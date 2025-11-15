import prisma from '@config/database';

/**
 * Get IDs of resources (drivers or vehicles) that are busy on a specific date
 * @param date - The date to check availability for
 * @param resourceType - 'driver' or 'vehicle'
 * @returns Array of busy resource IDs
 */
export const getBusyResourceIds = async (
  date: Date,
  resourceType: 'driver' | 'vehicle'
): Promise<string[]> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const runsWithResources = await prisma.deliveryRun.findMany({
    where: {
      scheduledDate: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    select: {
      driverId: resourceType === 'driver',
      vehicleId: resourceType === 'vehicle',
    },
  });

  const busyIds = runsWithResources
    .map((run) => (resourceType === 'driver' ? run.driverId : run.vehicleId))
    .filter((id): id is string => id !== null);

  return busyIds;
};
