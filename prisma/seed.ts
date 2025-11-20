import { PrismaClient, OrderType, OrderStatus, DriverStatus, VehicleType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create customers
  console.log('Creating customers...');
  const customer1 = await prisma.customer.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      phone: '+14165551234',
      firstName: 'John',
      lastName: 'Doe',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { email: 'jane.smith@example.com' },
    update: {},
    create: {
      email: 'jane.smith@example.com',
      phone: '+14165555678',
      firstName: 'Jane',
      lastName: 'Smith',
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { email: 'bob.johnson@example.com' },
    update: {},
    create: {
      email: 'bob.johnson@example.com',
      phone: '+14165559012',
      firstName: 'Bob',
      lastName: 'Johnson',
    },
  });

  console.log('✓ Created 3 customers');

  // Create drivers
  console.log('Creating drivers...');
  const driver1 = await prisma.driver.upsert({
    where: { email: 'driver1@ordak.com' },
    update: {},
    create: {
      email: 'driver1@ordak.com',
      firstName: 'Mike',
      lastName: 'Wilson',
      phone: '+14165551111',
      licenseNumber: 'D1234567',
      status: DriverStatus.ACTIVE,
      startTime: '08:00',
      endTime: '17:00',
    },
  });

  const driver2 = await prisma.driver.upsert({
    where: { email: 'driver2@ordak.com' },
    update: {},
    create: {
      email: 'driver2@ordak.com',
      firstName: 'Sarah',
      lastName: 'Davis',
      phone: '+14165552222',
      licenseNumber: 'D7654321',
      status: DriverStatus.ACTIVE,
      startTime: '09:00',
      endTime: '18:00',
    },
  });

  console.log('✓ Created 2 drivers');

  // Create vehicles
  console.log('Creating vehicles...');
  const vehicle1 = await prisma.vehicle.upsert({
    where: { licensePlate: 'ABC-1234' },
    update: {},
    create: {
      licensePlate: 'ABC-1234',
      make: 'Ford',
      model: 'Transit',
      year: 2022,
      type: VehicleType.van,
      maxWeight: 1000,
      maxVolume: 15,
      maxStops: 30,
      isActive: true,
    },
  });

  const vehicle2 = await prisma.vehicle.upsert({
    where: { licensePlate: 'XYZ-5678' },
    update: {},
    create: {
      licensePlate: 'XYZ-5678',
      make: 'Toyota',
      model: 'Sienna',
      year: 2021,
      type: VehicleType.van,
      maxWeight: 800,
      maxVolume: 12,
      maxStops: 25,
      isActive: true,
    },
  });

  console.log('✓ Created 2 vehicles');

  // Create sample orders
  console.log('Creating sample orders...');

  // Toronto addresses (sample - these would normally be geocoded)
  const addresses = [
    {
      line1: '123 King St W',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5H 1A1',
      customerId: customer1.id,
    },
    {
      line1: '456 Queen St E',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5A 1S1',
      customerId: customer2.id,
    },
    {
      line1: '789 Yonge St',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M4Y 1Y5',
      customerId: customer3.id,
    },
    {
      line1: '321 Bloor St W',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5S 1W1',
      customerId: customer1.id,
    },
    {
      line1: '654 Spadina Ave',
      city: 'Toronto',
      province: 'ON',
      postalCode: 'M5S 2H1',
      customerId: customer2.id,
    },
  ];

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < addresses.length; i++) {
    const addr = addresses[i];
    if (!addr) continue;

    const scheduledDate = new Date(tomorrow);
    const timeWindowStart = new Date(tomorrow);
    timeWindowStart.setUTCHours(9 + i * 2, 0, 0, 0);

    const timeWindowEnd = new Date(timeWindowStart);
    timeWindowEnd.setUTCHours(timeWindowEnd.getUTCHours() + 2);

    await prisma.order.upsert({
      where: { orderNumber: `ORD-SEED-${i + 1}` },
      update: {},
      create: {
        orderNumber: `ORD-SEED-${i + 1}`,
        type: OrderType.delivery,
        status: OrderStatus.PENDING,
        customerId: addr.customerId,
        addressLine1: addr.line1,
        city: addr.city,
        province: addr.province,
        postalCode: addr.postalCode,
        country: 'CA',
        scheduledDate,
        timeWindowStart,
        timeWindowEnd,
        items: [
          {
            sku: `ITEM-${i + 1}`,
            name: `Product ${i + 1}`,
            quantity: 1 + i,
            price: (19.99 + i * 10).toFixed(2),
          },
        ],
        notes: i === 0 ? 'Please call upon arrival' : undefined,
      },
    });
  }

  console.log('✓ Created 5 sample orders');

  // Create a sample delivery run
  console.log('Creating sample delivery run...');
  const existingRun = await prisma.deliveryRun.findFirst({
    where: { name: 'Sample Run - Tomorrow' },
  });

  if (!existingRun) {
    const run = await prisma.deliveryRun.create({
      data: {
        name: 'Sample Run - Tomorrow',
        scheduledDate: tomorrow,
        driverId: driver1.id,
        vehicleId: vehicle1.id,
        status: 'DRAFT',
      },
    });

    console.log('✓ Created sample delivery run');
  } else {
    console.log('✓ Sample delivery run already exists');
  }

  console.log('');
  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log('  - 3 customers');
  console.log('  - 2 drivers (Mike Wilson, Sarah Davis)');
  console.log('  - 2 vehicles (Ford Transit, Toyota Sienna)');
  console.log('  - 5 orders scheduled for tomorrow');
  console.log('  - 1 delivery run (draft)');
  console.log('');
  console.log('🚀 You can now:');
  console.log('  1. View orders: GET /api/v1/orders');
  console.log('  2. Geocode addresses by creating orders via API');
  console.log('  3. Assign orders to the sample run');
  console.log('  4. Optimize the delivery run');
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
