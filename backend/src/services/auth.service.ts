import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../database/db.js';
import { userRepository } from '../repositories/user.repository.js';
import { donorRepository } from '../repositories/donor.repository.js';
import { ngoRepository } from '../repositories/ngo.repository.js';
import { config } from '../config/env.js';
import { AppError } from '../middleware/error.middleware.js';
import {
  RegisterDonorInput,
  RegisterNgoInput,
  LoginInput,
} from '../validators/auth.validator.js';

export class AuthService {
  async registerDonor(data: RegisterDonorInput) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const user = await userRepository.create(data.email, passwordHash, 'DONOR', client);

      const donor = await donorRepository.create(
        {
          user_id: user.id,
          organization_name: data.organizationName,
          contact_phone: data.contactPhone,
          address: data.address,
          city: data.city,
          latitude: data.latitude,
          longitude: data.longitude,
        },
        client
      );

      await client.query('COMMIT');

      const token = this.generateToken(user.id, user.email, 'DONOR');

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          donorId: donor.id,
          organizationName: donor.organization_name,
        },
        token,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async registerNgo(data: RegisterNgoInput) {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError('An account with this email already exists', 409);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const user = await userRepository.create(data.email, passwordHash, 'NGO', client);

      const ngo = await ngoRepository.create(
        {
          user_id: user.id,
          organization_name: data.organizationName,
          contact_phone: data.contactPhone,
          address: data.address,
          city: data.city,
          latitude: data.latitude,
          longitude: data.longitude,
          capacity_kg: data.capacityKg,
          service_radius_km: data.serviceRadiusKm,
          is_accepting: data.isAccepting ?? true,
        },
        client
      );

      await client.query('COMMIT');

      const token = this.generateToken(user.id, user.email, 'NGO');

      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          ngoId: ngo.id,
          organizationName: ngo.organization_name,
        },
        token,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async login(data: LoginInput) {
    const user = await userRepository.findByEmail(data.email);
    if (!user || !user.password_hash) {
      throw new AppError('Invalid email or password', 401);
    }

    const isMatch = await bcrypt.compare(data.password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    let donorId: string | undefined;
    let ngoId: string | undefined;
    let organizationName: string | undefined;

    if (user.role === 'DONOR') {
      const donor = await donorRepository.findByUserId(user.id);
      if (donor) {
        donorId = donor.id;
        organizationName = donor.organization_name;
      }
    } else if (user.role === 'NGO') {
      const ngo = await ngoRepository.findByUserId(user.id);
      if (ngo) {
        ngoId = ngo.id;
        organizationName = ngo.organization_name;
      }
    } else if (user.role === 'ADMIN') {
      organizationName = 'SurplusLink Administration';
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        donorId,
        ngoId,
        organizationName,
      },
      token,
    };
  }

  generateToken(userId: string, email: string, role: string): string {
    return jwt.sign(
      { userId, email, role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn as any }
    );
  }

  getCookieOptions() {
    const isProduction = config.nodeEnv === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? ('none' as const) : ('lax' as const),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }
}

export const authService = new AuthService();

