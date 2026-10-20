// Las respuestas de la API contienen datos sensibles: que ningún navegador ni proxy las guarde
module.exports = (req, res, next) => {
  res.set({ 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache' });
  next();
};