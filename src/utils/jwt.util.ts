import jwt from 'jsonwebtoken';
import { JWTPayload, TokenPair } from '../types/auth.types';
import { UserRole } from '@prisma/client';

// Security: JWT secrets are required - fail fast if not configured
if (!process.env['JWT_ACCESS_SECRET']) {
  throw new Error('JWT_ACCESS_SECRET environment variable is required');
}
if (!process.env['JWT_REFRESH_SECRET']) {
  throw new Error('JWT_REFRESH_SECRET environment variable is required');
}

const ACCESS_TOKEN_SECRET = process.env['JWT_ACCESS_SECRET'];
const REFRESH_TOKEN_SECRET = process.env['JWT_REFRESH_SECRET'];

const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

export const generateAccessToken = (userId: string, email: string, role: UserRole): string => {
  const payload: JWTPayload = {
    userId,
    email,
    role,
    type: 'access',
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
};

export const generateRefreshToken = (userId: string, email: string, role: UserRole): string => {
  const payload: JWTPayload = {
    userId,
    email,
    role,
    type: 'refresh',
  };

  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
};

export const generateTokenPair = (userId: string, email: string, role: UserRole): TokenPair => {
  return {
    accessToken: generateAccessToken(userId, email, role),
    refreshToken: generateRefreshToken(userId, email, role),
  };
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as JWTPayload;

    if (payload.type !== 'access') {
      throw new Error('Invalid token type');
    }

    return payload;
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const payload = jwt.verify(token, REFRESH_TOKEN_SECRET) as JWTPayload;

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    return payload;
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};
