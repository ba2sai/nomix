# Entorno local — NMX-001

## Alcance

Fundación técnica con una API Laravel real, una página React con comprobación de conexión y un proceso Horizon. No contiene reglas legales, usuarios, empresas ni planillas. NMX-002 y NMX-003 completan las herramientas y convenciones de cada aplicación.

## Versiones y dependencias

- PHP 8.5 (`php:8.5-fpm-bookworm`), Composer 2 y Laravel 13. Composer fija las versiones exactas en `backend/composer.lock`.
- React 19, Vite 8, TypeScript y Node 24 LTS (`frontend/.nvmrc` y `engines`). npm fija las versiones exactas en `frontend/package-lock.json`.
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

## Calidad del backend (NMX-002)

| Herramienta | Configuración | Qué verifica |
|---|---|---|
| Pint | `backend/pint.json` | Preset `laravel` y `declare(strict_types=1)` en todo archivo PHP. `composer format` corrige; `lint` solo comprueba. |
| PHPStan + Larastan | `backend/phpstan.neon` | Nivel 8 en `app`, `bootstrap`, `config`, `routes` y el código de soporte de pruebas. |
| PHPStan | `backend/phpstan-domain.neon` | Nivel `max` en `app/Domain`, sin Larastan (el dominio no conoce Laravel). |
| Pest | `backend/phpunit.xml`, `backend/tests/` | Suites `Architecture`, `Unit`, `Feature` y `Legal`. |

Pruebas de arquitectura (`tests/Architecture/LayersTest.php`):

- `App\Domain` no usa `Illuminate`, `Laravel`, `Carbon` ni las capas `Application`, `Infrastructure` o `Http`.
- `App\Domain` no usa helpers globales del framework (`app`, `config`, `now`…) ni funciones de fecha del sistema (`time`, `date`…).
- `App\Domain` no usa `float`: tipo, casts, literales decimales ni `floatval`/`doubleval`. Lo comprueba `FloatUsageScanner`, que tiene sus propios casos positivos y negativos.
- `Application` no depende de `Http`; `Http` no accede a `Infrastructure`.
- Todo `App` declara `strict_types`.

Los archivos de prueba de Pest quedan fuera de PHPStan, porque sus APIs dinámicas (`$this->getJson`, `arch()->expect`) no se resuelven estáticamente; el código de soporte sí se analiza.

Las pruebas no leen un `.env` del backend: `backend/.env.testing` está versionado y vacío, y `phpunit.xml` fija `APP_ENV=testing`, caché y sesión en memoria, colas síncronas y correo en arreglo. La conexión a BD sigue siendo PostgreSQL (nunca SQLite), porque las pruebas de aislamiento necesitan RLS.

`tests/Infrastructure/smoke.php` se mantiene como comprobación de roles y RLS sobre PostgreSQL real; su migración a Pest corresponde a NMX-022. El antiguo `tests/Infrastructure/lint.php` se retiró: Pint y PHPStan cubren la sintaxis y `strict_types`.

## Finales de línea

`.gitattributes` fija LF en todo el texto (`* text=auto eol=lf`), también en Windows con `core.autocrlf=true`, porque Pint y Prettier exigen LF. Si un checkout antiguo quedó con CRLF, haz commit o guarda tus cambios y, con `git status` limpio, ejecuta `git rm --cached -r . && git reset --hard` para volver a escribir los archivos. **Atención:** `reset --hard` descarta cualquier cambio sin commit.

## Dominio: Money y PayPeriod (NMX-005)

**`App\Domain\Shared\Money\Money`** (sobre `brick/math` 1.0):

- Se crea con `Money::of('1234.56')` o con un entero. Solo acepta decimales simples (`-?\d+(\.\d+)?`): rechaza `1e3`, `1,234.56`, `.5`, espacios y, por tipado estricto, `float`.
- `plus`, `minus` y `multipliedBy` son exactas y conservan todos los decimales. Solo `dividedBy()` y `round()` redondean, y siempre con una `RoundingPolicy`.
- `toString()` / `jsonSerialize()` devuelven un string con 2 decimales y **fallan si el monto tiene más**. Obligan a redondear cada concepto de forma explícita antes de mostrarlo o guardarlo.

