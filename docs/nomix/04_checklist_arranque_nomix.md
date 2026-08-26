# Checklist de Arranque: Información Disponible vs. Faltante

**Documento:** `04_checklist_arranque_nomix.md`
**Proyecto:** **Nomix - Nómina inteligente**
**Estado:** `ASSESSMENT`
**Fecha:** 2026-08-26
**Método:** Auditoría de los 10 documentos existentes (`docs/01..07`, `docs/nomix/01..03`) contra los requisitos mínimos para implementar la plataforma.

---

> ## 📌 ESTADO ACTUALIZADO — 2026-08-26
>
> Tras la investigación legal ([`06_base_legal_panama.md`](06_base_legal_panama.md)), varios huecos de este checklist **quedaron cerrados**. Estado real hoy:
>
> | Hueco | Estado | Dónde se resolvió |
> |---|---|---|
> | `GAP-003` Escalas de liquidación | ✅ **Cerrado** | Art. 225 (3.4 sem/año ≤10 años, 1 sem/año después) · Art. 224 · Fondo de Cesantía (1.92% + 5%) · preaviso completo — base legal §8 |
> | `GAP-005` *(parte de estados)* | 🟡 Parcial | Roles siguen pendientes; el ciclo de vida se elevó como consulta **F8** |
> | `GAP-006` Base gravable | 🟡 Parcial | Confirmado qué **no** cotiza (gastos repr., prima, indemnización, viáticos, subsidio). La matriz completa es la consulta **B1** |
> | `GAP-007` Convenciones | 🟡 Parcial | Divisor semanal 4.333 identificado; redondeo y divisor diario en consultas **F3** y **F4** |
> | `GAP-008` Horas extra | ✅ **Cerrado** | Art. 33 con rangos horarios · recargo de domingo 50% (Art. 48) · feriado 150% que incluye el día (Art. 49) · límite 3h/9h (Art. 36) — base legal §5 |
> | `GAP-010` `WF-003` Vacaciones | ✅ **Cerrado** | Art. 54–62 — base legal §6 |
> | Inembargabilidad *(riesgo legal)* | ✅ **Cerrado** | Art. 161: tope 50%, vivienda 30%, conceptos inembargables — base legal §9 |
> | Salario mínimo *(ausente)* | ✅ **Cerrado** | D.E. 13 de 2025 — base legal §10. Falta descargar la tabla de 59 tasas |
> | `DEC-003` Multi-país | ✅ **Decidido** | `ADR-008` — jurisdicción como dimensión, solo Panamá implementado |
> | `DEC-007` Cifrado de salario | ✅ **Decidido** | `ADR-007` — no cifrar `salario_base` a nivel de aplicación |
> | `GAP-001` Layouts ACH | 🔴 Abierto | Requiere manuales de banco o archivos de ejemplo |
> | `GAP-002` SIPE / Formulario 03 | 🔴 Abierto | Requiere especificaciones oficiales |
> | `GAP-004` Modelo transaccional | 🟡 Parcial | `ADR-002` define la estructura del catálogo de conceptos; faltan las entidades de planilla |
> | `GAP-005` Roles y permisos | 🔴 Abierto | Sin avance |
> | `DEC-001` Stack | ⏸️ **Pendiente** | `ADR-010` — única decisión que bloquea el scaffolding |
>
> **Cobertura para codificar: de ~55% a ~75%.** El grueso del motor está desbloqueado; lo que sigue bloqueado son formatos de archivo externos que no dependen del equipo.
>
> Consultas abiertas → [`07_consultas_profesional_planilla.md`](07_consultas_profesional_planilla.md)
> Decisiones de arquitectura → [`08_decisiones_arquitectura.md`](08_decisiones_arquitectura.md)

---

## 0. Veredicto en una línea

