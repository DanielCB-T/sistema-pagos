# Sistema de Gestión de Pagos — Asamblea Comunitaria de San Juan Teponaxtla

Sistema web para registrar, consultar y dar seguimiento a los pagos y adeudos de los habitantes,
generar comprobantes (PDF) y reportes (CSV/impresión). Construido a partir del protocolo
*Metodología_Completa* (modelo E-R, modelo relacional, casos de uso e interfaces).

**Tecnologías (las del documento):** PostgreSQL + JavaScript
(Node.js/Express en el servidor; JavaScript puro con módulos ES en el navegador, sin paso de compilación).

## Requisitos
- Node.js 18 o superior
- PostgreSQL 12 o superior

## Puesta en marcha
```bash
# 1) Base de datos (solo el esquema)
createdb sistema_pagos
psql -d sistema_pagos -f database/schema.sql

# 2) Backend
cd backend
npm install
cp .env.example .env          # editar: PGPASSWORD y JWT_SECRET (>= 32 caracteres aleatorios)
npm run seed                  # crea los 3 roles y el usuario administrador (muestra la contraseña si no se definió)
npm start                     # http://localhost:3000  (sirve API + frontend)
```
Generar un secreto: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

Para probar rápido: `npm run seed:demo` agrega `tesorero / Tesorero123`, `secretario / Secretario123`
y 3 habitantes de ejemplo (**solo pruebas**, no usar en producción).

Pruebas de la API (con el servidor en marcha y `seed:demo`): `npm test`.

## Roles y permisos (según los diagramas de casos de uso)
| Módulo | Administrador | Tesorero | Secretario |
|---|---|---|---|
| Iniciar sesión | ✔ | ✔ | ✔ |
| Usuarios (registrar, editar, eliminar, **bloquear**) | ✔ | – | – |
| Roles (asignar, modificar) | ✔ | – | – |
| Configurar sistema | ✔ | – | – |
| Pagos: consultar (buscar/filtrar) | ✔ | ✔ | ✔ |
| Pagos: registrar (valida + consulta y actualiza adeudo), modificar, eliminar, comprobante PDF | – | ✔ | – |
| Adeudos: consultar | ✔ | ✔ | ✔ |
| Adeudos: registrar, modificar, eliminar | – | ✔ | – |
| Habitantes: consultar | ✔ | ✔ | ✔ |
| Habitantes: registrar, actualizar, eliminar | – | – | ✔ |
| Reportes: generar, imprimir, exportar CSV | ✔ | ✔ | ✔ |

La matriz vive en **un solo archivo**: `backend/src/config/permissions.js`. El frontend recibe los permisos
del servidor, así que basta con cambiarlo ahí.

## Estructura (modular)
```
database/
  schema.sql            Esquema PostgreSQL (6 tablas del modelo relacional)
  backup.sh             Respaldo con pg_dump (cron)
backend/
  scripts/seed.js       Roles + administrador inicial (+ demo opcional)
  tests/api.test.js     Pruebas de extremo a extremo de la API
  src/
    server.js / app.js  Arranque y composición de Express
    config/             env.js · db.js (pool, transacciones) · permissions.js
    middlewares/        auth.js (JWT en cookie) · rbac.js · errorHandler.js
    utils/              validators.js · sql.js · money.js · AppError.js
    modules/<modulo>/   *.routes.js  →  *.controller.js  →  *.service.js (SQL + reglas)
      auth · usuarios · roles · habitantes · adeudos · pagos · reportes · configuracion
frontend/
  index.html · css/main.css · img/
  js/
    main.js · routes.js         Arranque, sesión y rutas (#/pagos, #/usuarios…)
    core/                       api.js · session.js · dom.js · format.js
    components/                 layout · table · form · modal · toast (reutilizables)
    views/                      una vista por pantalla (login, home, pagos, adeudos, …)
```

