import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate';

const router = Router();

// Validation middleware
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 8 }),
  body('firstName').isString().trim().notEmpty(),
  body('lastName').isString().trim().notEmpty(),
  body('phone').optional().isString(),
  body('role').isIn(['ADMIN', 'DISPATCHER', 'DRIVER']),
  validate,
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isString().notEmpty(),
  validate,
];

const refreshTokenValidation = [
  body('refreshToken').isString().notEmpty(),
  validate,
];

const changePasswordValidation = [
  body('currentPassword').isString().notEmpty(),
  body('newPassword').isString().isLength({ min: 8 }),
  validate,
];

// Public routes
router.post('/register', registerValidation, authController.register.bind(authController));
router.post('/login', loginValidation, authController.login.bind(authController));
router.post('/refresh', refreshTokenValidation, authController.refreshToken.bind(authController));

// Protected routes
router.get('/me', authenticate, authController.getMe.bind(authController));
router.post('/change-password', authenticate, changePasswordValidation, authController.changePassword.bind(authController));
router.post('/logout', authenticate, authController.logout.bind(authController));

export default router;
