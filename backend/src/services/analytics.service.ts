import { query } from '../database/db.js';
import { listingRepository } from '../repositories/listing.repository.js';
import { OverviewMetrics, HotspotCluster } from '../types/index.js';
import { config } from '../config/env.js';

export class AnalyticsService {
  /**
   * Retrieves high-level KPI metrics computed from live database records.
   */
  async getOverview(): Promise<OverviewMetrics> {
    const totalSurplusRes = await query<{ sum: string }>(
      'SELECT COALESCE(SUM(quantity_kg), 0) AS sum FROM listings'
    );
    const totalRescuedRes = await query<{ sum: string }>(
      `SELECT COALESCE(SUM(l.quantity_kg), 0) AS sum
       FROM claims c
       JOIN listings l ON l.id = c.listing_id
       WHERE c.status = 'COMPLETED'`
    );
    const activeListingsRes = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM listings WHERE status = 'OPEN' AND safe_until > NOW()`
    );
    const completedPickupsRes = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM claims WHERE status = 'COMPLETED'`
    );
    const donorsCountRes = await query<{ count: string }>('SELECT COUNT(*) AS count FROM donors');
    const ngosCountRes = await query<{ count: string }>('SELECT COUNT(*) AS count FROM ngos');

    // Unmatched surplus calculation
    const unmatchedListings = await listingRepository.findUnmatchedListings();
    const totalUnmatchedKg = unmatchedListings.reduce((sum, item) => sum + Number(item.quantity_kg), 0);

