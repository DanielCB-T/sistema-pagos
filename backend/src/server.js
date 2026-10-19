const config = require('./config/env');
const { pool } = require('./config/db');
const app = require('./app');

async function main() {
  await pool.query('SELECT 1'); // falla rápido si la BD no está disponible
  const server = app.listen(config.port, () => {
    console.log(`Sistema de Gestión de Pagos en http://localhost:${config.port}`);
  });
  const apagar = () => server.close(() => pool.end().then(() => process.exit(0)));
  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

main().catch((err) => {
  console.error('No se pudo iniciar el servidor:', err.message);
  process.exit(1);
});