**`RoundingPolicy`** (RULE-080, `PENDIENTE`): escala final, modo (`HALF_UP`, `HALF_EVEN`, `HALF_DOWN`, `UP`, `DOWN`) y escala intermedia para divisiones. **No tiene valores por defecto en el código.** La propuesta del catálogo (2 decimales, `HALF_UP`, 6 intermedios) se cargará desde `parametros_legales` en NMX-006.

**`App\Domain\Shared\Period\PayPeriod`:** `fortnight(año, mes, 1|2)`, `biweekly(inicio)` (14 días) y `month(año, mes)`, con fechas inclusivas en medianoche UTC. Ofrece `days()` y `contains()`. `thirteenthMonthInstallment()` devuelve la partida del XIII mes (RULE-030) y falla si el período cruza dos partidas, algo posible en meses y bisemanas. `thirteenthMonthInstallments()` las lista todas. Cómo repartir el salario entre partidas no está en el catálogo y queda para el motor de XIII mes.

**Pruebas de mutación:** `composer mutate` (incluido en `make test`) ejecuta Pest Mutate sobre la suite `Unit` y exige 100%. Se usa Pest Mutate en lugar de Infection porque Infection 0.35 ya no tiene adaptador para Pest. Solo se mutan las clases declaradas con `mutates(...)` en las pruebas; `tests/Architecture/MutationCoverageTest.php` falla si una clase de `app/Domain` con código no está declarada. La imagen PHP incluye PCOV 1.0.12 como driver de cobertura.

## Parámetros legales (NMX-006)

**Dominio (`App\Domain\Shared\Legal`):**

- `LegalParameters`: los parámetros vigentes en una fecha. Es la entrada del motor de nómina; se construye con `LegalParameters::on($fecha, $parámetros)` y rechaza parámetros no vigentes en esa fecha o códigos repetidos. `value()` devuelve un string decimal (p. ej. `'0.132500'`), `table()` una tabla (tramos de ISR, escala de indemnización, política de redondeo) y `get()` el parámetro completo con `ruleId`, `status`, vigencia y `source` para las trazas.
- `LegalParameter`: una fila del catálogo. Valida el formato `RULE-000`, que haya valor o tabla (no ambos), que el valor sea un decimal simple y que la vigencia no termine antes de empezar. Vigencia inclusiva; sin inicio o sin fin significa abierta.
- `LegalParameterCode`: enum con todos los códigos; cada caso cita su regla. `VerificationStatus`: los estados del catálogo, y solo `VALIDADO` permite producción.
- `LegalParametersRepository::forDate(DateTimeInterface)`: contrato de carga. Es el `LegalParameters::forDate()` del backlog: no puede ser estático en un dominio sin BD, así que la carga la hace la implementación de `Infrastructure`.
- Pedir un parámetro sin vigencia lanza `LegalParameterException` con un mensaje que nombra el código y la fecha.

**Infraestructura:** `DatabaseLegalParametersRepository` consulta `parametros_legales` (`LegalParameterRecord`, sin cast `decimal`: pasaría por `float`) y está enlazada al contrato en `AppServiceProvider`. `make setup` ejecuta `migrate --seed` con el rol de migraciones; `ParametrosLegalesSeeder` carga **todos** los valores del catálogo `04` con su estado y su fuente, y es idempotente. Si cambia el catálogo, cambia el seeder en el mismo PR.

**Pruebas:** las de dominio (`tests/Unit/Domain/Shared/Legal`) entran en la mutación. Las de BD (`tests/Feature/Legal`) corren contra PostgreSQL real con el rol de aplicación, dentro de una transacción que se revierte (`DatabaseTransactions`); no usan `RefreshDatabase` porque el rol de aplicación no puede crear ni borrar tablas. Cubren los criterios de NMX-006, las restricciones de la tabla y la idempotencia del seeder.

## Frontend (NMX-003)

