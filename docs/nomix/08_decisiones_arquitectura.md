# Decisiones de Arquitectura (ADR)

**Documento:** `08_decisiones_arquitectura.md`
**Proyecto:** **Nomix - Nómina inteligente**
**Fecha:** 2026-08-26
**Estado:** `PROPOSED` — pendiente `ADR-010`
**Motivo:** Revisión de la arquitectura propuesta en `01_propuesta_mejora_planifacil.md` a la luz de la investigación legal de `06_base_legal_panama.md`.

---

## 0. El cambio de premisa

La propuesta original partía de esta idea:

> *"La modernización propuesta no requiere reescribir la valiosa inteligencia de negocios ni las reglas fiscales panameñas que la plataforma ya resuelve correctamente."*
> — `01_propuesta_mejora_planifacil.md` §7

**La investigación legal desmiente esa premisa.** De lo relevado en PlaniFácil:

| Regla observada | Estado real |
|---|---|
| CSS patronal 12.25% | Desactualizada desde abril 2025 |
| Deducción de $250 por dependiente | Sin respaldo en la normativa vigente |
| $800 "por cónyuge no perceptor" | Figura mal caracterizada |
| Gastos de representación al 10% plano | Escala de dos tramos |
| Recargo de domingo | Ausente |
| Tope del 50% en descuentos | Ausente |
| Inembargabilidad de vacaciones | Ausente |
| Validación de salario mínimo | Ausente |

**Consecuencia estratégica:** la lógica de PlaniFácil **no es un activo a reutilizar, es un pasivo a auditar**. Reimplementarla fielmente habría importado errores. El valor real del trabajo de ingeniería inversa es el **mapa funcional** (qué pantallas, qué flujos, qué reportes hacen falta), no las fórmulas.

Esto tiene dos efectos directos:

1. **Desaparece el principal argumento a favor de Laravel/PHP** (reutilizar los algoritmos existentes). No hay algoritmos que reutilizar. → `ADR-010`
2. **La base legal, no el software original, es la fuente de verdad.** El motor se construye desde `06_base_legal_panama.md`, y PlaniFácil pasa a ser referencia de alcance funcional y de convenciones de mercado. → `ADR-001`

---

## ADR-001 — Motor temporal: toda regla se resuelve por fecha de vigencia

**Estado:** `ACCEPTED`

### Contexto
La investigación encontró tres fuentes independientes de cambio normativo con fechas conocidas:

- **Ley 462 de 2025** escalona la cuota patronal: 12.25% → **13.25%** (abr-2025) → **14.25%** (mar-2027) → **15.25%** (mar-2029).
- **Salario mínimo** se revisa cada dos años por decreto ejecutivo (el vigente es el D.E. 13 de dic-2025).
- **Art. 225** tiene tres regímenes de indemnización aplicables **según la fecha de ingreso del trabajador** — coexisten hoy en la misma empresa.

### Decisión
Ninguna tasa, tramo, divisor, umbral o recargo existe como constante en el código. Todos viven en tablas de reglas con **período de validez**, y el motor las resuelve **por la fecha del período que se está calculando**, nunca por la fecha actual.

```
resolverRegla(codigo, fechaDelPeriodo, jurisdiccion) → versión vigente en esa fecha
```

**Bitemporalidad:** cada regla lleva dos ejes de tiempo.

| Eje | Qué significa |
|---|---|
| **Tiempo de validez** (`vigente_desde` / `vigente_hasta`) | Cuándo la ley aplica |
| **Tiempo de registro** (`conocido_desde`) | Cuándo Nomix se enteró |

El segundo eje permite responder *"¿por qué en marzo calculamos esto, si hoy la regla dice otra cosa?"* — que es exactamente la pregunta de un auditor.

### Consecuencias
- ✅ Recalcular una planilla de 2024 usa **12.25%**; una de hoy usa **13.25%**. Automáticamente.
- ✅ Las tasas de 2027 y 2029 **se pueden cargar hoy**, con fecha futura. El sistema se actualiza solo, en la fecha correcta, sin desplegar nada.
- ✅ El Factor WOW #1 ("Zero-Recalculate") depende de poder recalcular cualquier período con sus reglas correctas. Sin esto, no funciona.
- ⚠️ Toda consulta de reglas necesita una fecha. No hay forma de "preguntar la tasa" sin contexto temporal — es intencional.

### Nuevo diferenciador de producto
> **"Nomix nunca se te desactualiza."** Los competidores requieren una actualización de software (y que el cliente la instale) cuando cambia una tasa. Nomix ya tiene cargados los cambios de 2027 y 2029 con su fecha de activación. Es un argumento de venta concreto que sale gratis de esta decisión.

---

