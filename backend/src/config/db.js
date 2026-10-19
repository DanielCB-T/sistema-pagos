// Pool de conexiones a PostgreSQL y helper de transacciones
const { Pool, types } = require('pg');
const { db } = require('./env');

// DATE (oid 1082) se devuelve como texto 'YYYY-MM-DD' para evitar desfases de zona horaria
types.setTypeParser(1082, (v) => v);

const pool = new Pool(db);
pool.on('error', (err) => console.error('[db] error en conexión inactiva:', err.message));

const query = (text, params) => pool.query(text, params);

async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