La documentación cubre muy bien **QUÉ existe** (88 pantallas, 55+ endpoints, 6 módulos, 12 causales legales) pero tiene vacíos críticos en **CÓMO se calcula y cómo se serializa**. Se puede arrancar hoy con ~55% del sistema; el 45% restante depende de 5 bloqueantes concretos, la mayoría resolubles con documentos externos (manuales de banco, CSS, DGI) y no con más análisis del software original.

| Área | Cobertura documental | ¿Se puede codificar ya? |
|---|---|---|
| Inventario de pantallas y navegación | 🟩 95% | Sí |
| Catálogos maestros (sucursal, depto, cargo, acreedor) | 🟩 85% | Sí |
| Ficha de colaborador | 🟨 40% (≈40 de 110+ campos) | Parcial |
| Motor de retenciones (CSS, SE, ISR) | 🟨 65% | Sí, con supuestos declarados |
| Motor de prestaciones (XIII, vacaciones) | 🟨 55% | Parcial |
| Motor de liquidaciones (Art. 210-227) | 🟥 30% | **No** — faltan las escalas |
| Exportadores ACH (8 bancos) | 🟥 5% | **No** — cero layouts |
| Reportes oficiales (SIPE, Form. 03) | 🟥 5% | **No** — cero layouts |
| Modelo de datos transaccional (planilla, marcación) | 🟥 15% | **No** |
| Roles y permisos | 🟥 0% | **No** |
| Máquina de estados de planilla | 🟥 0% | **No** |
| Arquitectura de despliegue / seguridad | 🟩 80% | Sí |

---

## 1. ✅ Lo que SÍ tenemos (base sólida, no hay que volver a investigar)

- [x] **Inventario funcional completo** — 88 pantallas `SCR-001` a `SCR-088` con endpoint, propósito y componentes (`02_application_map.md`).
- [x] **Inventario de endpoints** — 55+ APIs clasificadas por tipo: persistencia, ACH, PDF, liquidaciones (`05_api_and_endpoints_inventory.md`).
- [x] **Topología de módulos** — 6 módulos `MOD-001` a `MOD-006` con jerarquía (`01_application_overview.md`).
- [x] **Tasas de retención de ley** — CSS obrero 9.75% / patronal 12.25%; SE obrero 1.25% / patronal 1.50%.
- [x] **Tabla de tramos ISR** — Exento hasta $11,000; 15% de $11,000.01 a $50,000; $5,850 + 25% sobre el excedente de $50,000.
- [x] **Deducciones ISR** — $800 anuales por cónyuge, $250 anuales por dependiente.
- [x] **Ciclo del XIII Mes** — 3 partidas con sus períodos exactos (16-dic/15-abr, 16-abr/15-ago, 16-ago/15-dic), divisor /12, CSS obrero 7.25%, SE 0%.
- [x] **Las 12 causales de terminación** con su artículo del Código de Trabajo (`SCR-041` a `SCR-052`).
- [x] **Catálogo de campos de la ficha de colaborador** — ~40 campos con tipo, opciones de select y regla de negocio (`03_entities_and_data_model.md` §1.1-1.4).
- [x] **Entidad de descuentos/acreedores** (`ENT-005`) — 10 campos con opciones.
- [x] **Parámetros de empresa** (`ENT-003`) — 8 parámetros de configuración global.
- [x] **Los 8 bancos ACH de destino** — BAC, Banistmo, Banco General, Banesco, Multibank, Credicorp, Caja de Ahorros, Global Bank.
- [x] **35 reportes catalogados** con destinatario y propósito.
- [x] **Hallazgos de seguridad y UX** con mitigación (`FIND-001..004`, `UX-001..005`).
- [x] **Arquitectura de despliegue** — topología Docker, RLS multi-tenant, PITR/WAL-G, RPO<5s / RTO<15min (`nomix/03`).
- [x] **Visión de producto** — los 6 diferenciadores "Factor WOW" y el posicionamiento de mercado.

---

