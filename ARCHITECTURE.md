# ARCHITECTURE.md — Nomix

**Proyecto:** Nomix — Nómina inteligente · República de Panamá
**Versión:** 1.0.0 · 2026-08-26
**Estado:** `ACTIVO` — vinculante para todos los agentes de implementación

> Este documento es **el qué y el cómo**. El **porqué** de cada decisión está en
> [`docs/nomix/08_decisiones_arquitectura.md`](docs/nomix/08_decisiones_arquitectura.md) (ADR-001 a ADR-012).
> Toda regla de cálculo viene de [`docs/nomix/06_base_legal_panama.md`](docs/nomix/06_base_legal_panama.md).
> Ante contradicción entre documentos, manda la jerarquía de [`docs/README.md`](docs/README.md).

---

## 1. Stack

| Capa | Elección | ADR |
|---|---|---|
| Lenguaje | **TypeScript** (estricto, `strict: true`) en todo el monorepo | `ADR-010` |
| Backend | **NestJS 11** — REST + SSE | `ADR-010` |
| Frontend | **React 19 + Vite** · Tailwind + shadcn/ui | `ADR-010` |
| Base de datos | **PostgreSQL 16** con Row-Level Security | `ADR-011` |
| Acceso a datos | **Drizzle ORM** + SQL explícito donde convenga | §4.3 |
| Colas | **BullMQ** sobre Redis | `ADR-012` |
| Cache y sesiones | **Redis 7** | `ADR-011` |
| Aritmética monetaria | **decimal.js** — obligatorio | `ADR-006` |
| Validación | **Zod** — DTOs, reglas y configuración | `ADR-003` |
| Monorepo | **pnpm workspaces + Turborepo** | §2 |
| Contenedores | **Docker Compose** sobre VPS | `ADR-012` |
| Proxy y TLS | **Caddy** | `ADR-012` |
| Respaldos | **pgBackRest** → S3-compatible cifrado | `ADR-012` |

**Prohibido:** aritmética nativa de JavaScript sobre valores monetarios. Ver §6.

---

## 2. Estructura del monorepo

```
nomix/
├── apps/
│   ├── api/                 NestJS — REST, SSE, auth, RLS
│   ├── web/                 React + Vite — admin y portal
│   └── worker/              BullMQ — PDF, ACH, SIPE, correo
├── packages/
│   ├── payroll-engine/      ⭐ Motor puro. Sin I/O, sin DB, sin reloj
│   ├── rules/               Resolución temporal de reglas (ADR-001)
│   ├── contracts/           Esquemas Zod + tipos compartidos
│   ├── db/                  Drizzle: schema, migraciones, políticas RLS
│   ├── ach-exporters/       Adaptadores por banco (stubs por ahora)
│   └── ui/                  Componentes compartidos
├── docker/
├── docs/
└── ARCHITECTURE.md
```

### Regla de dependencias

```
payroll-engine  →  (nada, salvo decimal.js)
rules           →  contracts
api             →  payroll-engine, rules, contracts, db
web             →  payroll-engine, contracts, ui
worker          →  payroll-engine, rules, contracts, db, ach-exporters
```

**`packages/payroll-engine` no importa nada del proyecto.** Es una función pura:
recibe insumos y reglas ya resueltas, devuelve resultados con su trazabilidad. Por eso
corre igual en el servidor y en el navegador — que es lo que hace posible el cálculo
reactivo del Factor WOW #1 **sin duplicar lógica**.

> ⚠️ El navegador **previsualiza**. El servidor es la única autoridad. Nada que el
> cliente calcule se persiste sin recálculo en el servidor.

---

## 3. Dónde vive cada cosa

| Lógica | Ubicación | Motivo |
|---|---|---|
| Fórmulas de cálculo | `packages/payroll-engine` | Puro, testeable, compartible |
| Resolución de reglas por fecha | `packages/rules` | `ADR-001` |
| Persistencia y RLS | `apps/api` + `packages/db` | Frontera de seguridad |
| Autorización | `apps/api` (guards) + RLS en base de datos | Doble capa |
| Generación de archivos y PDF | `apps/worker` | Libera el hilo HTTP |
| Previsualización reactiva | `apps/web` vía `payroll-engine` | Sin round-trip por tecla |
| **Autoridad del resultado** | **`apps/api`, siempre** | Nunca el cliente |

---

## 4. Modelo de datos

### 4.1 Identidad y tenencia (`ADR-011`)

