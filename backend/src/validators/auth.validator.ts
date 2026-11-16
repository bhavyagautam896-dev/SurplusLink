import { z } from 'zod';

export const registerDonorSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.literal('DONOR'),
  organizationName: z.string().min(2, 'Organization name is required'),
  contactPhone: z.string().min(7, 'Valid contact phone is required'),
  address: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
});

export const registerNgoSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.literal('NGO'),
  organizationName: z.string().min(2, 'Organization name is required'),
  contactPhone: z.string().min(7, 'Valid contact phone is required'),
  address: z.string().min(3, 'Address is required'),
  city: z.string().min(2, 'City is required'),
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  capacityKg: z.number().positive('Capacity must be greater than 0'),
  serviceRadiusKm: z.number().positive('Service radius must be greater than 0'),
  isAccepting: z.boolean().optional().default(true),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type RegisterDonorInput = z.infer<typeof registerDonorSchema>;
export type RegisterNgoInput = z.infer<typeof registerNgoSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