## ADR-002 — El catálogo de conceptos con matriz de incidencia es el núcleo del modelo de datos

**Estado:** `ACCEPTED`

### Contexto
La investigación confirmó que la incidencia varía radicalmente entre conceptos, y de formas que no se pueden generalizar:

| Concepto | CSS | Seguro Educativo | ISR |
|---|---|---|---|
| Salario ordinario | 9.75% | 1.25% | Tabla ordinaria |
| **Décimo Tercer Mes** | **7.25%** | **0%** | Tabla ordinaria |
| **Gastos de representación** | **0%** | **0%** | **Escala propia** |
| **Subsidio de incapacidad** | **0%** | **0%** | ❓ |
| **Prima de antigüedad** | **0%** | **0%** | Exención especial |

No hay patrón. Cada concepto es un caso.

### Decisión
Un **concepto de nómina es una fila de datos**, no una clase de código. Cada uno declara su incidencia sobre cada base, y esa declaración también está versionada por vigencia (`ADR-001`).

```
concepto (
  codigo, nombre, tipo,           -- ingreso | deduccion | aporte_patronal | provision
  incide_css, tasa_css_especial,  -- null = tasa general
  incide_seguro_educativo,
  incide_isr, regimen_isr,        -- ordinario | gastos_representacion | exento | especial
  incide_base_xiii,
  incide_promedio_vacaciones,
  incide_base_liquidacion,
  es_inembargable,
  vigente_desde, vigente_hasta,
  jurisdiccion_id, empresa_id     -- null = regla general del país
)
```

El campo `empresa_id` nullable es lo que habilita **convenios colectivos** y el **régimen CAPAC-SUNTRACS** sin tocar código: son filas con `empresa_id` poblado que sobrescriben la regla general.

### Consecuencias
- ✅ Convenios colectivos, regímenes especiales y expansión regional salen **sin código nuevo**.
- ✅ La matriz de `05_especificacion_pendiente` §1 deja de ser documentación y pasa a ser **datos sembrados**.
- ✅ Cuando el profesional responda el Bloque B1 del cuestionario, es un `INSERT`, no un `refactor`.
- ⚠️ Requiere disciplina: la tentación de agregar un `if (concepto === 'XIII')` en el motor debe rechazarse siempre.

---

## ADR-003 — Motor de reglas evaluadas, no biblioteca de fórmulas

**Estado:** `ACCEPTED`

### Contexto
Varias reglas panameñas **no son fórmulas** — son decisiones que dependen del contexto en tiempo de ejecución:

- **Art. 33:** el recargo de hora extra (50% o 75%) depende de **qué jornada se está prolongando** y de **a qué hora empezó**, no del tipo de jornada asignado al trabajador.
- **Art. 212:** si aplica el régimen de despido sin causa depende de la **actividad y el tamaño de la empresa** (≤10 agrícolas, ≤15 manufactureras, ≤20 agroindustriales, ≤5 venta al detal).
- **Art. 225:** el régimen de indemnización depende de la **fecha de ingreso del trabajador**, y los regímenes son **combinables** para un mismo trabajador.
- **Art. 161:** qué descuento se aplica depende de cuánto margen quedó tras aplicar los anteriores.

### Decisión
El motor evalúa **tablas de decisión** con condiciones y prioridad, no cadenas de `if/else`. Cada regla declara sus condiciones de aplicación como datos.

**Ejemplo — clasificación de hora extra:**

| Prioridad | Jornada iniciada | Hora de inicio | Recargo | Base legal |
|---|---|---|---|---|
| 1 | nocturna | — | 0.75 | Art. 33 |
| 2 | mixta | ≥ 18:00 | 0.75 | Art. 33 |
| 3 | mixta | < 18:00 | 0.50 | Art. 33 |
| 4 | nocturna (jornada completa) | — | 0.50 | Art. 33 |
| 5 | diurna | — | 0.25 | Art. 33 |

### Consecuencias
- ✅ Cada regla es **testeable en aislamiento** y **citable** a su artículo.
- ✅ Corregir una interpretación legal es cambiar una fila, no depurar una cadena de condicionales.
- ⚠️ Mayor complejidad inicial del motor. Se paga sola en el primer cambio normativo.

---

## ADR-004 — Los descuentos son un problema de asignación restringida, no un bucle

**Estado:** `ACCEPTED`

### Contexto
El Art. 161 impone restricciones que interactúan entre sí:

- Tope global del **50%** del salario en dinero
- Tope del **30%** para compra de vivienda
- **Pensión alimenticia exenta** del tope global
- **Vacaciones, jubilaciones, pensiones e indemnizaciones inembargables en cuantía completa**
- Salario inembargable **hasta el mínimo legal**

