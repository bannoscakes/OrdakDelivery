import { Request, Response } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import geocodingService from './geocoding.service';
import { z } from 'zod';

const forwardGeocodeSchema = z.object({
  body: z.object({
    address: z.string().min(1, 'Address is required'),
    country: z.string().length(2).optional(),
  }),
});

const reverseGeocodeSchema = z.object({
  body: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
});

export const forwardGeocode = asyncHandler(async (req: Request, res: Response) => {
  const { address, country } = forwardGeocodeSchema.parse({ body: req.body }).body;

  const result = await geocodingService.geocodeAddress(address, { country });

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const reverseGeocode = asyncHandler(async (req: Request, res: Response) => {
  const { latitude, longitude } = reverseGeocodeSchema.parse({ body: req.body }).body;

  const result = await geocodingService.reverseGeocode({ latitude, longitude });

  res.status(200).json({
    success: true,
    data: result,
  });
});
