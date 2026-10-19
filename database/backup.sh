#!/usr/bin/env bash
# Respaldo de la base de datos (pg_dump). Uso:  ./database/backup.sh [carpeta_destino]
# Lee las credenciales de backend/.env. Programar con cron, p. ej. diario a las 22:00:
#   0 22 * * * /ruta/al/proyecto/database/backup.sh /ruta/a/respaldos
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
set -a; source "$RAIZ/backend/.env"; set +a
DESTINO="${1:-$RAIZ/respaldos}"
mkdir -p "$DESTINO"
ARCHIVO="$DESTINO/sistema_pagos_$(date +%Y%m%d_%H%M%S).sql.gz"
PGPASSWORD="${PGPASSWORD:-}" pg_dump -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "${PGUSER:-postgres}" "${PGDATABASE:-sistema_pagos}" | gzip > "$ARCHIVO"
find "$DESTINO" -name 'sistema_pagos_*.sql.gz' -mtime +30 -delete   # conserva 30 días
echo "Respaldo creado: $ARCHIVO"
# Restaurar:  gunzip -c archivo.sql.gz | psql -d sistema_pagos
