// Datos iniciales. Uso:
//   npm run seed        -> crea los 3 roles y el usuario administrador
//   npm run seed:demo   -> además crea tesorero, secretario y datos de ejemplo (SOLO para pruebas)
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
require('../src/config/env');
const { pool, query } = require('../src/config/db');
const { ROLES } = require('../src/config/permissions');

const demo = process.argv.includes('--demo');

async function crearUsuario(nombre, contrasena, idRol) {
  const hash = await bcrypt.hash(contrasena, 10);
  const r = await query(
    `INSERT INTO usuario (nombre_usuario, contrasena, id_rol) VALUES ($1,$2,$3)
     ON CONFLICT (nombre_usuario) DO NOTHING RETURNING id_usuario`,
    [nombre, hash, idRol]
  );
  return r.rowCount > 0;
}

async function main() {
  // Roles con ids fijos (deben coincidir con config/permissions.js)
  await query(
    `INSERT INTO rol (id_rol, nombre_rol) VALUES ($1,'Administrador'), ($2,'Tesorero'), ($3,'Secretario')
     ON CONFLICT (id_rol) DO NOTHING`,
    [ROLES.ADMINISTRADOR, ROLES.TESORERO, ROLES.SECRETARIO]
  );
  await query(`SELECT setval(pg_get_serial_sequence('rol','id_rol'), (SELECT MAX(id_rol) FROM rol))`);

  const adminUser = process.env.ADMIN_USER || 'admin';
  const generada = !process.env.ADMIN_PASSWORD;
  const adminPass = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
  if (await crearUsuario(adminUser, adminPass, ROLES.ADMINISTRADOR)) {
    console.log(`Administrador creado -> usuario: ${adminUser}${generada ? `  contraseña: ${adminPass}  (anótela, no se vuelve a mostrar)` : ''}`);
  } else {
    console.log(`El usuario "${adminUser}" ya existe; no se modificó.`);
  }

  if (demo) {
    await crearUsuario('tesorero', 'Tesorero123', ROLES.TESORERO);
    await crearUsuario('secretario', 'Secretario123', ROLES.SECRETARIO);
    const { rows } = await query('SELECT COUNT(*)::int AS n FROM habitante');
    if (rows[0].n === 0) {
      await query(
        `INSERT INTO habitante (nombre_completo, direccion, telefono, numero_familia) VALUES
         ('María López Hernández','Calle Principal s/n','9511234567','F-001'),
         ('José Martínez Cruz','Barrio Centro','9517654321','F-002'),
         ('Ana García Ruiz','Camino a la Escuela','9519876543','F-003')`
      );
    }
    console.log('Demo: tesorero / Tesorero123  y  secretario / Secretario123 (¡no usar en producción!)');
  }
}

main().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => pool.end());