## ¿Dónde corregir cada tipo de error?
| Síntoma | Dónde mirar |
|---|---|
| Un permiso de más/menos, opción de menú que no aparece | `backend/src/config/permissions.js` |
| Regla de negocio o consulta SQL de un módulo | `backend/src/modules/<modulo>/<modulo>.service.js` |
| Validación de un campo (longitud, formato) | `service.js` del módulo o `utils/validators.js` |
| Saldo de un adeudo incorrecto tras un pago | `adeudos.service.js` → `aplicarMovimiento()` |
| Formato del comprobante PDF | `modules/pagos/comprobante.pdf.js` |
| Contenido de un reporte / nuevo tipo de reporte | `modules/reportes/reportes.builders.js` (+ lista en `views/reportes.js`) |
| Estructura de las tablas | `database/schema.sql` |
| Una pantalla se ve o se comporta mal | `frontend/js/views/<pantalla>.js` |
| Aspecto de tablas, formularios, botones, ventanas | `frontend/js/components/*` y `css/main.css` |
| Error de red / sesión expirada | `frontend/js/core/api.js`, `session.js` |

Los errores del servidor se responden como `{ "error": { "message", "code" } }` y se registran en consola.

## Decisiones de diseño (dónde el sistema interpreta el documento)
- **Modelo de datos**: se siguió el *modelo relacional* (incluye `pago.id_adeudo`, que el E-R no dibuja).
  `id_adeudo` es opcional para permitir aportaciones voluntarias sin adeudo. `fecha_inicio/fecha_fin` de `reporte`
  son opcionales (los reportes de adeudos y habitantes no llevan periodo).
- **`contraseña` → `contrasena`** (sin ñ) en la BD; se guarda como hash bcrypt.
- **Usuario**: la tabla solo tiene `nombre_usuario`, por lo que el formulario de la interfaz muestra
  *Usuario, Contraseña, Cargo (rol) y Estado* (se omite el campo "Nombre" del prototipo).
- **Adeudos**: la tabla no tiene concepto; el concepto vive en cada pago. Un pago asociado a un adeudo lo reduce
  (relación "Reduce" del E-R) dentro de una transacción; modificar o eliminar el pago reajusta el saldo.
- **Modificar pago**: no cambia el habitante ni el adeudo (solo concepto, monto, fecha y observaciones).
- **Configurar sistema** no tiene tabla en el modelo, así que guarda nombre de la comunidad, localidad y leyenda del
  comprobante en `backend/data/configuracion.json`.
- **Roles**: son los 3 del documento con ids fijos; "modificar rol" cambia el nombre visible, no los permisos.
- **Administrador y pantallas del prototipo**: el menú del prototipo le muestra pagos, adeudos, habitantes y reportes;
  se le dio acceso de *solo lectura* (el caso de uso solo incluye "Consultar pago") más generación de reportes.
- **Eliminar** un usuario/habitante/adeudo con datos relacionados se rechaza con un mensaje (para usuarios se sugiere bloquear).
- El administrador no puede bloquearse, eliminarse ni cambiarse el rol a sí mismo.

## Seguridad y operación
- Sesión con JWT en cookie `httpOnly` + `SameSite=Strict`; el estado del usuario se revisa en cada petición
  (un usuario bloqueado pierde acceso de inmediato). Límite de intentos de login. Cabeceras con Helmet.
- Todas las consultas SQL son parametrizadas; el frontend nunca usa `innerHTML` con datos (previene XSS);
  el CSV neutraliza fórmulas (`= + - @`).
- Si se publica por HTTPS, poner `COOKIE_SECURE=true`. Si solo se usa en la red local (HTTP) dejar `false`.
- Las fechas por defecto usan la zona horaria de PostgreSQL; para Oaxaca: `ALTER DATABASE sistema_pagos SET timezone TO 'America/Mexico_City';`
- Respaldos: `database/backup.sh` (programar con cron). Restaurar: `gunzip -c archivo.sql.gz | psql -d sistema_pagos`.
