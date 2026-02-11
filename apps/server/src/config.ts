import { config as loadEnv } from 'dotenv';

loadEnv();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  jwtSecret: process.env.JWT_SECRET || 'change-this-secret',
  adminCreateKey: process.env.ADMIN_CREATE_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  logLevel: process.env.LOG_LEVEL || 'info',
};

if (!config.jwtSecret || config.jwtSecret === 'change-this-secret') {
  console.warn('WARNING: JWT_SECRET not set or using default value. Set a secure secret in production.');
}

if (!config.adminCreateKey) {
  console.warn('WARNING: ADMIN_CREATE_KEY not set. Event creation will be unprotected.');
}
