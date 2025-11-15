import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inventory, pharmacies, medicines } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single inventory record by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const record = await db
        .select()
        .from(inventory)
        .where(eq(inventory.id, parseInt(id)))
        .limit(1);

      if (record.length === 0) {
        return NextResponse.json(
          { error: 'Inventory not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(record[0], { status: 200 });
    }

    // List inventory with filters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const pharmacyId = searchParams.get('pharmacyId');
    const medicineId = searchParams.get('medicineId');
    const isAvailable = searchParams.get('isAvailable');

    let query = db.select().from(inventory);

    // Build filter conditions
    const conditions = [];
    
    if (pharmacyId) {
      if (isNaN(parseInt(pharmacyId))) {
        return NextResponse.json(
          { error: 'Valid pharmacyId is required', code: 'INVALID_PHARMACY_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(inventory.pharmacyId, parseInt(pharmacyId)));
    }

    if (medicineId) {
      if (isNaN(parseInt(medicineId))) {
        return NextResponse.json(
          { error: 'Valid medicineId is required', code: 'INVALID_MEDICINE_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(inventory.medicineId, parseInt(medicineId)));
    }

    if (isAvailable !== null && isAvailable !== undefined) {
      const availabilityValue = isAvailable === 'true';
      conditions.push(eq(inventory.isAvailable, availabilityValue));
    }

    // Apply filters if any
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query.limit(limit).offset(offset);

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
    const { pharmacyId, medicineId, quantity, price, discountPercentage, isAvailable } = body;

    // Validate required fields
    if (!pharmacyId) {
      return NextResponse.json(
        { error: 'pharmacyId is required', code: 'MISSING_PHARMACY_ID' },
        { status: 400 }
      );
    }

    if (!medicineId) {
      return NextResponse.json(
        { error: 'medicineId is required', code: 'MISSING_MEDICINE_ID' },
        { status: 400 }
      );
    }

    if (quantity === undefined || quantity === null) {
      return NextResponse.json(
        { error: 'quantity is required', code: 'MISSING_QUANTITY' },
        { status: 400 }
      );
    }

    if (!price) {
      return NextResponse.json(
        { error: 'price is required', code: 'MISSING_PRICE' },
        { status: 400 }
      );
    }

    // Validate pharmacyId is positive integer
    if (isNaN(parseInt(pharmacyId)) || parseInt(pharmacyId) <= 0) {
      return NextResponse.json(
        { error: 'pharmacyId must be a positive integer', code: 'INVALID_PHARMACY_ID' },
        { status: 400 }
      );
    }

    // Validate medicineId is positive integer
    if (isNaN(parseInt(medicineId)) || parseInt(medicineId) <= 0) {
      return NextResponse.json(
        { error: 'medicineId must be a positive integer', code: 'INVALID_MEDICINE_ID' },
        { status: 400 }
      );
    }

    // Validate quantity is non-negative integer
    if (isNaN(parseInt(quantity)) || parseInt(quantity) < 0) {
      return NextResponse.json(
        { error: 'quantity must be a non-negative integer', code: 'INVALID_QUANTITY' },
        { status: 400 }
      );
    }

    // Validate price is positive number
    if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
      return NextResponse.json(
        { error: 'price must be a positive number', code: 'INVALID_PRICE' },
        { status: 400 }
      );
    }

    // Validate discountPercentage if provided
    if (discountPercentage !== undefined && discountPercentage !== null) {
      const discount = parseFloat(discountPercentage);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return NextResponse.json(
          { error: 'discountPercentage must be between 0 and 100', code: 'INVALID_DISCOUNT' },
          { status: 400 }
        );
      }
    }

    // Basic validation: Check if pharmacy exists
    const pharmacyExists = await db
      .select()
      .from(pharmacies)
      .where(eq(pharmacies.id, parseInt(pharmacyId)))
      .limit(1);

    if (pharmacyExists.length === 0) {
      return NextResponse.json(
        { error: 'Pharmacy not found', code: 'PHARMACY_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Basic validation: Check if medicine exists
    const medicineExists = await db
      .select()
      .from(medicines)
      .where(eq(medicines.id, parseInt(medicineId)))
      .limit(1);

    if (medicineExists.length === 0) {
      return NextResponse.json(
        { error: 'Medicine not found', code: 'MEDICINE_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Prepare insert data with defaults
    const insertData = {
      pharmacyId: parseInt(pharmacyId),
      medicineId: parseInt(medicineId),
      quantity: parseInt(quantity),
      price: parseFloat(price),
      discountPercentage: discountPercentage !== undefined ? parseFloat(discountPercentage) : 0,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      lastUpdated: new Date().toISOString(),
    };

    const newInventory = await db
      .insert(inventory)
      .values(insertData)
      .returning();

    return NextResponse.json(newInventory[0], { status: 201 });
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existing = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Inventory not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { quantity, price, discountPercentage, isAvailable } = body;

    // Prepare update data
    const updates: any = {
      lastUpdated: new Date().toISOString(),
    };

    // Validate and add quantity if provided
    if (quantity !== undefined && quantity !== null) {
      if (isNaN(parseInt(quantity)) || parseInt(quantity) < 0) {
        return NextResponse.json(
          { error: 'quantity must be a non-negative integer', code: 'INVALID_QUANTITY' },
          { status: 400 }
        );
      }
      updates.quantity = parseInt(quantity);
    }

    // Validate and add price if provided
    if (price !== undefined && price !== null) {
      if (isNaN(parseFloat(price)) || parseFloat(price) <= 0) {
        return NextResponse.json(
          { error: 'price must be a positive number', code: 'INVALID_PRICE' },
          { status: 400 }
        );
      }
      updates.price = parseFloat(price);
    }

    // Validate and add discountPercentage if provided
    if (discountPercentage !== undefined && discountPercentage !== null) {
      const discount = parseFloat(discountPercentage);
      if (isNaN(discount) || discount < 0 || discount > 100) {
        return NextResponse.json(
          { error: 'discountPercentage must be between 0 and 100', code: 'INVALID_DISCOUNT' },
          { status: 400 }
        );
      }
      updates.discountPercentage = discount;
    }

    // Add isAvailable if provided
    if (isAvailable !== undefined && isAvailable !== null) {
      updates.isAvailable = Boolean(isAvailable);
    }

    const updated = await db
      .update(inventory)
      .set(updates)
      .where(eq(inventory.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
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
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if record exists
    const existing = await db
      .select()
      .from(inventory)
      .where(eq(inventory.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Inventory not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(inventory)
      .where(eq(inventory.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Inventory deleted successfully',
        deleted: deleted[0],
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