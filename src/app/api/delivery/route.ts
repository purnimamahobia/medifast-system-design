import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { delivery, orders, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

const VALID_STATUSES = ['assigned', 'accepted', 'picked_up', 'on_the_way', 'delivered', 'failed'] as const;
type DeliveryStatus = typeof VALID_STATUSES[number];

function isValidStatus(status: string): status is DeliveryStatus {
  return VALID_STATUSES.includes(status as DeliveryStatus);
}

function validateLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

function validateLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single delivery by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const result = await db
        .select()
        .from(delivery)
        .where(eq(delivery.id, parseInt(id)))
        .limit(1);

      if (result.length === 0) {
        return NextResponse.json(
          { error: 'Delivery not found', code: 'DELIVERY_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(result[0], { status: 200 });
    }

    // List deliveries with filters and pagination
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const orderId = searchParams.get('orderId');
    const deliveryPersonId = searchParams.get('deliveryPersonId');
    const status = searchParams.get('status');

    let query = db.select().from(delivery);

    // Build where conditions
    const conditions = [];

    if (orderId) {
      const orderIdNum = parseInt(orderId);
      if (!isNaN(orderIdNum)) {
        conditions.push(eq(delivery.orderId, orderIdNum));
      }
    }

    if (deliveryPersonId) {
      const deliveryPersonIdNum = parseInt(deliveryPersonId);
      if (!isNaN(deliveryPersonIdNum)) {
        conditions.push(eq(delivery.deliveryPersonId, deliveryPersonIdNum));
      }
    }

    if (status) {
      if (isValidStatus(status)) {
        conditions.push(eq(delivery.status, status));
      } else {
        return NextResponse.json(
          { 
            error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
            code: 'INVALID_STATUS'
          },
          { status: 400 }
        );
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(delivery.id))
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
      orderId,
      status,
      deliveryPersonId,
      currentLatitude,
      currentLongitude,
      assignedAt,
      pickedUpAt,
      deliveredAt,
      notes
    } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required', code: 'MISSING_ORDER_ID' },
        { status: 400 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { error: 'status is required', code: 'MISSING_STATUS' },
        { status: 400 }
      );
    }

    // Validate status
    if (!isValidStatus(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    // Validate orderId is unique
    const existingDelivery = await db
      .select()
      .from(delivery)
      .where(eq(delivery.orderId, parseInt(orderId)))
      .limit(1);

    if (existingDelivery.length > 0) {
      return NextResponse.json(
        {
          error: 'A delivery already exists for this order',
          code: 'DUPLICATE_ORDER_DELIVERY'
        },
        { status: 400 }
      );
    }

    // Validate orderId exists
    const orderExists = await db
      .select()
      .from(orders)
      .where(eq(orders.id, parseInt(orderId)))
      .limit(1);

    if (orderExists.length === 0) {
      return NextResponse.json(
        { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Validate deliveryPersonId exists if provided
    if (deliveryPersonId) {
      const userExists = await db
        .select()
        .from(users)
        .where(eq(users.id, parseInt(deliveryPersonId)))
        .limit(1);

      if (userExists.length === 0) {
        return NextResponse.json(
          { error: 'Delivery person not found', code: 'DELIVERY_PERSON_NOT_FOUND' },
          { status: 400 }
        );
      }
    }

    // Validate latitude/longitude if provided
    if (currentLatitude !== undefined && currentLatitude !== null) {
      if (!validateLatitude(parseFloat(currentLatitude))) {
        return NextResponse.json(
          { error: 'Invalid latitude. Must be between -90 and 90', code: 'INVALID_LATITUDE' },
          { status: 400 }
        );
      }
    }

    if (currentLongitude !== undefined && currentLongitude !== null) {
      if (!validateLongitude(parseFloat(currentLongitude))) {
        return NextResponse.json(
          { error: 'Invalid longitude. Must be between -180 and 180', code: 'INVALID_LONGITUDE' },
          { status: 400 }
        );
      }
    }

    // Prepare insert data
    const insertData: any = {
      orderId: parseInt(orderId),
      status: status.trim(),
      assignedAt: assignedAt ?? new Date().toISOString()
    };

    if (deliveryPersonId) {
      insertData.deliveryPersonId = parseInt(deliveryPersonId);
    }

    if (currentLatitude !== undefined && currentLatitude !== null) {
      insertData.currentLatitude = parseFloat(currentLatitude);
    }

    if (currentLongitude !== undefined && currentLongitude !== null) {
      insertData.currentLongitude = parseFloat(currentLongitude);
    }

    if (pickedUpAt) {
      insertData.pickedUpAt = pickedUpAt;
    }

    if (deliveredAt) {
      insertData.deliveredAt = deliveredAt;
    }

    if (notes) {
      insertData.notes = notes.trim();
    }

    const newDelivery = await db
      .insert(delivery)
      .values(insertData)
      .returning();

    return NextResponse.json(newDelivery[0], { status: 201 });
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

    // Check if delivery exists
    const existing = await db
      .select()
      .from(delivery)
      .where(eq(delivery.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Delivery not found', code: 'DELIVERY_NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      deliveryPersonId,
      status,
      currentLatitude,
      currentLongitude,
      assignedAt,
      pickedUpAt,
      deliveredAt,
      notes
    } = body;

    const updates: any = {};

    // Validate and add status
    if (status !== undefined) {
      if (!isValidStatus(status)) {
        return NextResponse.json(
          {
            error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
            code: 'INVALID_STATUS'
          },
          { status: 400 }
        );
      }
      updates.status = status.trim();

      // Auto-update timestamps based on status changes
      if (status === 'picked_up' && !pickedUpAt && !existing[0].pickedUpAt) {
        updates.pickedUpAt = new Date().toISOString();
      }

      if (status === 'delivered' && !deliveredAt && !existing[0].deliveredAt) {
        updates.deliveredAt = new Date().toISOString();
      }
    }

    // Validate deliveryPersonId if provided
    if (deliveryPersonId !== undefined) {
      if (deliveryPersonId === null) {
        updates.deliveryPersonId = null;
      } else {
        const userExists = await db
          .select()
          .from(users)
          .where(eq(users.id, parseInt(deliveryPersonId)))
          .limit(1);

        if (userExists.length === 0) {
          return NextResponse.json(
            { error: 'Delivery person not found', code: 'DELIVERY_PERSON_NOT_FOUND' },
            { status: 400 }
          );
        }
        updates.deliveryPersonId = parseInt(deliveryPersonId);
      }
    }

    // Validate and add latitude
    if (currentLatitude !== undefined) {
      if (currentLatitude === null) {
        updates.currentLatitude = null;
      } else {
        if (!validateLatitude(parseFloat(currentLatitude))) {
          return NextResponse.json(
            { error: 'Invalid latitude. Must be between -90 and 90', code: 'INVALID_LATITUDE' },
            { status: 400 }
          );
        }
        updates.currentLatitude = parseFloat(currentLatitude);
      }
    }

    // Validate and add longitude
    if (currentLongitude !== undefined) {
      if (currentLongitude === null) {
        updates.currentLongitude = null;
      } else {
        if (!validateLongitude(parseFloat(currentLongitude))) {
          return NextResponse.json(
            { error: 'Invalid longitude. Must be between -180 and 180', code: 'INVALID_LONGITUDE' },
            { status: 400 }
          );
        }
        updates.currentLongitude = parseFloat(currentLongitude);
      }
    }

    if (assignedAt !== undefined) {
      updates.assignedAt = assignedAt;
    }

    if (pickedUpAt !== undefined) {
      updates.pickedUpAt = pickedUpAt;
    }

    if (deliveredAt !== undefined) {
      updates.deliveredAt = deliveredAt;
    }

    if (notes !== undefined) {
      updates.notes = notes ? notes.trim() : null;
    }

    const updated = await db
      .update(delivery)
      .set(updates)
      .where(eq(delivery.id, parseInt(id)))
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

    // Check if delivery exists
    const existing = await db
      .select()
      .from(delivery)
      .where(eq(delivery.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Delivery not found', code: 'DELIVERY_NOT_FOUND' },
        { status: 404 }
      );
    }

    const deleted = await db
      .delete(delivery)
      .where(eq(delivery.id, parseInt(id)))
      .returning();

    return NextResponse.json(
      {
        message: 'Delivery deleted successfully',
        delivery: deleted[0]
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