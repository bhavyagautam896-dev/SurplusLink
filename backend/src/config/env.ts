import dotenv from 'dotenv';
import path from 'path';

// Load from root .env if present, otherwise process.env
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:1234@localhost:5432/surpluslink',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_surpluslink_tpds_2026_secure',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // Logistics parameters
  averageSpeedKmh: parseFloat(process.env.AVERAGE_SPEED_KMH || '20'),
  roadDetourFactor: parseFloat(process.env.ROAD_DETOUR_FACTOR || '1.25'),
  defaultSearchRadiusKm: parseFloat(process.env.DEFAULT_SEARCH_RADIUS_KM || '15'),

  // Seed / Map default center
  seedCity: process.env.SEED_CITY || 'Nagpur',
  seedCityLat: parseFloat(process.env.SEED_CITY_LAT || '21.1458'),
  seedCityLng: parseFloat(process.env.SEED_CITY_LNG || '79.0882'),
};

export function validateConfig(): void {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
}

