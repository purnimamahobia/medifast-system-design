import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pharmacies } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single pharmacy fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const pharmacy = await db
        .select()
        .from(pharmacies)
        .where(eq(pharmacies.id, parseInt(id)))
        .limit(1);

      if (pharmacy.length === 0) {
        return NextResponse.json(
          { error: 'Pharmacy not found', code: 'PHARMACY_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(pharmacy[0], { status: 200 });
    }

    // List pharmacies with pagination, search, and filters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const isActiveParam = searchParams.get('isActive');

    let query = db.select().from(pharmacies);

    const conditions = [];

    // Search filter
    if (search) {
      const searchCondition = or(
        like(pharmacies.pharmacyName, `%${search}%`),
        like(pharmacies.address, `%${search}%`),
        like(pharmacies.licenseNumber, `%${search}%`)
      );
      conditions.push(searchCondition);
    }

    // Active filter
    if (isActiveParam !== null) {
      const isActive = isActiveParam === 'true';
      conditions.push(eq(pharmacies.isActive, isActive));
    }

    // Apply conditions
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(pharmacies.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Required field validation
    const requiredFields = [
      'pharmacyName',
      'licenseNumber',
      'address',
      'latitude',
      'longitude',
      'phone',
      'email',
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          {
            error: `${field} is required`,
            code: 'MISSING_REQUIRED_FIELD',
          },
          { status: 400 }
        );
      }
    }

    // Sanitize string inputs
    const pharmacyName = body.pharmacyName.trim();
    const licenseNumber = body.licenseNumber.trim();
    const address = body.address.trim();
    const phone = body.phone.trim();
    const email = body.email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    // Validate latitude and longitude
    const latitude = parseFloat(body.latitude);
    const longitude = parseFloat(body.longitude);

    if (isNaN(latitude) || latitude < -90 || latitude > 90) {
      return NextResponse.json(
        {
          error: 'Latitude must be a number between -90 and 90',
          code: 'INVALID_LATITUDE',
        },
        { status: 400 }
      );
    }

    if (isNaN(longitude) || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        {
          error: 'Longitude must be a number between -180 and 180',
          code: 'INVALID_LONGITUDE',
        },
        { status: 400 }
      );
    }

    // Validate rating if provided
    let rating = body.rating !== undefined ? parseFloat(body.rating) : 0;
    if (isNaN(rating) || rating < 0 || rating > 5) {
      return NextResponse.json(
        {
          error: 'Rating must be a number between 0 and 5',
          code: 'INVALID_RATING',
        },
        { status: 400 }
      );
    }

    // Check license number uniqueness
    const existingPharmacy = await db
      .select()
      .from(pharmacies)
      .where(eq(pharmacies.licenseNumber, licenseNumber))
      .limit(1);

    if (existingPharmacy.length > 0) {
      return NextResponse.json(
        {
          error: 'License number already exists',
          code: 'DUPLICATE_LICENSE_NUMBER',
        },
        { status: 400 }
      );
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData: any = {
      pharmacyName,
      licenseNumber,
      address,
      latitude,
      longitude,
      phone,
      email,
      isActive: body.isActive !== undefined ? body.isActive : true,
      rating,
      createdAt: now,
      updatedAt: now,
    };

    // Optional fields
    if (body.userId !== undefined) {
      insertData.userId = parseInt(body.userId);
    }
    if (body.openingTime) {
      insertData.openingTime = body.openingTime.trim();
    }
    if (body.closingTime) {
      insertData.closingTime = body.closingTime.trim();
    }

    const newPharmacy = await db.insert(pharmacies).values(insertData).returning();

    return NextResponse.json(newPharmacy[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const pharmacyId = parseInt(id);

    // Check if pharmacy exists
    const existingPharmacy = await db
      .select()
      .from(pharmacies)
      .where(eq(pharmacies.id, pharmacyId))
      .limit(1);

    if (existingPharmacy.length === 0) {
      return NextResponse.json(
        { error: 'Pharmacy not found', code: 'PHARMACY_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: any = {};

    // Sanitize and validate updates
    if (body.pharmacyName !== undefined) {
      updates.pharmacyName = body.pharmacyName.trim();
    }

    if (body.licenseNumber !== undefined) {
      const licenseNumber = body.licenseNumber.trim();

      // Check license number uniqueness if changed
      if (licenseNumber !== existingPharmacy[0].licenseNumber) {
        const duplicateCheck = await db
          .select()
          .from(pharmacies)
          .where(eq(pharmacies.licenseNumber, licenseNumber))
          .limit(1);

        if (duplicateCheck.length > 0) {
          return NextResponse.json(
            {
              error: 'License number already exists',
              code: 'DUPLICATE_LICENSE_NUMBER',
            },
            { status: 400 }
          );
        }
      }

      updates.licenseNumber = licenseNumber;
    }

    if (body.address !== undefined) {
      updates.address = body.address.trim();
    }

    if (body.latitude !== undefined) {
      const latitude = parseFloat(body.latitude);
      if (isNaN(latitude) || latitude < -90 || latitude > 90) {
        return NextResponse.json(
          {
            error: 'Latitude must be a number between -90 and 90',
            code: 'INVALID_LATITUDE',
          },
          { status: 400 }
        );
      }
      updates.latitude = latitude;
    }

    if (body.longitude !== undefined) {
      const longitude = parseFloat(body.longitude);
      if (isNaN(longitude) || longitude < -180 || longitude > 180) {
        return NextResponse.json(
          {
            error: 'Longitude must be a number between -180 and 180',
            code: 'INVALID_LONGITUDE',
          },
          { status: 400 }
        );
      }
      updates.longitude = longitude;
    }

    if (body.phone !== undefined) {
      updates.phone = body.phone.trim();
    }

    if (body.email !== undefined) {
      const email = body.email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format', code: 'INVALID_EMAIL' },
          { status: 400 }
        );
      }
      updates.email = email;
    }

    if (body.openingTime !== undefined) {
      updates.openingTime = body.openingTime ? body.openingTime.trim() : null;
    }

    if (body.closingTime !== undefined) {
      updates.closingTime = body.closingTime ? body.closingTime.trim() : null;
    }

    if (body.isActive !== undefined) {
      updates.isActive = body.isActive;
    }

    if (body.rating !== undefined) {
      const rating = parseFloat(body.rating);
      if (isNaN(rating) || rating < 0 || rating > 5) {
        return NextResponse.json(
          {
            error: 'Rating must be a number between 0 and 5',
            code: 'INVALID_RATING',
          },
          { status: 400 }
        );
      }
      updates.rating = rating;
    }

    if (body.userId !== undefined) {
      updates.userId = body.userId ? parseInt(body.userId) : null;
    }

    // Always update timestamp
    updates.updatedAt = new Date().toISOString();

    const updatedPharmacy = await db
      .update(pharmacies)
      .set(updates)
      .where(eq(pharmacies.id, pharmacyId))
      .returning();

    return NextResponse.json(updatedPharmacy[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const pharmacyId = parseInt(id);

    // Check if pharmacy exists
    const existingPharmacy = await db
      .select()
      .from(pharmacies)
      .where(eq(pharmacies.id, pharmacyId))
      .limit(1);

    if (existingPharmacy.length === 0) {
      return NextResponse.json(
        { error: 'Pharmacy not found', code: 'PHARMACY_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(pharmacies)
      .where(eq(pharmacies.id, pharmacyId))
      .returning();

    return NextResponse.json(
      {
        message: 'Pharmacy deleted successfully',
        pharmacy: deleted[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}