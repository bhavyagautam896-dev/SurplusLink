import { query } from '../database/db.js';
import { Listing, ListingStatus, EligibleListing } from '../types/index.js';
import { config } from '../config/env.js';

export class ListingRepository {
  async create(
    listing: Omit<Listing, 'id' | 'status' | 'created_at' | 'updated_at'>,
    client?: any
  ): Promise<Listing> {
    const runner = client ? client.query.bind(client) : query;
    const res = await runner(
      `INSERT INTO listings (donor_id, food_type, description, quantity_kg, latitude, longitude, safe_until, pickup_instructions, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN')
       RETURNING *`,
      [
        listing.donor_id,
        listing.food_type,
        listing.description,
        listing.quantity_kg,
        listing.latitude,
        listing.longitude,
        listing.safe_until,
        listing.pickup_instructions || null,
      ]
    );
    return res.rows[0];
  }

  async findById(id: string, client?: any): Promise<Listing | null> {
    const runner = client ? client.query.bind(client) : query;
    const res = await runner(
      `SELECT l.*,
              d.organization_name AS donor_organization_name,
              d.contact_phone AS donor_phone,
              d.address AS donor_address
       FROM listings l
       JOIN donors d ON d.id = l.donor_id
       WHERE l.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async findByDonorId(donorId: string): Promise<Listing[]> {
    const res = await query<Listing>(
      `SELECT l.*,
              d.organization_name AS donor_organization_name,
              d.contact_phone AS donor_phone,
              d.address AS donor_address
       FROM listings l
       JOIN donors d ON d.id = l.donor_id
       WHERE l.donor_id = $1
       ORDER BY l.created_at DESC`,
      [donorId]
    );
    return res.rows;
  }

  async update(
    id: string,
    donorId: string,
    fields: Partial<Pick<Listing, 'food_type' | 'description' | 'quantity_kg' | 'safe_until' | 'pickup_instructions'>>,
    client?: any
  ): Promise<Listing | null> {
    const runner = client ? client.query.bind(client) : query;

    // A donor can only modify their own listing when it is still OPEN
    const updates: string[] = ['updated_at = NOW()'];
    const values: any[] = [id, donorId];
    let paramIndex = 3;

    if (fields.food_type !== undefined) {
      updates.push(`food_type = $${paramIndex++}`);
      values.push(fields.food_type);
    }
    if (fields.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(fields.description);
    }
    if (fields.quantity_kg !== undefined) {
      updates.push(`quantity_kg = $${paramIndex++}`);
      values.push(fields.quantity_kg);
    }
    if (fields.safe_until !== undefined) {
      updates.push(`safe_until = $${paramIndex++}`);
      values.push(fields.safe_until);
    }
    if (fields.pickup_instructions !== undefined) {
      updates.push(`pickup_instructions = $${paramIndex++}`);
      values.push(fields.pickup_instructions);
    }

    const res = await runner(
      `UPDATE listings
       SET ${updates.join(', ')}
       WHERE id = $1 AND donor_id = $2 AND status = 'OPEN'
       RETURNING *`,
      values
    );

    return res.rows[0] || null;
  }

  async updateStatus(id: string, status: ListingStatus, client?: any): Promise<Listing | null> {
    const runner = client ? client.query.bind(client) : query;
    const res = await runner(
      `UPDATE listings
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    return res.rows[0] || null;
  }

  /**
   * Finds nearby eligible listings for an NGO with Haversine distance, travel time, and safe-until window.
   */
  async findNearbyEligible(
    ngoLat: number,
    ngoLng: number,
    ngoCapacityKg: number,
    effectiveRadiusKm: number,
    now: Date = new Date(),
    filters?: {
      foodType?: string;
      minQuantity?: number;
      maxQuantity?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }
  ): Promise<EligibleListing[]> {
    const detourFactor = config.roadDetourFactor;
    const speedKmh = config.averageSpeedKmh;

    const conditions: string[] = [
      `l.status = 'OPEN'`,
      `l.safe_until > $5`,
      `l.quantity_kg <= $6`,
      `haversine_distance($1, $2, l.latitude, l.longitude) <= $7`,
      `($5::timestamptz + (((haversine_distance($1, $2, l.latitude, l.longitude) * $3 / $4) * 60) * INTERVAL '1 minute')) <= l.safe_until`,
    ];

    const params: any[] = [
      ngoLat,
      ngoLng,
      detourFactor,
      speedKmh,
      now.toISOString(),
      ngoCapacityKg,
      effectiveRadiusKm,
    ];
    let paramIndex = 8;

    if (filters?.foodType) {
      conditions.push(`l.food_type ILIKE $${paramIndex++}`);
      params.push(`%${filters.foodType}%`);
    }

    if (filters?.minQuantity) {
      conditions.push(`l.quantity_kg >= $${paramIndex++}`);
      params.push(filters.minQuantity);
    }

    if (filters?.maxQuantity) {
      conditions.push(`l.quantity_kg <= $${paramIndex++}`);
      params.push(filters.maxQuantity);
    }

    // Determine sorting
    let orderByClause = 'remaining_minutes ASC, distance_km ASC'; // Default: urgency first
    const direction = filters?.sortOrder?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    if (filters?.sortBy === 'distance') {
      orderByClause = `distance_km ${direction}, remaining_minutes ASC`;
    } else if (filters?.sortBy === 'earliestSafeUntil') {
      orderByClause = `l.safe_until ${direction}`;
    } else if (filters?.sortBy === 'quantity') {
      orderByClause = `l.quantity_kg ${direction}`;
    } else if (filters?.sortBy === 'urgency') {
      orderByClause = `remaining_minutes ${direction}, distance_km ASC`;
    }

    const sql = `
      SELECT
        l.*,
        d.organization_name AS donor_organization_name,
        d.contact_phone AS donor_phone,
        d.address AS donor_address,
        haversine_distance($1, $2, l.latitude, l.longitude)::FLOAT AS distance_km,
        ROUND(((haversine_distance($1, $2, l.latitude, l.longitude) * $3 / $4) * 60)::NUMERIC, 2)::FLOAT AS estimated_travel_minutes,
        ROUND(EXTRACT(EPOCH FROM (l.safe_until - $5::timestamptz)) / 60)::INTEGER AS remaining_minutes,
        CASE
          WHEN EXTRACT(EPOCH FROM (l.safe_until - $5::timestamptz)) / 60 <= 60 THEN 'URGENT'
          WHEN EXTRACT(EPOCH FROM (l.safe_until - $5::timestamptz)) / 60 <= 180 THEN 'EXPIRING_SOON'
          ELSE 'AVAILABLE'
        END AS urgency
      FROM listings l
      JOIN donors d ON d.id = l.donor_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderByClause}
    `;

    const res = await query<EligibleListing>(sql, params);
    return res.rows;
  }

  /**
   * Identifies all open, unexpired listings for which NO active accepting NGO qualifies.
   */
  async findUnmatchedListings(now: Date = new Date()): Promise<Listing[]> {
    const detourFactor = config.roadDetourFactor;
    const speedKmh = config.averageSpeedKmh;

    const sql = `
      SELECT l.*,
             d.organization_name AS donor_organization_name,
             d.contact_phone AS donor_phone,
             d.address AS donor_address
      FROM listings l
      JOIN donors d ON d.id = l.donor_id
      WHERE l.status = 'OPEN'
        AND l.safe_until > $1
        AND NOT EXISTS (
          SELECT 1
          FROM ngos n
          WHERE n.is_accepting = TRUE
            AND l.quantity_kg <= n.capacity_kg
            AND haversine_distance(n.latitude, n.longitude, l.latitude, l.longitude) <= n.service_radius_km
            AND ($1::timestamptz + (((haversine_distance(n.latitude, n.longitude, l.latitude, l.longitude) * $2 / $3) * 60) * INTERVAL '1 minute')) <= l.safe_until
        )
      ORDER BY l.safe_until ASC
    `;

    const res = await query<Listing>(sql, [now.toISOString(), detourFactor, speedKmh]);
    return res.rows;
  }
}

export const listingRepository = new ListingRepository();