## 2. 🚨 BLOQUEANTES — sin esto no se puede escribir el código

### `GAP-001` — Layouts de archivos ACH: **cero especificación** 🟥
**Evidencia:** `05_api_and_endpoints_inventory.md` §2 lista `API-016` a `API-025` con solo el nombre del banco y una etiqueta vaga de formato ("Archivo plano", "texto estructurado", "Fixed-Width"). No hay ni un solo nombre de campo, posición, longitud, tipo de registro ni carácter de relleno.

**Por qué bloquea:** un archivo ACH es un contrato binario con el banco. Un byte fuera de posición = rechazo del lote = la nómina no se paga. Esto **no es inferible**: hay que obtenerlo del banco.

- [ ] Manual de formato ACH de **BAC Credomatic**
- [ ] Manual de formato ACH de **Banistmo**
- [ ] Manual de formato ACH de **Banco General**
- [ ] Manual de formato ACH de **Global Bank**
- [ ] Manual de formato ACH de **Multibank**
- [ ] Manual de formato ACH de **Banesco Panamá**
- [ ] Manual de formato ACH de **Credicorp Bank**
- [ ] Manual de formato ACH de **Caja de Ahorros**
- [ ] Alternativa práctica: **1 archivo de ejemplo real generado por PlaniFácil por cada banco** (con datos anonimizados) — sirve para hacer ingeniería inversa del layout

> **Mitigación mientras tanto:** diseñar el patrón Strategy con `AchExporter` como puerto y dejar los 8 adaptadores como stubs con tests pendientes. La arquitectura no se bloquea; los adaptadores sí.

---

### `GAP-002` — Layouts de SIPE (CSS) y Formulario 03 (DGI): **cero especificación** 🟥
**Evidencia:** `API-033` describe `rep_sipe.php` solo como *"archivo estructurado para carga en el sistema SIPE"*. `API-034` describe `gen_pla03.php` como *"Reporte Formulario 03 de la DGI"*. Ninguna columna, orden ni formato.

**Por qué bloquea:** el Factor WOW #4 promete *"Cero Rechazos en e-Tax 2.0"*. Es imposible garantizar cero rechazos contra un formato desconocido.

- [ ] Especificación oficial del archivo de importación **SIPE** de la Caja de Seguro Social
- [ ] Especificación oficial del **Formulario 03** / e-Tax 2.0 de la DGI
- [ ] Archivos de ejemplo aceptados por ambos portales
- [ ] Las 30+ reglas de validación fiscal que promete el Factor WOW #4 (hoy solo se enuncian, no se listan)

---

### `GAP-003` — Escalas legales de liquidación: **incompletas** 🟥
**Evidencia:** `04_payroll_and_liquidation_workflows.md` §3.1.3 dice literalmente: *"Primer año: 3.4 semanas por año. **Siguientes años: Escalas progresivas**"*. La escala progresiva nunca se escribe. Además §3.1.2 contiene una fórmula mal formada (`Años × Salario Semanal / 1` — el divisor `1` no tiene sentido) y remata con *"+ Proporción meses/días"* sin definir la proporción.

**Por qué bloquea:** el módulo `MOD-005` (12 causales) es el que más exposición legal tiene. Un error aquí es una demanda en MITRADEL.

- [ ] **Tabla completa del Art. 225** — indemnización por año de servicio, todos los tramos
- [ ] **Escala de preaviso** por antigüedad (Art. 212 / 222) — el doc solo menciona "30 días" y "deducción de 1 semana"
- [ ] **Mecánica exacta de la Prima de Antigüedad** (Art. 224) — cómo se prorratean meses y días incompletos
- [ ] **Composición del Fondo de Cesantía 1.92%** (Ley 44 de 1995) — `SCR-084` lo menciona sin desglose ni base de cálculo
- [ ] **Tratamiento del ISR sobre indemnizaciones** — `liqisr.php` / `SCR-054` existe pero sin regla (¿qué porción es exenta?)
- [ ] Confirmación de vigencia de todas las tasas y tramos a la fecha de lanzamiento

