import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { medicines } from '@/db/schema';
import { eq, ne, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const medicineIdParam = searchParams.get('medicineId');
    const saltCompositionParam = searchParams.get('saltComposition');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 50);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Validate that at least one parameter is provided
    if (!medicineIdParam && !saltCompositionParam) {
      return NextResponse.json(
        { 
          error: 'Either medicineId or saltComposition parameter is required',
          code: 'MISSING_REQUIRED_PARAMETER'
        },
        { status: 400 }
      );
    }

    let saltComposition: string;
    let originalMedicine: any = null;
    let excludeMedicineId: number | null = null;

    // If medicineId is provided, fetch the original medicine first
    if (medicineIdParam) {
      const medicineId = parseInt(medicineIdParam);

      // Validate medicineId is a valid integer
      if (isNaN(medicineId)) {
        return NextResponse.json(
          { 
            error: 'Valid medicine ID is required',
            code: 'INVALID_MEDICINE_ID'
          },
          { status: 400 }
        );
      }

      // Fetch the original medicine to get its salt composition
      const medicineResult = await db.select()
        .from(medicines)
        .where(eq(medicines.id, medicineId))
        .limit(1);

      if (medicineResult.length === 0) {
        return NextResponse.json(
          { 
            error: 'Medicine not found',
            code: 'MEDICINE_NOT_FOUND'
          },
          { status: 404 }
        );
      }

      originalMedicine = medicineResult[0];
      saltComposition = originalMedicine.saltComposition;
      excludeMedicineId = medicineId;
    } else {
      // Use the provided salt composition
      saltComposition = saltCompositionParam!;
    }

    // Query for alternative medicines with matching salt composition
    let query = db.select()
      .from(medicines)
      .where(eq(medicines.saltComposition, saltComposition));

    // Exclude the original medicine if medicineId was provided
    if (excludeMedicineId !== null) {
      query = db.select()
        .from(medicines)
        .where(
          and(
            eq(medicines.saltComposition, saltComposition),
            ne(medicines.id, excludeMedicineId)
          )
        );
    }

    // Execute query with ordering and pagination
    const alternatives = await query
      .orderBy(medicines.price)
      .limit(limit)
      .offset(offset);

    // Get total count of alternatives (excluding original medicine if applicable)
    let countQuery = db.select()
      .from(medicines)
      .where(eq(medicines.saltComposition, saltComposition));

    if (excludeMedicineId !== null) {
      countQuery = db.select()
        .from(medicines)
        .where(
          and(
            eq(medicines.saltComposition, saltComposition),
            ne(medicines.id, excludeMedicineId)
          )
        );
    }

    const countResult = await countQuery;
    const count = countResult.length;

    // Build response object
    const response: any = {
      alternatives,
      saltComposition,
      count
    };

    // Include original medicine if medicineId was provided
    if (originalMedicine) {
      response.originalMedicine = originalMedicine;
    }

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + error.message 
      },
      { status: 500 }
    );
  }
}