Recorrer los descuentos en un bucle y restarlos produce resultados **ilegales**.

### Decisión
Etapa dedicada de asignación con restricciones, prioridades y arrastre de saldos:

```
1. Retenciones de ley (CSS, SE, ISR)     → sin tope
2. Determinar capacidad de descuento     → tope 50% del salario en dinero
3. Pensiones alimenticias                → EXENTAS del tope
4. Descuento de vivienda                 → tope propio del 30%
5. Resto por prelación                   → hasta agotar la capacidad
6. Verificar piso de salario mínimo      → según región y actividad
7. Registrar arrastre de saldos no aplicados

EXCLUSIÓN TOTAL: sobre pagos de vacaciones, indemnizaciones,
                 jubilaciones y pensiones no se asigna ningún
                 descuento de acreedor.
```

Cada descuento registra **por qué** se aplicó completo, parcialmente o no se aplicó.

### Consecuencias
- ✅ Elimina un riesgo legal directo que la documentación previa no contemplaba.
- ✅ El arrastre de saldos queda modelado desde el inicio, no parcheado después.
- ⏸️ El **orden de prelación** entre acreedores ordinarios está pendiente (consulta **E1**). Hasta entonces: orden por antigüedad de la orden, configurable, con override manual auditable.

---

## ADR-005 — Cada resultado guarda qué regla lo produjo

**Estado:** `ACCEPTED`

### Contexto
Tres necesidades convergen en el mismo mecanismo:

1. **Auditoría legal** — DGI, CSS y MITRADEL pueden exigir justificación de un cálculo de hace tres años.
2. **Factor WOW #3** — el *Inspection Drawer* que muestra paso a paso cómo se calculó una retención.
3. **`ADR-001`** — si las reglas cambian con el tiempo, hay que saber cuál se usó.

### Decisión
Cada línea calculada persiste su **procedencia**: qué versión de qué regla se aplicó, con qué insumos, y qué produjo.

```
planilla_detalle_traza (
  detalle_id, concepto_codigo,
  regla_codigo, regla_version,
  base_aplicada, tasa_aplicada, resultado,
  articulo_legal,        -- "Art. 33 CT", "Art. 700 CF"
  calculado_en
)
```

### Consecuencias
- ✅ El Inspection Drawer del Factor WOW #3 sale **casi gratis** — es una vista sobre esta tabla.
- ✅ Se puede responder *"¿por qué a Carlos le retuvieron esto en marzo?"* con precisión, años después.
- ✅ Alimenta al Copiloto IA con contexto verificable en vez de conjeturas.
- ⚠️ Volumen de datos considerable. Mitigación: particionar por período y archivar los cerrados.

> **Reencuadre:** la explicabilidad deja de ser una característica de UI y pasa a ser una **propiedad del motor**. Es la diferencia entre "el sistema dice $X" y "el sistema dice $X por el Art. 33, con esta base y esta tasa".

---

## ADR-006 — Aritmética decimal exacta, redondeo solo en la frontera

**Estado:** `ACCEPTED`

### Decisión

| Aspecto | Regla |
|---|---|
| Tipo | `NUMERIC(18,6)` en base de datos · decimal exacto en aplicación |
| **Prohibido** | Punto flotante (`float`, `double`, `number` de JS) en cualquier cálculo monetario |
| Precisión interna | 6 decimales |
| Redondeo | **Solo** al presentar y al serializar archivos (ACH, SIPE, DGI) |
| Método | `HALF_UP` |
| Prohibido | Redondear resultados intermedios encadenados |

### Consecuencias
- ✅ Los totales patronales cuadran **al centavo** contra la CSS.
- ⚠️ Si el stack es TypeScript, obliga a una biblioteca decimal (`decimal.js` / `big.js`) y a prohibir aritmética nativa por regla de lint. Es una restricción real que hay que hacer cumplir con tooling, no con buenas intenciones.

---

## ADR-007 — No cifrar `salario_base` a nivel de aplicación

**Estado:** `ACCEPTED` — resuelve el conflicto `DEC-007`

### Contexto
`03_arquitectura_docker_seguridad_nomix.md` §3.1 propone cifrar con AES-256-GCM tres campos: `cedula`, `numero_cuenta_ach` y **`salario_base`**.

Un campo cifrado en la aplicación no admite `SUM`, `AVG`, `ORDER BY`, `GROUP BY` ni comparaciones en SQL. Cifrar `salario_base` rompería:

- **Validación de salario mínimo** (`comparar salario contra tabla por región y actividad`)
- Estadística salarial (`SCR-062`), Resumen de nómina (`SCR-082`)
- Reservas de cargas sociales (`SCR-085`), Salarios pagados (`SCR-080`)
- Cálculo de provisiones y del costo patronal
- Prácticamente todo el `MOD-006`

