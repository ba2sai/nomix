#!/usr/bin/env bash
# Nomix — prerequisitos del host de desarrollo (Ubuntu 26.04)
# Instala: nvm + Node 22 + pnpm 9 (vía Corepack). Docker se asume ya presente.
# Uso:  bash scripts/setup-dev-host.sh
set -euo pipefail

echo "== 1/5  Verificando Docker y Compose v2 =="
if ! command -v docker >/dev/null 2>&1; then
  echo "  ✗ Docker no está instalado. Instálalo primero:"
  echo "    https://docs.docker.com/engine/install/ubuntu/"
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "  ✗ Falta el plugin Compose v2 (docker compose)."
  echo "    sudo apt-get install -y docker-compose-plugin"
  exit 1
fi
echo "  ✓ $(docker --version)"
echo "  ✓ $(docker compose version | head -1)"
# Recomendado: usar docker sin sudo
if ! docker info >/dev/null 2>&1; then
  echo "  ⚠ No puedes hablar con el daemon sin sudo. Añádete al grupo:"
  echo "    sudo usermod -aG docker \$USER   # luego cierra y reabre sesión"
fi

echo "== 2/5  Instalando nvm (si falta) =="
export NVM_DIR="$HOME/.nvm"
if [ ! -s "$NVM_DIR/nvm.sh" ]; then
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
fi
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

echo "== 3/5  Instalando Node 22 LTS =="
nvm install 22
nvm alias default 22
nvm use 22
echo "  ✓ node $(node --version)"

echo "== 4/5  Habilitando pnpm 9 vía Corepack =="
corepack enable
corepack prepare pnpm@9.12.0 --activate
echo "  ✓ pnpm $(pnpm --version)"

echo "== 5/5  Verificación final =="
printf "  node   %s\n  pnpm   %s\n  docker %s\n" \
  "$(node --version)" "$(pnpm --version)" "$(docker --version | awk '{print $3}' | tr -d ,)"

cat <<'NEXT'

  ✓ Host listo. Próximos pasos, desde la raíz del repo:

      cp .env.example .env          # completa POSTGRES_PASSWORD y demás
      pnpm install                  # instala el workspace (fija pnpm-lock.yaml)
      pnpm test                     # valida el motor contra datos reales
      docker compose -p nomix -f docker/docker-compose.yml up -d postgres redis
      pnpm db:generate && pnpm db:migrate

NEXT
