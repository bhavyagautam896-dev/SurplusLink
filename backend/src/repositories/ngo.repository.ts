import { query } from '../database/db.js';
import { NGO } from '../types/index.js';

export class NgoRepository {
  async findByUserId(userId: string): Promise<NGO | null> {
    const res = await query<NGO>(
      `SELECT id, user_id, organization_name, contact_phone, address, city,
              latitude, longitude, capacity_kg, service_radius_km, is_accepting,
              created_at, updated_at
       FROM ngos WHERE user_id = $1`,
      [userId]
    );
    return res.rows[0] || null;
  }

  async findById(id: string): Promise<NGO | null> {
    const res = await query<NGO>(
      `SELECT id, user_id, organization_name, contact_phone, address, city,
              latitude, longitude, capacity_kg, service_radius_km, is_accepting,
              created_at, updated_at
       FROM ngos WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  }

  async create(
    ngo: Omit<NGO, 'id' | 'created_at' | 'updated_at'>,
    client?: any
  ): Promise<NGO> {
    const runner = client ? client.query.bind(client) : query;
    const res = await runner(
      `INSERT INTO ngos (user_id, organization_name, contact_phone, address, city, latitude, longitude, capacity_kg, service_radius_km, is_accepting)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, user_id, organization_name, contact_phone, address, city, latitude, longitude, capacity_kg, service_radius_km, is_accepting, created_at, updated_at`,
      [
        ngo.user_id,
        ngo.organization_name,
        ngo.contact_phone,
        ngo.address,
        ngo.city,
        ngo.latitude,
        ngo.longitude,
        ngo.capacity_kg,
        ngo.service_radius_km,
        ngo.is_accepting ?? true,
      ]
    );
    return res.rows[0];
  }

  async count(): Promise<number> {
    const res = await query<{ count: string }>('SELECT COUNT(*) FROM ngos');
    return parseInt(res.rows[0].count, 10);
  }

  async findAll(): Promise<NGO[]> {
    const res = await query<NGO>(
      `SELECT id, user_id, organization_name, contact_phone, address, city,
              latitude, longitude, capacity_kg, service_radius_km, is_accepting,
              created_at, updated_at
       FROM ngos ORDER BY organization_name ASC`
    );
    return res.rows;
  }

  async updateAcceptingStatus(id: string, isAccepting: boolean): Promise<NGO | null> {
    const res = await query<NGO>(
      `UPDATE ngos
       SET is_accepting = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, user_id, organization_name, contact_phone, address, city,
                 latitude, longitude, capacity_kg, service_radius_km, is_accepting,
                 created_at, updated_at`,
      [isAccepting, id]
    );
    return res.rows[0] || null;
  }
}

export const ngoRepository = new NgoRepository();
