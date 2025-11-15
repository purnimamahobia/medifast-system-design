import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { inventory, pharmacies, medicines } from '@/db/schema';
import { eq, and, gt } from 'drizzle-orm';

// Haversine formula to calculate distance between two coordinates (in km)
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Required parameter: medicineId
    const medicineIdParam = searchParams.get('medicineId');
    if (!medicineIdParam) {
      return NextResponse.json(
        {
          error: 'medicineId is required',
          code: 'MISSING_MEDICINE_ID',
        },
        { status: 400 }
      );
    }

    const medicineId = parseInt(medicineIdParam);
    if (isNaN(medicineId) || medicineId <= 0) {
      return NextResponse.json(
        {
          error: 'Valid medicineId is required',
          code: 'INVALID_MEDICINE_ID',
        },
        { status: 400 }
      );
    }

    // Optional parameters: location and radius
    const latParam = searchParams.get('latitude');
    const lonParam = searchParams.get('longitude');
    const radiusParam = searchParams.get('radius');
    const limitParam = searchParams.get('limit');

    let userLatitude: number | null = null;
    let userLongitude: number | null = null;
    let radius = 20; // default 20km
    let limit = 20; // default 20 pharmacies

    // Validate location parameters
    if (latParam || lonParam) {
      if (!latParam || !lonParam) {
        return NextResponse.json(
          {
            error: 'Both latitude and longitude are required for location-based search',
            code: 'INCOMPLETE_LOCATION',
          },
          { status: 400 }
        );
      }

      userLatitude = parseFloat(latParam);
      userLongitude = parseFloat(lonParam);

      if (
        isNaN(userLatitude) ||
        isNaN(userLongitude) ||
        userLatitude < -90 ||
        userLatitude > 90 ||
        userLongitude < -180 ||
        userLongitude > 180
      ) {
        return NextResponse.json(
          {
            error: 'Invalid latitude or longitude values',
            code: 'INVALID_LOCATION',
          },
          { status: 400 }
        );
      }
    }

    // Validate radius
    if (radiusParam) {
      radius = parseFloat(radiusParam);
      if (isNaN(radius) || radius <= 0) {
        return NextResponse.json(
          {
            error: 'Valid radius is required (in km)',
            code: 'INVALID_RADIUS',
          },
          { status: 400 }
        );
      }
    }

    // Validate limit
    if (limitParam) {
      limit = parseInt(limitParam);
      if (isNaN(limit) || limit <= 0) {
        return NextResponse.json(
          {
            error: 'Valid limit is required',
            code: 'INVALID_LIMIT',
          },
          { status: 400 }
        );
      }
      limit = Math.min(limit, 100); // max 100
    }

    // First, check if medicine exists
    const medicineRecord = await db
      .select()
      .from(medicines)
      .where(eq(medicines.id, medicineId))
      .limit(1);

    if (medicineRecord.length === 0) {
      return NextResponse.json(
        {
          error: 'Medicine not found',
          code: 'MEDICINE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const medicine = medicineRecord[0];

    // Query inventory with joins to pharmacies and medicines
    // Filter: isAvailable = true, quantity > 0, pharmacies.isActive = true
    const inventoryRecords = await db
      .select({
        inventoryId: inventory.id,
        pharmacyId: inventory.pharmacyId,
        medicineId: inventory.medicineId,
        quantity: inventory.quantity,
        price: inventory.price,
        discountPercentage: inventory.discountPercentage,
        isAvailable: inventory.isAvailable,
        lastUpdated: inventory.lastUpdated,
        pharmacyName: pharmacies.pharmacyName,
        address: pharmacies.address,
        latitude: pharmacies.latitude,
        longitude: pharmacies.longitude,
        phone: pharmacies.phone,
        rating: pharmacies.rating,
        isActive: pharmacies.isActive,
      })
      .from(inventory)
      .innerJoin(pharmacies, eq(inventory.pharmacyId, pharmacies.id))
      .where(
        and(
          eq(inventory.medicineId, medicineId),
          eq(inventory.isAvailable, true),
          gt(inventory.quantity, 0),
          eq(pharmacies.isActive, true)
        )
      );

    // Process results: calculate distance and final price
    interface PharmacyAvailability {
      pharmacyId: number;
      pharmacyName: string;
      address: string;
      phone: string;
      latitude: number;
      longitude: number;
      rating: number;
      quantity: number;
      price: number;
      discountPercentage: number;
      finalPrice: number;
      distance?: number;
      lastUpdated: string;
    }

    let availability: PharmacyAvailability[] = inventoryRecords.map(
      (record) => {
        const finalPrice =
          record.price - (record.price * (record.discountPercentage || 0)) / 100;

        const item: PharmacyAvailability = {
          pharmacyId: record.pharmacyId,
          pharmacyName: record.pharmacyName,
          address: record.address,
          phone: record.phone,
          latitude: record.latitude,
          longitude: record.longitude,
          rating: record.rating || 0,
          quantity: record.quantity,
          price: record.price,
          discountPercentage: record.discountPercentage || 0,
          finalPrice: parseFloat(finalPrice.toFixed(2)),
          lastUpdated: record.lastUpdated,
        };

        // Calculate distance if user location provided
        if (userLatitude !== null && userLongitude !== null) {
          const distance = calculateDistance(
            userLatitude,
            userLongitude,
            record.latitude,
            record.longitude
          );
          item.distance = parseFloat(distance.toFixed(2));
        }

        return item;
      }
    );

    // Filter by radius if location provided
    if (userLatitude !== null && userLongitude !== null) {
      availability = availability.filter(
        (item) => item.distance !== undefined && item.distance <= radius
      );

      // Sort by distance (ascending)
      availability.sort((a, b) => (a.distance || 0) - (b.distance || 0));
    } else {
      // Sort by price (ascending)
      availability.sort((a, b) => a.finalPrice - b.finalPrice);
    }

    // Apply limit
    const totalPharmacies = availability.length;
    availability = availability.slice(0, limit);

    // Build response
    const response: any = {
      medicine: {
        id: medicine.id,
        name: medicine.name,
        brand: medicine.brand,
        saltComposition: medicine.saltComposition,
        category: medicine.category,
        description: medicine.description,
        manufacturer: medicine.manufacturer,
        unit: medicine.unit,
        price: medicine.price,
        requiresPrescription: medicine.requiresPrescription,
        imageUrl: medicine.imageUrl,
      },
      availability,
      totalPharmacies,
    };

    // Include user location if provided
    if (userLatitude !== null && userLongitude !== null) {
      response.userLocation = {
        latitude: userLatitude,
        longitude: userLongitude,
        radius,
      };
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}