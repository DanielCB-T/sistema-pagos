// Composición de la aplicación Express
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const config = require('./config/env');
const { autenticar } = require('./middlewares/auth');
const csrf = require('./middlewares/csrf');
const noCache = require('./middlewares/noCache');
const auditoria = require('./middlewares/auditoria');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();
app.disable('x-powered-by');
if (config.trustProxy) app.set('trust proxy', /^\d+$/.test(config.trustProxy) ? Number(config.trustProxy) : config.trustProxy);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: null,
    },
  },
  crossOriginResourcePolicy: { policy: 'same-origin' },
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// --- API ---
// Límite general por IP (protege contra abuso y barridos automatizados)
const limiteGeneral = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Demasiadas solicitudes. Intente de nuevo en un momento', code: 'RATE_LIMIT' } },
});
app.use('/api', noCache, limiteGeneral, auditoria, csrf);
app.use('/api/auth', require('./modules/auth/auth.routes'));
app.use('/api', autenticar); // todo lo que sigue exige sesión vigente
app.use('/api/usuarios', require('./modules/usuarios/usuarios.routes'));
app.use('/api/roles', require('./modules/roles/roles.routes'));
app.use('/api/habitantes', require('./modules/habitantes/habitantes.routes'));
app.use('/api/adeudos', require('./modules/adeudos/adeudos.routes'));
app.use('/api/pagos', require('./modules/pagos/pagos.routes'));
app.use('/api/reportes', require('./modules/reportes/reportes.routes'));
app.use('/api/configuracion', require('./modules/configuracion/configuracion.routes'));
app.use('/api', notFound);

// --- Frontend estático ---
app.use(express.static(path.join(__dirname, '..', '..', 'frontend'), { dotfiles: 'ignore', index: 'index.html' }));

app.use(errorHandler);
module.exports = app;