```sql
usuario          ( id uuid pk, email citext unique, password_hash,
                   nombre, activo bool, creado_en )

empresa          ( id uuid pk, nombre_comercial, razon_social,
                   ruc, dv, numero_patronal,
                   actividad_ciiu,              -- salario mínimo + tasa RP
                   region_salario_minimo,       -- 1 | 2
                   tamano_empresa,              -- excepciones Art. 212
                   cantidad_trabajadores,
                   tasa_riesgo_profesional numeric(6,4),
                   paga_aguinaldo_acostumbrado bool,
                   jurisdiccion_id )            -- ADR-008

usuario_empresa  ( usuario_id, empresa_id, rol,
                   vigente_desde date, vigente_hasta date null,
                   pk (usuario_id, empresa_id, vigente_desde) )
```

**La membresía tiene vigencia.** Una firma contable que deja de atender a un cliente
pierde el acceso sin que se borre el historial.

### 4.2 Reglas temporales (`ADR-001`, `ADR-002`, `ADR-003`)

```sql
regla            ( id uuid pk, jurisdiccion_id, empresa_id null,
                   codigo,                      -- 'css_patronal', 'isr_tramos'
                   valor jsonb,
                   vigente_desde date, vigente_hasta date null,
                   conocido_desde timestamptz,  -- eje bitemporal
                   base_legal text,             -- 'Ley 462 de 2025'
                   confianza )                  -- verificado|verificar|pendiente

concepto         ( id uuid pk, jurisdiccion_id, empresa_id null,
                   codigo, nombre, tipo,
                   incide_css bool, tasa_css_especial numeric null,
                   incide_seguro_educativo bool,
                   incide_isr bool, regimen_isr,
                   incide_base_xiii bool,
                   incide_promedio_vacaciones bool,
                   incide_base_liquidacion bool,
                   es_inembargable bool,
                   vigente_desde, vigente_hasta )
```

`empresa_id` nulo = regla general del país. Poblado = convenio colectivo o régimen
especial. **Así se soportan convenios y CAPAC sin escribir código.**

> ⚠️ Sobre el XIII Mes, un convenio solo puede **mejorar** la regla general
> (Decreto 19 de 1973, Art. 5º). El motor valida que el resultado sea ≥ al general.

### 4.3 Planilla y trazabilidad (`ADR-005`)

```sql
planilla_cabecera ( id uuid pk, empresa_id, tipo, periodo_desde, periodo_hasta,
                    fecha_pago, estado, totales jsonb,
                    aprobada_por, aprobada_en )

planilla_detalle  ( id uuid pk, planilla_id, colaborador_id,
                    concepto_codigo, cantidad numeric(18,6),
                    base numeric(18,6), monto numeric(18,6) )

planilla_traza    ( detalle_id, regla_codigo, regla_version,
                    base_aplicada, tasa_aplicada, resultado,
                    articulo_legal, calculado_en )
```

`planilla_traza` alimenta la auditoría legal **y** el *Inspection Drawer* del producto.
Hereda la clasificación de sensibilidad de `salario_base`.

> ✅ **Máquina de estados de la planilla:** `borrador → calculada → aprobada →
> cerrada`, en `apps/api/src/planilla/estado.ts`. Se recalcula mientras no esté
> aprobada; al cerrar queda inmutable y emite `PlanillaCerrada` (`ADR-013`).

### 4.4 Precisión numérica (`ADR-006`)

- Todo monto: `numeric(18,6)`
- Drizzle devuelve `numeric` como **`string`**, nunca `number` — hace imposible la
  coerción accidental a float en la frontera de datos. **No cambiar esta configuración.**
- Redondeo `HALF_UP` a 2 decimales **solo** al presentar o serializar
- Nunca redondear resultados intermedios encadenados

---

## 5. Seguridad

### 5.1 Autenticación
Cookie de sesión `httpOnly` + `Secure` + `SameSite=Strict`, con estado en Redis:

```
sesion:{id} → { usuario_id, empresa_activa_id, expira }
```

**`empresa_activa_id` vive en el servidor.** El cliente nunca lo envía. Cambiar de
empresa es un endpoint que revalida la membresía y reescribe la sesión.

### 5.2 Aislamiento por RLS

Cada petición, dentro de su transacción:

```sql
SET LOCAL app.current_empresa_id = '<uuid>';
```

```sql
ALTER TABLE colaboradores ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON colaboradores
    USING (empresa_id = current_setting('app.current_empresa_id')::uuid);
```

**Doble capa:** guards de NestJS **y** RLS en la base de datos. Un fallo en el
código de aplicación no debe alcanzar para filtrar datos entre inquilinos.

### 5.3 Cifrado selectivo (`ADR-007`)

| Campo | Protección |
|---|---|
| `cedula` | AES-256-GCM en aplicación |
| `cuenta_bancaria` | AES-256-GCM en aplicación |
| `salario_base` | **Sin cifrado de app** — RLS + permisos de columna + auditoría de acceso |

