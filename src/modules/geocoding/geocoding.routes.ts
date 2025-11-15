import { Router } from 'express';
import * as geocodingController from './geocoding.controller';

const router = Router();

/**
 * @route   POST /api/v1/geocoding/forward
 * @desc    Geocode an address to coordinates
 * @access  Private
 */
router.post('/forward', geocodingController.forwardGeocode);

/**
 * @route   POST /api/v1/geocoding/reverse
 * @desc    Reverse geocode coordinates to address
 * @access  Private
 */
router.post('/reverse', geocodingController.reverseGeocode);

export default router;