---

### `GAP-004` — Modelo de datos transaccional: **ausente** 🟥
**Evidencia:** `07_final_reverse_engineering_specification.md` §5 promete *"`ENT-001` a `ENT-010`"*. Un `grep` sobre todos los documentos devuelve únicamente **`ENT-001`, `ENT-003` y `ENT-005`**. Siete entidades prometidas nunca se escribieron — y las que faltan son las centrales.

**Por qué bloquea:** `PLANILLA_DETALLE` (las líneas de concepto por colaborador por período) es literalmente el corazón del sistema y no tiene ni un campo definido.

- [ ] `PLANILLA_CABECERA` — período, tipo, estado, totales, fechas de corte
- [ ] `PLANILLA_DETALLE` — **crítico**: estructura de las líneas de ingreso/deducción por colaborador
- [ ] **Catálogo de conceptos de nómina** — el listado maestro de ingresos y deducciones con sus flags: ¿grava CSS? ¿grava SE? ¿grava ISR? ¿entra al XIII? ¿entra al promedio de vacaciones? **Sin esta tabla no hay motor.**
- [ ] `MARCACION` — estructura de las marcas biométricas (`SCR-025` menciona "8 tablas de inspección" sin detallarlas)
- [ ] `HORARIO` — estructura de la plantilla horaria semanal
- [ ] `LIQUIDACION` — cabecera y detalle del finiquito
- [ ] `VACACIONES` / `INCAPACIDAD` — estructura de los expedientes
- [ ] `ACREEDOR`, `SUCURSAL`, `GERENCIA`, `DEPARTAMENTO`, `CARGO` — catalogados como pantallas, sin campos
- [ ] **Los ~70 campos faltantes de la ficha de colaborador** — se declaran "110+ campos" y solo hay ~40 catalogados
- [ ] **Los "180+ campos" de balances acumulados** de `confbalan.php` (`SCR-013`) — cero detalle
- [ ] Tipos definitivos, nullability, unicidad, índices y claves foráneas

---

### `GAP-005` — Roles, permisos y máquina de estados: **inexistentes** 🟥
**Evidencia:** el `AGENTS.md` del repo define el prefijo `ROLE-` como obligatorio. Un `grep` de `ROLE-` sobre `docs/` devuelve **cero resultados**. `SCR-021` (`mantuser.php`) se cataloga como "Cuentas de usuario y roles" pero nunca se abrió la matriz. Sobre estados de planilla, la única mención en los 10 documentos es la etiqueta `Webhook: PlanillaAprobada` en un diagrama.

**Por qué bloquea:** sin roles no hay diseño de autorización ni de multi-tenancy. Sin máquina de estados no hay Factor WOW #1 — "Zero-Recalculate" **es** una decisión de estados e inmutabilidad, no un detalle de UI.

- [ ] **Matriz de roles** (`ROLE-001`...) — ¿Admin, Operador de Nómina, Supervisor, Contador, Auditor, Colaborador?
- [ ] **Matriz permiso × rol × módulo** — quién ve salarios, quién aprueba, quién revierte
- [ ] **Ciclo de vida de la planilla** — estados y transiciones válidas (¿Borrador → Calculada → En revisión → Aprobada → Cerrada → Pagada?)
- [ ] **Quién aprueba y quién puede revertir** — `plaliqdel.php` (`SCR-057`) revierte liquidaciones; falta la regla de autorización
- [ ] **Política de inmutabilidad** — qué se congela al cerrar y qué se corrige con ajuste (`SCR-034` a `SCR-040` son todos "ajustes")
- [ ] **Definición exacta de los períodos** — corte de quincenal (¿1-15 y 16-fin?), bisemanal, "Mensual 1ra Qna" vs "Mensual 2da Qna" (`ENT-001` lista los 5 tipos sin definirlos)

