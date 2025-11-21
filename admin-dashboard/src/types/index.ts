// API Types based on backend audit

export const OrderStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const OrderType = {
  DELIVERY: 'DELIVERY',
  PICKUP: 'PICKUP',
} as const;

export type OrderType = typeof OrderType[keyof typeof OrderType];

export const RunStatus = {
  DRAFT: 'DRAFT',
  PLANNED: 'PLANNED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

export type RunStatus = typeof RunStatus[keyof typeof RunStatus];

export const DriverStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  ON_LEAVE: 'ON_LEAVE',
} as const;

export type DriverStatus = typeof DriverStatus[keyof typeof DriverStatus];

export const VehicleType = {
  CAR: 'CAR',
  VAN: 'VAN',
  TRUCK: 'TRUCK',
  BIKE: 'BIKE',
  MOTORCYCLE: 'MOTORCYCLE',
} as const;

export type VehicleType = typeof VehicleType[keyof typeof VehicleType];

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country?: string;
  latitude?: number;
  longitude?: number;
}

export interface Customer {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
}

export interface OrderItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  price: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  customer: Customer;
  address: Address;
  scheduledDate: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  items: OrderItem[];
  notes?: string;
  specialInstructions?: string;
  deliveryRunId?: string;
  sequenceInRun?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Driver {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber?: string;
  status: DriverStatus;
  startTime?: string;
  endTime?: string;
  traccarDeviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Vehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  type?: VehicleType;
  capacityKg?: number;
  capacityCubicM?: number;
  status: 'active' | 'maintenance' | 'retired';
  createdAt: string;
  updatedAt: string;
}

export interface DeliveryRun {
  id: string;
  name: string;
  status: RunStatus;
  scheduledDate: string;
  startTime?: string;
  endTime?: string;
  driverId?: string;
  driver?: Driver;
  vehicleId?: string;
  vehicle?: Vehicle;
  orders?: Order[];
  optimizedRoute?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export interface ApiError {
  status: string;
  statusCode: number;
  message: string;
}

// Form types for creating/updating entities
export interface CreateOrderInput {
  orderNumber: string;
  type: OrderType;
  customer: Customer;
  address: Omit<Address, 'latitude' | 'longitude'>;
  scheduledDate: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  items: Omit<OrderItem, 'id'>[];
  notes?: string;
  specialInstructions?: string;
}

export interface UpdateOrderInput {
  status?: OrderStatus;
  scheduledDate?: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  notes?: string;
  specialInstructions?: string;
}

export interface CreateDriverInput {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber?: string;
  startTime?: string;
  endTime?: string;
  traccarDeviceId?: string;
}

export interface UpdateDriverInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  licenseNumber?: string;
  status?: DriverStatus;
  startTime?: string;
  endTime?: string;
  traccarDeviceId?: string;
}

export interface CreateVehicleInput {
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  type?: VehicleType;
  capacityKg?: number;
  capacityCubicM?: number;
}

export interface UpdateVehicleInput {
  make?: string;
  model?: string;
  year?: number;
  type?: VehicleType;
  capacityKg?: number;
  capacityCubicM?: number;
  status?: 'active' | 'maintenance' | 'retired';
}

export interface CreateDeliveryRunInput {
  name: string;
  scheduledDate: string;
  driverId?: string;
  vehicleId?: string;
  orderIds?: string[];
}

export interface UpdateDeliveryRunInput {
  name?: string;
  status?: RunStatus;
  driverId?: string;
  vehicleId?: string;
  startTime?: string;
  endTime?: string;
}

export interface AssignOrdersInput {
  orderIds: string[];
}

export interface OptimizeRunInput {
  startLocation: [number, number]; // [longitude, latitude]
  endLocation?: [number, number];
}