`salario_base` no se cifra porque rompería la validación de salario mínimo y todos
los reportes agregados. **La contrapartida es que la auditoría de acceso a salarios
debe estar operativa antes del primer dato real.**

### 5.4 Prueba de seguridad obligatoria
Un usuario cuya membresía en una empresa **venció** no puede acceder a sus datos, ni
con una sesión previa ni manipulando identificadores. `seguridad-datos` debe probarlo
explícitamente antes de cualquier despliegue.

---

## 6. Convenciones no negociables

1. **Ninguna constante legal en el código.**
   ```ts
   ❌ const CSS_PATRONAL = 0.1325;
   ✅ const tasa = await reglas.resolver('css_patronal', periodo.fechaFin, jurisdiccion);
   ```
2. **Las reglas se resuelven por la fecha del período, nunca por `new Date()`.**
3. **Sin aritmética nativa sobre dinero.** `decimal.js` siempre. Regla de lint que
   **rompe el build**.
4. **La incidencia de conceptos se consulta, no se codifica.** Prohibido
   `if (concepto === 'XIII')`.
5. **Todo cálculo es puro.** Sin base de datos ni reloj dentro del motor: reglas y
   fecha llegan como parámetros.
6. **Cada resultado persiste su procedencia.**
7. **`jurisdiccion_id` en toda tabla de reglas.**
8. Idioma del dominio: **español de Panamá** — planilla, colaborador, quincena,
   décimo tercer mes, liquidación, prima de antigüedad.
9. **Inyección de dependencias siempre explícita con `@Inject(TOKEN)`.** No se
   depende de `emitDecoratorMetadata`/`design:paramtypes` reflejada, para que la
   DI funcione igual bajo cualquier compilador. El dev de la API usa el path
   compilado (`tsc -w` + `node --watch`), con paridad con producción.

---

## 7. Puertos de salida (bloqueados por terceros)

Los layouts de ACH, SIPE y Formulario 03 no están disponibles. **La arquitectura no
espera por ellos:** se definen las interfaces ahora y los adaptadores quedan como
stubs con tests pendientes.

```ts
interface AchExporter {
  readonly banco: string;
  validarCuenta(cuenta: string, tipo: TipoCuenta): ResultadoValidacion;
  exportar(lote: LoteDispersion): Promise<ArchivoGenerado>;
}
```

Bancos a implementar: BAC, Banistmo, Banco General, Global Bank, Multibank,
Banesco, Credicorp, Caja de Ahorros.

> 🔓 **Estos puertos se desbloquean pronto:** hay acceso a una cuenta piloto desde la
> cual se pueden generar archivos reales por banco. Ver §9.

---

## 8. Infraestructura (`ADR-012`)

```
Internet → Caddy (TLS) ─┬→ web    (nginx + estáticos)
                        └→ api    (NestJS)
                              ├→ postgres 16   (RLS)
                              └→ redis 7       (sesiones, colas)
                                    ↑
                                 worker (BullMQ)

postgres → pgBackRest → S3-compatible cifrado   (PITR, RPO<5s)
```

Ambientes: `dev` · `staging` · `prod`. **Datos reales de empleados solo en `prod`** —
requisito de la Ley 81, no una buena práctica.

**Ventanas de mantenimiento prohibidas:** días 15 y 30/31 (cierre de quincena) y la
semana previa al 15 de abril, 15 de agosto y 15 de diciembre (partidas del XIII).

---

## 9. Orden de construcción

| # | Entregable | Responsable | Estado |
|---|---|---|---|
| 0 | **Extraer datos de la cuenta piloto** | JK | 🔥 **Máxima prioridad — ver abajo** |
| 1 | Scaffolding: monorepo, Docker, CI, lint decimal | devops-infra | 🔓 |
| 2 | `packages/db` — schema, RLS, migraciones | arquitecto + seguridad-datos | 🔓 |
| 3 | `packages/rules` — resolución temporal | backend-nomina | 🔓 |
| 4 | Catálogo de conceptos + siembra desde la base legal | backend-nomina | ✅ 32 conceptos |
| 5 | `packages/payroll-engine` — CSS, SE, ISR, recargos | backend-nomina | ✅ CSS/SE/RP + recargos, devengo, ISR acumulativo (`ADR-014`) |
| 6 | Asignación de descuentos (`ADR-004`) | backend-nomina | ✅ Topes del Art. 161 con arrastre de saldos |
| 7 | Auth + membresía + RLS | seguridad-datos | ✅ |
| 8 | Máquina de estados de planilla | arquitecto-soluciones | ✅ borrador→calculada→aprobada→cerrada |
| 9 | API + shell de UI | backend + frontend | ✅ base |
| 10 | Exportadores ACH / SIPE / DGI | backend-nomina | 🟡 Tras el paso 0 |
| 11 | Prestaciones: XIII Mes, vacaciones, liquidaciones | backend-nomina | ✅ XIII (`ADR-015`), Vacaciones (`ADR-016`), Liquidación (`ADR-017`) |

