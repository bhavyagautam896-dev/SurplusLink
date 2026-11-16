import { describe, it, expect } from 'vitest';
import { query } from '../src/database/db.js';
import { analyticsService } from '../src/services/analytics.service.js';

describe('Matching-Rate Evaluation on Seeded Dataset', () => {
  it('calculates matching rate on 200 listings with verified numerator and denominator', async () => {
    const overview = await analyticsService.getOverview();
    const matchingStats = await analyticsService.getMatchingStats();

    const totalListingsRes = await query<{ count: string }>(
      `SELECT COUNT(*)::INTEGER AS count FROM listings WHERE status != 'CANCELLED'`
    );
    const denominator = parseInt(totalListingsRes.rows[0].count, 10);

    const numerator = matchingStats.claimedCount + matchingStats.completedCount + matchingStats.openMatchedCount;
    const computedPercentage = Math.round((numerator / denominator) * 1000) / 10;

    console.log('\n--- MATCHING RATE EVALUATION REPORT ---');
    console.log(`Total Non-Cancelled Listings (Denominator): ${denominator}`);
    console.log(`Eligible / Rescued Listings (Numerator):    ${numerator}`);
    console.log(`  - Completed Pickups:                     ${matchingStats.completedCount}`);
    console.log(`  - Currently Claimed / In Transit:         ${matchingStats.claimedCount}`);
    console.log(`  - Open with >= 1 Eligible NGO:           ${matchingStats.openMatchedCount}`);
    console.log(`  - Open Unmatched Hotspots:               ${matchingStats.openUnmatchedCount}`);
    console.log(`Overall Matching Rate:                     ${computedPercentage}%`);
    console.log('---------------------------------------\n');

    expect(denominator).toBeGreaterThanOrEqual(200);
    expect(computedPercentage).toBeGreaterThanOrEqual(70); // Seeded rate ~80.5%
    expect(overview.matchingRatePercentage).toBeGreaterThanOrEqual(70);
  });
});
