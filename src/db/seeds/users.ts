import { db } from '@/db';
import { users } from '@/db/schema';

async function main() {
    const sampleUsers = [
        {
            name: 'John Smith',
            email: 'john.smith@email.com',
            phone: '+1-555-0123',
            role: 'customer',
            address: '123 Main St, Apt 4B, New York, NY 10001',
            latitude: 40.7128,
            longitude: -74.0060,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Sarah Johnson',
            email: 'sarah.johnson@email.com',
            phone: '+1-555-0124',
            role: 'customer',
            address: '456 Broadway Ave, Suite 12, New York, NY 10002',
            latitude: 40.7223,
            longitude: -73.9897,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Mike Chen',
            email: 'mike.chen@email.com',
            phone: '+1-555-0125',
            role: 'pharmacy',
            address: '789 Park Ave, Floor 2, New York, NY 10003',
            latitude: 40.7358,
            longitude: -73.9831,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'Emily Rodriguez',
            email: 'emily.rodriguez@email.com',
            phone: '+1-555-0126',
            role: 'pharmacy',
            address: '321 Madison St, Unit 5, New York, NY 10004',
            latitude: 40.7089,
            longitude: -74.0012,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        {
            name: 'David Kumar',
            email: 'david.kumar@email.com',
            phone: '+1-555-0127',
            role: 'delivery',
            address: '654 Fifth Ave, Apt 8C, New York, NY 10005',
            latitude: 40.7484,
            longitude: -73.9857,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }
    ];

    await db.insert(users).values(sampleUsers);
    
    console.log('✅ Users seeder completed successfully');
}

main().catch((error) => {
    console.error('❌ Seeder failed:', error);
});