import { prisma } from '../../lib/prisma';
import { hashPassword, comparePassword, validatePasswordStrength } from '../../utils/password.util';
import { generateTokenPair, verifyRefreshToken } from '../../utils/jwt.util';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  AuthUser,
  TokenPair,
} from '../../types/auth.types';

export class AuthService {
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    // Validate password strength
    const passwordValidation = validatePasswordStrength(data.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);

    // Create user
    // Security: Always default new registrations to DRIVER role to prevent privilege escalation
    // Admins and dispatchers should be created through admin-only user management endpoints
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'DRIVER', // Security: ignore client-supplied role, default to lowest privilege
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    // Note: Driver records should be created separately via the Drivers API
    // and then linked to users. We don't auto-create drivers here.

    // Generate tokens
    const tokens = generateTokenPair(user.id, user.email, user.role);

    return {
      user: user as AuthUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Your account has been deactivated');
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate tokens
    const tokens = generateTokenPair(user.id, user.email, user.role);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword as AuthUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('Account has been deactivated');
    }

    // Generate new token pair
    return generateTokenPair(user.id, user.email, user.role);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });
  }

  async getMe(userId: string): Promise<AuthUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user as AuthUser;
  }
}

export const authService = new AuthService();
