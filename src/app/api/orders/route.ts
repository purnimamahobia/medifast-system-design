import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, users, pharmacies } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const VALID_STATUSES = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'picked_up',
  'out_for_delivery',
  'delivered',
  'cancelled'
] as const;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single order by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const order = await db
        .select()
        .from(orders)
        .where(eq(orders.id, parseInt(id)))
        .limit(1);

      if (order.length === 0) {
        return NextResponse.json(
          { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(order[0], { status: 200 });
    }

    // List orders with filters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const userId = searchParams.get('userId');
    const pharmacyId = searchParams.get('pharmacyId');
    const status = searchParams.get('status');

    let query = db.select().from(orders);

    // Build filter conditions
    const conditions = [];

    if (userId) {
      if (isNaN(parseInt(userId))) {
        return NextResponse.json(
          { error: 'Valid userId is required', code: 'INVALID_USER_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(orders.userId, parseInt(userId)));
    }

    if (pharmacyId) {
      if (isNaN(parseInt(pharmacyId))) {
        return NextResponse.json(
          { error: 'Valid pharmacyId is required', code: 'INVALID_PHARMACY_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(orders.pharmacyId, parseInt(pharmacyId)));
    }

    if (status) {
      if (!VALID_STATUSES.includes(status as any)) {
        return NextResponse.json(
          {
            error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
            code: 'INVALID_STATUS'
          },
          { status: 400 }
        );
      }
      conditions.push(eq(orders.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(orders.createdAt))
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

    const {
      userId,
      pharmacyId,
      orderNumber,
      status,
      totalAmount,
      deliveryAddress,
      deliveryFee,
      deliveryLatitude,
      deliveryLongitude,
      estimatedDeliveryTime,
      prescriptionRequired,
      prescriptionVerified
    } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    if (!pharmacyId) {
      return NextResponse.json(
        { error: 'pharmacyId is required', code: 'MISSING_PHARMACY_ID' },
        { status: 400 }
      );
    }

    if (!orderNumber || typeof orderNumber !== 'string') {
      return NextResponse.json(
        { error: 'orderNumber is required', code: 'MISSING_ORDER_NUMBER' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: 'status is required', code: 'MISSING_STATUS' },
        { status: 400 }
      );
    }

    if (totalAmount === undefined || totalAmount === null) {
      return NextResponse.json(
        { error: 'totalAmount is required', code: 'MISSING_TOTAL_AMOUNT' },
        { status: 400 }
      );
    }

    if (!deliveryAddress || typeof deliveryAddress !== 'string') {
      return NextResponse.json(
        { error: 'deliveryAddress is required', code: 'MISSING_DELIVERY_ADDRESS' },
        { status: 400 }
      );
    }

    // Validate userId is a valid integer
    if (isNaN(parseInt(userId))) {
      return NextResponse.json(
        { error: 'Valid userId is required', code: 'INVALID_USER_ID' },
        { status: 400 }
      );
    }

    // Validate pharmacyId is a valid integer
    if (isNaN(parseInt(pharmacyId))) {
      return NextResponse.json(
        { error: 'Valid pharmacyId is required', code: 'INVALID_PHARMACY_ID' },
        { status: 400 }
      );
    }

    // Validate status
    if (!VALID_STATUSES.includes(status as any)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    // Validate totalAmount is a positive number
    if (isNaN(parseFloat(totalAmount)) || parseFloat(totalAmount) < 0) {
      return NextResponse.json(
        { error: 'totalAmount must be a positive number', code: 'INVALID_TOTAL_AMOUNT' },
        { status: 400 }
      );
    }

    // Validate deliveryFee if provided
    if (deliveryFee !== undefined && (isNaN(parseFloat(deliveryFee)) || parseFloat(deliveryFee) < 0)) {
      return NextResponse.json(
        { error: 'deliveryFee must be a positive number', code: 'INVALID_DELIVERY_FEE' },
        { status: 400 }
      );
    }

    // Validate latitude/longitude ranges if provided
    if (deliveryLatitude !== undefined) {
      const lat = parseFloat(deliveryLatitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return NextResponse.json(
          { error: 'deliveryLatitude must be between -90 and 90', code: 'INVALID_LATITUDE' },
          { status: 400 }
        );
      }
    }

    if (deliveryLongitude !== undefined) {
      const lng = parseFloat(deliveryLongitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return NextResponse.json(
          { error: 'deliveryLongitude must be between -180 and 180', code: 'INVALID_LONGITUDE' },
          { status: 400 }
        );
      }
    }

    // Validate estimatedDeliveryTime if provided
    if (estimatedDeliveryTime !== undefined) {
      const time = parseInt(estimatedDeliveryTime);
      if (isNaN(time) || time < 0) {
        return NextResponse.json(
          { error: 'estimatedDeliveryTime must be a positive integer', code: 'INVALID_ESTIMATED_DELIVERY_TIME' },
          { status: 400 }
        );
      }
    }

    // Check if user exists
    const userExists = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(userId)))
      .limit(1);

    if (userExists.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Check if pharmacy exists
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

    // Check if orderNumber already exists
    const existingOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber.trim()))
      .limit(1);

    if (existingOrder.length > 0) {
      return NextResponse.json(
        { error: 'Order number already exists', code: 'DUPLICATE_ORDER_NUMBER' },
        { status: 400 }
      );
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData: any = {
      userId: parseInt(userId),
      pharmacyId: parseInt(pharmacyId),
      orderNumber: orderNumber.trim(),
      status,
      totalAmount: parseFloat(totalAmount),
      deliveryAddress: deliveryAddress.trim(),
      deliveryFee: deliveryFee !== undefined ? parseFloat(deliveryFee) : 0,
      prescriptionRequired: prescriptionRequired ?? false,
      prescriptionVerified: prescriptionVerified ?? false,
      createdAt: now,
      updatedAt: now
    };

    if (deliveryLatitude !== undefined) {
      insertData.deliveryLatitude = parseFloat(deliveryLatitude);
    }

    if (deliveryLongitude !== undefined) {
      insertData.deliveryLongitude = parseFloat(deliveryLongitude);
    }

    if (estimatedDeliveryTime !== undefined) {
      insertData.estimatedDeliveryTime = parseInt(estimatedDeliveryTime);
    }

    const newOrder = await db.insert(orders).values(insertData).returning();

    return NextResponse.json(newOrder[0], { status: 201 });
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();

    const {
      status,
      totalAmount,
      deliveryFee,
      deliveryAddress,
      deliveryLatitude,
      deliveryLongitude,
      estimatedDeliveryTime,
      prescriptionRequired,
      prescriptionVerified
    } = body;

    // Check if order exists
    const existingOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, parseInt(id)))
      .limit(1);

    if (existingOrder.length === 0) {
      return NextResponse.json(
        { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Validate status if provided
    if (status && !VALID_STATUSES.includes(status as any)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    // Validate totalAmount if provided
    if (totalAmount !== undefined && (isNaN(parseFloat(totalAmount)) || parseFloat(totalAmount) < 0)) {
      return NextResponse.json(
        { error: 'totalAmount must be a positive number', code: 'INVALID_TOTAL_AMOUNT' },
        { status: 400 }
      );
    }

    // Validate deliveryFee if provided
    if (deliveryFee !== undefined && (isNaN(parseFloat(deliveryFee)) || parseFloat(deliveryFee) < 0)) {
      return NextResponse.json(
        { error: 'deliveryFee must be a positive number', code: 'INVALID_DELIVERY_FEE' },
        { status: 400 }
      );
    }

    // Validate latitude/longitude ranges if provided
    if (deliveryLatitude !== undefined) {
      const lat = parseFloat(deliveryLatitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return NextResponse.json(
          { error: 'deliveryLatitude must be between -90 and 90', code: 'INVALID_LATITUDE' },
          { status: 400 }
        );
      }
    }

    if (deliveryLongitude !== undefined) {
      const lng = parseFloat(deliveryLongitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return NextResponse.json(
          { error: 'deliveryLongitude must be between -180 and 180', code: 'INVALID_LONGITUDE' },
          { status: 400 }
        );
      }
    }

    // Validate estimatedDeliveryTime if provided
    if (estimatedDeliveryTime !== undefined) {
      const time = parseInt(estimatedDeliveryTime);
      if (isNaN(time) || time < 0) {
        return NextResponse.json(
          { error: 'estimatedDeliveryTime must be a positive integer', code: 'INVALID_ESTIMATED_DELIVERY_TIME' },
          { status: 400 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date().toISOString()
    };

    if (status !== undefined) updateData.status = status;
    if (totalAmount !== undefined) updateData.totalAmount = parseFloat(totalAmount);
    if (deliveryFee !== undefined) updateData.deliveryFee = parseFloat(deliveryFee);
    if (deliveryAddress !== undefined) updateData.deliveryAddress = deliveryAddress.trim();
    if (deliveryLatitude !== undefined) updateData.deliveryLatitude = parseFloat(deliveryLatitude);
    if (deliveryLongitude !== undefined) updateData.deliveryLongitude = parseFloat(deliveryLongitude);
    if (estimatedDeliveryTime !== undefined) updateData.estimatedDeliveryTime = parseInt(estimatedDeliveryTime);
    if (prescriptionRequired !== undefined) updateData.prescriptionRequired = prescriptionRequired;
    if (prescriptionVerified !== undefined) updateData.prescriptionVerified = prescriptionVerified;

    const updated = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, parseInt(id)))
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

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if order exists
    const existingOrder = await db
      .select()
      .from(orders)
      .where(eq(orders.id, parseInt(id)))
      .limit(1);

    if (existingOrder.length === 0) {
      return NextResponse.json(
        { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(orders)
      .where(eq(orders.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Order deleted successfully',
        order: deleted[0]
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