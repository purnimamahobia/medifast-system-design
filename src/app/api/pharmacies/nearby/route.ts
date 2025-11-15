import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pharmacies } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Haversine formula to calculate distance between two coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Required parameters: latitude and longitude
    const latitudeParam = searchParams.get('latitude');
    const longitudeParam = searchParams.get('longitude');
    
    if (!latitudeParam || !longitudeParam) {
      return NextResponse.json(
        {
          error: 'Latitude and longitude are required parameters',
          code: 'MISSING_COORDINATES',
        },
        { status: 400 }
      );
    }
    
    const userLatitude = parseFloat(latitudeParam);
    const userLongitude = parseFloat(longitudeParam);
    
    // Validate latitude range
    if (isNaN(userLatitude) || userLatitude < -90 || userLatitude > 90) {
      return NextResponse.json(
        {
          error: 'Latitude must be a valid number between -90 and 90',
          code: 'INVALID_LATITUDE',
        },
        { status: 400 }
      );
    }
    
    // Validate longitude range
    if (isNaN(userLongitude) || userLongitude < -180 || userLongitude > 180) {
      return NextResponse.json(
        {
          error: 'Longitude must be a valid number between -180 and 180',
          code: 'INVALID_LONGITUDE',
        },
        { status: 400 }
      );
    }
    
    // Optional parameters
    const radiusParam = searchParams.get('radius');
    const radius = radiusParam ? parseFloat(radiusParam) : 10;
    
    if (isNaN(radius) || radius <= 0 || radius > 50) {
      return NextResponse.json(
        {
          error: 'Radius must be a positive number not exceeding 50 km',
          code: 'INVALID_RADIUS',
        },
        { status: 400 }
      );
    }
    
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(parseInt(limitParam), 50) : 10;
    
    if (isNaN(limit) || limit <= 0) {
      return NextResponse.json(
        {
          error: 'Limit must be a positive number',
          code: 'INVALID_LIMIT',
        },
        { status: 400 }
      );
    }
    
    const isActiveParam = searchParams.get('isActive');
    const isActiveFilter = isActiveParam === 'false' ? false : true;
    
    // Fetch pharmacies from database with isActive filter
    let query = db.select().from(pharmacies);
    
    if (isActiveFilter) {
      query = query.where(eq(pharmacies.isActive, true));
    }
    
    const allPharmacies = await query;
    
    // Calculate distance for each pharmacy and filter by radius
    const pharmaciesWithDistance = allPharmacies
      .map((pharmacy) => {
        const distance = calculateDistance(
          userLatitude,
          userLongitude,
          pharmacy.latitude,
          pharmacy.longitude
        );
        
        return {
          ...pharmacy,
          distance,
          distanceUnit: 'km',
        };
      })
      .filter((pharmacy) => pharmacy.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
    
    return NextResponse.json(
      {
        pharmacies: pharmaciesWithDistance,
        userLocation: {
          latitude: userLatitude,
          longitude: userLongitude,
        },
        radius,
        count: pharmaciesWithDistance.length,
      },
      { status: 200 }
    );
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