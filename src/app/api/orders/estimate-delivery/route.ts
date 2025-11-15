import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pharmacies } from '@/db/schema';
import { eq } from 'drizzle-orm';

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function calculateTravelTime(distance: number): number {
  if (distance <= 2) return 10;
  if (distance <= 5) return 20;
  if (distance <= 10) return 35;
  if (distance <= 20) return 60;
  return 90;
}

function calculateDeliveryFee(distance: number): number {
  if (distance <= 2) return 2.00;
  if (distance <= 5) return 3.50;
  if (distance <= 10) return 5.00;
  if (distance <= 20) return 7.50;
  return 10.00;
}

function validateLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

function validateLongitude(lon: number): boolean {
  return lon >= -180 && lon <= 180;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pharmacyId, deliveryLatitude, deliveryLongitude } = body;

    // Validate required fields
    if (!pharmacyId) {
      return NextResponse.json({
        error: "pharmacyId is required",
        code: "MISSING_PHARMACY_ID"
      }, { status: 400 });
    }

    if (deliveryLatitude === undefined || deliveryLatitude === null) {
      return NextResponse.json({
        error: "deliveryLatitude is required",
        code: "MISSING_DELIVERY_LATITUDE"
      }, { status: 400 });
    }

    if (deliveryLongitude === undefined || deliveryLongitude === null) {
      return NextResponse.json({
        error: "deliveryLongitude is required",
        code: "MISSING_DELIVERY_LONGITUDE"
      }, { status: 400 });
    }

    // Validate pharmacyId is a valid number
    const parsedPharmacyId = parseInt(pharmacyId);
    if (isNaN(parsedPharmacyId)) {
      return NextResponse.json({
        error: "pharmacyId must be a valid number",
        code: "INVALID_PHARMACY_ID"
      }, { status: 400 });
    }

    // Validate latitude and longitude ranges
    const deliveryLat = parseFloat(deliveryLatitude);
    const deliveryLon = parseFloat(deliveryLongitude);

    if (isNaN(deliveryLat) || !validateLatitude(deliveryLat)) {
      return NextResponse.json({
        error: "deliveryLatitude must be between -90 and 90",
        code: "INVALID_LATITUDE"
      }, { status: 400 });
    }

    if (isNaN(deliveryLon) || !validateLongitude(deliveryLon)) {
      return NextResponse.json({
        error: "deliveryLongitude must be between -180 and 180",
        code: "INVALID_LONGITUDE"
      }, { status: 400 });
    }

    // Fetch pharmacy details
    const pharmacy = await db.select()
      .from(pharmacies)
      .where(eq(pharmacies.id, parsedPharmacyId))
      .limit(1);

    if (pharmacy.length === 0) {
      return NextResponse.json({
        error: "Pharmacy not found",
        code: "PHARMACY_NOT_FOUND"
      }, { status: 404 });
    }

    const pharmacyData = pharmacy[0];

    // Validate pharmacy has coordinates
    if (!pharmacyData.latitude || !pharmacyData.longitude) {
      return NextResponse.json({
        error: "Pharmacy coordinates not available",
        code: "PHARMACY_COORDINATES_MISSING"
      }, { status: 400 });
    }

    // Calculate distance using Haversine formula
    const distance = calculateDistance(
      pharmacyData.latitude,
      pharmacyData.longitude,
      deliveryLat,
      deliveryLon
    );

    // Calculate delivery time components
    const preparationTime = 15;
    const travelTime = calculateTravelTime(distance);
    const bufferTime = 5;
    const estimatedDeliveryTime = preparationTime + travelTime + bufferTime;

    // Calculate delivery fee
    const deliveryFee = calculateDeliveryFee(distance);

    // Calculate estimated delivery timestamp
    const now = new Date();
    const estimatedDeliveryDate = new Date(now.getTime() + estimatedDeliveryTime * 60000);
    const estimatedDeliveryAt = estimatedDeliveryDate.toISOString();

    // Build response
    const response = {
      pharmacyId: pharmacyData.id,
      pharmacyName: pharmacyData.pharmacyName,
      pharmacyAddress: pharmacyData.address,
      pharmacyLocation: {
        latitude: pharmacyData.latitude,
        longitude: pharmacyData.longitude
      },
      deliveryLocation: {
        latitude: deliveryLat,
        longitude: deliveryLon
      },
      distance,
      estimatedDeliveryTime,
      breakdown: {
        preparationTime,
        travelTime,
        bufferTime
      },
      deliveryFee,
      estimatedDeliveryAt
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}