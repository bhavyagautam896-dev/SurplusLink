import { query } from '../database/db.js';
import { User, UserRole } from '../types/index.js';

export class UserRepository {
  async findByEmail(email: string): Promise<User | null> {
    const res = await query<User>(
      'SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    return res.rows[0] || null;
  }

  async findById(id: string): Promise<User | null> {
    const res = await query<User>(
      'SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  }

  async create(email: string, passwordHash: string, role: UserRole, client?: any): Promise<User> {
    const runner = client ? client.query.bind(client) : query;
    const res = await runner(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING id, email, role, created_at, updated_at`,
      [email.toLowerCase(), passwordHash, role]
    );
    return res.rows[0];
  }
}

export const userRepository = new UserRepository();

