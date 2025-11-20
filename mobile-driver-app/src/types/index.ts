// Common Types
export type Status = 'PENDING' | 'CONFIRMED' | 'ASSIGNED' | 'IN_PROGRESS' | 'DELIVERED' | 'FAILED' | 'CANCELLED';
export type RunStatus = 'DRAFT' | 'PLANNED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type VehicleType = 'CAR' | 'VAN' | 'TRUCK' | 'BIKE' | 'MOTORCYCLE';
export type DriverStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE';

// User & Authentication
export interface Driver {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber: string;
  status: DriverStatus;
  startTime: string;
  endTime: string;
  traccarDeviceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  driver: Driver | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Address & Location
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location extends Coordinates {
  timestamp: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
}

// Customer
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
}

// Order Item
export interface OrderItem {
  id: string;
  sku: string;
  name: string;
  quantity: number;
  price: string;
}

// Order
export interface Order {
  id: string;
  orderNumber: string;
  type: 'DELIVERY' | 'PICKUP';
  status: Status;
  customer: Customer;
  address: Address;
  location?: Coordinates;
  scheduledDate: string;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  items: OrderItem[];
  notes?: string;
  specialInstructions?: string;
  deliveryRunId?: string;
  sequenceNumber?: number;
  estimatedArrival?: string;
  actualArrival?: string;
  completedAt?: string;
  proofOfDelivery?: ProofOfDelivery;
  createdAt: string;
  updatedAt: string;
}

// Proof of Delivery
export interface ProofOfDelivery {
  signature?: string;
  photos?: string[];
  notes?: string;
  recipientName?: string;
  timestamp: string;
}

// Vehicle
export interface Vehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  type: VehicleType;
  maxWeight?: number;
  maxVolume?: number;
  maxStops?: number;
  isActive: boolean;
}

// Delivery Run
export interface DeliveryRun {
  id: string;
  runNumber: string; // Auto-generated unique identifier (e.g., "RUN-20251120-001")
  name: string; // Human-readable name (e.g., "Route 1 - Downtown")
  status: RunStatus;
  scheduledDate: string;
  driver: Driver;
  vehicle: Vehicle;
  orders: Order[];
  optimizedRoute?: GeoJSON.LineString; // GeoJSON geometry of optimized route
  totalDistanceKm?: number; // Distance in kilometers
  estimatedDurationMinutes?: number; // Duration in minutes
  actualStartTime?: string;
  actualEndTime?: string;
  startLocation?: Coordinates;
  totalOrders: number;
  deliveredOrders: number;
  failedOrders: number;
  createdAt: string;
  updatedAt: string;
}

// Navigation
export interface RouteStep {
  instruction: string;
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
}

export interface NavigationState {
  currentRun?: DeliveryRun;
  currentOrderIndex: number;
  isNavigating: boolean;
  currentLocation?: Location;
  nextStop?: Order;
  remainingDistance?: number;
  remainingDuration?: number;
  eta?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  status: 'error';
  statusCode: number;
  message: string;
  errors?: Array<{
    path: string;
    message: string;
  }>;
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

// Notification
export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'run_assigned' | 'order_updated' | 'system';
  data?: any;
  read: boolean;
  createdAt: string;
}

// Settings
export interface AppSettings {
  notifications: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
  };
  location: {
    backgroundTracking: boolean;
    updateInterval: number;
  };
  offline: {
    enabled: boolean;
    autoSync: boolean;
  };
  theme: 'light' | 'dark' | 'auto';
}

// Store States
export interface RootStore {
  auth: AuthState;
  runs: DeliveryRun[];
  currentRun: DeliveryRun | null;
  navigation: NavigationState;
  settings: AppSettings;
  notifications: Notification[];
  isOnline: boolean;
}