### El paso 0 vale más que cualquier decisión técnica

Hay acceso a una cuenta piloto. De ahí se obtiene, en una sola sesión:

- **Un archivo ACH por banco** → desbloquea `GAP-001` (8 exportadores)
- **Un archivo SIPE y un Formulario 03** → desbloquea `GAP-002`
- **Un talonario y una planilla completa** → resuelve casi todo el Bloque F del
  cuestionario (divisores, redondeo, corte de quincena) **y** se convierte en la
  suite de pruebas de aceptación del motor

Eso convierte los dos únicos bloqueantes externos del proyecto en trabajo normal.
**Hacerlo antes de escribir código evita construir contra supuestos.**

---

## 10. Registro de cambios

| Fecha | Cambio |
|---|---|
| 2026-08-26 | Versión inicial. Cierra `ADR-010`, `ADR-011`, `ADR-012` |
| 2026-08-28 | Pasos 4 y 8 completos. El motor se dirige por el catálogo de conceptos (`ADR-002`): `acumularBases` decide las bases por los flags de incidencia, no por el código del concepto. Nueva tabla `movimiento` (devengado del período) con su RLS. Prorrateo configurable por empresa (`empresa.metodo_prorrateo`). |
| 2026-08-28 | ISR implementado con método acumulativo (`ADR-014`). Dos flujos paralelos (ordinario / gastos de representación), cada uno con su propia escala de tramos resuelta por vigencia (`resolverTramos`). El acumulado del año se reconstruye sumando la columna `base` de líneas `isr_retencion` de períodos anteriores — sin guardar una cifra "acumulada" aparte que se desincronizaría al recalcular. |

| 2026-08-28 | Décimo Tercer Mes (`ADR-015`). Es un TIPO de planilla, no un concepto: la partida se reconstruye sumando las líneas de `planilla_detalle` de la ventana que fija el Decreto 221, y vuelve a pasar por la matriz de incidencia para sus retenciones (CSS 7.25%, SE 0%, ISR ordinario). El ciclo de partidas y el divisor viven en `regla` (`partidas_xiii`, `divisor_xiii`). Nueva columna `colaborador.monto_aguinaldo` para la regla del Art. 3º. La cuota patronal sigue sin determinar (consulta A7) y la planilla lo declara en vez de estimarla. |

| 2026-08-28 | Vacaciones (`ADR-016`). No es un tipo de planilla ni un workflow con tabla propia: es una ayuda de cálculo (`GET /planillas/:id/vacaciones/:colaboradorId`) que reconstruye el ciclo del colaborador desde el histórico de `planilla_detalle` — igual principio que el XIII, pero el ciclo es por colaborador (ancla en `fecha_ingreso`), no un calendario compartido. `monto = Σ(salarios del ciclo) ÷ 11`, con `divisor_vacaciones` sembrado en `verificar` porque su equivalencia con `divisor_salario_diario` (330 días) hereda la incertidumbre de ese divisor, marcado `pendiente`. |

| 2026-08-29 | Asignación de descuentos (`ADR-004` implementado). Los topes del Art. 161 se resuelven como un problema de asignación, no como restas encadenadas: pensión alimenticia exenta, vivienda con tope propio del 30%, ordinarios por prelación hasta agotar el 50%, y lo que no cupo se declara como saldo arrastrado. El régimen de cada descuento es un dato del catálogo (`concepto.categoria_descuento`, migración 0006). El piso de salario mínimo no se verifica todavía y cada planilla lo declara. |
| 2026-08-29 | Liquidación laboral (`ADR-017`). `POST /colaboradores/:id/liquidacion` es una propuesta de SOLO LECTURA, separada de la baja: prima de antigüedad (Art. 224, cualquiera sea la causa), indemnización (Art. 225, solo despido injustificado o renuncia justificada, escala recorrida por tramos) y preaviso (Art. 212/222, decidido por RRHH y no inferido). La escala vive en `regla` con la vigencia de la Ley 44 de 1995. Discrepancia declarada de 12 centavos contra el ejemplo de la base legal §8.3, que redondea el semanal intermedio y `ADR-006` no (consulta F4). |

> Todo cambio de arquitectura se registra **primero** como ADR en
> `docs/nomix/08_decisiones_arquitectura.md`, y después se refleja aquí.
