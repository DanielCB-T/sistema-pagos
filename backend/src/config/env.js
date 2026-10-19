// Lectura y validación de variables de entorno (backend/.env)
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const secret = process.env.JWT_SECRET || '';
if (secret.length < 32) {
  throw new Error('JWT_SECRET es obligatorio y debe tener al menos 32 caracteres (revisa backend/.env)');
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  db: {
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT) || 5432,
    database: process.env.PGDATABASE || 'sistema_pagos',
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || '',
  },
  jwt: { secret, sessionHours: Number(process.env.SESSION_HOURS) || 8 },
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS) || 10,
};
