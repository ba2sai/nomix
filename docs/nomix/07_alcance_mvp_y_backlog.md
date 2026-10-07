# Alcance del MVP y Backlog de Construcción: Nomix

**Documento:** `07_alcance_mvp_y_backlog.md`  
**Proyecto:** **Nomix - Nómina inteligente**  
**Estado:** `ACCEPTED` (el backlog se actualiza a medida que avanza el trabajo)  
**Equipo:** Claude y Codex (implementan y se revisan entre sí) + el dueño del producto (aprobación final)

---

## 1. Alcance del MVP

**Objetivo:** que una empresa panameña pueda procesar su planilla quincenal completa en Nomix, de principio a fin, con cálculos correctos y trazables.

### 1.1 Dentro del MVP
- Usuarios con 2FA, varias empresas por usuario y roles.
- Empresas, catálogos (departamentos, cargos, sucursales) y colaboradores con datos sensibles cifrados.
- Catálogo de reglas legales con parámetros por vigencia.
- Planilla regular (quincenal) con salario, horas extra y novedades ingresadas a mano, descuentos a acreedores, CSS, SE, ISR y cargas patronales.
- Recálculo en vivo por colaborador en planillas en borrador, con la traza de cada cálculo (*Inspection Drawer*).
- Flujo de aprobación y planillas inmutables.
- Comprobantes de pago en PDF.
- Archivo ACH de **un** banco.
- XIII mes, vacaciones y liquidaciones.
- Reportes base: resumen de planilla y cargas patronales.
- Auditoría.

### 1.2 Fuera del MVP (fases posteriores)
- Marcaciones de relojes biométricos.
- Portal y bot de WhatsApp para colaboradores.
- Copiloto de IA y detector de anomalías.
- n8n e integraciones con ERPs.
- Simulador financiero.
- Planillas bisemanales y por hora (el modelo de datos ya las contempla).
- Archivo SIPE, hasta tener la especificación oficial del formato.
- ACH de varios bancos (se agregan como adaptadores).
- Réplica de lectura de BD y Redis Sentinel.

---

## 2. Hitos

| Hito | Nombre | Resultado | Tickets |
|---|---|---|---|
| H0 | Fundación | Repo, Docker, CI y bases de backend y frontend funcionando | NMX-001 a NMX-006 |
| H1 | Motor legal | Reglas de cálculo puras y probadas | NMX-010 a NMX-018 |
| H2 | Empresas y colaboradores | Multi-inquilino, autenticación, CRUD con cifrado | NMX-020 a NMX-027 |
| H3 | Planilla regular | Crear, calcular, recalcular, revisar y aprobar | NMX-030 a NMX-036 |
| H4 | Salidas | PDF, ACH, reportes | NMX-040 a NMX-043 |
| H5 | Prestaciones | XIII mes, vacaciones, liquidaciones | NMX-050 a NMX-053 |
| H6 | Salida a producción | Validación legal, seguridad, despliegue y respaldos | NMX-090 a NMX-095 |

H1 y H2 pueden avanzar en paralelo una vez cerrado H0.

---

## 3. Backlog

**Formato:** cada ticket tiene un responsable sugerido para implementar (**Impl.**) y otro para revisar (**Rev.**). La propuesta inicial reparte así: Claude implementa el motor y el backend de dominio, y Codex escribe sus pruebas legales y revisa; Codex implementa infraestructura y frontend, y Claude revisa. Se puede cambiar por ticket.

### H0 — Fundación

#### NMX-001 — Estructura del monorepo y Docker Compose
- **Impl.:** Codex · **Rev.:** Claude · **Depende de:** —
- Crear la estructura de la sección 1 de `05`, `docker-compose.yml` con los servicios de la sección 5, `Makefile`, `.env.example` y `.gitignore` completo.
- Rol de PostgreSQL de la aplicación **sin** `BYPASSRLS` y rol separado para migraciones.
- **Criterios de aceptación:**
  - `make up && make setup` deja la API respondiendo en `http://localhost:8080/api/health` y el frontend en `http://localhost:5173`.
  - `make down` limpia sin errores.
  - No se sube ningún secreto.

#### NMX-002 — Base del backend Laravel
- **Impl.:** Claude · **Rev.:** Codex · **Depende de:** NMX-001
- Laravel instalado en `backend/` con `declare(strict_types=1)` en todo archivo, Pint, PHPStan + Larastan, Pest y la estructura de carpetas `Domain/Application/Infrastructure/Http`.
- Prueba de arquitectura: `Domain` no usa clases de Laravel ni `float`.
- Endpoint `GET /api/health`.
- **Criterios de aceptación:** `make lint` y `make test` pasan; la prueba de arquitectura falla si se agrega un `use Illuminate\...` en `Domain`.

