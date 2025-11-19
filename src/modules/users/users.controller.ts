import { Request, Response } from 'express';
import { usersService } from './users.service';
import logger from '../../config/logger';
import { CreateUserRequest, UpdateUserRequest, ListUsersQuery } from '../../types/users.types';

/**
 * Create a new user (Admin only)
 */
export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const data: CreateUserRequest = req.body;
    const result = await usersService.createUser(data);

    logger.info('User created', { userId: result.user.id, role: result.user.role, createdBy: req.user?.id });

    res.status(201).json(result);
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(400).json({
      error: 'Failed to create user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * List users with filters and pagination
 */
export async function listUsers(req: Request, res: Response): Promise<void> {
  try {
    const query: ListUsersQuery = {
      role: req.query['role'] as any,
      isActive: req.query['isActive'] === 'true' ? true : req.query['isActive'] === 'false' ? false : undefined,
      page: req.query['page'] ? parseInt(req.query['page'] as string, 10) : undefined,
      limit: req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined,
    };

    const result = await usersService.listUsers(query);

    logger.debug('Users listed', { count: result.data.length, query });

    res.json(result);
  } catch (error) {
    logger.error('Error listing users:', error);
    res.status(500).json({
      error: 'Failed to list users',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get user by ID
 */
export async function getUser(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id']!;
    const user = await usersService.getUserById(id);

    res.json(user);
  } catch (error) {
    logger.error('Error getting user:', error);
    res.status(404).json({
      error: 'User not found',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Update user
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id']!;
    const data: UpdateUserRequest = req.body;

    const user = await usersService.updateUser(id, data);

    logger.info('User updated', { userId: id, updatedBy: req.user?.id });

    res.json(user);
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(400).json({
      error: 'Failed to update user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Delete user
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params['id']!;
    await usersService.deleteUser(id);

    logger.info('User deleted', { userId: id, deletedBy: req.user?.id });

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(400).json({
      error: 'Failed to delete user',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
