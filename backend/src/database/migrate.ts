import fs from 'fs';
import path from 'path';
import { pool } from './db.js';

export async function runMigrations(): Promise<void> {
  console.log('🔄 Running database migrations...');
  const srcMigrations = path.resolve(process.cwd(), 'src/database/migrations');
  const distMigrations = path.resolve(process.cwd(), 'dist/database/migrations');

  let migrationsDir = srcMigrations;
  if (fs.existsSync(srcMigrations)) {
    migrationsDir = srcMigrations;
  } else if (fs.existsSync(distMigrations)) {
    migrationsDir = distMigrations;
  }

  const files = fs.readdirSync(migrationsDir).filter((f: string) => f.endsWith('.sql')).sort();

  // Create migrations tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

  for (const file of files) {
    const existing = await pool.query(
      'SELECT id FROM schema_migrations WHERE filename = $1',
      [file]
    );

    if (existing.rowCount && existing.rowCount > 0) {
      console.log(`⏩ Migration already applied: ${file}`);
      continue;
    }

    console.log(`⚡ Applying migration: ${file}`);
    const filePath = path.join(migrationsDir, file);
    const sql = fs.readFileSync(filePath, 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file]
      );
      await client.query('COMMIT');
      console.log(`✅ Applied migration: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`❌ Migration failed: ${file}`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.log('🎉 All migrations completed successfully.');
}

// Allow direct CLI execution
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
