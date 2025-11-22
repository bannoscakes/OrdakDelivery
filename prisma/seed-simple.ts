import { PrismaClient, OrderType, OrderStatus, DriverStatus, VehicleType, VehicleStatus, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('Clearing existing data...');
  await prisma.order.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.deliveryRun.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.vehicle.deleteMany({});
  await prisma.user.deleteMany({});
  console.log('✓ Cleared existing data');

  // Create admin user
  console.log('Creating admin user...');
  const passwordHash = await bcrypt.hash('password123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ordak.com',
      passwordHash,
      role: UserRole.admin,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+14165551111',
    },
  });
  console.log('✓ Created admin user (admin@ordak.com / password123)');

  // Create drivers
  console.log('Creating drivers...');
  const driver1User = await prisma.user.create({
    data: {
      email: 'driver1@ordak.com',
      passwordHash,
      role: UserRole.driver,
      firstName: 'John',
      lastName: 'Driver',
      phone: '+14165552222',
      driver: {
        create: {
          driverLicense: 'DL123456',
          licenseExpiry: new Date('2026-12-31'),
          status: DriverStatus.available,
        },
      },
    },
    include: { driver: true },
  });

  const driver2User = await prisma.user.create({
    data: {
      email: 'driver2@ordak.com',
      passwordHash,
      role: UserRole.driver,
      firstName: 'Jane',
      lastName: 'Driver',
      phone: '+14165553333',
      driver: {
        create: {
          driverLicense: 'DL789012',
          licenseExpiry: new Date('2027-12-31'),
          status: DriverStatus.available,
        },
      },
    },
    include: { driver: true },
  });
  console.log('✓ Created 2 drivers');

  // Create vehicles
  console.log('Creating vehicles...');
  const vehicle1 = await prisma.vehicle.create({
    data: {
      licensePlate: 'ABC-1234',
      make: 'Ford',
      model: 'Transit',
      year: 2022,
      type: VehicleType.VAN,
      status: VehicleStatus.active,
      capacityKg: 1000,
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      licensePlate: 'XYZ-5678',
      make: 'Mercedes',
      model: 'Sprinter',
      year: 2023,
      type: VehicleType.VAN,
      status: VehicleStatus.active,
      capacityKg: 1200,
    },
  });
  console.log('✓ Created 2 vehicles');

  // Create customers with addresses
  console.log('Creating customers...');
  const customer1 = await prisma.customer.create({
    data: {
      email: 'customer1@example.com',
      phone: '+14165554444',
      firstName: 'Alice',
      lastName: 'Smith',
      addresses: {
        create: {
          line1: '123 King St W',
          city: 'Toronto',
          stateProvince: 'ON',
          postalCode: 'M5H 1A1',
          country: 'CA',
          isDefault: true,
        },
      },
    },
    include: { addresses: true },
  });

  const customer2 = await prisma.customer.create({
    data: {
      email: 'customer2@example.com',
      phone: '+14165555555',
      firstName: 'Bob',
      lastName: 'Johnson',
      addresses: {
        create: {
          line1: '456 Queen St E',
          city: 'Toronto',
          stateProvince: 'ON',
          postalCode: 'M5A 1R6',
          country: 'CA',
          isDefault: true,
        },
      },
    },
    include: { addresses: true },
  });
  console.log('✓ Created 2 customers');

  // Create orders
  console.log('Creating orders...');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  await prisma.order.create({
    data: {
      orderNumber: 'ORD-001',
      externalSource: 'MANUAL',
      type: OrderType.delivery,
      status: OrderStatus.PENDING,
      customerId: customer1.id,
      deliveryAddressId: customer1.addresses[0].id,
      scheduledDate: tomorrow,
      specialInstructions: 'Please call upon arrival',
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: 'ORD-002',
      externalSource: 'MANUAL',
      type: OrderType.delivery,
      status: OrderStatus.PENDING,
      customerId: customer2.id,
      deliveryAddressId: customer2.addresses[0].id,
      scheduledDate: tomorrow,
    },
  });
  console.log('✓ Created 2 orders');

  console.log('\n✅ Seed completed successfully!');
  console.log('\nTest credentials:');
  console.log('  Admin: admin@ordak.com / password123');
  console.log('  Driver 1: driver1@ordak.com / password123');
  console.log('  Driver 2: driver2@ordak.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
