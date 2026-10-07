# Entorno local — NMX-001

## Alcance

Fundación técnica con una API Laravel real, una página React con comprobación de conexión y un proceso Horizon. No contiene reglas legales, usuarios, empresas ni planillas. NMX-002 y NMX-003 completan las herramientas y convenciones de cada aplicación.

## Versiones y dependencias

- PHP 8.5 (`php:8.5-fpm-bookworm`), Composer 2 y Laravel 13. Composer fija las versiones exactas en `backend/composer.lock`.
- React 18, Vite 8, TypeScript y Node 24 LTS (`frontend/.nvmrc` y `engines`). npm fija las versiones exactas en `frontend/package-lock.json`.
- PostgreSQL 16, Redis 7.4, Nginx 1.28 y Mailpit 1.29.
- Las imágenes fijan la serie de versiones; una reconstrucción puede incorporar parches. Los digests de producción y su actualización pertenecen a NMX-091.

Referencias consultadas para compatibilidad: [Laravel 13](https://laravel.com/framework/docs/releases), [PHP 8.5](https://www.php.net/releases/8.5/en.php), [Node LTS](https://nodejs.org/en/about/previous-releases) y [Vite 8](https://vite.dev/blog/announcing-vite8.html).

## Secuencia de arranque

1. `make env` genera `.env` desde el ejemplo, completa secretos vacíos y conserva los existentes. No imprime claves. Este paso está incluido en `make up`.
2. `make up` construye la imagen PHP y arranca PostgreSQL, Redis y Mailpit. No requiere PHP, Composer ni Node instalados en el host.
3. `make setup` instala dependencias desde los locks, ejecuta las migraciones con un contenedor de herramientas y arranca API, frontend y Horizon con comprobaciones de salud.
4. `make lint` y `make test` verifican la fundación. Las pruebas requieren `up` y `setup` completados.
5. `make down` apaga solo este proyecto y conserva sus volúmenes. Repetir `up` y `setup` lo restaura.

En PowerShell los mismos comandos se invocan como `.\nomix.ps1 env`, `.\nomix.ps1 up`, etc. El wrapper detiene la ejecución ante cualquier fallo de Docker. En Windows se recomienda Docker Desktop con backend WSL2. Si el editor no activa la recarga de Vite, establece `VITE_USE_POLLING=true` en `.env` y repite `setup`.

## Credenciales y privilegios

- `.env.example` no contiene claves. `.env` está excluido de Git; es exclusivamente local.
- `nomix_admin` inicializa PostgreSQL y las extensiones `citext` / `btree_gist`.
- `nomix_migrator` puede crear tablas en `public`. No es superusuario ni tiene `BYPASSRLS`.
- `nomix_app` solo puede conectar, usar el esquema y operar filas/secuencias concedidas. No es propietario de tablas, no puede crear tablas, asumir el rol migrador, ejecutar `TRUNCATE` ni desactivar RLS.
- API y Horizon reciben únicamente la credencial de aplicación. `migrate` y `checks` son servicios con perfil `tools`; solo se ejecutan explícitamente. `checks` necesita ambas credenciales para crear y eliminar una tabla efímera de pruebas.
- Los permisos por defecto conceden DML al rol de aplicación sobre tablas nuevas del migrador. Cada migración de negocio futura debe activar RLS y crear sus políticas **en la misma transacción**. `audit_logs` deberá revocar UPDATE/DELETE según NMX-024.
- Esta base prueba que RLS se puede aplicar con los roles correctos. El middleware de empresa y las políticas de negocio se implementan en NMX-022.
- La clave de sesión Laravel no es la futura clave de cifrado de campos. El cifrado envolvente AES-256-GCM y KMS pertenecen a NMX-023/093.

## Datos persistentes

Los volúmenes se nombran con `COMPOSE_PROJECT_NAME`: PostgreSQL, Redis, storage de Laravel, vendor y node_modules. Cambiar el nombre crea otro entorno. `down` no borra volúmenes.

Los scripts de inicialización de PostgreSQL se ejecutan solo cuando el volumen está vacío. Cambiar contraseñas en `.env` no cambia las de una BD existente. No regeneres `.env` para resolver un fallo de conexión: conserva las claves o realiza una rotación explícita. Las modificaciones de roles sobre instalaciones existentes requieren una operación administrada posterior.

No se crea ninguna tabla de negocio en este ticket. Laravel solo prepara su registro técnico de migraciones. Las pruebas RLS crean una tabla con nombre aleatorio y la eliminan en `finally`.

## Diagnóstico

- Estado: `docker compose ps`.
- API: `docker compose logs --tail=80 app nginx`.
- Worker: `docker compose logs --tail=80 horizon` y `docker compose exec horizon php artisan horizon:status`.
- BD: `docker compose logs --tail=80 postgres`. No compartas logs sin comprobar su contenido.
- Puertos: modifica `.env` antes de `up`, no detengas aplicaciones ajenas para liberar puertos.
- `/api/health` comprueba que Laravel responde. Las comprobaciones de BD, Redis, SMTP y aislamiento se ejecutan en `test`; el endpoint no sustituye una futura verificación de disponibilidad completa.
- Mailpit captura los correos de desarrollo. No envía mensajes externos.

## Entrega y revisión

Rama `nmx-001-monorepo-docker`, creada desde `ccr-2e3f57bc-j6bsvi`. Antes de integrar: revisión cruzada por Claude y aprobación del dueño del producto según `AGENTS.md`. Este ticket no configura todavía GitHub Actions.

### Verificación local del 7 de octubre de 2026

- Docker Desktop con contenedores Linux en Windows; comandos ejecutados con `nomix.ps1`.
- `lint`: Compose, Composer, sintaxis/strict_types de PHP y TypeScript correctos.
- `test`: permisos de roles, aislamiento de lectura/escritura A/B, contexto transaccional, API y proxy, Redis, SMTP y Horizon correctos. Dos pruebas HTTP con Node aprobadas, incluido el rechazo de acceso al panel Horizon. Build de React correcto.
- `down` seguido de `up` y `setup`: los cinco volúmenes se conservaron, `.env` mantuvo exactamente su contenido y la API volvió a responder.
- Horizon usa `SIGTERM` explícito, distinto de la señal predeterminada de la imagen PHP-FPM; su apagado terminó con código 0.
- GNU Make no está instalado en el host. Se verificó la sintaxis del Makefile con `make --dry-run` dentro de la imagen PHP; las operaciones equivalentes se ejecutaron realmente con PowerShell.
- Puertos de esta máquina: frontend `5173`, API `8082`, PostgreSQL `5433`, Redis `6379`, Mailpit `8025`. Los valores alternativos están solo en `.env`, porque otros proyectos ocupan `8080` y `5432`.
- `.env`, cachés de Laravel y `frontend/dist` quedan excluidos de Git.
- Revisión cruzada por Claude: pendiente. Este registro no sustituye esa revisión.
