import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

const VALID_ROLES = ['customer', 'pharmacy', 'delivery'];

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateRole(role: string): boolean {
  return VALID_ROLES.includes(role);
}

function validateCoordinate(value: any, type: 'latitude' | 'longitude'): boolean {
  if (value === null || value === undefined) return true;
  const num = parseFloat(value);
  if (isNaN(num)) return false;
  if (type === 'latitude') return num >= -90 && num <= 90;
  if (type === 'longitude') return num >= -180 && num <= 180;
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(id)))
        .limit(1);

      if (user.length === 0) {
        return NextResponse.json(
          { error: 'User not found', code: 'USER_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(user[0], { status: 200 });
    }

    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const role = searchParams.get('role');

    let query = db.select().from(users);

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.phone, `%${search}%`)
        )
      );
    }

    if (role) {
      if (!validateRole(role)) {
        return NextResponse.json(
          {
            error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
            code: 'INVALID_ROLE',
          },
          { status: 400 }
        );
      }
      conditions.push(eq(users.role, role));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, role, address, latitude, longitude } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required', code: 'MISSING_NAME' },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required', code: 'MISSING_EMAIL' },
        { status: 400 }
      );
    }

    if (!validateEmail(email.trim())) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    if (!phone || !phone.trim()) {
      return NextResponse.json(
        { error: 'Phone is required', code: 'MISSING_PHONE' },
        { status: 400 }
      );
    }

    if (!role || !role.trim()) {
      return NextResponse.json(
        { error: 'Role is required', code: 'MISSING_ROLE' },
        { status: 400 }
      );
    }

    if (!validateRole(role)) {
      return NextResponse.json(
        {
          error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
          code: 'INVALID_ROLE',
        },
        { status: 400 }
      );
    }

    if (latitude !== undefined && latitude !== null && !validateCoordinate(latitude, 'latitude')) {
      return NextResponse.json(
        { error: 'Invalid latitude. Must be between -90 and 90', code: 'INVALID_LATITUDE' },
        { status: 400 }
      );
    }

    if (longitude !== undefined && longitude !== null && !validateCoordinate(longitude, 'longitude')) {
      return NextResponse.json(
        { error: 'Invalid longitude. Must be between -180 and 180', code: 'INVALID_LONGITUDE' },
        { status: 400 }
      );
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists', code: 'EMAIL_EXISTS' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    const insertData: any = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      role: role.trim(),
      createdAt: now,
      updatedAt: now,
    };

    if (address !== undefined && address !== null) {
      insertData.address = address.trim();
    }

    if (latitude !== undefined && latitude !== null) {
      insertData.latitude = parseFloat(latitude);
    }

    if (longitude !== undefined && longitude !== null) {
      insertData.longitude = parseFloat(longitude);
    }

    const newUser = await db.insert(users).values(insertData).returning();

    return NextResponse.json(newUser[0], { status: 201 });
  } catch (error: any) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, email, phone, role, address, latitude, longitude } = body;

    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: 'Name cannot be empty', code: 'INVALID_NAME' },
          { status: 400 }
        );
      }
      updates.name = name.trim();
    }

    if (email !== undefined) {
      if (!email.trim()) {
        return NextResponse.json(
          { error: 'Email cannot be empty', code: 'INVALID_EMAIL' },
          { status: 400 }
        );
      }
      if (!validateEmail(email.trim())) {
        return NextResponse.json(
          { error: 'Invalid email format', code: 'INVALID_EMAIL' },
          { status: 400 }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();
      if (normalizedEmail !== existingUser[0].email) {
        const emailExists = await db
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .limit(1);

        if (emailExists.length > 0) {
          return NextResponse.json(
            { error: 'Email already exists', code: 'EMAIL_EXISTS' },
            { status: 400 }
          );
        }
      }
      updates.email = normalizedEmail;
    }

    if (phone !== undefined) {
      if (!phone.trim()) {
        return NextResponse.json(
          { error: 'Phone cannot be empty', code: 'INVALID_PHONE' },
          { status: 400 }
        );
      }
      updates.phone = phone.trim();
    }

    if (role !== undefined) {
      if (!validateRole(role)) {
        return NextResponse.json(
          {
            error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
            code: 'INVALID_ROLE',
          },
          { status: 400 }
        );
      }
      updates.role = role.trim();
    }

    if (address !== undefined) {
      updates.address = address ? address.trim() : null;
    }

    if (latitude !== undefined) {
      if (latitude !== null && !validateCoordinate(latitude, 'latitude')) {
        return NextResponse.json(
          { error: 'Invalid latitude. Must be between -90 and 90', code: 'INVALID_LATITUDE' },
          { status: 400 }
        );
      }
      updates.latitude = latitude !== null ? parseFloat(latitude) : null;
    }

    if (longitude !== undefined) {
      if (longitude !== null && !validateCoordinate(longitude, 'longitude')) {
        return NextResponse.json(
          { error: 'Invalid longitude. Must be between -180 and 180', code: 'INVALID_LONGITUDE' },
          { status: 400 }
        );
      }
      updates.longitude = longitude !== null ? parseFloat(longitude) : null;
    }

    const updated = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error: any) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(id)))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(users)
      .where(eq(users.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'User deleted successfully',
        user: deleted[0],
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}