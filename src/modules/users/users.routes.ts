import { Router } from 'express';
import * as usersController from './users.controller';
import { authenticate, requireAdmin } from '@/middleware/auth.middleware';
import { body } from 'express-validator';
import { validate } from '@/middleware/validate';

const router = Router();

// All user management routes require authentication
router.use(authenticate);

// Validation middleware
const createUserValidation = [
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
  body('role').isIn(['ADMIN', 'DISPATCHER', 'DRIVER']).withMessage('Role must be ADMIN, DISPATCHER, or DRIVER'),
  validate,
];

const updateUserValidation = [
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().isString().trim().notEmpty(),
  body('lastName').optional().isString().trim().notEmpty(),
  body('phone').optional().isString(),
  body('role').optional().isIn(['ADMIN', 'DISPATCHER', 'DRIVER']),
  body('isActive').optional().isBoolean(),
  validate,
];

/**
 * @route   POST /api/v1/users
 * @desc    Create a new user (ADMIN only)
 * @access  Admin
 */
router.post('/', requireAdmin, createUserValidation, usersController.createUser);

/**
 * @route   GET /api/v1/users
 * @desc    List users with filters and pagination
 * @access  Admin
 */
router.get('/', requireAdmin, usersController.listUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user by ID
 * @access  Admin
 */
router.get('/:id', requireAdmin, usersController.getUser);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Update user
 * @access  Admin
 */
router.put('/:id', requireAdmin, updateUserValidation, usersController.updateUser);

/**
 * @route   DELETE /api/v1/users/:id
 * @desc    Delete user
 * @access  Admin
 */
router.delete('/:id', requireAdmin, usersController.deleteUser);

export default router;