---

## 3. ⚠️ IMPORTANTES — se puede arrancar con supuestos declarados, pero hay que cerrarlos antes de producción

### `GAP-006` — Base gravable: qué concepto grava qué 🟨
`SCR-036` (Otros Ingresos) menciona *"clasificación de gravable / no gravable a CSS/ISR"* pero nunca da las reglas. Es la misma información que pide `GAP-004` (catálogo de conceptos) vista desde el ángulo fiscal.

- [ ] ¿Las horas extra gravan CSS? ¿SE? ¿Entran al promedio de vacaciones?
- [ ] ¿Comisiones, bonos, dietas y viáticos — cuáles gravan y cuáles no?
- [ ] ¿Existe **tope de cotización** de CSS? Los documentos no lo mencionan en absoluto.
- [ ] **Gastos de representación:** `04_payroll` §1.1.5 dice *"10% fijo (o escala especial según tramo)"* — literalmente ambiguo, hay que resolverlo.
- [ ] **Tasa de Riesgos Profesionales:** `rp_por` es un campo por empresa (`API-002`) pero no hay rango, tabla ni fuente.

### `GAP-007` — Convenciones de cálculo no definidas 🟨
Ninguna de estas aparece en los documentos y todas cambian el resultado en centavos:

- [ ] **Divisores salariales** — salario diario ¿/30? semanal ¿/7 o /4.33? `ENT-001` define `salario_hora = salario_mensual / horas_mensuales` pero no la convención para prima, preaviso e indemnización.
- [ ] **Política de redondeo** — ¿medio arriba, bancario, truncado? ¿Se redondea por concepto o solo el neto? En nómina esto produce descuadres contra CSS y DGI.
- [ ] **Base del ISR** — `04_payroll` §1.1.4 estima la renta anual como `Salario Mensual × 13`. Ese `13` presupone el XIII mes, lo que choca con el tratamiento separado del XIII y con `gasto_rep` que grava aparte. Hay que definir la base exacta y si CSS/SE se deducen de ella.
- [ ] **XIII Mes** — el 7.25% obrero está; falta la **cuota patronal** y la regla concreta de ISR (el doc dice solo *"si supera los límites gravables"*).
- [ ] **Vacaciones** — "promedio de los últimos 11 meses" y "30 días por cada 11 meses" están enunciados, pero falta la mecánica de acumulación, el fraccionamiento y qué retenciones aplican sobre el pago de vacaciones.

### `GAP-008` — Recargos de horas extra: **contradicción entre documentos** 🟨
| Fuente | Qué dice |
|---|---|
| `02_application_map.md` `SCR-029` | 25%, 50%, 75%, 150% |
| `04_payroll` / `01_application_overview` | diurna 25%, nocturna 50%, **mixta 75%**, descanso/feriado 150% |
| `nomix/01_propuesta` §3.2.C | *"Mixta (**+50% o +75%**)"* — indeciso |

- [ ] Resolver el recargo de jornada mixta contra el Código de Trabajo
- [ ] **Regla de acumulación** — `nomix/01_propuesta` línea 139 propone *"Horas Excedentes en Día de Fiesta (+150% + 50%)"* sin citar base legal. Confirmar.
- [ ] Definir el umbral de jornada nocturna y mixta (rangos horarios)
- [ ] `SCR-039` menciona el régimen especial **CAPAC-SUNTRACS** (construcción) sin ninguna regla — ¿entra en el alcance del MVP?

### `GAP-009` — Integraciones de entrada sin especificar 🟨
- [ ] **Formato de archivo de relojes biométricos** — se nombran ZKTeco, Hikvision y Anviz sin formato ni protocolo
- [ ] `SCR-025` menciona "8 tablas de inspección" de marcaciones, nunca detalladas
- [ ] ¿Los relojes exportan archivo, tienen API, o hace falta un agente local?

