/**
 * Type definitions for Dispatch Service
 */

export interface AutoAssignResult {
  totalOrders: number;
  assignedOrders: number;
  outOfBoundsOrders: number;
  assignmentsByZone: ZoneAssignment[];
}

export interface ZoneAssignment {
  zoneId: string;
  zoneName: string;
  orderCount: number;
  orderIds: string[];
}

export interface DraftRunsResult {
  totalZones: number;
  runsCreated: number;
  runs: RunSummary[];
}

export interface RunSummary {
  runId: string;
  runNumber: string;
  zoneId: string;
  zoneName: string;
  orderCount: number;
}

export interface ZoneBalanceCheck {
  zoneId: string;
  zoneName: string;
  orderCount: number;
  targetDriverCount: number;
  ordersPerDriver: number;
  status: 'balanced' | 'overloaded' | 'underutilized';
  recommendation?: string;
}

export interface RebalanceResult {
  totalZones: number;
  zonesRebalanced: number;
  ordersMoved: number;
  changes: RebalanceChange[];
}

export interface RebalanceChange {
  orderId: string;
  orderNumber: string;
  fromZone: string;
  toZone: string;
  reason: string;
}

export interface DriverVehicleAssignment {
  runId: string;
  driverId: string;
  vehicleId: string;
}

export interface BulkAssignResult {
  totalAssignments: number;
  successfulAssignments: number;
  failedAssignments: number;
  results: AssignmentResult[];
}

export interface AssignmentResult {
  runId: string;
  runNumber: string;
  driverId?: string;
  vehicleId?: string;
  success: boolean;
  error?: string;
}

export interface FinalizeRunResult {
  runId: string;
  runNumber: string;
  orderCount: number;
  customersSmsed: number;
  driverNotified: boolean;
  estimatedDuration: number;
  estimatedDistance: number;
}

export interface FinalizeAllResult {
  totalRuns: number;
  finalizedRuns: number;
  totalOrders: number;
  totalSms: number;
  failures: FinalizeFailure[];
}

export interface FinalizeFailure {
  runId: string;
  runNumber: string;
  error: string;
}

export interface DispatchJobInput {
  type: 'auto_assign_zones' | 'create_draft_runs' | 'rebalance_zones' | 'finalize_all_runs' | 'send_bulk_sms';
  scheduledDate: Date;
  parameters?: Record<string, any>;
  createdBy?: string;
}
