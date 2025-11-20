/**
 * Type definitions for Fleet Service
 */

export interface AvailableDriver {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  isAvailable: boolean;
  currentRunId?: string;
  currentRunNumber?: string;
}

export interface AvailableVehicle {
  id: string;
  name: string;
  licensePlate: string;
  type: string;
  capacityKg: number;
  capacityCubicM: number;
  isAvailable: boolean;
  currentRunId?: string;
  currentRunNumber?: string;
}

export interface AvailabilityCheckResult {
  availableDrivers: AvailableDriver[];
  availableVehicles: AvailableVehicle[];
  totalDrivers: number;
  totalVehicles: number;
}

export interface DriverSchedule {
  driverId: string;
  driverName: string;
  date: Date;
  runs: ScheduledRun[];
  totalOrders: number;
  totalDuration: number;
  totalDistance: number;
}

export interface ScheduledRun {
  runId: string;
  runNumber: string;
  status: string;
  orderCount: number;
  estimatedDuration: number;
  estimatedDistance: number;
}

export interface VehicleUtilization {
  vehicleId: string;
  vehicleName: string;
  date: Date;
  runs: ScheduledRun[];
  totalOrders: number;
  utilizationPercent: number;
  capacityUsedKg: number;
  capacityTotalKg: number;
}

export interface FleetStats {
  date: Date;
  totalDrivers: number;
  activeDrivers: number;
  availableDrivers: number;
  totalVehicles: number;
  availableVehicles: number;
  totalRuns: number;
  driverUtilizationPercent: number;
  vehicleUtilizationPercent: number;
}