### `GAP-010` — `WF-003` nunca se escribió 🟨
Existen `WF-001` (planilla quincenal), `WF-002` (XIII mes) y `WF-004` (liquidaciones). **`WF-003` falta** — por la numeración, correspondería al workflow de Vacaciones.

---

## 4. 🧭 DECISIONES tuyas — no están en los documentos porque son de negocio, no de ingeniería

Estas no las resuelve más investigación; las resuelves tú.

### Producto y alcance
- [ ] `DEC-001` **Stack de backend** — la propuesta recomienda Laravel 11/PHP 8.3 justificándolo en *"reutilización de los algoritmos existentes en PHP"*, **pero en este repo no hay código PHP de PlaniFácil**, solo la especificación. Esa justificación no aplica y hay que reescribir el motor desde cero de todas formas. Alternativa fuerte: monorepo TypeScript (NestJS + React) que permite compartir el motor de cálculo entre servidor y navegador — que es exactamente lo que exige el Factor WOW #1.
- [ ] `DEC-002` **¿Migración desde PlaniFácil?** — ¿hay acceso a la base de datos o a exports de clientes existentes? Cambia el esfuerzo drásticamente y además desbloquearía `GAP-001` y `GAP-004`.
- [ ] `DEC-003` **¿Panamá-only o multi-país desde el diseño?** — el tagline dice *"Panamá y la región"*. Diseñar el motor con reglas parametrizadas por jurisdicción cuesta ~20% más ahora y evita una reescritura después.
- [ ] `DEC-004` **Alcance del MVP** — ¿qué de los 6 Factor WOW entra en v1? Mi lectura: #1 (motor reactivo) y #5 (validación ACH) son diferenciadores estructurales; #2 (IA), #3 (WhatsApp) y #6 (simulador) son incrementales que se pueden añadir sin rediseñar.
- [ ] `DEC-005` **Modelo de tenancy** — ¿un contador administra N empresas con una sola cuenta? Define el diseño de RLS y de sesión.
- [ ] `DEC-006` **Volumen esperado** — # de empresas y # de colaboradores por empresa. Dimensiona todo (¿hace falta réplica de lectura en el MVP?).

### Técnicas con impacto directo
- [ ] `DEC-007` ⚠️ **Conflicto real detectado:** `nomix/03` §3.1 propone cifrar `colaboradores.salario_base` a nivel de aplicación (AES-256-GCM). Un campo cifrado en la aplicación **no admite `SUM`, `AVG`, `ORDER BY` ni `GROUP BY` en SQL** — eso rompe prácticamente todos los reportes agregados del `MOD-006` (`repcolabsal`, `rep_resumen`, `represervas`, `repsalpag`). Hay que elegir: cifrar solo cédula y cuenta bancaria, usar cifrado determinista, o mover las agregaciones a la aplicación. **Decidir antes de diseñar el esquema.**
- [ ] `DEC-008` **Proveedor de WhatsApp** — Meta Cloud API vs Twilio vs 360dialog. Requiere verificación de negocio y plantillas preaprobadas: es un trámite con plazos, conviene iniciarlo temprano.
- [ ] `DEC-009` **Política de PII con la IA** — el Copiloto necesita contexto de nómina. ¿Qué se le envía? Cédulas y salarios son datos protegidos por la Ley 81 de Panamá. Definir redacción/anonimización antes de escribir el primer prompt.
- [ ] `DEC-010` **Infraestructura y presupuesto** — VPS propio, AWS, Hetzner. Afecta si WAL-G/S3 y la réplica son viables en v1.
- [ ] `DEC-011` **Equipo** — cuántas personas y qué stack dominan. Es probablemente el factor de mayor peso sobre `DEC-001`.

---

## 5. 🧹 Higiene de la documentación actual