#### NMX-003 — Base del frontend
- **Impl.:** Codex · **Rev.:** Claude · **Depende de:** NMX-001
- Vite + React + TypeScript estricto, Tailwind, shadcn/ui, TanStack Query, React Router, ESLint, Prettier, Vitest.
- Layout base: sidebar, header y área de contenido; modo claro y oscuro.
- **Criterios de aceptación:** `npm run build`, `npm run lint`, `npm run typecheck` y `npm test` pasan; la página muestra el estado de `/api/health`.

#### NMX-004 — Integración continua
- **Impl.:** Codex · **Rev.:** Claude · **Depende de:** NMX-002, NMX-003
- Workflow de la sección 6 de `05` con PostgreSQL 16 como servicio.
- **Criterios de aceptación:** un PR con un error de lint o una prueba fallida queda en rojo.

#### NMX-005 — Value objects `Money` y `PayPeriod`
- **Impl.:** Claude · **Rev.:** Codex · **Depende de:** NMX-002
- `Money` sobre `brick/math`: suma, resta, multiplicación por tasa, comparación, `round()` según RULE-080 (configurable), serialización a string con 2 decimales.
- `PayPeriod`: quincenas (1–15 y 16–fin de mes), bisemanas y meses; días del período; partida de XIII mes a la que pertenece.
- **Criterios de aceptación:**
  - 0.1 + 0.2 = 0.30 exacto.
  - 1,234.56 × 9.75% = 120.37.
  - Quincena de febrero en año bisiesto termina el 29.
  - Prueba de mutación (Infection) sin mutantes vivos.

#### NMX-006 — Parámetros legales con vigencia
- **Impl.:** Claude · **Rev.:** Codex · **Depende de:** NMX-005
- Tabla `parametros_legales` (ver `06`), seeder con **todos** los valores del catálogo `04` y su estado de verificación, y `LegalParameters::forDate(DateTimeInterface)`.
- **Criterios de aceptación:**
  - `forDate('2026-10-15')` devuelve CSS patronal 13.25%; `forDate('2027-03-01')` devuelve 14.25%; `forDate('2025-03-31')` devuelve 12.25%.
  - La BD rechaza dos vigencias cruzadas para el mismo código.
  - Pedir un parámetro sin vigencia para la fecha lanza una excepción clara.

### H1 — Motor legal

> Cada ticket incluye las pruebas de `backend/tests/Legal/` con los casos del catálogo, escritas por el revisor. Si una regla está `PENDIENTE`, se implementa como parámetro y se marca en la traza.

| Ticket | Regla(s) | Descripción | Impl. | Rev. y pruebas |
|---|---|---|---|---|
| NMX-010 | — | `RuleTrace`, `LineItem`, `PayrollInput` y `PayrollResult` | Claude | Codex |
| NMX-011 | RULE-001, 002, 005, 006, 007 | Cuotas de CSS, SE y Riesgos Profesionales | Claude | Codex |
| NMX-012 | RULE-010 | Tarifa anual de ISR | Claude | Codex |
| NMX-013 | RULE-011, 012 | Estrategia de retención de ISR (parametrizada) y gastos de representación | Claude | Codex |
| NMX-014 | RULE-020, 021, 022 | Horas extra, recargos y salario por hora | Claude | Codex |
| NMX-015 | RULE-070 | Descuentos a terceros con prioridad y tope parametrizados | Claude | Codex |
| NMX-016 | — | `PayrollCalculator`: compone todas las reglas en un `PayrollResult` | Claude | Codex |
| NMX-017 | RULE-080 | Política de redondeo aplicada de punta a punta | Claude | Codex |
| NMX-018 | — | Pruebas de escenario: 10 colaboradores ficticios con resultados calculados a mano | Codex | Claude |

**Criterio común:** 100% de cobertura de líneas en `app/Domain/Payroll` y ninguna prueba depende de la BD.

### H2 — Empresas, usuarios y colaboradores

| Ticket | Descripción | Impl. | Rev. |
|---|---|---|---|
| NMX-020 | Autenticación con Sanctum SPA + Fortify 2FA (TOTP) | Claude | Codex |
| NMX-021 | Empresas, `empresa_user`, roles y Policies | Claude | Codex |
| NMX-022 | Middleware de tenant + RLS + Global Scope, con pruebas de aislamiento A/B | Claude | Codex |
| NMX-023 | Cifrado envolvente, cast `EncryptedField` y blind index de cédula | Claude | Codex |
| NMX-024 | Auditoría (`audit_logs` de solo inserción) | Claude | Codex |
| NMX-025 | API de catálogos y colaboradores, con historial salarial | Claude | Codex |
| NMX-026 | Frontend: login, 2FA, selector de empresa | Codex | Claude |
| NMX-027 | Frontend: catálogos y ficha del colaborador (wizard de 5 pasos) | Codex | Claude |

**Criterios clave:**
- Un usuario de la empresa A recibe 404 al pedir un colaborador de la empresa B, y una consulta SQL directa con el rol de la aplicación tampoco lo devuelve.
- En la BD, `cedula`, `numero_cuenta` y `salario_base` no aparecen en claro.
- Buscar un colaborador por cédula exacta funciona.

