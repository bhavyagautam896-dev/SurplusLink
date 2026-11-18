import { z } from 'zod';

export const claimListingParamsSchema = z.object({
  id: z.string().uuid('Invalid listing ID format'),
});

export const updateClaimStatusParamsSchema = z.object({
  id: z.string().uuid('Invalid claim ID format'),
});

export type ClaimListingParams = z.infer<typeof claimListingParamsSchema>;
export type UpdateClaimStatusParams = z.infer<typeof updateClaimStatusParamsSchema>;