- [ ] **Duplicados exactos:** `docs/propuesta_mejora_planifacil.md` y `docs/nomix/01_propuesta_mejora_planifacil.md` son **byte-idénticos**. `docs/vision_producto_factor_wow.md` y `docs/nomix/02_...` difieren solo en el título. Conservar una copia de cada uno y borrar la otra para evitar que diverjan.
- [ ] **Enlaces rotos:** `07_final_reverse_engineering_specification.md` §5 apunta a `file:///d:/Dev/Planilla/docs/...` — rutas Windows de otra máquina.
- [ ] **Fórmula mal formada:** `04_payroll` §3.1.2, la prima de antigüedad tiene un divisor `/1` sin sentido.
- [ ] **Promesa incumplida:** el índice anuncia `ENT-001` a `ENT-010`; solo existen 3 entidades.
- [ ] **Prefijos sin usar:** `AGENTS.md` exige `ROLE-`, `FUNC-` y `TEST-`; ninguno aparece en `docs/`.

---

## 6. ✅ Qué se puede construir HOY sin esperar a nadie

Aproximadamente el 55% del sistema no está bloqueado. Orden sugerido:

1. [ ] **Scaffolding e infraestructura** — monorepo, `docker-compose`, linting, CI, migraciones. Depende solo de `DEC-001`.
2. [ ] **Auth, multi-tenancy (RLS) y audit log** — `nomix/03` §3.2 tiene la política RLS lista para usar. Los roles finos pueden empezar con un enum provisional y refinarse con `GAP-005`.
3. [ ] **Catálogos maestros** — empresa, sucursal, gerencia, departamento, cargo, acreedor, banco, horario. Bien definidos en `MOD-003`.
4. [ ] **Ficha de colaborador con los ~40 campos catalogados**, ya organizada en el wizard de 5 pasos de `nomix/01` §2.2.A. Los ~70 campos restantes se agregan sin rediseñar.
5. [ ] **Validador de cédula panameña y DV de RUC** — algoritmo público, no depende de los documentos.
6. [ ] **Motor de retenciones: CSS y SE** — tasas confirmadas, funciones puras testeables hoy.
7. [ ] **Motor de ISR** — la tabla de tramos está confirmada; se implementa con la base gravable parametrizable para cerrar `GAP-007` sin reescribir.
8. [ ] **Puertos (interfaces) de ACH, SIPE y DGI** — definir el contrato ahora y dejar los adaptadores como stubs con tests pendientes. Así `GAP-001` y `GAP-002` no bloquean la arquitectura, solo la implementación de cada adaptador.
9. [ ] **Shell de UI** — layout responsivo, sidebar, Cmd+K, tema claro/oscuro, sistema de toasts. No depende de ningún gap.

---

## 7. Ruta crítica: los 5 documentos que más desbloquean

Si solo pudieras conseguir cinco cosas, en este orden:

| # | Qué conseguir | Desbloquea | Dónde se consigue |
|---|---|---|---|
| 1 | Archivos ACH de ejemplo reales (1 por banco) | `GAP-001` — módulo de pagos completo | Banca en línea del cliente / manual del banco |
| 2 | Layout SIPE + Formulario 03 | `GAP-002` — Factor WOW #4 | Portales CSS y DGI, o el contador del cliente |
| 3 | Tabla completa del Art. 225 y escala de preaviso | `GAP-003` — `MOD-005` entero | Código de Trabajo de Panamá / asesor laboral |
| 4 | Un export o captura de la ficha completa + catálogo de conceptos | `GAP-004`, `GAP-006` — el motor de nómina | Sesión con PlaniFácil o con el operador de nómina |
| 5 | Entrevista de 1 hora con un operador de nómina real | `GAP-005`, `GAP-007`, `DEC-004` | Marisol Barria o equivalente |

> Los ítems 1, 2 y 4 se resuelven en gran medida con **una sola sesión de captura sobre PlaniFácil en vivo** — la misma vía por la que se produjo la documentación existente.