### H3 — Planilla regular

| Ticket | Descripción | Impl. | Rev. |
|---|---|---|---|
| NMX-030 | Novedades (horas extra, ausencias, bonos...) | Claude | Codex |
| NMX-031 | Crear planilla y calcular a todos los colaboradores activos (en cola si son muchos) | Claude | Codex |
| NMX-032 | Recalcular un colaborador (`RecalculateEmployee`) con bloqueo optimista | Claude | Codex |
| NMX-033 | Estados y aprobación; inmutabilidad con *trigger* | Claude | Codex |
| NMX-034 | Frontend: grilla de planilla editable con recálculo en vivo y diff visual | Codex | Claude |
| NMX-035 | Frontend: *Inspection Drawer* con la traza de cada línea | Codex | Claude |
| NMX-036 | E2E con Playwright: crear, editar, aprobar | Codex | Claude |

**Criterios clave:** editar una novedad actualiza el neto de ese colaborador en menos de 1 segundo; una planilla aprobada rechaza cualquier cambio (API y BD).

### H4 — Salidas

| Ticket | Descripción | Impl. | Rev. |
|---|---|---|---|
| NMX-040 | Comprobante de pago en PDF (en cola) | Codex | Claude |
| NMX-041 | Exportador ACH: interfaz `AchExporter` y adaptador del primer banco | Claude | Codex |
| NMX-042 | Reportes: resumen de planilla y cargas patronales (PDF y Excel) | Codex | Claude |
| NMX-043 | Envío de comprobantes por correo | Codex | Claude |

**Bloqueo:** NMX-041 necesita saber el banco y su especificación de formato (ver sección 5).

### H5 — Prestaciones

| Ticket | Regla(s) | Descripción | Impl. | Rev. |
|---|---|---|---|---|
| NMX-050 | RULE-030, 003, 004 | Planilla de XIII mes por partida | Claude | Codex |
| NMX-051 | RULE-040 | Acumulación y pago de vacaciones | Claude | Codex |
| NMX-052 | RULE-050 a 054 | Liquidaciones por causal | Claude | Codex |
| NMX-053 | — | Frontend de XIII mes, vacaciones y liquidaciones | Codex | Claude |

**Bloqueo:** NMX-052 no se cierra sin la matriz de causales revisada por el abogado (RULE-053).

### H6 — Salida a producción

| Ticket | Descripción | Responsable |
|---|---|---|
| NMX-090 | **Puerta legal:** todas las reglas del MVP en `VALIDADO` y pruebas actualizadas | Dueño del producto + profesional; Claude actualiza el catálogo |
| NMX-091 | Infraestructura de producción: servidor, Traefik/NGINX, TLS, Cloudflare | Codex · Rev. Claude |
| NMX-092 | Respaldos con PITR (WAL-G o pgBackRest) y prueba de restauración automatizada | Codex · Rev. Claude |
| NMX-093 | KMS de producción y rotación de claves | Claude · Rev. Codex |
| NMX-094 | Revisión de seguridad (OWASP ASVS nivel 2) y corrección de hallazgos | Claude y Codex |
| NMX-095 | Piloto: correr una planilla real en paralelo con el sistema actual y comparar | Dueño del producto |

---

## 4. Plan para Mañana (Día 1)

| Orden | Ticket | Quién | Nota |
|---|---|---|---|
| 1 | NMX-001 | Codex | Bloquea todo lo demás. Debe cerrarse primero. |
| 2a | NMX-002 → NMX-005 → NMX-006 | Claude | En secuencia, una rama y un PR por ticket |
| 2b | NMX-003 → NMX-004 | Codex | En paralelo con 2a |
| 3 | Revisiones cruzadas | Ambos | Cada PR lo revisa el otro agente antes de que el dueño del producto lo apruebe |

**Al final del día 1:** H0 cerrado, con CI en verde, `make up` funcionando y los parámetros legales cargados con su estado de verificación.

---

## 5. Pendientes del dueño del producto (no bloquean el día 1)

| Pendiente | Bloquea | Fecha límite sugerida |
|---|---|---|
| Contratar o conseguir un contador o abogado laboral que valide el catálogo `04` (empezar por RULE-011) | NMX-013 definitivo, NMX-052, NMX-090 | Antes de H3 |
| Elegir el primer banco para ACH y conseguir su especificación de archivo | NMX-041 | Antes de H4 |
| Crear la cuenta de nube (AWS, por el KMS) y definir región | NMX-091, NMX-093 | Antes de H6 |
| Conseguir la especificación oficial del archivo SIPE | Fase posterior | — |
| Dominio para la aplicación | NMX-091 | Antes de H6 |
| Planillas reales anonimizadas de PlaniFácil, para comparar resultados | NMX-018, NMX-095 | Cuando sea posible |
