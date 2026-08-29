# Nomix — Nómina inteligente

Plataforma de nómina para la República de Panamá. Monorepo TypeScript.

> **Documentación:** empieza por [`docs/README.md`](docs/README.md).
> **Arquitectura:** [`ARCHITECTURE.md`](ARCHITECTURE.md) — lectura obligatoria antes de escribir código.
> **Base legal (fuente de verdad de todo cálculo):** [`docs/nomix/06_base_legal_panama.md`](docs/nomix/06_base_legal_panama.md).

## Requisitos

- **Node 22+** (ver `.nvmrc`) · **pnpm 9** · **Docker** (para Postgres y Redis locales)

Ninguno está instalado en el entorno donde se generó el esqueleto; instálalos antes del primer arranque:

```bash
corepack enable          # habilita pnpm que trae Node
nvm use                  # toma la versión de .nvmrc
```

## Arranque

```bash
pnpm install                     # instala todo el workspace
cp .env.example .env             # completa los secretos locales
pnpm infra:up                    # levanta postgres + redis (docker/)
pnpm db:generate && pnpm db:migrate
pnpm test                        # corre las pruebas (incluye la validación real)
pnpm dev                         # turbo: api + web + worker
```

## Estructura

```
apps/
  api/       NestJS — REST + SSE. Única autoridad de cálculo.
  web/       React + Vite — dashboard RRHH + portal del colaborador.
  worker/    BullMQ — PDF, ACH, SIPE, correo.
packages/
  payroll-engine/   ⭐ Motor puro. Sin I/O. Corre en servidor y navegador.
  rules/            Resolución de reglas por fecha de vigencia (ADR-001).
  contracts/        Esquemas Zod + tipos compartidos.
  db/               Drizzle: schema, migraciones, políticas RLS.
  ach-exporters/    (en apps/worker/src/ach) adaptadores por banco — stubs.
docker/      docker-compose, Caddyfile, init de Postgres.
docs/        Toda la documentación del proyecto.
```

## Las reglas que no se rompen (resumen — detalle en `ARCHITECTURE.md` §6)

1. Ninguna constante legal en el código: todo viene de la config versionada por fecha.
2. Las reglas se resuelven por la **fecha del período**, nunca por hoy.
3. Sin aritmética nativa sobre dinero: `Money`/`decimal.js` siempre. La regla de
   lint **rompe el build** ante un literal decimal en el motor.
4. La incidencia de conceptos se consulta, no se codifica.
5. Cada resultado persiste qué regla lo produjo.

## Estado

| Pieza | Estado |
|---|---|
| Monorepo (pnpm + turbo + tsconfig) | ✅ Listo |
| Docker: Postgres 16 + Redis + Caddy | ✅ Listo |
| Rol de app NOBYPASSRLS + políticas RLS | ✅ Aplicadas y probadas (incluye `movimiento`) |
| Regla de lint anti-decimal (ADR-010) | ✅ Configurada |
| `@nomix/rules` — resolución temporal | ✅ Con test (12.25→13.25→14.25%) |
| `@nomix/db` — schema, 6 migraciones, RLS | ✅ Listo |
| `@nomix/contracts` | ✅ Base |
| **Catálogo de conceptos** (matriz de incidencia, ADR-002) | ✅ 51 conceptos sembrados desde la base legal |
| `@nomix/payroll-engine` — CSS/SE/RP, bases, devengo, ISR | ✅ 61 tests; cuadra al centavo contra jun-2026 |
| API: auth + RLS multi-tenant, colaboradores, planilla | ✅ Máquina de estados + movimientos del período |
| **ISR** — retención acumulativa (`ADR-014`) | ✅ Dos flujos (ordinario / gastos de representación), verificado contra 2 quincenas reales |
| Web: shell, login, wizard, planillas + movimientos | ✅ Operativo |
| **XIII Mes** — 3 partidas, aguinaldo y piso irrenunciable (`ADR-015`) | ✅ 19 casos de prueba; ventana, divisor y partidas resueltos por vigencia |
| **Vacaciones** — ayuda de cálculo sobre el histórico (`ADR-016`) | ✅ 7 casos de prueba; ciclo por colaborador reconstruido, sin tabla nueva |
| **Liquidaciones** — prima, indemnización y preaviso (`ADR-017`) | ✅ 18 casos de prueba; propuesta de solo lectura, separada de la baja |
| **Descuentos** — topes del Art. 161 (`ADR-004`) | ✅ 17 casos de prueba; asignación con arrastre de saldos |
| Exportadores ACH / SIPE / Formulario 03 | ⬜ SIPE y Form-03 desbloqueados; ACH pendiente |
| **Roles y permisos** (`ADR-018`, cierra `GAP-005`) | ✅ 5 roles del negocio, matriz rol × permiso probada; separación de funciones y alcance por empresa |
| **Bitácora de acceso** (`ADR-019`) | ✅ Append-only verificada contra PostgreSQL real |
| **Membresía vigente exigida por el RLS** (`ADR-020`) | ✅ Cierra el acceso con sesión previa a la revocación (§5.4) |
| Web: Cmd+K, Inspection Drawer, UI por rol | ✅ La traza de cada cifra, visible |
| `apps/worker` (BullMQ) | 🟡 Stub |