### Decisión

| Campo | Protección |
|---|---|
| `cedula` | ✅ Cifrado de aplicación AES-256-GCM |
| `numero_cuenta_ach` | ✅ Cifrado de aplicación AES-256-GCM |
| **`salario_base`** | ❌ **Sin cifrado de aplicación.** Protegido por RLS + permisos a nivel de columna + auditoría de acceso + cifrado en reposo del volumen |

### Justificación
La **Ley 81 de 2019** exige *medidas de seguridad apropiadas*, no una técnica específica. Para un dato que la lógica de negocio debe agregar constantemente, la medida apropiada es **control de acceso + trazabilidad**, no cifrado de campo. Cifrarlo produciría un sistema que no puede hacer su trabajo, y la salida habitual —descifrar todo en memoria para agregar— ofrece **menos** seguridad real que RLS bien aplicado, además de no escalar.

Cédula y cuenta bancaria son distintos: nunca se agregan, solo se leen puntualmente. Ahí el cifrado no cuesta nada.

### Consecuencias
- ✅ El `MOD-006` completo sigue siendo viable.
- ✅ La validación de salario mínimo es posible.
- ⚠️ Exige que RLS, los permisos de columna y la auditoría de acceso a salarios estén **bien hechos**. Es la contrapartida y no es negociable.

---

## ADR-008 — Jurisdicción como dimensión desde el día 1, con Panamá como única implementación

**Estado:** `ACCEPTED` — resuelve `DEC-003`

### Contexto
El tagline apunta a *"Panamá y la región"*. La investigación mostró que las reglas panameñas son muy específicas, **pero que su forma es general**: toda la jurisdicción se expresa como *conjuntos de reglas con vigencia + matriz de incidencia de conceptos*, que es exactamente lo que definen `ADR-001` y `ADR-002`.

### Decisión
Incluir `jurisdiccion_id` en todas las tablas de reglas desde el inicio. El motor no contiene ninguna referencia a Panamá; consume reglas. **No se implementa ningún otro país todavía.**

### Consecuencias
- ✅ Costo marginal hoy: estimado en **~5%** del esfuerzo del motor (una columna y disciplina de diseño).
- ✅ Evita una reescritura completa cuando aparezca el segundo país.
- ⚠️ Riesgo de sobre-abstracción. **Mitigación explícita:** no se crea ninguna abstracción que Panamá no necesite. La generalidad viene de que las reglas son datos, no de capas de indirección especulativas.

---

## ADR-009 — El calendario de feriados es un generador, no una lista

**Estado:** `ACCEPTED`

### Contexto
De los 12 días de fiesta o duelo del Art. 46:
- 9 son de **fecha fija**
- 2 son **móviles** dependientes de la Pascua — Martes de Carnaval (Pascua − 47 días) y Viernes Santo (Pascua − 2 días)
- 1 es **quinquenal** — toma de posesión presidencial

Además, el Ejecutivo puede decretar días de duelo nacional imprevistos.

### Decisión
Tabla de definiciones con tipo de cálculo (`fija` / `movil_pascua` / `eventual`), y generación de las fechas concretas por año. Los duelos nacionales decretados se agregan como registros eventuales por año.

### Consecuencias
- ✅ El calendario nunca queda desactualizado ni requiere carga manual anual.
- ✅ Corresponde a `confdiaslibres.php` (`SCR-011`), pero correcto.

---

## ADR-010 — Stack tecnológico ⏸️ PENDIENTE

**Estado:** `PROPOSED` — **es la única decisión que falta y bloquea el scaffolding**

### Contexto revisado
La propuesta original recomendaba **Laravel 11 / PHP 8.3** con este argumento:

> *"Reutilización de los algoritmos matemáticos y legales existentes en PHP... Evita reescribir desde cero la compleja lógica tributaria panameña."*

**Ese argumento ya no se sostiene, por dos razones acumuladas:**
1. En este repositorio **no existe código PHP de PlaniFácil** — solo la especificación reconstruida.
2. Aunque existiera, la sección §0 demuestra que esa lógica está **parcialmente desactualizada y en algunos puntos es incorrecta**. Reutilizarla importaría errores.

Sin ese argumento, la comparación se decide por otros factores:

| Factor | NestJS + TypeScript | Laravel + PHP |
|---|---|---|
| **Factor WOW #1** (cálculo reactivo en vivo) | Motor compartido servidor/navegador — cálculo instantáneo sin round-trip | Requiere ida y vuelta al servidor por cada edición, o duplicar el motor en TS |
| Aritmética decimal (`ADR-006`) | Requiere `decimal.js` + regla de lint estricta | `BCMath` nativo — **ventaja de PHP** |
| Tipado del dominio | Tipos estructurales, discriminated unions, Zod para validar reglas | Enums y tipos de PHP 8.3, buenos pero menos expresivos |
| Ecosistema circundante | n8n es Node · SDK de Anthropic en TS | Requiere puentes |
| Colas y trabajos | BullMQ | Horizon — **muy maduro, ventaja de PHP** |
| Un solo lenguaje en todo el equipo | Sí (motor, API, web) | No (PHP + TS de todos modos en el frontend) |

**Recomendación: NestJS + TypeScript en monorepo**, con `@nomix/payroll-engine` como paquete puro sin dependencias de infraestructura, consumido tanto por la API como por el navegador.

El factor decisivo es el `ADR-005` combinado con el Factor WOW #1: si el motor y su trazabilidad corren también en el cliente, el cálculo reactivo con diff visual es inmediato y offline-capaz. Con backend PHP hay que elegir entre latencia en cada tecla o mantener dos implementaciones del motor sincronizadas — que en un sistema de nómina es exactamente el tipo de divergencia que produce errores caros.

**La contra honesta:** `BCMath` de PHP y Horizon son mejores que sus equivalentes en Node, y si tu equipo domina PHP, esa ventaja pesa más que todo lo anterior.

### Decisión
✅ **ACEPTADO — TypeScript en monorepo (NestJS + React), 2026-08-26.**

**Restricción declarada por JK:** el proyecto lo construye él apoyándose en agentes IA, sin equipo humano. Eso elimina el factor "dominio del equipo", que era el único contrapeso serio a favor de PHP, y desplaza el criterio a **qué stack produce código verificable con menor superficie de error silencioso**.

| Criterio bajo desarrollo asistido por agentes | Resultado |
|---|---|
| Un solo lenguaje en motor, API y web | Un solo contexto para el agente. Menos traducción entre paradigmas, menos error |
| Motor compartido servidor/navegador | El Factor WOW #1 sin duplicar lógica — **la duplicación es precisamente el riesgo que un agente introduce sin avisar** |
| Validación de reglas en runtime | Zod permite que el catálogo de conceptos y las tablas de decisión (`ADR-002`, `ADR-003`) se validen solos al cargarse |
| Ecosistema n8n y SDK de Anthropic | Nativos |

### ⚠️ La deuda que esta decisión asume — y su mitigación obligatoria

**JavaScript no tiene decimal nativo.** Un agente puede escribir `salario * 0.0975` sin pensarlo, y eso pasa los tests con números pequeños y falla en producción por centavos. PHP no sufre esto porque tiene `BCMath`.

Esta es la **desventaja real** de la decisión y no se resuelve con buenas intenciones. Contramedidas, todas obligatorias:

1. **`decimal.js` en todo cálculo monetario.** Sin excepción.
2. **Regla de lint que rompa el build** ante operadores aritméticos (`* / + -`) sobre tipos monetarios en `packages/payroll-engine` y `apps/api`.
3. **Columnas `numeric` que regresan `string`** desde la base de datos, nunca `number`. Hace imposible la coerción accidental a float en la frontera de datos.
4. **`qa-calculos` trata la aritmética nativa en código monetario como hallazgo crítico automático**, no como observación de estilo.

> Sin las cuatro, esta decisión es peor que Laravel. Con las cuatro, es mejor.

### Stack concreto
Detalle completo en [`ARCHITECTURE.md`](../../ARCHITECTURE.md) en la raíz del repositorio.

---

## ADR-011 — Multi-tenancy con membresía explícita (modelo de firma contable)

**Estado:** `ACCEPTED` — resuelve `DEC-005`

### Contexto
JK confirma que el mercado objetivo es **contadores y firmas contables que gestionan la planilla de N empresas clientes** desde una sola cuenta. Es el modelo del competidor y el real del mercado panameño.

Es el modelo de tenancy **más difícil de asegurar**: el vínculo usuario↔empresa es de muchos a muchos, cambia con el tiempo (una firma pierde un cliente), y el rol puede diferir por empresa.

### Decisión

```
usuario
empresa
usuario_empresa ( usuario_id, empresa_id, rol,
                  vigente_desde, vigente_hasta )   ← membresía con vigencia
```

- La sesión guarda `empresa_activa_id`, **resuelto en el servidor**, nunca enviado por el cliente.
- Cada petición valida la membresía vigente y ejecuta `SET LOCAL app.current_empresa_id` dentro de la transacción.
- Las políticas RLS de PostgreSQL filtran por `current_setting('app.current_empresa_id')`.
- El rol se resuelve **por empresa**, no por usuario: la misma persona puede ser administradora en una y solo lectora en otra.

