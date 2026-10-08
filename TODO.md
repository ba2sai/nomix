# TO DO — Nomix

**Actualizado:** 7 de octubre de 2026.  
**Objetivo del MVP:** procesar una planilla quincenal completa, con cálculos correctos, trazables y aislamiento entre empresas.

Este documento resume el avance y ordena los siguientes pasos. Los criterios completos y las dependencias de cada ticket están en el [backlog del MVP](docs/nomix/07_alcance_mvp_y_backlog.md).

## 1. Estado actual

**NMX-001 implementado, probado y publicado en GitHub; pendiente de revisión cruzada e integración.** H0 todavía no está cerrado.

- Rama: [`nmx-001-monorepo-docker`](https://github.com/ba2sai/nomix/tree/nmx-001-monorepo-docker).
- Rama de origen: `ccr-2e3f57bc-j6bsvi`.
- Commit de implementación: [`9890e7b`](https://github.com/ba2sai/nomix/commit/9890e7bab1b87c827a371519bbf2989709b9ecc6).
- Mensaje: `feat(nmx-001): incorpora monorepo y entorno Docker local`.
- Ya existe un arranque técnico; los módulos de negocio, autenticación y cálculos de nómina siguen pendientes.

**NMX-002 implementado, probado y publicado ([PR #1](https://github.com/ba2sai/nomix/pull/1)); pendiente de revisión cruzada (Codex) e integración.**

- Rama: `nmx-002-backend-base`, creada desde `nmx-001-monorepo-docker` porque NMX-001 aún no está integrado. Al fusionar NMX-001, el PR de NMX-002 se reorienta a `main`.
- Implementó: Claude. Revisa: Codex.

**NMX-003 implementado, probado y aprobado por Codex (tercera revisión, sobre `e215155`); pendiente de publicación, aprobación del dueño del producto e integración.**

- Rama: `nmx-003-frontend-base`, encadenada sobre `nmx-002-backend-base`.
- Implementó: Claude, por indicación del dueño del producto. Revisa: Codex.

**NMX-005 implementado y probado en local; pendiente de publicación, revisión cruzada (Codex) e integración.**

- Rama: `nmx-005-money-value-object`, encadenada sobre `nmx-003-frontend-base`.
- Implementó: Claude. Revisa: Codex.

## 2. Trabajo realizado

- [x] Analizar la documentación y ordenar el plan de desarrollo.
- [x] Mantener el stack aprobado: Laravel, React/Vite/TypeScript, PostgreSQL 16, Redis/Horizon y Docker Compose.
- [x] Delimitar NMX-001 como infraestructura y arranque mínimo; dejar la ampliación del backend/frontend en NMX-002 y NMX-003.
- [x] Crear la estructura `backend/`, `frontend/` y `docker/`, con las capas iniciales del backend.
- [x] Configurar PHP-FPM, Nginx, PostgreSQL, Redis, Horizon, frontend y Mailpit.
- [x] Implementar `/api/health` y una página React que comprueba la conexión con la API.
- [x] Fijar las dependencias en `composer.lock` y `package-lock.json`.
- [x] Separar los roles de PostgreSQL para administración, migraciones y aplicación; el rol de aplicación no tiene `BYPASSRLS` ni permisos de creación de tablas.
- [x] Generar claves locales aleatorias y excluir `.env`, dependencias, cachés y archivos de compilación de Git.
- [x] Añadir `Makefile` y `nomix.ps1` para ejecutar el entorno en Windows sin instalar Make.
- [x] Documentar instalación, puertos, persistencia y diagnóstico en la [guía del entorno local](docs/nomix/08_entorno_local.md).
- [x] Crear el commit y hacer push de NMX-001 al remoto `nomix`.

## 3. Validaciones realizadas

- [x] Construcción de la imagen PHP e instalación de dependencias.
- [x] Comprobaciones de Compose, Composer, sintaxis PHP, `strict_types` y TypeScript.
- [x] Pruebas de lectura y escritura entre empresas A/B sobre PostgreSQL real.
- [x] Verificación de que el contexto de empresa no persiste tras finalizar la transacción.
- [x] Rechazo de creación de tablas, desactivación de RLS y `TRUNCATE` desde el rol de aplicación.
- [x] Respuesta JSON de la API, acceso mediante el proxy de Vite, Redis y SMTP de Mailpit.
- [x] Horizon en ejecución y rechazo de acceso al panel sin autorización.
- [x] Dos pruebas HTTP del frontend y compilación de React.
- [x] Apagado y reinicio conservando los cinco volúmenes y las claves locales.
- [x] Apagado ordenado de Horizon con `SIGTERM` y código de salida 0.

Las operaciones de lint y pruebas se ejecutaron con PowerShell. El Makefile se comprobó con `make --dry-run` dentro de la imagen PHP; GNU Make no está instalado en el host. ESLint/Prettier/Vitest se incorporan en NMX-003.

### NMX-002 — Base del backend (7 de octubre de 2026)

**Implementación**

- [x] Dependencias de desarrollo fijadas en `composer.lock`: Pest 5.3 (PHPUnit 13.4), `pest-plugin-laravel`, Pint 1.32 y Larastan 3.13. Todas compatibles con PHP 8.5 y Laravel 13 sin forzar versiones.
- [x] Pint (`pint.json`): preset `laravel` y `declare_strict_types`. Se aplicó a `bootstrap/providers.php` y `tests/Infrastructure/smoke.php` (solo formato).
- [x] PHPStan nivel 8 en el backend (`phpstan.neon`) y nivel `max` en `app/Domain` sin Larastan (`phpstan-domain.neon`).
- [x] Pest con suites `Architecture`, `Unit`, `Feature` y `Legal` (`phpunit.xml`, `tests/Pest.php`, `tests/TestCase.php`).
- [x] Pruebas de arquitectura: `Domain` sin Laravel/Carbon/otras capas, sin helpers globales ni fecha del sistema, sin código de depuración; `Application` no usa `Http`; `Http` no usa `Infrastructure`; `strict_types` en todo `App`.
- [x] Prohibición de `float` en `Domain` mediante `FloatUsageScanner` (tipos, casts, literales, `floatval`/`doubleval`), con 18 casos propios positivos y negativos.
- [x] Prueba de `GET /api/health` con Pest.
- [x] Primera clase de dominio: `App\Domain\Shared\DomainException`, base de las excepciones de negocio (la usará NMX-006 para "parámetro sin vigencia").
- [x] `composer lint` = Pint + PHPStan ×2; `composer test` = Pest; `composer format` = Pint. `make test` / `nomix.ps1 test` ejecutan Pest antes de `smoke.php`.
- [x] Retirado `tests/Infrastructure/lint.php` (lo cubren Pint y PHPStan). `smoke.php` se mantiene; su migración a Pest corresponde a NMX-022.
- [x] `backend/.env.testing` versionado y vacío, con `<server>` + `<env force>` en `phpunit.xml`. Así las pruebas no buscan un `.env` del backend, que no existe en el contenedor, y no heredan `APP_ENV=local`.
- [x] Documentación: `README.md` y `docs/nomix/08_entorno_local.md` (sección "Calidad del backend").

**Pruebas**

- [x] `.\nomix.ps1 lint`: Compose, Composer, Pint (18 archivos), PHPStan nivel 8 y `max` sin errores, TypeScript. Código de salida 0.
- [x] `.\nomix.ps1 test`: Pest 26 pruebas (86 aserciones), roles/RLS en PostgreSQL real, API, proxy, Redis, SMTP, Horizon, pruebas HTTP y build del frontend. Código de salida 0.
- [x] Criterio de aceptación verificado a mano: al agregar en `Domain` una clase con `use Illuminate\Support\Str`, falla `Domain no depende de Laravel…` ("Expecting 'App\Domain' not to use 'Illuminate'"). Al agregar una con `float` y `0.0975`, falla `Domain no usa float` e indica archivo y línea. Los archivos se eliminaron después.
- [ ] La prueba negativa no quedó automatizada: generar archivos dentro de `app/Domain` durante la suite es frágil (montaje compartido con el host y restos si la ejecución se interrumpe). El detector de `float` sí tiene pruebas con fragmentos de código.

**Publicación, revisión e integración**

- [x] Commit `7bbb32a` y push de `nmx-002-backend-base` al remoto `nomix`.
- [x] PR [#1](https://github.com/ba2sai/nomix/pull/1) con la plantilla, contra `nmx-001-monorepo-docker`. Al integrarse NMX-001 se reorienta a `main`.
- [ ] Revisión cruzada de Codex.
- [ ] Aprobación del dueño del producto e integración.

**Notas para tickets siguientes**

- Pruebas de mutación: resuelto en NMX-005 con Pest Mutate (Infection 0.35 ya no admite Pest).
- Driver de cobertura: PCOV 1.0.12 añadido a la imagen PHP en NMX-005.
- Los archivos de prueba de Pest quedan fuera de PHPStan por sus APIs dinámicas. Si se quiere analizarlos, evaluar un plugin de PHPStan para Pest compatible con Pest 5.

### NMX-003 — Base del frontend (7 de octubre de 2026)

Por indicación del dueño del producto, lo implementó Claude (en el backlog figuraba Codex). Por tanto, la revisión cruzada la hace Codex.

**Implementación**

- [x] Rama `nmx-003-frontend-base`, encadenada sobre `nmx-002-backend-base` para no generar conflictos en `Makefile`, `nomix.ps1`, `README.md` y `TODO.md`.
- [x] React 19.3 en lugar de 18: React Router 8 lo exige. Registrado como decisión D-13 tras la revisión (ver abajo).
- [x] Dependencias fijadas en `package-lock.json` (0 vulnerabilidades): Tailwind CSS 4.3 (plugin de Vite), React Router 8.4, TanStack Query 5.104, ESLint 10 + typescript-eslint 8 (`strictTypeChecked`), Prettier 3.9 con orden de clases de Tailwind, Vitest 5 + Testing Library + jsdom.
- [x] shadcn/ui: `components.json`, `cn()` y componentes Button, Card y Badge en `src/components/ui`, adaptados a React 19.
- [x] Layout: sidebar (fija en escritorio, panel desplegable en móvil), header con título de la ruta y área de contenido. Página 404. Los módulos futuros aparecen como "Pronto", sin enlace.
- [x] Modo claro y oscuro: tokens en `styles.css`, preferencia en `localStorage` o del sistema, y script en `index.html` contra el destello inicial.
- [x] La página de inicio muestra el estado de `/api/health` con TanStack Query, valida la forma de la respuesta y ofrece "Reintentar" ante error.
- [x] Scripts: `lint` (ESLint sin avisos + Prettier), `typecheck`, `test` (Vitest), `test:integration` (las pruebas Node de NMX-001, ahora en `tests/integration/`), `format`.
- [x] `make lint`/`test` y `nomix.ps1` ejecutan typecheck, Vitest y las pruebas de integración.
- [x] Documentación: `README.md` y sección "Frontend (NMX-003)" en `docs/nomix/08_entorno_local.md`.

**Pruebas**

- [x] `npm run build`, `npm run lint`, `npm run typecheck` y `npm test` (15 pruebas en 4 archivos) pasan.
- [x] Revisión visual en Chrome: modo claro, modo oscuro, vista móvil de 375 px con menú abierto y estado "Conexión establecida". Consola sin errores ni avisos.
- [x] Al final de la revisión se borró la preferencia de tema guardada en el navegador.

**Publicación, revisión e integración**

- [x] Commit `3e09b72` en `nmx-003-frontend-base`.
- [x] Primera revisión cruzada de Codex sobre `3e09b72` (local, `tmp/nmx-003-review.md`): cambios solicitados con 3 hallazgos P2.
- [x] Correcciones aplicadas (ver "Ronda de revisión 1").
- [x] Segunda revisión de Codex sobre `925bb9f` (`tmp/nmx-003-review-925bb9f.md`): los 3 hallazgos anteriores quedaron resueltos y hay 1 nuevo P2.
- [x] Corrección aplicada (ver "Ronda de revisión 2").
- [x] Tercera revisión de Codex sobre `e215155`: aprobado.
- [ ] Push y PR contra `nmx-002-backend-base`, con reorientación posterior a `main`.
- [ ] Aprobación del dueño del producto e integración.

**Ronda de revisión 1 (Codex)**

| Hallazgo | Resolución |
|---|---|
| P2: `npm run lint` falla tras un checkout en Windows con `core.autocrlf=true` (Prettier exige LF y Git entregaba CRLF) | `.gitattributes` pasa a `* text=auto eol=lf`. Verificado con un worktree nuevo en esta máquina, que tiene `autocrlf=true`. |
| P2: el menú móvil no movía ni contenía el foco, no cerraba con Escape ni devolvía el foco | Nuevo `Sheet` de shadcn sobre `@radix-ui/react-dialog` 1.2. El botón del header es su `SheetTrigger`. 4 pruebas nuevas de teclado: foco inicial y contenido con Tab/Shift+Tab, fondo inerte, Escape, botón Cerrar y cierre al navegar. Revisado también en Chrome. |
| P2: React 19 contradecía el stack aceptado (D-02 decía React 18) | El dueño del producto aprobó React 19. Se registró como D-13 en `00_decisiones_stack_nomix.md` y se actualizaron el resumen y D-02. |

Además, se eliminó un aviso de Vite: `vitest.config.ts` importa `./vite.config.ts` con extensión, como pedirá el cargador nativo de configuración.

**Ronda de revisión 2 (Codex)**

| Hallazgo | Resolución |
|---|---|
| P2: al ampliar a escritorio (≥ 768 px) con el menú abierto, `md:hidden` ocultaba el panel pero el diálogo seguía abierto en modo modal: fondo sin punteros ni scroll y fuera del árbol de accesibilidad | Nuevo hook `useOnMediaQueryMatch`: `AppLayout` escucha `(min-width: 768px)` y cierra el menú al entrar en escritorio, y cancela la suscripción al desmontarse. Se cierra desde el listener, sin efectos que observen el estado. 2 pruebas nuevas con un simulador de `matchMedia`: cierre, liberación de punteros, scroll y accesibilidad, sin reapertura al volver a móvil, y limpieza de la suscripción. Ambas fallan si se quita el hook. En Chrome, al ampliar un iframe de 375 a 1024 px, se libera el fondo. |

Lección: en Windows, Vite dentro de Docker no detecta los cambios sin `VITE_USE_POLLING=true`. Antes de revisar en el navegador hay que reiniciar `frontend` o activar el polling.

**Notas para tickets siguientes**

- Los tipos de la API se generarán desde OpenAPI (`openapi-typescript`) cuando exista el contrato. Hoy `health` se valida a mano.
- React Hook Form + Zod y Playwright se incorporan con el primer formulario (NMX-026) y con H3, respectivamente.

### NMX-005 — Money y PayPeriod (7 de octubre de 2026)

**Implementación**

- [x] Rama `nmx-005-money-value-object`, encadenada sobre `nmx-003-frontend-base`.
- [x] `brick/math` 1.0. `Money`: creación desde string decimal o entero (rechaza notación científica, comas y `float`), `plus`, `minus`, `multipliedBy` exactas, `dividedBy` y `round` según `RoundingPolicy`, comparaciones y serialización a string de 2 decimales que exige redondeo previo.
- [x] `RoundingPolicy` (RULE-080, `PENDIENTE`) sin valores por defecto en el código; modos `HALF_UP`, `HALF_EVEN`, `HALF_DOWN`, `UP` y `DOWN`. Los valores se cargarán desde `parametros_legales` en NMX-006.
- [x] `PayPeriod`: quincenas, bisemanas y meses con fechas inclusivas en medianoche UTC, `days()`, `contains()` y partida del XIII mes (RULE-030) mediante `ThirteenthMonthInstallment`.
- [x] Pruebas de mutación con Pest Mutate (`composer mutate`, incluido en `make test`), 100% exigido. PCOV 1.0.12 añadido a la imagen PHP.
- [x] Prueba de arquitectura que obliga a declarar con `mutates()` cada clase de `app/Domain` con código.
- [x] Documentación: `05` §4, criterio de NMX-005 en `07` y sección "Dominio: Money y PayPeriod" en `08`.

**Pruebas**

- [x] Criterios: `0.1 + 0.2 = 0.30` exacto; `1,234.56 × 9.75% = 120.37`; la quincena de febrero termina el 29 en 2024 y 2028; mutación con 0 mutantes vivos (144 de 144 detectados).
- [x] También se cubren los casos del catálogo RULE-001 (500.00 → 48.75) y RULE-030 (6,000.00 ÷ 12 → 500.00).
- [x] PHPStan nivel `max` en `Domain` sin errores.

**Decisiones a validar en la revisión**

- [ ] **Pest Mutate en lugar de Infection.** El backlog nombraba Infection, pero su versión 0.35 eliminó el adaptador de Pest. El criterio de fondo ("sin mutantes vivos") se cumple.
- [ ] **Fechas de las partidas de RULE-030 en código** (`ThirteenthMonthInstallment::endMonth`). Son el calendario legal de la partida, no una tasa, y citan RULE-030. Si se prefiere, pueden pasar a `parametros_legales` en NMX-006.
- [ ] **`RoundingPolicy` sin valores por defecto.** Hasta NMX-006 no hay una política "oficial" utilizable fuera de las pruebas.

**Publicación, revisión e integración**

- [ ] Commit, push y PR contra `nmx-003-frontend-base`.
- [ ] Revisión cruzada de Codex, que además escribe pruebas legales desde el catálogo si lo considera necesario.
- [ ] Aprobación del dueño del producto e integración.

## 4. Siguientes pasos inmediatos

- [ ] Preparar el PR de NMX-001 con la plantilla del repositorio, criterios de aceptación y evidencia de validación. Definir su rama destino antes de abrirlo, considerando que el desarrollo partió de `ccr-2e3f57bc-j6bsvi`.
- [ ] Obtener la revisión de Claude y atender los hallazgos.
- [ ] Obtener la aprobación del dueño del producto e integrar según el flujo de [AGENTS.md](AGENTS.md). El implementador no fusiona su propio PR.
- [x] **NMX-002 — Backend:** incorporar Pint, PHPStan/Larastan y Pest; completar las capas y verificar que `Domain` no depende de Laravel ni usa `float`. Implementado y probado; falta publicación, revisión e integración (ver §3).
- [x] **NMX-003 — Frontend:** incorporar Tailwind, shadcn/ui, TanStack Query, React Router, ESLint, Prettier y Vitest; construir sidebar, header y modos claro/oscuro. Implementado y probado; falta revisión e integración (ver §3).
- [ ] **NMX-004 — CI:** después de NMX-002 y NMX-003, ejecutar lint, pruebas, typecheck y build en GitHub Actions con PostgreSQL real.
- [x] **NMX-005 — Money y PayPeriod:** después de NMX-002, implementar aritmética exacta y períodos, con redondeo configurable y pruebas de límites/mutación. Implementado y probado; falta revisión e integración (ver §3).
- [ ] **NMX-006 — Parámetros legales:** después de NMX-005, implementar vigencias, estados de verificación, rechazo de solapamientos y errores ante parámetros ausentes.

**Resultado esperado para cerrar H0:** entorno reproducible, backend/frontend con herramientas de calidad, CI en verde, objetos monetarios probados y parámetros legales versionados por fecha.

## 5. Decisiones y pendientes que deben resolverse

- [ ] Conseguir un contador o abogado laboral para validar el [catálogo legal](docs/nomix/04_catalogo_reglas_legales.md). Ninguna regla figura aún como `VALIDADO` en la documentación revisada.
- [ ] Priorizar retención de ISR, bases gravables, conversión de salario por hora, descuentos y redondeo. Las reglas pendientes deben seguir identificadas como tales.
- [ ] Documentar reglas faltantes para salario quincenal, ingreso a mitad de período, ausencias y cambios salariales dentro de una quincena, con casos de prueba y fuentes.
- [ ] Definir cómo conservar entradas históricas cifradas y presentar trazas según permisos sin guardar salario base en claro.
- [ ] Precisar la transición de planilla aprobada a pagada: mantener inmutables los cálculos y definir el registro de pago permitido.
- [ ] Completar el modelo y los tickets de ajustes, historial de parámetros por empresa y saldos/acumulados iniciales para empleados existentes.
- [ ] Elegir el primer banco ACH y conseguir su especificación antes de NMX-041.
- [ ] Definir cuenta AWS, región y dominio antes de la preparación de producción.
- [ ] Preparar históricos y casos de comparación anonimizados para el piloto, fuera del repositorio. Las pruebas del código utilizan datos ficticios.

Estas decisiones pueden gestionarse mientras se construye H0; sus bloqueos deben resolverse antes de implementar o habilitar los comportamientos afectados.

## 6. Ruta hasta el MVP

| Orden | Hito | Entrega | Dependencia o puerta de salida |
|---|---|---|---|
| 1 | H0 · Fundación | NMX-001 a 006 | Calidad técnica y CI verificadas |
| 2 | H1 · Motor legal | NMX-010 a 018 | Reglas puras y escenarios contrastados; puede avanzar junto con H2 después de H0 |
| 2 | H2 · Empresas y colaboradores | NMX-020 a 027 | Login/2FA, roles, cifrado, auditoría y aislamiento |
| 3 | H3 · Planilla regular | NMX-030 a 036 | Crear, recalcular, explicar, revisar y aprobar; E2E completo |
| 4 | H4 · Salidas | NMX-040 a 043 | PDF, reportes, correo y ACH de un banco verificados |
| 5 | H5 · Prestaciones | NMX-050 a 053 | XIII mes, vacaciones y liquidaciones; matriz de causales revisada |
| 6 | H6 · Producción | NMX-090 a 095 | Reglas validadas, seguridad, claves, restauración de backups y piloto aprobado |

**Primera demostración funcional:** dos empresas y diez colaboradores ficticios; iniciar sesión, seleccionar empresa, registrar colaboradores, crear una quincena, editar novedades, recalcular un colaborador, inspeccionar fórmulas y aprobar sin permitir cambios posteriores.

IA, WhatsApp, biométricos, n8n, SIPE y ACH multibanco permanecen en el alcance posterior al MVP definido en el backlog.

## 7. Comandos de referencia

```powershell
.\nomix.ps1 up
.\nomix.ps1 setup
.\nomix.ps1 lint
.\nomix.ps1 test
.\nomix.ps1 status
.\nomix.ps1 down
```

Con GNU Make: `make up`, `make setup`, `make lint`, `make test`, `make status` y `make down`.

Direcciones configuradas durante la validación de esta máquina: frontend `http://localhost:5173`, API `http://localhost:8082/api/health` y Mailpit `http://localhost:8025`. PostgreSQL usa el puerto local `5433`. Los puertos alternativos se configuran en `.env`; el ejemplo conserva `8080` y `5432`.

Actualizar este documento al terminar cada ticket, registrando por separado implementación, pruebas, publicación, revisión e integración.
