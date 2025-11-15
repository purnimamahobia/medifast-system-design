import { db } from '@/db';
import { pharmacies } from '@/db/schema';

async function main() {
    const samplePharmacies = [
        {
            userId: 3,
            pharmacyName: 'HealthPlus Pharmacy',
            licenseNumber: 'PHR-2024-001',
            address: '456 Broadway, New York, NY 10013',
            latitude: 40.7199,
            longitude: -74.0030,
            phone: '+1-555-1001',
            email: 'contact@healthplus.com',
            openingTime: '09:00',
            closingTime: '21:00',
            isActive: 1,
            rating: 4.5,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            userId: 4,
            pharmacyName: 'CareWell Pharmacy',
            licenseNumber: 'PHR-2024-002',
            address: '789 5th Avenue, New York, NY 10022',
            latitude: 40.7614,
            longitude: -73.9776,
            phone: '+1-555-1002',
            email: 'info@carewell.com',
            openingTime: '08:00',
            closingTime: '22:00',
            isActive: 1,
            rating: 4.7,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            userId: 3,
            pharmacyName: 'MediQuick Pharmacy',
            licenseNumber: 'PHR-2024-003',
            address: '321 Park Ave, New York, NY 10016',
            latitude: 40.7454,
            longitude: -73.9797,
            phone: '+1-555-1003',
            email: 'support@mediquick.com',
            openingTime: '09:00',
            closingTime: '21:00',
            isActive: 1,
            rating: 4.2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
    ];

    await db.insert(pharmacies).values(samplePharmacies);
    
    console.log('✅ Pharmacies seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});