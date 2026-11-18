import { describe, it, expect, beforeAll } from 'vitest';
import { createListingSchema } from '../src/validators/listing.validator.js';
import { query } from '../src/database/db.js';
import { claimService } from '../src/services/claim.service.js';

describe('Invalid-Case and Validation Testing', () => {
  let ngoId: string;

  beforeAll(async () => {
    const ngoRes = await query('SELECT id FROM ngos LIMIT 1');
    ngoId = ngoRes.rows[0].id;
  });

  it('rejects listing with past safe-until time', () => {
    const pastTime = new Date(Date.now() - 3600 * 1000).toISOString();
    const result = createListingSchema.safeParse({
      foodType: 'Bread',
      description: 'Leftover rolls',
      quantityKg: 10,
      latitude: 21.1458,
      longitude: 79.0882,
      safeUntil: pastTime,
    });
    expect(result.success).toBe(false);
  });

  it('rejects listing with quantity equal to 0', () => {
    const futureTime = new Date(Date.now() + 3600 * 1000).toISOString();
    const result = createListingSchema.safeParse({
      foodType: 'Bread',
      description: 'Leftover rolls',
      quantityKg: 0,
      latitude: 21.1458,
      longitude: 79.0882,
      safeUntil: futureTime,
    });
    expect(result.success).toBe(false);
  });

  it('rejects listing with negative quantity', () => {
    const futureTime = new Date(Date.now() + 3600 * 1000).toISOString();
    const result = createListingSchema.safeParse({
      foodType: 'Curry',
      description: 'Vegetable curry',
      quantityKg: -15,
      latitude: 21.1458,
      longitude: 79.0882,
      safeUntil: futureTime,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid latitude (> 90) and invalid longitude (< -180)', () => {
    const futureTime = new Date(Date.now() + 3600 * 1000).toISOString();
    const badLat = createListingSchema.safeParse({
      foodType: 'Rice',
      description: 'Steamed rice',
      quantityKg: 10,
      latitude: 95.5,
      longitude: 79.0882,
      safeUntil: futureTime,
    });
    expect(badLat.success).toBe(false);

    const badLon = createListingSchema.safeParse({
      foodType: 'Rice',
      description: 'Steamed rice',
      quantityKg: 10,
      latitude: 21.1458,
      longitude: -195.0,
      safeUntil: futureTime,
    });
    expect(badLon.success).toBe(false);
  });

  it('rejects claim for non-existent listing ID', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    await expect(
      claimService.claimListing(nonExistentId, ngoId)
    ).rejects.toThrow(/Listing not found/i);
  });
});

