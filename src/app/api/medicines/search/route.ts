import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { medicines } from '@/db/schema';
import { like, and, or, gte, lte, eq, desc, asc, sql, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Extract and validate parameters
    const q = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const requiresPrescription = searchParams.get('requiresPrescription');
    const sortBy = searchParams.get('sortBy') || 'name';
    const order = searchParams.get('order') || 'asc';
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Validate sortBy parameter
    const validSortFields = ['price', 'name', 'createdAt'];
    if (!validSortFields.includes(sortBy)) {
      return NextResponse.json({
        error: 'Invalid sortBy parameter. Must be one of: price, name, createdAt',
        code: 'INVALID_SORT_FIELD'
      }, { status: 400 });
    }

    // Validate order parameter
    if (order !== 'asc' && order !== 'desc') {
      return NextResponse.json({
        error: 'Invalid order parameter. Must be either asc or desc',
        code: 'INVALID_ORDER'
      }, { status: 400 });
    }

    // Validate category parameter
    const validCategories = ['prescription', 'otc', 'supplement', 'device', 'first_aid', 'baby_care', 'personal_care'];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json({
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
        code: 'INVALID_CATEGORY'
      }, { status: 400 });
    }

    // Validate price range
    if (minPrice && isNaN(parseFloat(minPrice))) {
      return NextResponse.json({
        error: 'Invalid minPrice parameter. Must be a valid number',
        code: 'INVALID_MIN_PRICE'
      }, { status: 400 });
    }

    if (maxPrice && isNaN(parseFloat(maxPrice))) {
      return NextResponse.json({
        error: 'Invalid maxPrice parameter. Must be a valid number',
        code: 'INVALID_MAX_PRICE'
      }, { status: 400 });
    }

    if (minPrice && maxPrice && parseFloat(minPrice) > parseFloat(maxPrice)) {
      return NextResponse.json({
        error: 'minPrice cannot be greater than maxPrice',
        code: 'INVALID_PRICE_RANGE'
      }, { status: 400 });
    }

    // Validate requiresPrescription parameter
    if (requiresPrescription && requiresPrescription !== 'true' && requiresPrescription !== 'false') {
      return NextResponse.json({
        error: 'Invalid requiresPrescription parameter. Must be either true or false',
        code: 'INVALID_PRESCRIPTION_FILTER'
      }, { status: 400 });
    }

    // Build filter conditions
    const conditions = [];

    // Search across name, brand, and saltComposition
    if (q.trim()) {
      conditions.push(
        or(
          like(medicines.name, `%${q}%`),
          like(medicines.brand, `%${q}%`),
          like(medicines.saltComposition, `%${q}%`)
        )
      );
    }

    // Category filter
    if (category) {
      conditions.push(eq(medicines.category, category));
    }

    // Price range filters
    if (minPrice) {
      conditions.push(gte(medicines.price, parseFloat(minPrice)));
    }
    if (maxPrice) {
      conditions.push(lte(medicines.price, parseFloat(maxPrice)));
    }

    // Prescription requirement filter
    if (requiresPrescription) {
      conditions.push(eq(medicines.requiresPrescription, requiresPrescription === 'true'));
    }

    // Combine all conditions with AND
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    // Determine sort order
    const orderByClause = order === 'desc' 
      ? desc(medicines[sortBy as keyof typeof medicines])
      : asc(medicines[sortBy as keyof typeof medicines]);

    // Execute query for results
    let query = db.select().from(medicines);
    
    if (whereCondition) {
      query = query.where(whereCondition);
    }

    const results = await query
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    // Get total count
    let countQuery = db.select({ count: count() }).from(medicines);
    
    if (whereCondition) {
      countQuery = countQuery.where(whereCondition);
    }

    const [{ count: totalCount }] = await countQuery;

    // Return response
    return NextResponse.json({
      results,
      count: totalCount,
      limit,
      offset
    }, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error'),
      code: 'INTERNAL_SERVER_ERROR'
    }, { status: 500 });
  }
}