**Stack:** React 19, React Router 8, TanStack Query 5, Tailwind CSS 4 (plugin de Vite, sin `tailwind.config`) y componentes shadcn/ui copiados en `src/components/ui` (`components.json` permite agregar más con `npx shadcn add`). React 19 es una decisión aprobada del stack (D-13 en `00_decisiones_stack_nomix.md`).

**Estructura** (según `05` §3):

- `src/app/`: punto de entrada, providers (`AppProviders`), router con títulos en `handle.title`, layout (`layout/`) y tema (`theme/`).
- `src/features/<módulo>/`: `api.ts` con los hooks de TanStack Query, `components/` y `pages/`. Hoy: `health` e `inicio`.
- `src/components/ui/`: Button, Card, Badge y Sheet de shadcn/ui.
- `src/lib/`: `cn()`, cliente `apiGet()` con tiempo límite de 5 s y la fábrica del `QueryClient`.

**Layout:** sidebar fija en escritorio y panel desplegable en móvil (menor de 768 px), header con el título de la ruta y área de contenido. El panel móvil es un `Sheet` sobre el Dialog de Radix: lleva y contiene el foco, deja inerte el fondo, cierra con Escape y devuelve el foco al botón que lo abrió. Los módulos que aún no existen aparecen en la navegación como "Pronto", sin enlace.

**Modo claro y oscuro:** clase `.dark` en `<html>` con tokens de color en `src/app/styles.css`. El tema se guarda en `localStorage` (`nomix-theme`); si no hay valor guardado, se usa la preferencia del sistema. Un script en `index.html` aplica el tema antes del primer pintado para evitar el destello claro.

**Calidad:**

| Comando | Qué ejecuta |
|---|---|
| `npm run lint` | ESLint (`strictTypeChecked` de typescript-eslint, reglas de hooks y Fast Refresh) con cero avisos, y `prettier --check` |
| `npm run typecheck` | `tsc --noEmit` con `strict`, `noUncheckedIndexedAccess` y sin variables sin uso |
| `npm test` | Vitest + Testing Library en jsdom: pruebas de componentes, sin servicios |
| `npm run test:integration` | Pruebas con Node contra los servicios levantados: Vite, proxy `/api` y bloqueo de Horizon |
| `npm run format` | Prettier (con orden de clases de Tailwind) y `eslint --fix` |

`make lint` / `make test` (o `nomix.ps1`) ejecutan todos ellos además de los del backend.

## Integración continua (NMX-004)

`.github/workflows/ci.yml` se ejecuta en cada pull request (con cualquier rama base, lo que admite PRs encadenados), en cada push a `main` y a mano (`workflow_dispatch`). Un solo job en `ubuntu-24.04` repite la secuencia local:

1. `make env`: `.env` con secretos aleatorios propios de esa ejecución; no se usan secretos del repositorio.
2. Imagen PHP desde `docker/php/Dockerfile`, con caché de capas de GitHub Actions (equivale al `compose build app` de `make up`).
3. `docker compose up` de PostgreSQL 16, Redis y Mailpit; luego `make setup`, `make lint` y `make test`.
4. Ante un fallo, publica los registros de los servicios. Siempre apaga el entorno y borra los volúmenes.

**Por qué Docker Compose y no `services:` de GitHub:** el CI usa la misma imagen PHP 8.5 con PCOV, el mismo script de roles de PostgreSQL (rol de aplicación sin `BYPASSRLS`) y los mismos comandos que cada desarrollador, de modo que un verde en local equivale a un verde en CI.

**Seguridad:** permisos de solo lectura (`contents: read`), checkout sin credenciales persistidas y acciones de terceros fijadas por SHA de commit, con la versión en un comentario. Para actualizar una acción, reemplaza el SHA por el de la nueva etiqueta.

Un paso que falla deja el PR en rojo; `make` se detiene en el primer comando con error. `main` debe protegerse en GitHub exigiendo el check **CI / Lint y pruebas** antes de fusionar. Esta configuración la hace el dueño del repositorio.

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
