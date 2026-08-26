#!/usr/bin/env bash
# Nomix — levanta el entorno de desarrollo completo con un comando.
#   Carga nvm, asegura Postgres + Redis, compila, y arranca API + frontend.
#   Ctrl+C detiene todo limpiamente.
#
# Uso:  bash scripts/dev-up.sh
set -euo pipefail

# --- Ubicación del repo (este script vive en scripts/) ---
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# --- Cargar nvm (por si el shell no lo tiene) ---
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
command -v pnpm >/dev/null || { echo "✗ pnpm no está en el PATH. Corre antes: bash scripts/setup-dev-host.sh"; exit 1; }

echo "== Nomix dev =="
echo "  node $(node -v)  ·  pnpm $(pnpm -v)"

# --- .env ---
if [ ! -f .env ]; then
  cp .env.example .env
  echo "  · .env creado desde .env.example"
fi
if ! grep -q '^FIELD_ENCRYPTION_KEY=.\+' .env; then
  KEY="$(openssl rand -base64 32)"
  sed -i '/^FIELD_ENCRYPTION_KEY=/d' .env
  echo "FIELD_ENCRYPTION_KEY=$KEY" >> .env
  echo "  · FIELD_ENCRYPTION_KEY generada"
fi

# --- Postgres + Redis (idempotente, proyecto aislado 'nomix') ---
echo "== Base de datos =="
docker compose --env-file .env -p nomix -f docker/docker-compose.yml up -d postgres redis >/dev/null
printf "  esperando postgres"
for _ in $(seq 1 30); do
  s="$(docker inspect -f '{{.State.Health.Status}}' nomix-postgres-1 2>/dev/null || echo none)"
  [ "$s" = "healthy" ] && { echo " ✓"; break; }
  printf "."; sleep 1
done

# --- Compilar (rápido si está cacheado) ---
echo "== Compilando =="
pnpm build >/dev/null 2>&1 && echo "  ✓ build" || { echo "  ✗ build falló — corre 'pnpm build' para ver el detalle"; exit 1; }

# --- Cargar variables de entorno para los procesos ---
set -a; . ./.env; set +a
export API_PORT="${API_PORT:-3000}"

# --- Limpieza al salir ---
API_PID=""
cleanup() {
  echo ""
  echo "== Deteniendo =="
  [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null || true
  # por si vite dejó hijos
  pkill -P $$ 2>/dev/null || true
  echo "  ✓ API detenida (los contenedores siguen arriba; 'pnpm infra:down' para bajarlos)"
}
trap cleanup EXIT INT TERM

# --- API en segundo plano ---
echo "== API =="
( cd apps/api && node dist/main.js ) &
API_PID=$!
printf "  esperando API"
for _ in $(seq 1 30); do
  curl -fsS "http://127.0.0.1:${API_PORT}/api/health" >/dev/null 2>&1 && { echo " ✓  http://127.0.0.1:${API_PORT}/api"; break; }
  printf "."; sleep 1
done

# --- Frontend en primer plano (Ctrl+C aquí detiene todo) ---
echo "== Frontend =="
echo "  Login: demo@nomix.pa / Demo1234"
echo "  Abre:  http://$(hostname -I | awk '{print $1}'):5173   (o http://localhost:5173)"
echo ""
cd apps/web
pnpm dev --host
