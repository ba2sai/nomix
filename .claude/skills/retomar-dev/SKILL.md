---
name: retomar-dev
description: Conecta al servidor de desarrollo de Nomix (192.168.1.207) al arrancar una sesión, compara su estado contra el repo local de esta máquina y resume en qué quedó el trabajo. Actívalo cuando JK diga "retomemos", "conéctate al dev", "en qué quedamos", "revisa el servidor", o al inicio de cualquier sesión de trabajo en este proyecto donde JK quiera seguir donde lo dejó — sin importar si esta máquina es la laptop o la PC de casa.
---

# Retomar desarrollo — conectar al servidor Dev y ver dónde quedamos

JK trabaja este proyecto desde dos máquinas (laptop y PC de casa) contra un único
servidor de desarrollo compartido. Este skill es el punto de entrada de sesión: antes
de proponer o escribir nada, establece qué máquina tiene el trabajo más reciente y
qué falta por sincronizar.

**Servidor Dev:** `labadmin@192.168.1.207` (hostname `dockercplane`, Ubuntu). Acceso
por clave SSH — sin contraseña. Ahí corren, vía `pnpm dev`, la API (puerto 3000) y el
web (puerto 5173), más Postgres y Redis en Docker (`nomix-postgres-1`,
`nomix-redis-1`). El repo remoto vive en `~/nomix`.

## Paso 1 — Verificar acceso SSH

```bash
ssh -o BatchMode=yes -o ConnectTimeout=5 labadmin@192.168.1.207 "hostname && whoami"
```

- **Si falla** (esta es una máquina nueva sin la clave instalada): dile a JK que esta
  máquina no tiene acceso todavía. Genera un par de claves (`ssh-keygen -t ed25519 -f
  ~/.ssh/id_ed25519 -N ""` si no existe una), muéstrale la pública, y pídele que corra
  él mismo `ssh-copy-id labadmin@192.168.1.207` desde su terminal (la contraseña se
  escribe interactivamente ahí, nunca la pidas por chat ni la seas tú quien la teclee
  en un comando). No sigas al paso 2 hasta confirmar el acceso.
- **Si funciona:** sigue.

## Paso 2 — Estado del repo en el servidor

```bash
ssh -o BatchMode=yes labadmin@192.168.1.207 "cd ~/nomix && git log --oneline -5 && echo --- && git status --short"
```

## Paso 3 — Estado del repo local (esta máquina)

```bash
git -C <ruta-del-repo-local> log --oneline -5
git -C <ruta-del-repo-local> status --short
```

Si esta máquina no tiene el repo clonado todavía, dilo explícitamente — no asumas
dónde vive.

## Paso 4 — Comparar y resolver la divergencia

Con los dos `git status`/`git log` en mano:

- **Mismo commit, ambos limpios:** no hay nada pendiente de sincronizar. Continúa al
  paso 5.
- **Mismo commit, uno de los dos con cambios sin commitear:** ese lado tiene trabajo
  en curso que el otro no ve. Dile a JK cuáles archivos son y pregúntale si quiere
  traerlos aquí antes de seguir (no lo hagas por tu cuenta si hay cambios en AMBOS
  lados a la vez — ahí sí hay que decidir cuál gana, o fusionar a mano).
- **Commits distintos:** el repo local y el del servidor divergieron. No hagas
  `git push --force` ni sobrescribas nada sin que JK lo decida explícitamente.

Para traer cambios de esta máquina al servidor (cuando está claro que esta máquina
tiene la versión buena y el servidor no tiene trabajo propio sin commitear):

```bash
git -C <ruta-del-repo-local> status --porcelain | awk '{ $1=""; sub(/^ /,""); print }' > /tmp/retomar-dev-files.txt
rsync -av --relative --files-from=/tmp/retomar-dev-files.txt -e ssh <ruta-del-repo-local>/./ labadmin@192.168.1.207:~/nomix/
```

Esto sincroniza solo los archivos que `git status` marca (modificados + nuevos), sin
tocar `node_modules`, `.env` ni nada que ya esté corriendo en el servidor. Si hay
directorios nuevos en la lista, expándelos a archivos individuales antes del rsync
(un directorio entero como línea de `--files-from` no basta).

Para el sentido contrario (traer del servidor a esta máquina), el mismo patrón con
origen y destino invertidos.

## Paso 5 — Qué está corriendo

```bash
ssh -o BatchMode=yes labadmin@192.168.1.207 "ps aux | grep -E 'node|pnpm|vite' | grep -v grep; echo ---; ss -tlnp 2>/dev/null | grep -E ':3000|:5173|:5432|:6379'; echo ---; docker ps"
```

Confirma que API, web, Postgres y Redis siguen sanos. Si algo no está corriendo y
hace falta para la sesión, ofrece levantarlo (`pnpm dev` desde `~/nomix` vía SSH, o
`docker compose up -d` si los contenedores están caídos) — pero pregunta antes de
matar o reiniciar un proceso que ya está arriba.

## Paso 6 — Resumen para JK

Cierra con un resumen corto, no una transcripción de los comandos:

1. **Conexión:** ok / no disponible en esta máquina (y qué hiciste al respecto).
2. **Sincronía:** local y servidor en el mismo commit, o qué diverge y qué falta
   traer/llevar.
3. **Corriendo:** qué servicios están arriba en el servidor.
4. **Dónde quedamos:** lee la sección "Orden de construcción" y el "Registro de
   cambios" al final de `ARCHITECTURE.md` (no los repitas de memoria — ese archivo
   cambia con cada sesión) y menciona el siguiente ítem `⬜`/`🟡` pendiente, más
   cualquier trabajo sin commitear detectado en el paso 4 que todavía no tenga dueño
   claro.

No hace falta preguntar "¿en qué seguimos?" si `ARCHITECTURE.md` ya deja claro cuál es
el siguiente paso — propón continuar ahí y deja que JK corrija si prefiere otra cosa.

## Fuera de alcance de este skill

- No borra `~/nomix-legacy-scp` ni `~/nomix-backup-antes-paso4.tgz` en el servidor
  automáticamente — son artefactos de despliegues anteriores; si estorban, pregúntale
  a JK antes de tocarlos.
- No instala paquetes del sistema (`sshpass`, etc.) ni modifica `sudo` — si hace
  falta algo que requiere privilegios que esta sesión no tiene, dilo y espera
  instrucción.
- No configura hooks automáticos de `SessionStart` — eso vive en `settings.json` y es
  una decisión aparte (bloqueada por el clasificador de auto mode la última vez que
  se intentó). Este skill es de invocación manual mientras esa vía no esté resuelta.
