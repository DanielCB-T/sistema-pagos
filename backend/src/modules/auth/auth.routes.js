const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('./auth.controller');
const { autenticar } = require('../../middlewares/auth');
const { loginMaxAttempts } = require('../../config/env');

// Freno a intentos de fuerza bruta (solo cuenta los intentos fallidos)
const limitarLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: loginMaxAttempts,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Demasiados intentos. Intente de nuevo en unos minutos', code: 'RATE_LIMIT' } },
});

router.post('/login', limitarLogin, ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', autenticar, ctrl.me);

module.exports = router;
