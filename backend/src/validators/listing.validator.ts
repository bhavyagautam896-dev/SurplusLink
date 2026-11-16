import { z } from 'zod';

export const createListingSchema = z.object({
  foodType: z.string().min(2, 'Food type is required'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  quantityKg: z.number().positive('Quantity must be greater than 0'),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  safeUntil: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date.getTime() > Date.now();
  }, {
    message: 'Safe-until time must be a valid future timestamp',
  }),
  pickupInstructions: z.string().optional().nullable(),
});

export const updateListingSchema = z.object({
  foodType: z.string().min(2).optional(),
  description: z.string().min(5).optional(),
  quantityKg: z.number().positive().optional(),
  safeUntil: z.string().refine((val) => {
    const date = new Date(val);
    return !isNaN(date.getTime()) && date.getTime() > Date.now();
  }, {
    message: 'Safe-until time must be a valid future timestamp',
  }).optional(),
  pickupInstructions: z.string().optional().nullable(),
});

export const nearbyListingsQuerySchema = z.object({
  radiusKm: z.coerce.number().positive().optional(),
  foodType: z.string().optional(),
  minQuantity: z.coerce.number().positive().optional(),
  maxQuantity: z.coerce.number().positive().optional(),
  sortBy: z.enum(['urgency', 'distance', 'earliestSafeUntil', 'quantity']).optional().default('urgency'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
export type UpdateListingInput = z.infer<typeof updateListingSchema>;
export type NearbyListingsQuery = z.infer<typeof nearbyListingsQuerySchema>;
