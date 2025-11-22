import { Request, Response } from 'express';
import { authService } from './auth.service';
import { LoginRequest, RegisterRequest, RefreshTokenRequest, ChangePasswordRequest } from '../../types/auth.types';

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const data: RegisterRequest = req.body;

      const result = await authService.register(data);

      // Set HttpOnly cookies for tokens
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return user data without tokens
      return res.status(201).json({ user: result.user });
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

      // Set HttpOnly cookies for tokens
      res.cookie('accessToken', result.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return user data without tokens
      return res.status(200).json({ user: result.user });
    } catch (error) {
      return res.status(401).json({
        error: 'Login failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      // Get refresh token from cookie
      const refreshToken = req.cookies.refreshToken;

      if (!refreshToken) {
        return res.status(400).json({
          error: 'Bad request',
          message: 'Refresh token is required',
        });
      }

      const tokens = await authService.refreshToken(refreshToken);

      // Set new HttpOnly cookies
      res.cookie('accessToken', tokens.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return res.status(200).json({ message: 'Token refreshed successfully' });
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
    // Clear HttpOnly cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({
      message: 'Logged out successfully',
    });
  }
}

export const authController = new AuthController();
