// Prueba de humo de la API. Requiere: BD con esquema + "npm run seed:demo" y el servidor en marcha.
//   BASE_URL=http://localhost:3000 ADMIN_PASSWORD=... npm test
const test = require('node:test');
const assert = require('node:assert/strict');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Admin12345';

function cliente() {
  let cookie = '';
  const call = async (method, url, body) => {
    const res = await fetch(BASE + url, {
      method,
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'sgp', ...(cookie && { Cookie: cookie }) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.getSetCookie?.()[0];
    if (set) cookie = set.split(';')[0];
    const tipo = res.headers.get('content-type') || '';
    const data = tipo.includes('json') ? await res.json() : Buffer.from(await res.arrayBuffer());
    return { status: res.status, data, headers: res.headers };
  };
  return {
    get: (u) => call('GET', u), post: (u, b) => call('POST', u, b), put: (u, b) => call('PUT', u, b),
    patch: (u, b) => call('PATCH', u, b), del: (u) => call('DELETE', u),
    async login(u, p) { const r = await call('POST', '/api/auth/login', { nombre_usuario: u, contrasena: p }); assert.equal(r.status, 200, JSON.stringify(r.data)); return r.data.usuario; },
  };
}

const sufijo = Date.now().toString().slice(-6);
const admin = cliente(), tes = cliente(), sec = cliente();
let idHab, idAdeudo, idPago, idPagoLibre, idUsuario;

test('login: credenciales inválidas y sesión requerida', async () => {
  const anon = cliente();
  assert.equal((await anon.get('/api/pagos')).status, 401);
  assert.equal((await anon.post('/api/auth/login', { nombre_usuario: 'admin', contrasena: 'mala' })).status, 401);
  const u = await admin.login('admin', ADMIN_PASS);
  assert.equal(u.rol, 'Administrador');
  await tes.login('tesorero', 'Tesorero123');
  await sec.login('secretario', 'Secretario123');
});

test('RBAC: cada rol solo accede a lo de su caso de uso', async () => {
  assert.equal((await sec.post('/api/pagos', {})).status, 403);       // secretario no registra pagos
  assert.equal((await tes.get('/api/usuarios')).status, 403);         // tesorero no gestiona usuarios
  assert.equal((await tes.post('/api/habitantes', {})).status, 403);  // tesorero no registra habitantes
  assert.equal((await admin.post('/api/pagos', {})).status, 403);     // admin solo consulta pagos
  assert.equal((await admin.get('/api/pagos')).status, 200);
  assert.equal((await sec.get('/api/pagos')).status, 200);
});

test('secretario registra habitante; validaciones', async () => {
  assert.equal((await sec.post('/api/habitantes', { nombre_completo: 'x' })).status, 400);
  const r = await sec.post('/api/habitantes', { nombre_completo: `Prueba ${sufijo}`, telefono: '9510000000', numero_familia: 'F-9' });
  assert.equal(r.status, 201);
  idHab = r.data.id_habitante;
  assert.equal((await sec.put(`/api/habitantes/${idHab}`, { nombre_completo: `Prueba ${sufijo} B`, telefono: '9510000001' })).status, 200);
  assert.ok((await sec.get(`/api/habitantes?q=Prueba%20${sufijo}`)).data.length >= 1);
});

test('tesorero: adeudo y pago actualizan el saldo; sobrepago se rechaza', async () => {
  let r = await tes.post('/api/adeudos', { id_habitante: idHab, monto_total: '1000' });
  assert.equal(r.status, 201); idAdeudo = r.data.id_adeudo;
  assert.equal(r.data.monto_pendiente, '1000.00');

  r = await tes.post('/api/pagos', { id_habitante: idHab, id_adeudo: idAdeudo, monto: '400.50', concepto: 'Cuota' });
  assert.equal(r.status, 201); idPago = r.data.id_pago;
  let a = (await tes.get(`/api/adeudos/${idAdeudo}`)).data;
  assert.equal(a.monto_pagado, '400.50'); assert.equal(a.monto_pendiente, '599.50'); assert.equal(a.estado, 'parcial');

  assert.equal((await tes.post('/api/pagos', { id_habitante: idHab, id_adeudo: idAdeudo, monto: '700', concepto: 'x' })).status, 409);
  assert.equal((await tes.post('/api/pagos', { id_habitante: idHab, monto: '-5', concepto: 'x' })).status, 400);
  assert.equal((await tes.post('/api/pagos', { id_habitante: idHab, monto: '10', concepto: 'x', fecha: '2999-01-01' })).status, 400);

  // modificar monto -> reajusta adeudo
  r = await tes.put(`/api/pagos/${idPago}`, { monto: '1000', concepto: 'Cuota', observaciones: 'ajuste' });
  assert.equal(r.status, 200);
  a = (await tes.get(`/api/adeudos/${idAdeudo}`)).data;
  assert.equal(a.estado, 'pagado'); assert.equal(a.monto_pendiente, '0.00');

  // pago libre (sin adeudo)
  r = await tes.post('/api/pagos', { id_habitante: idHab, monto: '50', concepto: 'Aportación voluntaria' });
  assert.equal(r.status, 201); idPagoLibre = r.data.id_pago;
});

test('consultar pagos: buscar y filtrar; comprobante PDF', async () => {
  const r = await admin.get(`/api/pagos?id_habitante=${idHab}&desde=2000-01-01`);
  assert.equal(r.data.total, 2);
  assert.equal(r.data.suma, '1050.00');
  assert.equal((await admin.get('/api/pagos?q=voluntaria')).data.data.length >= 1, true);
  const pdf = await tes.get(`/api/pagos/${idPago}/comprobante`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.data.subarray(0, 4).toString(), '%PDF');
  assert.equal((await sec.get(`/api/pagos/${idPago}/comprobante`)).status, 403);
});

test('reportes: generar, historial y exportar CSV', async () => {
  const hoy = new Date().toISOString().slice(0, 10);
  assert.equal((await sec.post('/api/reportes', { tipo_reporte: 'pagos' })).status, 400); // falta periodo
  const r = await sec.post('/api/reportes', { tipo_reporte: 'pagos', fecha_inicio: '2000-01-01', fecha_fin: hoy });
  assert.equal(r.status, 201);
  assert.ok(r.data.filas.length >= 2);
  const csv = await sec.get(`/api/reportes/${r.data.reporte.id_reporte}/csv`);
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  assert.match(csv.data.toString('utf8'), /Folio,Fecha,Habitante/);
  for (const tipo of ['adeudos', 'habitantes']) assert.equal((await tes.post('/api/reportes', { tipo_reporte: tipo })).status, 201);
  assert.ok((await admin.get('/api/reportes')).data.length >= 3);
});

test('eliminar pago revierte adeudo; no se elimina lo relacionado', async () => {
  assert.equal((await tes.del(`/api/pagos/${idPago}`)).status, 204);
  const a = (await tes.get(`/api/adeudos/${idAdeudo}`)).data;
  assert.equal(a.monto_pendiente, '1000.00'); assert.equal(a.estado, 'pendiente');
  assert.equal((await tes.del(`/api/habitantes/${idHab}`)).status, 403);
  assert.equal((await sec.del(`/api/habitantes/${idHab}`)).status, 409); // tiene pago y adeudo
  await tes.del(`/api/pagos/${idPagoLibre}`);
  assert.equal((await tes.del(`/api/adeudos/${idAdeudo}`)).status, 204);
  assert.equal((await sec.del(`/api/habitantes/${idHab}`)).status, 204);
});

test('admin: usuarios, bloqueo, roles y configuración', async () => {
  let r = await admin.post('/api/usuarios', { nombre_usuario: `user${sufijo}`, contrasena: 'Clave12345', id_rol: 3 });
  assert.equal(r.status, 201); idUsuario = r.data.id_usuario;
  assert.equal((await admin.post('/api/usuarios', { nombre_usuario: `user${sufijo}`, contrasena: 'Clave12345', id_rol: 3 })).status, 409);
  assert.equal((await admin.post('/api/usuarios', { nombre_usuario: 'corto', contrasena: '123', id_rol: 3 })).status, 400);

  const otro = cliente();
  await otro.login(`user${sufijo}`, 'Clave12345');
  assert.equal((await admin.patch(`/api/usuarios/${idUsuario}/estado`, { estado: 'bloqueado' })).status, 200);
  assert.equal((await otro.get('/api/auth/me')).status, 401);   // sesión existente invalidada
  assert.equal((await cliente().post('/api/auth/login', { nombre_usuario: `user${sufijo}`, contrasena: 'Clave12345' })).status, 403);

  assert.equal((await admin.put('/api/roles/asignar', { id_usuario: idUsuario, id_rol: 2 })).data.nombre_rol, 'Tesorero');
  const yo = (await admin.get('/api/auth/me')).data.usuario;
  assert.equal((await admin.patch(`/api/usuarios/${yo.id_usuario}/estado`, { estado: 'bloqueado' })).status, 409); // autobloqueo
  assert.equal((await admin.del(`/api/usuarios/${idUsuario}`)).status, 204);

  const roles = (await admin.get('/api/roles')).data;
  assert.equal(roles.length, 3);
  const cfg = await admin.put('/api/configuracion', { nombre_comunidad: 'Asamblea de Prueba', localidad: 'Oaxaca' });
  assert.equal(cfg.status, 200);
  assert.equal((await tes.put('/api/configuracion', { nombre_comunidad: 'X' })).status, 403);
  await admin.put('/api/configuracion', { nombre_comunidad: 'Asamblea Comunitaria de San Juan Teponaxtla', localidad: 'Putla Villa de Guerrero, Oaxaca' });
});

test('logout', async () => {
  assert.equal((await sec.post('/api/auth/logout')).status, 204);
});
