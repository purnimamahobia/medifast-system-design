import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { orderItems, orders, medicines } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single order item by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const orderItem = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.id, parseInt(id)))
        .limit(1);

      if (orderItem.length === 0) {
        return NextResponse.json(
          { error: 'Order item not found', code: 'NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(orderItem[0], { status: 200 });
    }

    // List order items with pagination and filters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const orderId = searchParams.get('orderId');
    const medicineId = searchParams.get('medicineId');

    let query = db.select().from(orderItems);

    // Build filter conditions
    const conditions = [];
    if (orderId) {
      const orderIdNum = parseInt(orderId);
      if (isNaN(orderIdNum)) {
        return NextResponse.json(
          { error: 'Valid orderId is required', code: 'INVALID_ORDER_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(orderItems.orderId, orderIdNum));
    }
    if (medicineId) {
      const medicineIdNum = parseInt(medicineId);
      if (isNaN(medicineIdNum)) {
        return NextResponse.json(
          { error: 'Valid medicineId is required', code: 'INVALID_MEDICINE_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(orderItems.medicineId, medicineIdNum));
    }

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
    const { orderId, medicineId, quantity, price, discount, subtotal } = body;

    // Validate required fields
    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId is required', code: 'MISSING_ORDER_ID' },
        { status: 400 }
      );
    }

    if (!medicineId) {
      return NextResponse.json(
        { error: 'medicineId is required', code: 'MISSING_MEDICINE_ID' },
        { status: 400 }
      );
    }

    if (!quantity) {
      return NextResponse.json(
        { error: 'quantity is required', code: 'MISSING_QUANTITY' },
        { status: 400 }
      );
    }

    if (price === undefined || price === null) {
      return NextResponse.json(
        { error: 'price is required', code: 'MISSING_PRICE' },
        { status: 400 }
      );
    }

    if (subtotal === undefined || subtotal === null) {
      return NextResponse.json(
        { error: 'subtotal is required', code: 'MISSING_SUBTOTAL' },
        { status: 400 }
      );
    }

    // Validate orderId is positive integer
    const orderIdNum = parseInt(orderId);
    if (isNaN(orderIdNum) || orderIdNum <= 0) {
      return NextResponse.json(
        { error: 'orderId must be a positive integer', code: 'INVALID_ORDER_ID' },
        { status: 400 }
      );
    }

    // Validate medicineId is positive integer
    const medicineIdNum = parseInt(medicineId);
    if (isNaN(medicineIdNum) || medicineIdNum <= 0) {
      return NextResponse.json(
        { error: 'medicineId must be a positive integer', code: 'INVALID_MEDICINE_ID' },
        { status: 400 }
      );
    }

    // Validate quantity is positive integer
    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      return NextResponse.json(
        { error: 'quantity must be a positive integer', code: 'INVALID_QUANTITY' },
        { status: 400 }
      );
    }

    // Validate price is positive number
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json(
        { error: 'price must be a non-negative number', code: 'INVALID_PRICE' },
        { status: 400 }
      );
    }

    // Validate subtotal is positive number
    const subtotalNum = parseFloat(subtotal);
    if (isNaN(subtotalNum) || subtotalNum < 0) {
      return NextResponse.json(
        { error: 'subtotal must be a non-negative number', code: 'INVALID_SUBTOTAL' },
        { status: 400 }
      );
    }

    // Validate discount is non-negative (optional, defaults to 0)
    const discountNum = discount !== undefined && discount !== null ? parseFloat(discount) : 0;
    if (isNaN(discountNum) || discountNum < 0) {
      return NextResponse.json(
        { error: 'discount must be a non-negative number', code: 'INVALID_DISCOUNT' },
        { status: 400 }
      );
    }

    // Validate orderId exists
    const orderExists = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderIdNum))
      .limit(1);

    if (orderExists.length === 0) {
      return NextResponse.json(
        { error: 'Order not found', code: 'ORDER_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Validate medicineId exists
    const medicineExists = await db
      .select()
      .from(medicines)
      .where(eq(medicines.id, medicineIdNum))
      .limit(1);

    if (medicineExists.length === 0) {
      return NextResponse.json(
        { error: 'Medicine not found', code: 'MEDICINE_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Create order item
    const newOrderItem = await db
      .insert(orderItems)
      .values({
        orderId: orderIdNum,
        medicineId: medicineIdNum,
        quantity: quantityNum,
        price: priceNum,
        discount: discountNum,
        subtotal: subtotalNum,
      })
      .returning();

    return NextResponse.json(newOrderItem[0], { status: 201 });
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

    const idNum = parseInt(id);

    // Check if order item exists
    const existingOrderItem = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.id, idNum))
      .limit(1);

    if (existingOrderItem.length === 0) {
      return NextResponse.json(
        { error: 'Order item not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { quantity, price, discount, subtotal } = body;

    const updates: any = {};

    // Validate and prepare quantity update
    if (quantity !== undefined && quantity !== null) {
      const quantityNum = parseInt(quantity);
      if (isNaN(quantityNum) || quantityNum <= 0) {
        return NextResponse.json(
          { error: 'quantity must be a positive integer', code: 'INVALID_QUANTITY' },
          { status: 400 }
        );
      }
      updates.quantity = quantityNum;
    }

    // Validate and prepare price update
    if (price !== undefined && price !== null) {
      const priceNum = parseFloat(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return NextResponse.json(
          { error: 'price must be a non-negative number', code: 'INVALID_PRICE' },
          { status: 400 }
        );
      }
      updates.price = priceNum;
    }

    // Validate and prepare discount update
    if (discount !== undefined && discount !== null) {
      const discountNum = parseFloat(discount);
      if (isNaN(discountNum) || discountNum < 0) {
        return NextResponse.json(
          { error: 'discount must be a non-negative number', code: 'INVALID_DISCOUNT' },
          { status: 400 }
        );
      }
      updates.discount = discountNum;
    }

    // Validate and prepare subtotal update
    if (subtotal !== undefined && subtotal !== null) {
      const subtotalNum = parseFloat(subtotal);
      if (isNaN(subtotalNum) || subtotalNum < 0) {
        return NextResponse.json(
          { error: 'subtotal must be a non-negative number', code: 'INVALID_SUBTOTAL' },
          { status: 400 }
        );
      }
      updates.subtotal = subtotalNum;
    }

    // If no valid updates provided
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'NO_UPDATES' },
        { status: 400 }
      );
    }

    // Update order item
    const updated = await db
      .update(orderItems)
      .set(updates)
      .where(eq(orderItems.id, idNum))
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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const idNum = parseInt(id);

    // Check if order item exists
    const existingOrderItem = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.id, idNum))
      .limit(1);

    if (existingOrderItem.length === 0) {
      return NextResponse.json(
        { error: 'Order item not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Delete order item
    const deleted = await db
      .delete(orderItems)
      .where(eq(orderItems.id, idNum))
      .returning();

    return NextResponse.json(
      {
        message: 'Order item deleted successfully',
        orderItem: deleted[0],
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