### Convenciones configurables por empresa

| Columna | Default | Por qué es configurable |
|---|---|---|
| `metodo_prorrateo` | `mitad_mensual` | La quincena se paga como `salario ÷ 2` o por días reales. El doc 05 §2 lo deja como consulta abierta y ambas prácticas existen en el mercado. |
| `horas_mensuales` | `208` | Divisor de la hora ordinaria: 208 (48 h/sem) o 192 (base legal §12.2). |

> **Sobre la honestidad del cálculo:** cada concepto del catálogo lleva su
> `confianza` (`verificado` / `verificar` / `pendiente`). Cuando una planilla usa
> un concepto sin verificar, el resultado lo declara en
> `totales.conceptosPendientes` y la UI lo marca como provisional. Todos los
> pendientes derivan de consultas abiertas del
> [`07_consultas_profesional_planilla.md`](docs/nomix/07_consultas_profesional_planilla.md).

### Seguridad — quién puede qué, y quién lo miró (`ADR-018`, `ADR-019`, `ADR-020`)

La columna `usuario_empresa.rol` llevaba desde el principio sin consultarse: quien
entraba a una empresa podía todo. Ahora las rutas declaran un **verbo**
(`@Requiere('planilla:aprobar')`) y la matriz rol × permiso vive en el código —
no en `regla`, porque una política de autorización no es una regla legal
versionada por fecha y no debe poder cambiarla quien escriba en la base de datos.
El criterio rector es la **separación de funciones**: `operador_nomina` captura y
calcula pero no aprueba, que es el control interno básico de una nómina.

El agujero más serio no eran los roles sino la **vigencia**. Las políticas RLS se
aislaban por el identificador de empresa que la aplicación les pasaba, y la
vigencia solo se comprobaba al iniciar sesión. Una sesión abierta antes de
revocarle el acceso a alguien seguía viendo salarios y planillas — y con
expiración deslizante, mientras hubiera actividad, sin vencer nunca.
`app_current_empresa()` ahora devuelve la empresa **solo si la membresía está
viva**, con lo que toda política existente y futura hereda la comprobación.

Y como `ADR-007` decidió no cifrar `salario_base`, su contrapartida ya está
pagada: `acceso_auditoria` registra quién vio qué, incluidos los intentos
**denegados**. Es append-only por construcción — sin políticas de UPDATE ni
DELETE — y con un `REVOKE` encima, porque el RLS por sí solo la hacía inmutable
*en silencio* y en una bitácora el intento de manipulación es justo lo que hay
que poder ver. Si la bitácora no está disponible, una ruta de salarios responde
503 en vez de servir el dato sin rastro.

### XIII Mes — un proceso, no un concepto (`ADR-015`)

