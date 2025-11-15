import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { delivery, orders, users, pharmacies } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Helper function to calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

// Helper function to calculate ETA (5 minutes per km average city speed)
function calculateETA(distanceKm: number): number {
  return Math.ceil(distanceKm * 5); // Returns minutes
}

// Helper function to calculate progress percentage
function calculateProgress(
  pharmacyLat: number, 
  pharmacyLon: number, 
  currentLat: number | null, 
  currentLon: number | null, 
  destLat: number, 
  destLon: number
): number {
  if (!currentLat || !currentLon) return 0;
  
  const totalDistance = calculateDistance(pharmacyLat, pharmacyLon, destLat, destLon);
  const remainingDistance = calculateDistance(currentLat, currentLon, destLat, destLon);
  
  if (totalDistance === 0) return 100;
  
  const progress = ((totalDistance - remainingDistance) / totalDistance) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get('orderId');
    const orderNumber = searchParams.get('orderNumber');

    // Validate that at least one parameter is provided
    if (!orderId && !orderNumber) {
      return NextResponse.json(
        { 
          error: 'Either orderId or orderNumber parameter is required',
          code: 'MISSING_REQUIRED_PARAMETER'
        },
        { status: 400 }
      );
    }

    // Fetch order details
    let orderQuery = db.select().from(orders);
    
    if (orderId) {
      const parsedOrderId = parseInt(orderId);
      if (isNaN(parsedOrderId)) {
        return NextResponse.json(
          { 
            error: 'Invalid orderId format',
            code: 'INVALID_ORDER_ID'
          },
          { status: 400 }
        );
      }
      orderQuery = orderQuery.where(eq(orders.id, parsedOrderId));
    } else if (orderNumber) {
      orderQuery = orderQuery.where(eq(orders.orderNumber, orderNumber));
    }

    const orderResult = await orderQuery.limit(1);

    if (orderResult.length === 0) {
      return NextResponse.json(
        { 
          error: 'Order not found',
          code: 'ORDER_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const order = orderResult[0];

    // Fetch delivery details
    const deliveryResult = await db.select()
      .from(delivery)
      .where(eq(delivery.orderId, order.id))
      .limit(1);

    if (deliveryResult.length === 0) {
      return NextResponse.json(
        { 
          error: 'Delivery record not found for this order',
          code: 'DELIVERY_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const deliveryRecord = deliveryResult[0];

    // Fetch pharmacy details
    const pharmacyResult = await db.select()
      .from(pharmacies)
      .where(eq(pharmacies.id, order.pharmacyId))
      .limit(1);

    if (pharmacyResult.length === 0) {
      return NextResponse.json(
        { 
          error: 'Pharmacy not found',
          code: 'PHARMACY_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const pharmacy = pharmacyResult[0];

    // Fetch delivery person details (if assigned)
    let deliveryPerson = null;
    if (deliveryRecord.deliveryPersonId) {
      const deliveryPersonResult = await db.select()
        .from(users)
        .where(eq(users.id, deliveryRecord.deliveryPersonId))
        .limit(1);

      if (deliveryPersonResult.length > 0) {
        deliveryPerson = deliveryPersonResult[0];
      }
    }

    // Calculate tracking information
    let currentDistance = null;
    let estimatedTimeRemaining = null;
    let progressPercentage = 0;
    let estimatedDeliveryTime = null;

    // Use delivery destination coordinates from order
    const destLat = order.deliveryLatitude;
    const destLon = order.deliveryLongitude;

    if (destLat && destLon) {
      // If delivery person has current location
      if (deliveryRecord.currentLatitude && deliveryRecord.currentLongitude) {
        currentDistance = calculateDistance(
          deliveryRecord.currentLatitude,
          deliveryRecord.currentLongitude,
          destLat,
          destLon
        );
        estimatedTimeRemaining = calculateETA(currentDistance);
        
        progressPercentage = calculateProgress(
          pharmacy.latitude,
          pharmacy.longitude,
          deliveryRecord.currentLatitude,
          deliveryRecord.currentLongitude,
          destLat,
          destLon
        );

        // Calculate estimated delivery time
        const now = new Date();
        estimatedDeliveryTime = new Date(now.getTime() + estimatedTimeRemaining * 60000).toISOString();
      } 
      // Use pharmacy location as starting point if no current location
      else if (deliveryRecord.status === 'assigned' || deliveryRecord.status === 'accepted') {
        currentDistance = calculateDistance(
          pharmacy.latitude,
          pharmacy.longitude,
          destLat,
          destLon
        );
        estimatedTimeRemaining = calculateETA(currentDistance);
        progressPercentage = 0;

        const now = new Date();
        estimatedDeliveryTime = new Date(now.getTime() + estimatedTimeRemaining * 60000).toISOString();
      }
      // If picked up but no current location, estimate based on pharmacy distance
      else if (deliveryRecord.status === 'picked_up' || deliveryRecord.status === 'on_the_way') {
        currentDistance = calculateDistance(
          pharmacy.latitude,
          pharmacy.longitude,
          destLat,
          destLon
        );
        estimatedTimeRemaining = calculateETA(currentDistance);
        
        // Estimate some progress has been made
        const timeSincePickup = deliveryRecord.pickedUpAt 
          ? (new Date().getTime() - new Date(deliveryRecord.pickedUpAt).getTime()) / 60000 
          : 0;
        
        progressPercentage = Math.min(50, Math.round((timeSincePickup / estimatedTimeRemaining) * 100));

        const now = new Date();
        estimatedDeliveryTime = new Date(now.getTime() + estimatedTimeRemaining * 60000).toISOString();
      }
      // If delivered, set progress to 100%
      else if (deliveryRecord.status === 'delivered') {
        currentDistance = 0;
        estimatedTimeRemaining = 0;
        progressPercentage = 100;
        estimatedDeliveryTime = deliveryRecord.deliveredAt;
      }
    }

    // Build response object
    const response = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      deliveryStatus: deliveryRecord.status,
      orderStatus: order.status,
      timeline: {
        orderPlaced: order.createdAt,
        deliveryAssigned: deliveryRecord.assignedAt,
        pickedUp: deliveryRecord.pickedUpAt,
        estimatedDelivery: estimatedDeliveryTime,
        delivered: deliveryRecord.deliveredAt
      },
      pharmacy: {
        id: pharmacy.id,
        name: pharmacy.pharmacyName,
        address: pharmacy.address,
        location: {
          latitude: pharmacy.latitude,
          longitude: pharmacy.longitude
        }
      },
      deliveryDestination: {
        address: order.deliveryAddress,
        location: destLat && destLon ? {
          latitude: destLat,
          longitude: destLon
        } : null
      },
      deliveryPerson: deliveryPerson ? {
        id: deliveryPerson.id,
        name: deliveryPerson.name,
        phone: deliveryPerson.phone,
        currentLocation: deliveryRecord.currentLatitude && deliveryRecord.currentLongitude ? {
          latitude: deliveryRecord.currentLatitude,
          longitude: deliveryRecord.currentLongitude
        } : null
      } : null,
      tracking: {
        currentDistance: currentDistance,
        estimatedTimeRemaining: estimatedTimeRemaining,
        progressPercentage: progressPercentage
      },
      notes: deliveryRecord.notes
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET delivery tracking error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
      },
      { status: 500 }
    );
  }
}