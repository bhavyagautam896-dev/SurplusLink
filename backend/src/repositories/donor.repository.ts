import { query } from '../database/db.js';
import { Donor } from '../types/index.js';

export class DonorRepository {
  async findByUserId(userId: string): Promise<Donor | null> {
    const res = await query<Donor>(
      'SELECT id, user_id, organization_name, contact_phone, address, city, latitude, longitude, created_at FROM donors WHERE user_id = $1',
      [userId]
    );
    return res.rows[0] || null;
  }

  async findById(id: string): Promise<Donor | null> {
    const res = await query<Donor>(
      'SELECT id, user_id, organization_name, contact_phone, address, city, latitude, longitude, created_at FROM donors WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }

  async create(
    donor: Omit<Donor, 'id' | 'created_at'>,
    client?: any
  ): Promise<Donor> {
    const runner = client ? client.query.bind(client) : query;
    const res = await runner(
      `INSERT INTO donors (user_id, organization_name, contact_phone, address, city, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, organization_name, contact_phone, address, city, latitude, longitude, created_at`,
      [
        donor.user_id,
        donor.organization_name,
        donor.contact_phone,
        donor.address,
        donor.city,
        donor.latitude,
        donor.longitude,
      ]
    );
    return res.rows[0];
  }

  async count(): Promise<number> {
    const res = await query<{ count: string }>('SELECT COUNT(*) FROM donors');
    return parseInt(res.rows[0].count, 10);
  }

  async findAll(): Promise<Donor[]> {
    const res = await query<Donor>(
      'SELECT id, user_id, organization_name, contact_phone, address, city, latitude, longitude, created_at FROM donors ORDER BY organization_name ASC'
    );
    return res.rows;
  }
}

export const donorRepository = new DonorRepository();
