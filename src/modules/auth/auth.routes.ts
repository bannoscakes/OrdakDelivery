import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { body } from 'express-validator';
import { validate } from '../../middleware/validate';

const router = Router();

// Validation middleware
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password')
    .isString()
    .isLength({ min: 8 })
    .matches(/[A-Z]/, 'g').withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'g').withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/, 'g').withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'g').withMessage('Password must contain at least one special character'),
  body('firstName').isString().trim().notEmpty(),
  body('lastName').isString().trim().notEmpty(),
  body('phone').optional().isString(),
  // Security: role field removed - new users always get DRIVER role
  // Privileged roles must be assigned through admin-only user management
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
  body('newPassword')
    .isString()
    .isLength({ min: 8 })
    .matches(/[A-Z]/, 'g').withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'g').withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/, 'g').withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, 'g').withMessage('Password must contain at least one special character'),
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
