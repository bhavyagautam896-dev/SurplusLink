import { app } from './app.js';
import { config, validateConfig } from './config/env.js';
import { pool } from './database/db.js';
import { runMigrations } from './database/migrate.js';

async function bootstrap() {
  try {
    validateConfig();

    console.log('🔌 Verifying PostgreSQL connection...');
    const dbTest = await pool.query('SELECT NOW() AS current_time, current_database() AS db_name');
    console.log(`✅ Connected to database "${dbTest.rows[0].db_name}" at ${dbTest.rows[0].current_time}`);

    // Auto-run migrations on startup
    await runMigrations();

    const server = app.listen(config.port, () => {
      console.log(`🚀 SurplusLink Backend running on port ${config.port} (${config.nodeEnv})`);
      console.log(`📡 Health check: http://localhost:${config.port}/api/health`);
    });

    const shutdown = async (signal: string) => {
      console.log(`🛑 Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await pool.end();
        console.log('💤 PostgreSQL pool closed. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

bootstrap();