    // Matching rate calculation:
    // Numerator: Listings claimed/completed/picked_up + Open listings that have at least 1 eligible NGO
    // Denominator: Total non-cancelled listings
    const totalListingsRes = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM listings WHERE status != 'CANCELLED'`
    );
    const totalListings = parseInt(totalListingsRes.rows[0].count, 10);

    const claimedOrDoneRes = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM listings WHERE status IN ('CLAIMED', 'PICKED_UP', 'COMPLETED')`
    );
    const claimedOrDone = parseInt(claimedOrDoneRes.rows[0].count, 10);

    // Active open listings that HAVE at least one match
    const activeOpenCount = parseInt(activeListingsRes.rows[0].count, 10);
    const matchedOpenCount = Math.max(0, activeOpenCount - unmatchedListings.length);

    const matchedTotal = claimedOrDone + matchedOpenCount;
    const matchingRatePercentage = totalListings > 0
      ? Math.round((matchedTotal / totalListings) * 1000) / 10
      : 0;

    return {
      totalSurplusPostedKg: Math.round(parseFloat(totalSurplusRes.rows[0].sum) * 10) / 10,
      totalRescuedKg: Math.round(parseFloat(totalRescuedRes.rows[0].sum) * 10) / 10,
      totalActiveListings: activeOpenCount,
      totalCompletedPickups: parseInt(completedPickupsRes.rows[0].count, 10),
      totalDonors: parseInt(donorsCountRes.rows[0].count, 10),
      totalNgos: parseInt(ngosCountRes.rows[0].count, 10),
      totalUnmatchedKg: Math.round(totalUnmatchedKg * 10) / 10,
      matchingRatePercentage,
    };
  }

  /**
   * Identifies unmatched listings and clusters them geographically into hotspots.
   */
  async getHotspots(): Promise<{
    hotspots: HotspotCluster[];
    totalUnmatchedListings: number;
    totalUnmatchedKg: number;
  }> {
    const detourFactor = config.roadDetourFactor;
    const speedKmh = config.averageSpeedKmh;

    const sql = `
      WITH unmatched_listings AS (
        SELECT l.*,
               d.organization_name AS donor_organization_name,
               d.contact_phone AS donor_phone,
               d.address AS donor_address
        FROM listings l
        JOIN donors d ON d.id = l.donor_id
        WHERE l.status = 'OPEN'
          AND l.safe_until > NOW()
          AND NOT EXISTS (
            SELECT 1
            FROM ngos n
            WHERE n.is_accepting = TRUE
              AND l.quantity_kg <= n.capacity_kg
              AND haversine_distance(n.latitude, n.longitude, l.latitude, l.longitude) <= n.service_radius_km
              AND (NOW() + (((haversine_distance(n.latitude, n.longitude, l.latitude, l.longitude) * $1 / $2) * 60) * INTERVAL '1 minute')) <= l.safe_until
          )
      )
      SELECT
        ROUND(latitude::NUMERIC, 2) AS grid_lat,
        ROUND(longitude::NUMERIC, 2) AS grid_lng,
        COUNT(*)::INTEGER AS unmatched_count,
        ROUND(SUM(quantity_kg)::NUMERIC, 1)::FLOAT AS total_unmatched_kg,
        ARRAY_AGG(DISTINCT food_type) AS sample_food_types
      FROM unmatched_listings
      GROUP BY ROUND(latitude::NUMERIC, 2), ROUND(longitude::NUMERIC, 2)
      ORDER BY total_unmatched_kg DESC
    `;

    const res = await query<HotspotCluster>(sql, [detourFactor, speedKmh]);

    const totalCount = res.rows.reduce((acc, h) => acc + Number(h.unmatched_count), 0);
    const totalKg = res.rows.reduce((acc, h) => acc + Number(h.total_unmatched_kg), 0);

    return {
      hotspots: res.rows,
      totalUnmatchedListings: totalCount,
      totalUnmatchedKg: Math.round(totalKg * 10) / 10,
    };
  }

  /**
   * Weekly food rescued trend over the past 8 weeks.
   */
  async getRescuedTrend(): Promise<Array<{ week: string; rescuedKg: number; pickupsCount: number }>> {
    const sql = `
      SELECT
        TO_CHAR(DATE_TRUNC('week', c.completed_at), 'YYYY-MM-DD') AS week,
        ROUND(COALESCE(SUM(l.quantity_kg), 0)::NUMERIC, 1)::FLOAT AS rescued_kg,
        COUNT(c.id)::INTEGER AS pickups_count
      FROM claims c
      JOIN listings l ON l.id = c.listing_id
      WHERE c.status = 'COMPLETED'
        AND c.completed_at >= NOW() - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', c.completed_at)
      ORDER BY week ASC
    `;

    const res = await query<{ week: string; rescued_kg: number; pickups_count: number }>(sql);

    return res.rows.map(row => ({
      week: row.week,
      rescuedKg: Number(row.rescued_kg),
      pickupsCount: Number(row.pickups_count),
    }));
  }

  /**
   * Analytics on how quickly listings are claimed.
   */
  async getClaimTimes(): Promise<{
    averageMinutesToClaim: number;
    distribution: Array<{ range: string; count: number }>;
  }> {
    const avgRes = await query<{ avg_minutes: string }>(
      `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (c.claimed_at - l.created_at)) / 60), 0) AS avg_minutes
       FROM claims c
       JOIN listings l ON l.id = c.listing_id`
    );

    const distRes = await query<{ range: string; count: string }>(
      `SELECT
        CASE
          WHEN EXTRACT(EPOCH FROM (c.claimed_at - l.created_at)) / 60 < 30 THEN '< 30 min'
          WHEN EXTRACT(EPOCH FROM (c.claimed_at - l.created_at)) / 60 < 60 THEN '30 - 60 min'
          WHEN EXTRACT(EPOCH FROM (c.claimed_at - l.created_at)) / 60 < 120 THEN '1 - 2 hours'
          WHEN EXTRACT(EPOCH FROM (c.claimed_at - l.created_at)) / 60 < 240 THEN '2 - 4 hours'
          ELSE '> 4 hours'
        END AS range,
        COUNT(*)::INTEGER AS count
       FROM claims c
       JOIN listings l ON l.id = c.listing_id
       GROUP BY 1
       ORDER BY MIN(EXTRACT(EPOCH FROM (c.claimed_at - l.created_at))) ASC`
    );

    return {
      averageMinutesToClaim: Math.round(parseFloat(avgRes.rows[0].avg_minutes) * 10) / 10,
      distribution: distRes.rows.map(row => ({
        range: row.range,
        count: parseInt(row.count, 10),
      })),
    };
  }

  /**
   * Matching distribution statistics.
   */
  async getMatchingStats(): Promise<{
    claimedCount: number;
    completedCount: number;
    openMatchedCount: number;
    openUnmatchedCount: number;
    expiredCount: number;
  }> {
    const statusCounts = await query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::INTEGER AS count FROM listings GROUP BY status`
    );

    const counts: Record<string, number> = {};
    for (const row of statusCounts.rows) {
      counts[row.status] = parseInt(row.count, 10);
    }

    const hotspots = await this.getHotspots();
    const openTotal = counts['OPEN'] || 0;
    const openUnmatched = hotspots.totalUnmatchedListings;
    const openMatched = Math.max(0, openTotal - openUnmatched);

    return {
      claimedCount: (counts['CLAIMED'] || 0) + (counts['PICKED_UP'] || 0),
      completedCount: counts['COMPLETED'] || 0,
      openMatchedCount: openMatched,
      openUnmatchedCount: openUnmatched,
      expiredCount: counts['EXPIRED'] || 0,
    };
  }

  /**
   * Retrieves map layers data: donors, NGOs, listings, claims, hotspots.
   */
  async getMapLayers(): Promise<any> {
    const donorsRes = await query(
      `SELECT id, organization_name, contact_phone, address, latitude, longitude FROM donors`
    );
    const ngosRes = await query(
      `SELECT id, organization_name, contact_phone, address, latitude, longitude, capacity_kg, service_radius_km, is_accepting FROM ngos`
    );
    const activeListingsRes = await query(
      `SELECT l.id, l.food_type, l.quantity_kg, l.latitude, l.longitude, l.safe_until, l.status,
              d.organization_name AS donor_name
       FROM listings l
       JOIN donors d ON d.id = l.donor_id
       WHERE l.status = 'OPEN' AND l.safe_until > NOW()`
    );
    const claimedListingsRes = await query(
      `SELECT l.id, l.food_type, l.quantity_kg, l.latitude, l.longitude, l.status,
              d.organization_name AS donor_name,
              n.organization_name AS ngo_name
       FROM claims c
       JOIN listings l ON l.id = c.listing_id
       JOIN donors d ON d.id = l.donor_id
       JOIN ngos n ON n.id = c.ngo_id
       WHERE c.status IN ('CLAIMED', 'PICKED_UP', 'COMPLETED')`
    );
    const hotspotsData = await this.getHotspots();

    return {
      donors: donorsRes.rows,
      ngos: ngosRes.rows,
      activeListings: activeListingsRes.rows,
      claimedListings: claimedListingsRes.rows,
      hotspots: hotspotsData.hotspots,
    };
  }
}

export const analyticsService = new AnalyticsService();

