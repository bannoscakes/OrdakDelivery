import { UserRole } from '@prisma/client';

/**
 * Request to create a new user (Admin only)
 * Used for creating ADMIN and DISPATCHER users
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
}

/**
 * Response when creating a user
 */
export interface CreateUserResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    createdAt: Date;
  };
}

/**
 * Request to update user
 */
export interface UpdateUserRequest {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * List users query parameters
 */
export interface ListUsersQuery {
  role?: UserRole;
  isActive?: boolean;
  page?: number;
  limit?: number;
}