El Décimo Tercer Mes se calcula sobre lo **percibido** en la ventana de su partida
(Decreto 19 de 1973 Art. 4º), así que no se devenga: se reconstruye sumando las
líneas de planilla ya persistidas de esos cuatro meses. Tres reglas del Decreto que
ningún documento previo recogía y que aquí se aplican y se **declaran** en la UI:
el aguinaldo acostumbrado compite con la 3ª partida y gana el mayor (Art. 3º), un
convenio colectivo solo vale si mejora el resultado general (Art. 5º), y la ventana
la fija el Decreto aunque la cabecera diga otra cosa. La cuota **patronal** sobre el
XIII sigue sin determinar (consulta A7): Nomix retiene la obrera —7.25%, verificada—
y deja el costo del empleador en "no determinado" en vez de estimarlo.

### Descuentos — una asignación, no una resta (`ADR-004`)

El Art. 161 no describe una resta: describe topes que interactúan. Recorrer los
descuentos en un bucle y restarlos produce resultados **ilegales**, así que es una
etapa dedicada: la pensión alimenticia va completa y exenta del tope, la cuota de
vivienda tiene su propio 30%, y los ordinarios compiten por el 50% restante en
orden de antigüedad. Lo que no cupo se declara como **saldo arrastrado** — y no se
aplica solo al período siguiente, porque la consulta E5 sigue abierta. Sobre lo
inembargable en cuantía completa (vacaciones, indemnizaciones) no se asigna nada,
ni siquiera un descuento que el trabajador autorizó: esa protección no es
renunciable. Cada línea guarda **por qué** quedó como quedó.

### Liquidaciones — una propuesta, no un acto (`ADR-017`)

`POST /colaboradores/:id/liquidacion` calcula y devuelve; no da de baja a nadie.
La distinción que más caro sale se modela primero: la prima de antigüedad se paga
**cualquiera sea la causa**, la indemnización solo por despido injustificado o
renuncia justificada. La escala del Art. 225 se recorre por tramos —15 años son
34 + 5 = 39 semanas, no 15 × 3.4 ni 15 × 1— y vive en `regla` con la vigencia de
la Ley 44 de 1995, para que los regímenes históricos del propio artículo sean
filas y no código. La propuesta está incompleta **por diseño**: le faltan las
vacaciones y el XIII proporcionales al cese (consulta D7), y lo dice en cada
respuesta en vez de omitirlos en silencio.

### Vacaciones — la misma ayuda para dos preguntas distintas (`ADR-016`)

A diferencia del XIII, el ciclo de vacaciones es **por colaborador** — ancla en su
`fecha_ingreso`, no en un calendario compartido — así que no encaja en el patrón de
"tipo de planilla". En vez de eso, es un botón **"Calcular automático"** en
Movimientos: reconstruye desde cuándo corre el ciclo actual (la última vez que se
pagaron vacaciones, o el ingreso si nunca), suma lo percibido en esa ventana con la
misma matriz de incidencia del catálogo, y sugiere `Σ ÷ 11` — un mes de sueldo por 11
meses de ciclo, el mismo patrón que el ÷12 del XIII. La diferencia honesta: el ÷12 del
XIII se demuestra con dos derivaciones independientes; el ÷11 de vacaciones depende de
la convención de mes de 30 días que ya usa `divisor_salario_diario` (marcado
`pendiente`), así que hereda esa incertidumbre en vez de esconderla.

### ISR — método acumulativo (`ADR-014`)

La ley no prescribe cómo retener ISR quincena a quincena (consulta A1). Nomix
recalcula el impuesto del año a la fecha en cada corte y retiene solo la
diferencia contra lo ya retenido — dos flujos paralelos (ordinario / gastos de
representación) con su propia escala, tal como exige el Formulario 03. Ningún
reembolso automático a mitad de año; sin deducciones personales capturadas
todavía (no hay campo en la ficha del colaborador). Detalle completo y
sub-decisiones declaradas en `ADR-014`.
