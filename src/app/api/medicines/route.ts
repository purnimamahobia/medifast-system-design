import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { medicines } from '@/db/schema';
import { eq, like, and, or, desc } from 'drizzle-orm';

const VALID_CATEGORIES = ['prescription', 'otc', 'supplement', 'device', 'first_aid', 'baby_care', 'personal_care'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    // Single medicine by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const medicine = await db.select()
        .from(medicines)
        .where(eq(medicines.id, parseInt(id)))
        .limit(1);

      if (medicine.length === 0) {
        return NextResponse.json({ 
          error: 'Medicine not found',
          code: "MEDICINE_NOT_FOUND" 
        }, { status: 404 });
      }

      return NextResponse.json(medicine[0], { status: 200 });
    }

    // List medicines with filters
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const requiresPrescription = searchParams.get('requiresPrescription');

    let query = db.select().from(medicines);

    const conditions = [];

    // Search filter
    if (search) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          like(medicines.name, searchTerm),
          like(medicines.brand, searchTerm),
          like(medicines.saltComposition, searchTerm)
        )
      );
    }

    // Category filter
    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return NextResponse.json({ 
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
          code: "INVALID_CATEGORY" 
        }, { status: 400 });
      }
      conditions.push(eq(medicines.category, category));
    }

    // Prescription filter
    if (requiresPrescription !== null) {
      const isPrescriptionRequired = requiresPrescription === 'true';
      conditions.push(eq(medicines.requiresPrescription, isPrescriptionRequired));
    }

    // Apply filters
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(medicines.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, brand, saltComposition, category, unit, price, description, manufacturer, requiresPrescription, imageUrl } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json({ 
        error: "Name is required",
        code: "MISSING_NAME" 
      }, { status: 400 });
    }

    if (!brand || !brand.trim()) {
      return NextResponse.json({ 
        error: "Brand is required",
        code: "MISSING_BRAND" 
      }, { status: 400 });
    }

    if (!saltComposition || !saltComposition.trim()) {
      return NextResponse.json({ 
        error: "Salt composition is required",
        code: "MISSING_SALT_COMPOSITION" 
      }, { status: 400 });
    }

    if (!category || !category.trim()) {
      return NextResponse.json({ 
        error: "Category is required",
        code: "MISSING_CATEGORY" 
      }, { status: 400 });
    }

    if (!unit || !unit.trim()) {
      return NextResponse.json({ 
        error: "Unit is required",
        code: "MISSING_UNIT" 
      }, { status: 400 });
    }

    if (price === undefined || price === null) {
      return NextResponse.json({ 
        error: "Price is required",
        code: "MISSING_PRICE" 
      }, { status: 400 });
    }

    // Validate category
    if (!VALID_CATEGORIES.includes(category.trim())) {
      return NextResponse.json({ 
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
        code: "INVALID_CATEGORY" 
      }, { status: 400 });
    }

    // Validate price
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return NextResponse.json({ 
        error: "Price must be a positive number",
        code: "INVALID_PRICE" 
      }, { status: 400 });
    }

    // Validate requiresPrescription if provided
    let prescriptionRequired = false;
    if (requiresPrescription !== undefined && requiresPrescription !== null) {
      if (typeof requiresPrescription !== 'boolean') {
        return NextResponse.json({ 
          error: "requiresPrescription must be a boolean",
          code: "INVALID_PRESCRIPTION_FLAG" 
        }, { status: 400 });
      }
      prescriptionRequired = requiresPrescription;
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData = {
      name: name.trim(),
      brand: brand.trim(),
      saltComposition: saltComposition.trim(),
      category: category.trim(),
      unit: unit.trim(),
      price: numericPrice,
      description: description ? description.trim() : null,
      manufacturer: manufacturer ? manufacturer.trim() : null,
      requiresPrescription: prescriptionRequired,
      imageUrl: imageUrl ? imageUrl.trim() : null,
      createdAt: now,
      updatedAt: now,
    };

    const newMedicine = await db.insert(medicines)
      .values(insertData)
      .returning();

    return NextResponse.json(newMedicine[0], { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if medicine exists
    const existing = await db.select()
      .from(medicines)
      .where(eq(medicines.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Medicine not found',
        code: "MEDICINE_NOT_FOUND" 
      }, { status: 404 });
    }

    const body = await request.json();
    const updates: any = {};

    // Update fields if provided
    if (body.name !== undefined) {
      if (!body.name || !body.name.trim()) {
        return NextResponse.json({ 
          error: "Name cannot be empty",
          code: "INVALID_NAME" 
        }, { status: 400 });
      }
      updates.name = body.name.trim();
    }

    if (body.brand !== undefined) {
      if (!body.brand || !body.brand.trim()) {
        return NextResponse.json({ 
          error: "Brand cannot be empty",
          code: "INVALID_BRAND" 
        }, { status: 400 });
      }
      updates.brand = body.brand.trim();
    }

    if (body.saltComposition !== undefined) {
      if (!body.saltComposition || !body.saltComposition.trim()) {
        return NextResponse.json({ 
          error: "Salt composition cannot be empty",
          code: "INVALID_SALT_COMPOSITION" 
        }, { status: 400 });
      }
      updates.saltComposition = body.saltComposition.trim();
    }

    if (body.category !== undefined) {
      if (!body.category || !body.category.trim()) {
        return NextResponse.json({ 
          error: "Category cannot be empty",
          code: "INVALID_CATEGORY" 
        }, { status: 400 });
      }
      if (!VALID_CATEGORIES.includes(body.category.trim())) {
        return NextResponse.json({ 
          error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`,
          code: "INVALID_CATEGORY" 
        }, { status: 400 });
      }
      updates.category = body.category.trim();
    }

    if (body.unit !== undefined) {
      if (!body.unit || !body.unit.trim()) {
        return NextResponse.json({ 
          error: "Unit cannot be empty",
          code: "INVALID_UNIT" 
        }, { status: 400 });
      }
      updates.unit = body.unit.trim();
    }

    if (body.price !== undefined) {
      const numericPrice = parseFloat(body.price);
      if (isNaN(numericPrice) || numericPrice <= 0) {
        return NextResponse.json({ 
          error: "Price must be a positive number",
          code: "INVALID_PRICE" 
        }, { status: 400 });
      }
      updates.price = numericPrice;
    }

    if (body.description !== undefined) {
      updates.description = body.description ? body.description.trim() : null;
    }

    if (body.manufacturer !== undefined) {
      updates.manufacturer = body.manufacturer ? body.manufacturer.trim() : null;
    }

    if (body.requiresPrescription !== undefined) {
      if (typeof body.requiresPrescription !== 'boolean') {
        return NextResponse.json({ 
          error: "requiresPrescription must be a boolean",
          code: "INVALID_PRESCRIPTION_FLAG" 
        }, { status: 400 });
      }
      updates.requiresPrescription = body.requiresPrescription;
    }

    if (body.imageUrl !== undefined) {
      updates.imageUrl = body.imageUrl ? body.imageUrl.trim() : null;
    }

    // Always update timestamp
    updates.updatedAt = new Date().toISOString();

    const updated = await db.update(medicines)
      .set(updates)
      .where(eq(medicines.id, parseInt(id)))
      .returning();

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if medicine exists
    const existing = await db.select()
      .from(medicines)
      .where(eq(medicines.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ 
        error: 'Medicine not found',
        code: "MEDICINE_NOT_FOUND" 
      }, { status: 404 });
    }

    const deleted = await db.delete(medicines)
      .where(eq(medicines.id, parseInt(id)))
      .returning();

    return NextResponse.json({ 
      message: 'Medicine deleted successfully',
      medicine: deleted[0]
    }, { status: 200 });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}