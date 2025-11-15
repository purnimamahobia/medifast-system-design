import { db } from '@/db';
import { orders } from '@/db/schema';

async function main() {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const sampleOrders = [
        {
            userId: 1,
            pharmacyId: 1,
            orderNumber: 'ORD-2024-0001',
            status: 'delivered',
            totalAmount: 45.99,
            deliveryFee: 3.50,
            deliveryAddress: '123 Main St, Apt 4B, New York, NY 10001',
            deliveryLatitude: 40.7128,
            deliveryLongitude: -74.0060,
            estimatedDeliveryTime: 35,
            prescriptionRequired: 1,
            prescriptionVerified: 1,
            createdAt: twoDaysAgo.toISOString(),
            updatedAt: oneDayAgo.toISOString(),
        },
        {
            userId: 2,
            pharmacyId: 2,
            orderNumber: 'ORD-2024-0002',
            status: 'out_for_delivery',
            totalAmount: 28.75,
            deliveryFee: 2.00,
            deliveryAddress: '789 Oak Avenue, Brooklyn, NY 11201',
            deliveryLatitude: 40.7280,
            deliveryLongitude: -73.9900,
            estimatedDeliveryTime: 25,
            prescriptionRequired: 0,
            prescriptionVerified: 0,
            createdAt: twoHoursAgo.toISOString(),
            updatedAt: thirtyMinutesAgo.toISOString(),
        },
        {
            userId: 1,
            pharmacyId: 3,
            orderNumber: 'ORD-2024-0003',
            status: 'pending',
            totalAmount: 67.50,
            deliveryFee: 5.00,
            deliveryAddress: '123 Main St, Apt 4B, New York, NY 10001',
            deliveryLatitude: 40.7128,
            deliveryLongitude: -74.0060,
            estimatedDeliveryTime: 40,
            prescriptionRequired: 1,
            prescriptionVerified: 0,
            createdAt: fifteenMinutesAgo.toISOString(),
            updatedAt: fifteenMinutesAgo.toISOString(),
        },
    ];

    await db.insert(orders).values(sampleOrders);
    
    console.log('✅ Orders seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});