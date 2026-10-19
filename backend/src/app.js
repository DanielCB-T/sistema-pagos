// Composición de la aplicación Express
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { autenticar } = require('./middlewares/auth');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: { useDefaults: true, directives: { upgradeInsecureRequests: null } },
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// --- API ---
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api', autenticar); // todo lo que sigue exige sesión
app.use('/api/usuarios', require('./modules/usuarios/usuarios.routes'));
app.use('/api/roles', require('./modules/roles/roles.routes'));
app.use('/api/habitantes', require('./modules/habitantes/habitantes.routes'));
app.use('/api/adeudos', require('./modules/adeudos/adeudos.routes'));
app.use('/api/pagos', require('./modules/pagos/pagos.routes'));
app.use('/api/reportes', require('./modules/reportes/reportes.routes'));
app.use('/api/configuracion', require('./modules/configuracion/configuracion.routes'));
app.use('/api', notFound);

// --- Frontend estático ---
app.use(express.static(path.join(__dirname, '..', '..', 'frontend')));

app.use(errorHandler);
module.exports = app;
