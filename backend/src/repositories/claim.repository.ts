import { query } from '../database/db.js';
import { Claim, ClaimStatus } from '../types/index.js';

export class ClaimRepository {
  async create(
    claim: Omit<Claim, 'id' | 'claimed_at' | 'picked_up_at' | 'completed_at'>,
    client?: any
  ): Promise<Claim> {
    const runner = client ? client.query.bind(client) : query;
    const res = await runner(
      `INSERT INTO claims (listing_id, ngo_id, claimed_at, distance_km, estimated_travel_minutes, status)
       VALUES ($1, $2, NOW(), $3, $4, 'CLAIMED')
       RETURNING *`,
      [
        claim.listing_id,
        claim.ngo_id,
        claim.distance_km,
        claim.estimated_travel_minutes,
      ]
    );
    return res.rows[0];
  }

  async findById(id: string, client?: any): Promise<Claim | null> {
    const runner = client ? client.query.bind(client) : query;
    const res = await runner(
      `SELECT c.*,
              l.food_type,
              l.quantity_kg,
              l.safe_until,
              l.donor_id,
              n.organization_name AS ngo_organization_name,
              n.contact_phone AS ngo_phone,
              d.organization_name AS donor_organization_name,
              d.address AS donor_address,
              d.contact_phone AS donor_phone
       FROM claims c
       JOIN listings l ON l.id = c.listing_id
       JOIN ngos n ON n.id = c.ngo_id
       JOIN donors d ON d.id = l.donor_id
       WHERE c.id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async findByListingId(listingId: string): Promise<Claim[]> {
    const res = await query<Claim>(
      `SELECT c.*,
              n.organization_name AS ngo_organization_name,
              n.contact_phone AS ngo_phone
       FROM claims c
       JOIN ngos n ON n.id = c.ngo_id
       WHERE c.listing_id = $1
       ORDER BY c.claimed_at DESC`,
      [listingId]
    );
    return res.rows;
  }

  async findByNgoId(ngoId: string): Promise<Claim[]> {
    const res = await query<Claim>(
      `SELECT c.*,
              l.food_type,
              l.quantity_kg,
              l.safe_until,
              l.donor_id,
              d.organization_name AS donor_organization_name,
              d.address AS donor_address,
              d.contact_phone AS donor_phone
       FROM claims c
       JOIN listings l ON l.id = c.listing_id
       JOIN donors d ON d.id = l.donor_id
       WHERE c.ngo_id = $1
       ORDER BY c.claimed_at DESC`,
      [ngoId]
    );
    return res.rows;
  }

  async findByDonorId(donorId: string): Promise<Claim[]> {
    const res = await query<Claim>(
      `SELECT c.*,
              l.food_type,
              l.quantity_kg,
              l.safe_until,
              n.organization_name AS ngo_organization_name,
              n.contact_phone AS ngo_phone
       FROM claims c
       JOIN listings l ON l.id = c.listing_id
       JOIN ngos n ON n.id = c.ngo_id
       WHERE l.donor_id = $1
       ORDER BY c.claimed_at DESC`,
      [donorId]
    );
    return res.rows;
  }

  async updateStatus(
    id: string,
    status: ClaimStatus,
    client?: any
  ): Promise<Claim | null> {
    const runner = client ? client.query.bind(client) : query;
    let timestampUpdate = '';
    if (status === 'PICKED_UP') {
      timestampUpdate = ', picked_up_at = NOW()';
    } else if (status === 'COMPLETED') {
      timestampUpdate = ', completed_at = NOW()';
    }

    const res = await runner(
      `UPDATE claims
       SET status = $1 ${timestampUpdate}
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    return res.rows[0] || null;
  }

  async countActiveClaimsForListing(listingId: string, client?: any): Promise<number> {
    const runner = client ? client.query.bind(client) : query;
    const res = await runner(
      `SELECT COUNT(*) FROM claims WHERE listing_id = $1 AND status IN ('CLAIMED', 'PICKED_UP')`,
      [listingId]
    );
    return parseInt(res.rows[0].count, 10);
  }
}

export const claimRepository = new ClaimRepository();
