import { Request, Response } from 'express';
import { authService } from './auth.service';
import { LoginRequest, RegisterRequest, RefreshTokenRequest, ChangePasswordRequest } from '../../types/auth.types';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const data: RegisterRequest = req.body;

      const result = await authService.register(data);

      return res.status(201).json(result);
    } catch (error) {
      return res.status(400).json({
        error: 'Registration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const data: LoginRequest = req.body;

      const result = await authService.login(data);

      return res.status(200).json(result);
    } catch (error) {
      return res.status(401).json({
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken }: RefreshTokenRequest = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Refresh token is required',
        });
      }

      const tokens = await authService.refreshToken(refreshToken);

      return res.status(200).json(tokens);
    } catch (error) {
      return res.status(401).json({
        error: 'Token refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async changePassword(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const { currentPassword, newPassword }: ChangePasswordRequest = req.body;

      await authService.changePassword(req.user.id, currentPassword, newPassword);

      return res.status(200).json({
        message: 'Password changed successfully',
      });
    } catch (error) {
      return res.status(400).json({
        error: 'Password change failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getMe(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      const user = await authService.getMe(req.user.id);

      return res.status(200).json(user);
    } catch (error) {
      return res.status(404).json({
        error: 'User not found',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async logout(_req: Request, res: Response) {
    // For JWT-based auth, logout is handled client-side by removing the token
    // This endpoint is here for API consistency and future token blacklisting
    return res.status(200).json({
      message: 'Logged out successfully',
    });
  }
}

export const authController = new AuthController();