### Consecuencias
- ✅ Cubre también el caso de empresa directa (una sola membresía) sin ramas de código.
- ✅ La vigencia en la membresía resuelve el caso real *"la firma dejó de atender a ese cliente"* sin borrar historial.
- 🔴 **Test de seguridad crítico y obligatorio:** un usuario cuya membresía venció **no puede** ver datos de esa empresa, ni aunque conserve el `empresa_id` de una sesión anterior. `seguridad-datos` debe probarlo explícitamente antes de cualquier despliegue.
- ⚠️ La auditoría registra **usuario + empresa activa**, no solo usuario.

---

## ADR-012 — Despliegue en VPS propio con Docker y PITR autogestionado

**Estado:** `ACCEPTED`

### Contexto
JK opta por VPS propio (Hetzner / DigitalOcean / Contabo) por costo y control.

### Decisión
Docker Compose sobre VPS único para el MVP, con ruta de crecimiento a Swarm o a un segundo nodo sin rediseño.

| Componente | Elección |
|---|---|
| Proxy y TLS | Caddy (certificados automáticos) |
| Base de datos | PostgreSQL 16 con RLS |
| Cache, sesiones y colas | Redis |
| Respaldo | **pgBackRest** → almacenamiento S3-compatible cifrado |
| Objetivos | **RPO < 5 s · RTO < 15 min** |

### Consecuencias
- ✅ Costo de infraestructura del MVP en el rango de $20–60/mes.
- ✅ Diseño portable: sin servicios propietarios. Migrar a cloud mayor después no exige rediseño.
- 🔴 **El costo real es operativo, y recae en `devops-infra`.** Un VPS propio significa que PITR, la réplica y el monitoreo hay que construirlos, no contratarlos. En nómina, `pg_dump` diario **no es suficiente**: perder el día activo es perder una quincena de capturas.
- ⚠️ **Prueba de restauración automatizada obligatoria** antes del primer dato real. Un respaldo no restaurado no es un respaldo.
- ⏸️ Réplica de lectura diferida: no se justifica en el MVP. El diseño no la impide.

---

## ADR-013 — n8n diferido tras el MVP, con enganche de eventos desde el día 1

**Estado:** `ACCEPTED`

### Contexto
JK confirma la visión: automatizaciones vía **n8n**, pero **después de tener un MVP
funcional y validado**. La decisión de secuencia es correcta — n8n sobre un motor de
cálculo aún no validado solo añadiría superficie de fallo.

### Decisión
1. **n8n NO entra en el MVP.** No se despliega, no se diseña contra él todavía.
2. **Pero el MVP emite eventos de dominio desde el inicio**, con patrón *outbox*:
   `PlanillaAprobada`, `ColaboradorContratado`, `LiquidacionEmitida`,
   `ContratoPorVencer`, etc. se escriben en una tabla `evento_saliente` dentro de la
   misma transacción que los produce.
3. Cuando llegue n8n, se conecta a esa cola de eventos. **Cero refactor del núcleo.**

### La frontera de n8n — no negociable (de `docs/nomix/01` §5.2)
n8n **orquesta y notifica; nunca calcula.**

| n8n SÍ hace | n8n NUNCA hace |
|---|---|
| Enviar talonarios por correo/WhatsApp al aprobar planilla | Calcular CSS, SE, ISR, neto o prestaciones |
| Alertas de vencimiento de contrato, SIPE, vacaciones | Ser fuente de verdad de ningún dato maestro |
| Ingerir marcaciones de relojes biométricos → API | Modificar montos de planilla |
| Empujar el asiento contable a QuickBooks/Odoo/SAP | Sustituir la base de datos |

Todo cálculo determinista vive en `packages/payroll-engine`, en el servidor. n8n
consume resultados ya calculados y los mueve.

### Consecuencias
- ✅ El MVP no carga con complejidad de automatización prematura.
- ✅ El patrón outbox cuesta ~1 tabla y una convención ahora; evita reescribir el
  flujo de eventos cuando n8n entre.
- ✅ La ingesta biométrica (relojes ZKTeco/Hikvision/Anviz) tiene su punto de entrada
  natural en n8n → `/api/v1/marcaciones`, sin acoplar el core a cada marca de reloj.
- ⚠️ `backend-nomina`: emitir el evento es parte de la definición de "hecho" de cada
  operación que lo amerite, no un añadido posterior.

---

## ADR-014 — Retención de ISR: método acumulativo, no proyección simple

**Estado:** `ACCEPTED`

### Contexto
La consulta **A1** de `07_consultas_profesional_planilla.md` sigue sin respuesta: la
ley panameña no prescribe **cómo** debe retener el empleador ISR quincena a
quincena — el instructivo de la DGI describe solo la declaración anual (base legal
§4.5). La documentación heredada de PlaniFácil proponía proyección simple
(`salario × 13 / 24`), pero esa fórmula:

- presupone el XIII Mes dentro de la base anual, mientras el XIII se grava aparte en
  su propio pago → riesgo de doble gravamen;
- falla ante ingreso variable (comisiones, horas extra, gastos de representación) y
  cambios de salario a mitad de año, obligando a un ajuste traumático de diciembre.

### Decisión
Nomix retiene con el **método acumulativo**: en cada período, recalcula el impuesto
causado sobre el ingreso gravable acumulado del año a la fecha (histórico de
`planilla_detalle` + este período) y retiene solo la diferencia contra lo ya
retenido. Dos flujos paralelos, cada uno con su propia escala progresiva y su propio
acumulado — el ordinario (Art. 700 CF) y el de gastos de representación (Art. 701
lit. l CF) — porque el Formulario 03 los reporta en columnas separadas
(`docs/nomix/09_formatos_reales_planifacil.md` §2).

Implementación: `packages/payroll-engine/src/planilla/isr.ts` (cálculo puro de
tramos y de la retención incremental) + `apps/api/src/planilla/isr-acumulado.ts`
(lee el histórico del año sumando la columna `base` de líneas `isr_retencion`
persistidas, nunca una cifra "acumulada" aparte que se desincronizaría si un período
anterior se recalcula).

**Sub-decisiones declaradas** (ninguna tiene respaldo legal firme; se documentan
para que sean auditables y corregibles):

| Sub-decisión | Elegido | Por qué |
|---|---|---|
| ¿Se resta CSS/SE de la base gravable? | **No** | La secuencia oficial del instructivo DGI (base legal §4.3, líneas 6-25) no menciona restarlas — solo resta gastos de representación y deducciones personales. La documentación heredada que sí las restaba no cita esa secuencia. |
| Deducción básica de B/.800 | **No se aplica automáticamente** | Base legal §4.2: es de la declaración **conjunta anual**, no una deducción automática de planilla. Aplicarla en cada quincena sería un error a escala. |
| Deducciones personales (médicos, hipoteca, jubilación) | **B/.0 (no capturadas)** | No existe campo en la ficha del colaborador. Queda como `deduccionesPersonalesAnuales: Money.ZERO` explícito en el código, listo para recibir un valor real cuando se agregue el campo. |
| XIII Mes en el flujo acumulativo | **Fuera de alcance** — el módulo XIII no existe todavía | Evita el riesgo de doble gravamen que motivó esta decisión en primer lugar; se diseñará su propio tratamiento cuando se construya `WF-002`. |
| Recalcular un período pasado después de uno posterior | **No reajusta automáticamente el posterior** | Igual que cualquier sistema de retención acumulativa: se asume que los períodos se calculan y aprueban en orden cronológico dentro del año. Aprobar congela el período (máquina de estados existente), lo que limita el riesgo en la práctica. |

### Consecuencias
- ✅ El sistema nunca retiene de más a mitad de año por ingreso variable — se
  autocorrige en el siguiente corte sin ajuste de fin de año.
- ✅ Cada línea de retención es auditable: su `base` es la de su propio período, su
  traza cita el artículo y el método (`ADR-014`).
- ⚠️ Todas las sub-decisiones de la tabla de arriba son supuestos declarados, no
  hechos verificados. `totales.isr.nota` lo expone en cada planilla calculada — no
  es letra pequeña, es visible en la UI (`PlanillaDetalle`).
- ⚠️ Sigue pendiente: la escala de gastos de representación tiene un tope declarado
  de "no exceder el 100% del salario" (base legal §4.4) que Nomix todavía no valida.

---

## Impacto en los diferenciadores de producto

### Factor WOW #4 — Pre-auditoría fiscal: ahora es concreto
La visión prometía *"30+ reglas de validación"* sin enumerarlas. La investigación produce las primeras **verificables**:

| # | Validación | Base legal |
|---|---|---|
| 1 | Salario por debajo del mínimo de su región y actividad | D.E. 13 de 2025 |
| 2 | Horas extra superan 3 diarias o 9 semanales | Art. 36 CT |
| 3 | Descuentos superan el 50% del salario en dinero | Art. 161 CT |
| 4 | Descuento de vivienda supera el 30% | Art. 161 CT |
| 5 | Descuento de acreedor aplicado sobre vacaciones o indemnización | Art. 161 CT |
| 6 | Comisiones u horas extra excluidas de la base de CSS | *(error más frecuente reportado)* |
| 7 | Vacaciones fraccionadas sin convención colectiva | Art. 56 CT |
| 8 | Fraccionamiento en más de 2 partes | Art. 56 CT |
| 9 | Subsidio de incapacidad incluido en la base del XIII | §7.2 base legal |
| 10 | Gastos de representación exceden el 100% del salario | ⚠️ por confirmar |
| 11 | Tasa de Riesgos Profesionales fuera del rango 0.56%–6.25% | JD-CSS 12,260-2024 |
| 12 | Jornada mixta con más de 3 horas nocturnas | Art. 31 CT |
| 13 | Cuota patronal aplicada con tasa no vigente para el período | Ley 462 de 2025 |

