import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { prescriptions, users, orders, pharmacies } from '@/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single prescription fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const prescription = await db.select()
        .from(prescriptions)
        .where(eq(prescriptions.id, parseInt(id)))
        .limit(1);

      if (prescription.length === 0) {
        return NextResponse.json({ 
          error: 'Prescription not found',
          code: 'PRESCRIPTION_NOT_FOUND' 
        }, { status: 404 });
      }

      return NextResponse.json(prescription[0], { status: 200 });
    }

    // List prescriptions with filtering and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const userId = searchParams.get('userId');
    const orderId = searchParams.get('orderId');
    const isVerified = searchParams.get('isVerified');

    let query = db.select().from(prescriptions);

    // Build filter conditions
    const conditions = [];
    
    if (userId) {
      if (isNaN(parseInt(userId))) {
        return NextResponse.json({ 
          error: "Valid user ID is required",
          code: "INVALID_USER_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(prescriptions.userId, parseInt(userId)));
    }

    if (orderId) {
      if (isNaN(parseInt(orderId))) {
        return NextResponse.json({ 
          error: "Valid order ID is required",
          code: "INVALID_ORDER_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(prescriptions.orderId, parseInt(orderId)));
    }

    if (isVerified !== null && isVerified !== undefined) {
      const verified = isVerified === 'true';
      conditions.push(eq(prescriptions.isVerified, verified));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(prescriptions.uploadedAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, orderId, prescriptionUrl, verifiedBy, isVerified, verificationNotes, verifiedAt } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json({ 
        error: "User ID is required",
        code: "MISSING_USER_ID" 
      }, { status: 400 });
    }

    if (!prescriptionUrl || prescriptionUrl.trim() === '') {
      return NextResponse.json({ 
        error: "Prescription URL is required",
        code: "MISSING_PRESCRIPTION_URL" 
      }, { status: 400 });
    }

    // Validate userId is positive integer
    if (isNaN(parseInt(userId)) || parseInt(userId) <= 0) {
      return NextResponse.json({ 
        error: "Valid user ID is required",
        code: "INVALID_USER_ID" 
      }, { status: 400 });
    }

    // Basic validation - check if user exists
    const userExists = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json({ 
        error: "User not found",
        code: "USER_NOT_FOUND" 
      }, { status: 400 });
    }

    // Validate orderId if provided
    if (orderId !== undefined && orderId !== null) {
      if (isNaN(parseInt(orderId)) || parseInt(orderId) <= 0) {
        return NextResponse.json({ 
          error: "Valid order ID is required",
          code: "INVALID_ORDER_ID" 
        }, { status: 400 });
      }

      const orderExists = await db.select()
        .from(orders)
        .where(eq(orders.id, parseInt(orderId)))
        .limit(1);

      if (orderExists.length === 0) {
        return NextResponse.json({ 
          error: "Order not found",
          code: "ORDER_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    // Validate verifiedBy if provided
    if (verifiedBy !== undefined && verifiedBy !== null) {
      if (isNaN(parseInt(verifiedBy)) || parseInt(verifiedBy) <= 0) {
        return NextResponse.json({ 
          error: "Valid pharmacy ID is required",
          code: "INVALID_PHARMACY_ID" 
        }, { status: 400 });
      }

      const pharmacyExists = await db.select()
        .from(pharmacies)
        .where(eq(pharmacies.id, parseInt(verifiedBy)))
        .limit(1);

      if (pharmacyExists.length === 0) {
        return NextResponse.json({ 
          error: "Pharmacy not found",
          code: "PHARMACY_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    // Prepare insert data
    const insertData: any = {
      userId: parseInt(userId),
      prescriptionUrl: prescriptionUrl.trim(),
      isVerified: isVerified ?? false,
      uploadedAt: new Date().toISOString(),
    };

    if (orderId !== undefined && orderId !== null) {
      insertData.orderId = parseInt(orderId);
    }

    if (verifiedBy !== undefined && verifiedBy !== null) {
      insertData.verifiedBy = parseInt(verifiedBy);
    }

    if (verificationNotes !== undefined && verificationNotes !== null) {
      insertData.verificationNotes = verificationNotes.trim();
    }

    if (verifiedAt !== undefined && verifiedAt !== null) {
      insertData.verifiedAt = verifiedAt;
    }

    const newPrescription = await db.insert(prescriptions)
      .values(insertData)
      .returning();

    return NextResponse.json(newPrescription[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const body = await request.json();
    const { orderId, verifiedBy, isVerified, verificationNotes, verifiedAt } = body;

    // Check if prescription exists
    const existing = await db.select()
      .from(prescriptions)
      .where(eq(prescriptions.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Prescription not found',
        code: 'PRESCRIPTION_NOT_FOUND' 
      }, { status: 404 });
    }

    // Validate orderId if provided
    if (orderId !== undefined && orderId !== null) {
      if (isNaN(parseInt(orderId)) || parseInt(orderId) <= 0) {
        return NextResponse.json({ 
          error: "Valid order ID is required",
          code: "INVALID_ORDER_ID" 
        }, { status: 400 });
      }

      const orderExists = await db.select()
        .from(orders)
        .where(eq(orders.id, parseInt(orderId)))
        .limit(1);

      if (orderExists.length === 0) {
        return NextResponse.json({ 
          error: "Order not found",
          code: "ORDER_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    // Validate verifiedBy if provided
    if (verifiedBy !== undefined && verifiedBy !== null) {
      if (isNaN(parseInt(verifiedBy)) || parseInt(verifiedBy) <= 0) {
        return NextResponse.json({ 
          error: "Valid pharmacy ID is required",
          code: "INVALID_PHARMACY_ID" 
        }, { status: 400 });
      }

      const pharmacyExists = await db.select()
        .from(pharmacies)
        .where(eq(pharmacies.id, parseInt(verifiedBy)))
        .limit(1);

      if (pharmacyExists.length === 0) {
        return NextResponse.json({ 
          error: "Pharmacy not found",
          code: "PHARMACY_NOT_FOUND" 
        }, { status: 400 });
      }
    }

    // Prepare update data
    const updateData: any = {};

    if (orderId !== undefined) {
      updateData.orderId = orderId !== null ? parseInt(orderId) : null;
    }

    if (verifiedBy !== undefined) {
      updateData.verifiedBy = verifiedBy !== null ? parseInt(verifiedBy) : null;
    }

    if (isVerified !== undefined) {
      updateData.isVerified = isVerified;
      
      // Auto-update verifiedAt if isVerified changes to true and verifiedAt is not already set
      if (isVerified === true && !existing[0].verifiedAt && verifiedAt === undefined) {
        updateData.verifiedAt = new Date().toISOString();
      }
    }

    if (verificationNotes !== undefined) {
      updateData.verificationNotes = verificationNotes !== null ? verificationNotes.trim() : null;
    }

    if (verifiedAt !== undefined) {
      updateData.verifiedAt = verifiedAt;
    }

    const updated = await db.update(prescriptions)
      .set(updateData)
      .where(eq(prescriptions.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if prescription exists
    const existing = await db.select()
      .from(prescriptions)
      .where(eq(prescriptions.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Prescription not found',
        code: 'PRESCRIPTION_NOT_FOUND' 
      }, { status: 404 });
    }

    const deleted = await db.delete(prescriptions)
      .where(eq(prescriptions.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'Prescription deleted successfully',
      prescription: deleted[0]
    }, { status: 200 });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + (error as Error).message 
    }, { status: 500 });
  }
}