La #6 y la #13 son las más valiosas comercialmente: son errores que los sistemas actuales cometen en silencio.

### Factor WOW #2 — Copiloto IA: ahora tiene corpus
`06_base_legal_panama.md` con sus citas de artículos es el material de fundamentación. El Copiloto responde **con base legal citada y verificable**, no con conocimiento general de un modelo. Combinado con `ADR-005`, puede explicar un cálculo concreto citando la regla y el artículo que lo produjeron.

### Nuevo diferenciador — "Nunca te desactualizas"
Sale gratis de `ADR-001`. Ver detalle arriba.

### Factor WOW #6 — Simulador: cifras corregidas
El costo patronal real usa 13.25% (no 12.25%), la tasa de RP real de **esa** empresa según su CIIU (0.56%–6.25%, no un 1.50% genérico), y añade dos componentes que faltaban: provisión de prima de antigüedad (1.92%) y cuota de indemnización del Fondo de Cesantía (5%).

---

## Hoja de ruta revisada

La Fase 1 original ("Estructuración Laravel / DB / API REST" + "Extracción y testing de motores legal/nómina") **ya no aplica tal cual**: no hay motores que extraer, y la base legal ya está hecha.

| Fase | Contenido | Estado |
|---|---|---|
| **0. Base legal** | Investigación normativa verificada con fuentes | ✅ **Completada** |
| **0b. Consultas** | Cuestionario a profesional (`07_consultas...`) | 📤 **Listo para enviar** |
| **1. Núcleo temporal** | Esquema de reglas con vigencia · catálogo de conceptos · motor de resolución (`ADR-001`, `ADR-002`, `ADR-003`) | 🔓 Desbloqueado |
| **2. Motor de cálculo** | CSS, SE, ISR, recargos, provisiones · asignación de descuentos (`ADR-004`) · trazabilidad (`ADR-005`) | 🔓 Desbloqueado |
| **3. Datos y acceso** | Multi-tenancy con RLS · cifrado selectivo (`ADR-007`) · auditoría | 🔓 Desbloqueado |
| **4. Prestaciones** | Vacaciones, XIII Mes, liquidaciones (Art. 210–227) | 🟡 Parcial — falta el Bloque D del cuestionario |
| **5. Interfaz** | Layout responsivo · Cmd+K · wizard de colaborador · Inspection Drawer | 🔓 Desbloqueado |
| **6. Salidas** | ACH multi-banco · SIPE · Formulario 03 | 🔴 Bloqueado — faltan los layouts |
| **7. Factor WOW** | Copiloto IA · WhatsApp · Simulador | 🔓 Desbloqueado |

**Lo que cambió:** las fases 1, 2, 3 y 5 —el grueso del sistema— están completamente desbloqueadas. Solo la fase 6 sigue bloqueada, y por documentos externos que no dependen de nosotros.

---

## Resumen de decisiones

| ADR | Decisión | Estado |
|---|---|---|
| 001 | Reglas resueltas por fecha de vigencia (bitemporal) | ✅ |
| 002 | Catálogo de conceptos con matriz de incidencia como datos | ✅ |
| 003 | Tablas de decisión evaluadas, no `if/else` | ✅ |
| 004 | Descuentos como asignación restringida | ✅ |
| 005 | Trazabilidad de regla en cada resultado | ✅ |
| 006 | Decimal exacto, redondeo solo en frontera | ✅ |
| 007 | No cifrar `salario_base` a nivel de aplicación | ✅ |
| 008 | Jurisdicción como dimensión, solo Panamá implementado | ✅ |
| 009 | Feriados como generador con fechas móviles | ✅ |
| 010 | **TypeScript en monorepo** (NestJS + React) + 4 contramedidas decimales | ✅ |
| 011 | Multi-tenancy con membresía explícita (modelo de firma contable) | ✅ |
| 012 | VPS propio con Docker, PostgreSQL y PITR autogestionado | ✅ |
| 013 | n8n diferido tras el MVP, con enganche de eventos (outbox) desde el día 1 | ✅ |

**No queda ninguna decisión de arquitectura abierta.** El detalle operativo está en
[`ARCHITECTURE.md`](../../ARCHITECTURE.md).
