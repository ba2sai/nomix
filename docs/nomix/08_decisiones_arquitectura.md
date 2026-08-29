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

### Implementación (2026-08-29)
`packages/payroll-engine/src/planilla/descuentos.ts` (`asignarDescuentos`, puro) +
`apps/api/src/planilla/descuentos.ts` (topes por vigencia). El régimen de cada
descuento frente al Art. 161 es un DATO del catálogo —`concepto.categoria_descuento`:
`pension_alimenticia` | `vivienda` | `ordinario`— así que añadir "cuota sindical"
o "cooperativa" es un `INSERT`, no un `if` nuevo (coherente con `ADR-002`).

Tres sub-decisiones declaradas, ninguna con respaldo legal firme:

| Sub-decisión | Elegido | Por qué |
|---|---|---|
| ¿Las retenciones de ley consumen el tope del 50%? (**E2**) | **No** | El Art. 161 dice "el total de deducciones y retenciones no excederá del 50%", pero la base legal §9.1 lista ISR y CSS obrera como "sin límite (retención de ley)". Las dos lecturas no caben juntas; Nomix toma la segunda y lo declara. |
| Prelación entre acreedores ordinarios (**E1**) | **Antigüedad de la captura** | A falta de una fecha de orden en el modelo, la marca de tiempo del movimiento es lo más cercano y es auditable. Se usa la marca completa, no solo la fecha: de ese orden depende quién cobra cuando el 50% no alcanza. |
| Arrastre de saldos (**E5**) | **Se calcula y se muestra, no se aplica solo** | Que el saldo se arrastre al período siguiente, si genera mora y si hay que notificar al acreedor son tres preguntas sin responder. Aplicarlo automáticamente sería inventar las tres. |

El piso de salario mínimo del Art. 161 **no se verifica todavía**: la tabla de 59
tasas del D.E. 13 de 2025 no está cargada. El resultado lo declara en cada
planilla en vez de dar por bueno un neto que podría vulnerarlo.

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
| XIII Mes en el flujo acumulativo | **Entra al mismo acumulado anual** (resuelto en `ADR-015`) | El riesgo de doble gravamen venía de la proyección `× 13`, que presuponía el XIII sin haberlo percibido. El método acumulativo suma solo bases realmente percibidas, así que sumar la partida al acumulado ordinario lo cuenta exactamente una vez. |
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

## ADR-015 — El XIII Mes es un proceso sobre el histórico, no un concepto que se devenga

**Estado:** `ACCEPTED`
**Fecha:** 2026-08-28

### Contexto
El Décimo Tercer Mes (Decreto de Gabinete 221 de 1971, reglamentado por el Decreto
19 de 1973) se paga en tres partidas y se calcula **sobre el promedio de los
salarios percibidos** en el período de cada una (Art. 4º) — no sobre el salario
contratado. Eso lo hace estructuralmente distinto de todo lo que el motor hacía
hasta ahora: no es una línea más que se devenga dentro de un período, es un cálculo
que mira **cuatro meses hacia atrás**.

Además arrastra tres reglas que ningún documento previo del repositorio recogía, y
que son exactamente el tipo de detalle que produce reclamos en MITRADEL:

- **Art. 3º** — la 3ª partida compite con el aguinaldo pactado o acostumbrado, y se
  paga la suma **más favorable** al trabajador.
- **Art. 5º** — piso irrenunciable: un convenio colectivo solo vale en lo que mejore
  el resultado de la regla general. La sobrescritura es **unidireccional**.
- **§3.3** — la cuota **obrera** de CSS sobre el XIII es 7.25% (no 9.75%) y el Seguro
  Educativo es 0%. La cuota **patronal** sigue sin determinar (consulta **A7**).

### Decisión

**1. El XIII es un TIPO de planilla (`xiii`), no un concepto capturable.**
La rama vive en `ProcesoService.calcular` sobre `planilla_cabecera.tipo`, no dentro
del bucle de conceptos. Un proceso distinto merece una rama distinta; lo que
`ADR-002` prohíbe es preguntar por el *código de un concepto* dentro del motor, y
eso se sigue respetando. Una planilla de XIII **rechaza movimientos**: aceptarlos y
después ignorarlos sería peor que negarlos.

**2. La base se reconstruye del histórico, no se acumula en una columna.**
`acumularVentana` suma las líneas de `planilla_detalle` de las planillas que cierran
dentro de la ventana de la partida, y las hace pasar por `acumularBases`: es la
matriz de incidencia (`incide_base_xiii`) la que decide qué entra, con las
deducciones restando por su tipo. Mismo principio que `ADR-014`: recalcular una
quincena anterior corrige el XIII solo, sin dejar una cifra vieja en ninguna parte.
Y el propio catálogo impide calcular el décimo sobre el décimo, porque `xiii_mes`
declara `incide_base_xiii = false`.

**3. Las retenciones no se calculan en el módulo del XIII.**
La partida se emite como una línea del concepto `xiii_mes` y vuelve a pasar por
`acumularBases`. El catálogo ya declara su tasa propia de CSS y su régimen de ISR,
así que el 7.25% no aparece cableado en ninguna parte del código del XIII.

**4. El ciclo de partidas y el divisor viven en `regla`, no en el código.**
`partidas_xiii` (array `[{ numero, desde: 'MM-DD', hasta: 'MM-DD' }]`) y
`divisor_xiii` (`"12"`). Llevan medio siglo sin moverse, pero cablearlas rompería
`ADR-001` y, sobre todo, impediría que un convenio colectivo los sobrescriba.

**5. Las tres comparaciones del Decreto son `MAX`, y ninguna es silenciosa.**
Aguinaldo (Art. 3º) y piso general (Art. 5º) se resuelven con `Money.max` y
**siempre** dejan una advertencia en `totales.advertencias`, visible en la UI. Un
sistema que sustituye la partida por el aguinaldo sin decirlo es un sistema en el
que nadie puede verificar por qué le pagaron lo que le pagaron.

**6. El período que el usuario escribe no manda: manda el Decreto.**
La ventana se deriva de la fecha de cierre con `resolverPartida`. Si la cabecera
declara otras fechas, se calcula sobre la ventana legal y se advierte. Calcular
sobre una ventana inventada sería un error que nadie detectaría hasta la demanda.

**7. Sin cuota patronal determinada, esta planilla no reporta costo del empleador.**
`totales.cargasPatronales` y `totales.costoEmpleador` van en `null`, y la UI muestra
"no determinado" con la nota de la consulta A7. Poner el bruto ahí lo haría parecer
un costo completo, y no lo es.

### Sub-decisiones declaradas
Ninguna de estas tiene respaldo legal firme. Se documentan aquí y se **muestran en
la planilla** cuando aplican, para que sean auditables y corregibles:

| Sub-decisión | Elegido | Por qué |
|---|---|---|
| ¿El aguinaldo compite con la 3ª partida o con el XIII completo del año? (**B2-bis.c**) | **Con la 3ª partida** | Lectura literal del Art. 3º: *"La Tercera Partida (…) equivale a un Aguinaldo"*, y remata *"sin perjuicio del pago completo de las otras dos partidas"*. |
| ¿A qué tasa cotiza el aguinaldo que gana la comparación? (**B2-bis.d**) | **7.25%, como el XIII** | Se emite con el concepto `xiii_mes`, que es la partida a la que sustituye. Si el asesor responde 9.75%, se resuelve con un concepto propio en el catálogo — sin tocar código. |
| ¿Qué califica como aguinaldo "acostumbrado de manera reiterada"? (**B2-bis.b**) | **Lo declara la empresa** | `empresa.paga_aguinaldo_acostumbrado` + `colaborador.monto_aguinaldo`. Nomix no infiere la costumbre de la historia de pagos: es un hecho jurídico, no un patrón de datos. |
| ¿A qué partida pertenece una planilla que cruza la frontera de la ventana? | **A la partida en la que cierra** (`periodo_hasta`) | Los cortes quincenales panameños coinciden con las fronteras de las partidas, así que hoy ninguna planilla queda partida. |

### Lo que este ADR NO decide
- **La cuota patronal sobre el XIII** (consulta **A7**). No se inventa una tasa.
- **Qué monto entra al promedio cuando paga la CSS** — licencia de maternidad y
  riesgos profesionales están en la lista taxativa del Art. 4º sin calificar quién
  paga (consulta **B2.e**, base legal §3.7). Hoy entra lo que el catálogo declare
  para cada concepto; `subsidio_incapacidad_css` está en `false` y marcado
  `verificar`.
- **El modo "solo salario base"** de PlaniFácil: Nomix **no lo ofrece**. Viola el
  Art. 4º y el Art. 5º lo cierra. Si se importa histórico de un sistema que lo
  usaba, hay que advertir que puede estar subcalculado.

### Consecuencias
- ✅ Añadir un concepto que deba entrar al XIII es un `INSERT` con
  `incide_base_xiii = true`. Cero cambios de código.
- ✅ El XIII de un colaborador que entró a mitad del período sale correcto sin
  prorrateo aparte: solo acumuló lo que percibió (Art. 2º del Decreto 221).
- ✅ El ISR del XIII entra al acumulado anual ordinario y se cuenta una sola vez.
- ⚠️ La planilla del XIII depende de que las planillas ordinarias de su ventana
  estén calculadas. Si falta una quincena, la partida sale corta — y no hay forma
  de detectarlo automáticamente hasta que exista un calendario de períodos
  esperados. Queda anotado como hueco conocido.

---

## ADR-016 — Vacaciones: ayuda de cálculo sobre el histórico, no un ciclo persistido

**Estado:** `ACCEPTED`
**Fecha:** 2026-08-28

### Contexto
El Art. 54 del Código de Trabajo da derecho a 30 días de vacaciones por cada 11 meses
continuos de trabajo, pagadas por adelantado sobre el promedio de lo percibido en ese
período (base legal §6). A diferencia del XIII Mes (`ADR-015`), el ciclo de vacaciones
**no es un calendario compartido por toda la empresa**: cada colaborador tiene el suyo,
anclado a su `fecha_ingreso` y renovado cada vez que se le pagan. Forzar el patrón del
XIII (una fecha única, un tipo de planilla que procesa a todos a la vez) habría sido
artificial.

Además, la mecánica operativa tiene más huecos abiertos que el XIII: la consulta
**B4** (`07_consultas_profesional_planilla.md`) deja sin resolver el fraccionamiento
en la práctica, la compensación en dinero sin gozarlas, y el tope de acumulación. Y el
propio Art. 54 admite dos formulaciones de la tasa de acumulación — "30 días por 11
meses" y "1 día por 11 días trabajados" — que la consulta B4 anota que **redondean
distinto**, sin que ningún documento las concilie.

### Decisión

**1. Es una ayuda de cálculo dentro de Movimientos, no un tipo de planilla ni un
workflow con tabla propia.**
`GET /planillas/:id/vacaciones/:colaboradorId` (`MovimientoService.calcularVacaciones`)
reconstruye el ciclo vigente y devuelve un monto **sugerido**. Quien captura el
movimiento lo revisa, lo ajusta o lo descarta — el resultado siempre termina como una
línea `vacaciones_pagadas` normal, capturada como cualquier otro movimiento (ADR-002).
Esto deja fuera del alcance de hoy el workflow completo (`WF-003`, que nunca se
escribió) y su tabla de ciclos abiertos/saldo — se construye cuando las consultas
B4 tengan respuesta, no antes.

**2. El ciclo se reconstruye del histórico, nunca se guarda un saldo.**
Inicio = el día siguiente a la última línea `vacaciones_pagadas` de ese colaborador en
`planilla_detalle`, o su `fecha_ingreso` si nunca se le han pagado. Mismo principio que
`ADR-014`/`ADR-015`: corregir una línea de un ciclo anterior corrige el actual sin
dejar ninguna cifra vieja desincronizada.

**3. La base del promedio la sigue decidiendo el catálogo.**
`Bases.promedioVacaciones` (ya existente desde `ADR-002`) se acumula con
`acumularBases` sobre las líneas de planilla del ciclo, exactamente como el XIII usa
`Bases.xiii`. Ningún concepto está nombrado dentro de este módulo.

**4. La equivalencia de las dos formulaciones del Art. 54 se declara, no se demuestra.**
```
monto = Σ(salarios del ciclo) ÷ 11
```
Es el mismo patrón que el ÷12 del XIII (un "mes de sueldo" por un período de
acumulación), pero con una diferencia importante: el ÷12 del XIII se demuestra con dos
derivaciones independientes (base legal §3.2). El ÷11 de vacaciones **depende** de que
"11 meses" equivalga a 330 días — una conversión que solo es cierta bajo la misma
convención de mes de 30 días que ya usa `divisor_salario_diario`, y esa regla está
marcada `pendiente` en el catálogo. La regla `divisor_vacaciones` se siembra en
`verificar`, no `verificado`: **hereda** la incertidumbre en vez de ocultarla detrás de
una demostración que no existe.

**5. Un ciclo parcial se paga proporcional, sin bloquear ni advertir como error.**
Igual que el XIII, un colaborador que no completó los 330 días acumula menos por
construcción. La respuesta declara `cicloCompleto: false` y una advertencia — información,
no un impedimento: Nomix no decide si la empresa puede pagar vacaciones anticipadas,
solo calcula honestamente sobre lo que se le pide.

### Lo que este ADR NO decide
- **Fraccionamiento (Art. 56)** — máximo 2 partes, solo con convención colectiva
  vigente. No hay campo en la ficha de empresa para declarar si existe convención
  colectiva (consulta B4.d), así que este módulo no valida ni advierte sobre
  fraccionamiento. Queda para cuando ese dato exista.
- **Compensación en dinero sin gozarlas** (consulta B4.b) y **tope de acumulación**
  (consulta B4.c). Sin respuesta, no se implementan ni se asumen.
- **Traslape con la quincena** (consulta B4.a) — cómo se compone el talonario cuando
  las vacaciones cubren parte de un período de pago. El monto se calcula igual; el
  cómo se presenta en el comprobante queda para el módulo de comprobantes.

### Consecuencias
- ✅ Cero tablas nuevas, cero estado nuevo que mantener sincronizado.
- ✅ Corregir una planilla pasada corrige automáticamente cualquier cálculo de
  vacaciones posterior que dependa de ella.
- ⚠️ El monto sugerido depende de que las planillas del ciclo ya estén calculadas —
  si falta una, el ciclo sale corto. Mismo hueco conocido que `ADR-015` para el XIII,
  ahora también declarado aquí.
- ⚠️ Toda la matemática de "días acumulados" y "ciclo completo" hereda la
  incertidumbre de `divisor_salario_diario`. Si ese divisor se corrige, `divisor_vacaciones`
  debería revisarse en la misma sesión.

---

## ADR-017 — Liquidación: propuesta que se revisa, no un acto que se ejecuta

**Estado:** `ACCEPTED`
**Fecha:** 2026-08-29

### Contexto
La liquidación (Art. 210–229) es el módulo con más exposición legal del sistema:
un error aquí es una demanda en MITRADEL. Tiene tres componentes con reglas
distintas —prima de antigüedad (Art. 224), indemnización (Art. 225) y preaviso
(Art. 212/222)— y **cuatro consultas abiertas** que tocan el número final: D1
(cómo se prorratean los años incompletos), D2 🔴 (qué salario base se usa), D5
(qué define a un "técnico" y si el preaviso a cargo del trabajador está sujeto al
tope del 50%) y D7 (vacaciones y XIII proporcionales al cese).

### Decisión

**1. Es una propuesta de solo lectura, no una transacción.**
`POST /colaboradores/:id/liquidacion` calcula y devuelve; **no** da de baja al
colaborador, no persiste líneas y no genera planilla. Dar de baja sigue siendo
`POST /colaboradores/:id/baja`, un endpoint aparte. Una liquidación se revisa
varias veces antes de ejecutarse, y mezclar el cálculo con la terminación
convierte cada consulta en un acto irreversible.

**2. La distinción "qué procede según la causa" es lo primero que se modela.**
La prima de antigüedad se paga **cualquiera sea la causa**, renuncia incluida
(Art. 224); la indemnización solo por despido injustificado o renuncia
justificada (Art. 225). Es el error más caro y más frecuente de la práctica, así
que vive en una función explícita (`procedeIndemnizacion`) y tiene sus propios
tests, en vez de quedar implícito en un `if` dentro del cálculo.

**3. La escala del Art. 225 se recorre por tramos, nunca con un factor único.**
15 años son 34 + 5 = 39 semanas. Calcularlo como `15 × 3.4` o como `15 × 1` son
los dos errores clásicos; `semanasIndemnizacion` acumula tramo a tramo y lo
prueba contra el ejemplo textual de la base legal §8.3.

**4. La escala vive en `regla`, con la vigencia de la Ley 44 de 1995.**
El propio Art. 225 conserva escalas para relaciones anteriores al 2 de abril de
1972 y un régimen intermedio. Cuando haya que soportarlas serán filas con otra
vigencia (`ADR-001`), no un `if` por fecha de ingreso.

**5. El preaviso lo decide RRHH, no se infiere de la causa.**
`semanasPreaviso` es un parámetro: positivo lo debe el empleador, negativo lo
debe el trabajador (Art. 222, renuncia sin aviso), `null` si se otorgó en tiempo.
Si el colaborador está marcado `es_tecnico` y renuncia, la propuesta **advierte**
que el Art. 222 le exige 2 meses y no 15 días — pero no calcula el preaviso por
su cuenta, porque si se otorgó o no es un hecho que solo conoce RRHH.

**6. Las semanas se presentan como semanas.**
`serializarLinea` convierte la tasa a porcentaje, lo que para una liquidación
produce "671.2329%" donde en realidad son 6.7123 **semanas**. Esta respuesta usa
su propia serialización con `semanas` explícito. Un número que el contador no
puede leer es un número que no va a verificar.

### Discrepancia declarada con el ejemplo de la base legal §8.3
El documento calcula `1000 / 4.333 = 230.79` (redondeando el semanal) y luego
`230.79 × 39 = 9,000.81`. Este motor no redondea intermedios (`ADR-006`) y llega
a **9,000.69** — 12 centavos menos. Cuál acepta MITRADEL es la consulta **F4**,
sin responder. Los tests fijan el comportamiento `ADR-006` y **documentan la
diferencia** en vez de esconderla; el resultado la declara en `advertencias`.

### Lo que este ADR NO decide
- **El salario base** (consulta D2 🔴). Hoy se usa el salario contratado vigente
  y la propuesta lo declara en cada respuesta. No se implementa "el más
  favorable al trabajador" porque no está confirmado que sea la regla.
- **Vacaciones y XIII proporcionales al cese** (consulta D7). No se incluyen en
  la propuesta, y esta lo dice explícitamente en vez de omitirlos en silencio.
- **Los regímenes históricos del Art. 225** (consulta D3). Solo el vigente.
- **El Fondo de Cesantía** (Ley 44/1995, consulta D4): es un aporte trimestral
  del empleador, no una línea de la liquidación del trabajador.

### Consecuencias
- ✅ La distinción causa → componentes queda cubierta por tests, que es donde
  más caro sale equivocarse.
- ✅ Soportar un régimen histórico del Art. 225 será un `INSERT` con otra
  vigencia, sin tocar el motor.
- ⚠️ La propuesta está incompleta por diseño: le faltan las proporcionales de
  D7. Quien la use tiene que calcularlas aparte, y la respuesta lo advierte.

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

## ADR-018 — Autorización por rol: verbos en las rutas, matriz en el código

**Estado:** ✅ Aceptado · **Cierra:** `GAP-005` · **Depende de:** `ADR-011`

### El problema

La columna `usuario_empresa.rol` existía desde `ADR-011` y **no se consultaba en
ninguna parte**. En la práctica el sistema tenía un solo nivel de acceso: quien
podía entrar a una empresa podía todo — ver salarios, capturar movimientos,
calcular, aprobar y cerrar. `GAP-005` lo señalaba como bloqueante y preguntaba,
literalmente, "quién aprueba y quién puede revertir".

### La decisión

**Las rutas declaran un verbo, no un rol.** `@Requiere('planilla:aprobar')`,
nunca `@Roles('admin_rrhh')`. Cambiar quién aprueba es entonces editar una tabla
en un archivo, no salir a cazar decoradores por los controladores.

**La matriz rol × permiso vive en el código** (`apps/api/src/auth/permisos.ts`),
no en `regla`. Esto contradice en apariencia la convención de "ninguna constante
en el código", así que conviene ser explícito: esa convención habla de reglas
**legales** — cambian por decreto, en una fecha, y recalcular 2024 exige las
reglas de 2024. Una política de autorización no tiene ninguna de esas
propiedades y sí tiene la contraria: debe ser revisable en el diff, estar
cubierta por pruebas y **no** ser modificable por quien logre escribir en la
base de datos. Ponerla en `regla` convertiría un acceso de escritura a una tabla
en una escalada de privilegios. Lo que sí es dato es la *asignación* de rol a
persona: `usuario_empresa.rol`, por empresa y con vigencia.

**Cinco roles** definidos por la organización, con separación de funciones como
criterio rector:

| Rol | Alcance | ¿Aprueba? | ¿Bitácora? |
|---|---|---|---|
| `GlobalAdmin` | Todo — soporte de la aplicación | Sí | Sí |
| `AdminFinanzas` | Todo menos configuración de la aplicación | Sí | Sí |
| `AdminRRHH` | Colaboradores y planillas; nada contable | Sí | **No** |
| `AsistContable` | Solo lectura de resultados de planilla | No | Sí |
| `AsistRRHH` | Alta de colaboradores, captura y cálculo | **No** | No |

Que `AsistRRHH` **no** apruebe no es una preferencia de diseño: es el control
interno básico de una nómina. El mismo par de manos que introduce un movimiento
no debería poder cerrarlo y mandarlo a pagar. Una prueba lo fija por escrito —
si alguien concede `planilla:aprobar` a un rol que ya calcula, falla.

Tres decisiones del reparto que conviene que sean explícitas:

- **`AdminFinanzas` tiene hoy los mismos permisos efectivos que `GlobalAdmin`**,
  y no es un error de copiar y pegar: lo único que los separa —configuración y
  administración de la aplicación— todavía no existe como funcionalidad. La
  diferencia aparecerá sola cuando esas pantallas se construyan.
- **`AdminRRHH` no lee la bitácora.** RRHH es el principal consumidor de datos
  de salario, o sea la parte auditada, y un rastro que lee quien está siendo
  auditado no audita nada. Es el mismo argumento por el que `AsistContable` sí
  la ve.
- **`AsistContable` no ve la ficha del colaborador**, solo los resultados de
  planilla. Para cuadrar un asiento hace falta cuánto se pagó y a quién; la
  cédula, la cuenta bancaria y el domicilio no.

Solo se reparten los permisos que **hoy tienen ruta**. Contabilidad,
marcaciones, incidentes, configuración de la aplicación y alta de usuarios son
parte del modelo del negocio pero aún no existen; sus permisos se añadirán al
construirse cada uno, en vez de declarar ahora una matriz que promete accesos a
pantallas inexistentes.

### El alcance sigue siendo por empresa, incluido `GlobalAdmin`

`GlobalAdmin` tiene todos los permisos **dentro de la empresa donde se le
asignó**, no sobre todas a la vez. Dar soporte a una empresa exige tener
membresía en ella, con su fecha y su rastro.

Un rol verdaderamente global habría obligado a abrir una excepción en
`app_current_empresa()`, que es la pieza de la que cuelga todo el aislamiento
multi-inquilino (`ADR-020`). Cambiar eso por comodidad de soporte sería cambiar
la propiedad más cara de defender del sistema por la más fácil de conceder. Si
algún día hace falta acceso entre empresas, el camino es un mecanismo explícito
de "romper el cristal" —con justificación y una marca aparte en la bitácora—, no
un permiso comodín en esta matriz.

### Nomenclatura

Los nombres van tal como los definió el negocio (`GlobalAdmin`, no
`global_admin`), aunque el resto de columnas enumeradas del esquema use
snake_case: se prefiere que el valor guardado en `usuario_empresa.rol` sea
exactamente el término que la gente usa al hablar, sin una capa de traducción
que solo existiría para satisfacer una convención.

Cambiar el vocabulario de roles exige migrar los datos, no solo el código: la
matriz es fail-closed, así que una fila con un rol que ya no existe deja a esa
persona sin ningún permiso. La migración `0010` hace esa correspondencia.

### El rol se resuelve en cada petición, no se guarda en la sesión

La tentación obvia era copiar el rol a la sesión de Redis al iniciarla. Se
descartó: el rol es un dato **con vigencia**, y una copia en la sesión es una
foto que envejece sin avisar. Con expiración deslizante, revocar a alguien no
surtiría efecto hasta su próximo inicio de sesión — que con actividad continua
podría no llegar nunca. Cuesta una consulta indexada por petición y compra que
quitar un acceso lo quite de verdad.

### Consecuencias

- El frontend recibe `permisos` en `/auth/me` y oculta lo que el rol no puede
  hacer. Es **cortesía de interfaz, no el control**: la decisión es del servidor.
- La UI dice *por qué* falta un botón ("tu rol no aprueba planillas — separación
  de funciones") en vez de dejar una pantalla que parece "no hay nada que hacer".
- Un rol desconocido en la columna no tiene ningún permiso (fail-closed).
- El catálogo de conceptos tiene permiso propio (`catalogo:leer`) y **no** cuenta
  como acceso sensible: es dato de referencia — tasas, tramos, incidencia — sin
  el nombre de nadie. Reusar `planilla:leer` habría inundado la bitácora con la
  consulta que hace cada carga de pantalla, enterrando los accesos que importan.

---

## ADR-019 — Bitácora de acceso: la contrapartida de no cifrar el salario

**Estado:** ✅ Aceptado · **Paga la deuda de:** `ADR-007`

### Por qué existe

`ADR-007` decidió **no** cifrar `salario_base` en la aplicación, con un
argumento que sigue siendo bueno: cifrarlo rompería la validación de salario
mínimo y todos los reportes agregados, y la salida habitual — descifrar todo en
memoria para agregar — ofrece *menos* seguridad real que un RLS bien aplicado.
Pero esa decisión venía con precio, escrito en `ARCHITECTURE.md` §5.3: *"la
auditoría de acceso a salarios debe estar operativa antes del primer dato
real"*. Estaba sin pagar. Este ADR la paga.

### Qué se registra

Tabla `acceso_auditoria`: quién, cuándo, qué permiso ejerció, sobre qué ruta y
recurso, desde qué IP, y **con qué resultado**. Se registran los accesos
permitidos y los **denegados** — un 403 contra datos de salario le interesa más
a un investigador que un 200.

La cobertura no depende de que alguien se acuerde de instrumentar cada
controlador: se declara una sola vez, en `PERMISOS_SENSIBLES`. Una ruta nueva
que sirva salarios declara su permiso y con eso ya queda auditada. Añadir un
endpoint de salarios sin rastro exigiría sacar su permiso de esa lista, que es
un cambio visible en el diff.

### Inmutable por construcción, no por convención

La tabla tiene política de `SELECT` e `INSERT` y **ninguna** de `UPDATE` ni
`DELETE`. Bajo RLS, lo que no tiene política se deniega: ni el rol de la
aplicación puede reescribir su propio rastro, aunque escriba el SQL a mano.

Al probarlo contra PostgreSQL apareció un matiz que cambió el diseño: el RLS por
sí solo hace la tabla inmutable pero **en silencio** — un `UPDATE` no falla,
simplemente afecta cero filas. Seguro, sí; detectable, no. Y en una bitácora el
intento de manipulación es justo lo que uno quiere ver. Por eso se añadió un
`REVOKE UPDATE, DELETE, TRUNCATE` explícito, que lo convierte en un `permission
denied` inmediato. Los dos controles se solapan a propósito: si alguien concede
privilegios de más con un `GRANT ALL`, el RLS sigue tapando el hueco; si alguien
añade una política por descuido, el `REVOKE` sigue en pie.

### El asiento entra por una función, no por un INSERT

`registrar_acceso()` es `SECURITY DEFINER` por dos razones concretas:

1. Un acceso denegado **por membresía vencida** ocurre justo cuando
   `app_current_empresa()` ya devuelve `NULL`, así que un INSERT normal fallaría
   por `WITH CHECK` y se perdería el evento más interesante.
2. La función toma el usuario del contexto de sesión en vez de aceptarlo como
   parámetro: quien llama no puede firmar el asiento con el nombre de otro.

### Falla cerrado, y es una decisión

Si la bitácora no está disponible, una ruta sensible responde `503` en vez de
servir el dato. `ADR-007` aceptó no cifrar a cambio de "control de acceso +
trazabilidad"; servir el salario con la trazabilidad caída rompe el trato. Se
prefiere no responder a responder sin dejar rastro. Para los accesos
**denegados** se hace lo contrario — se registra sin propagar el fallo —, porque
convertir un 403 en un 500 solo esconde la causa real a quien la investiga.

---

## ADR-020 — La membresía vigente se comprueba en la base, no solo en la app

**Estado:** ✅ Aceptado · **Cumple:** `ARCHITECTURE.md` §5.4 · **Refuerza:** `ADR-011`

### El agujero

`ARCHITECTURE.md` §5.4 exigía desde el principio una prueba obligatoria: *"un
usuario cuya membresía en una empresa venció no puede acceder a sus datos, **ni
con una sesión previa** ni manipulando identificadores"*. No existía ni la
prueba ni el control.

El fallo era real y no requería ninguna astucia para explotarlo. Las políticas
RLS se aislaban por `app_current_empresa()`, que se limitaba a **leer el
identificador que la aplicación le pasaba**. La vigencia solo se comprobaba en
`mis_empresas()`, que corre al iniciar sesión y al elegir empresa. Una vez que
`empresaActivaId` quedaba escrito en la sesión de Redis, nadie volvía a
preguntar: la sesión de alguien a quien se le revocó el acceso seguía viendo
salarios, planillas y movimientos — y con expiración deslizante, mientras
hubiera actividad, sin vencer nunca.

### La decisión

`app_current_empresa()` deja de ser un lector del contexto y pasa a devolver la
empresa activa **solo si el usuario tiene membresía vigente en ella**.

Centralizarlo ahí, en vez de repetir un `AND` en cada política, es lo que hace
que el control sea *fail-closed por construcción*: toda política existente — y
toda futura — que se aísle por `app_current_empresa()` hereda la comprobación
sin que nadie tenga que acordarse de añadirla.

La función auxiliar `app_membresia_vigente()` es `SECURITY DEFINER` por
necesidad, no por comodidad: `usuario_empresa` tiene RLS y su propia política
llama a `app_current_empresa()`, así que leer la tabla bajo RLS produciría
recursión de políticas. Todas las funciones `SECURITY DEFINER` del proyecto
fijan además `search_path` — incluida `mis_empresas()`, que no lo hacía —, sin
lo cual un `search_path` manipulado puede resolver `usuario_empresa` a otra
tabla.

La capa de aplicación hace la misma comprobación en cada petición
(`PermisoGuard`), no porque la base no baste, sino para poder devolver un 403
explicable en vez de un resultado vacío. Es la "doble capa" de
`ARCHITECTURE.md` §5.2 aplicada de verdad.

### Consecuencia deliberada: no hay acceso anónimo a datos de inquilino

Un contexto de solo-empresa, sin usuario, ya no ve nada. Todo acceso a datos de
una empresa queda atribuido a una persona — que es exactamente lo que `ADR-019`
necesita para que la bitácora signifique algo. `withTenant()` queda marcado como
obsoleto para datos de inquilino.

Esto deja una pregunta abierta y **declarada**: un proceso de fondo sin usuario
interactivo (el worker de PDF/ACH) necesitará su propia decisión explícita —
probablemente un rol de base de datos distinto con su propio alcance. Hoy ese
worker es un stub, y no se le abre una puerta lateral por si acaso.

### Verificación

`apps/api/src/db/membresia.test.ts` prueba el escenario completo contra
PostgreSQL real, **en la capa de datos y no a través del guard**: si la prueba
pasara solo por la capa de aplicación estaría verificando precisamente la capa
que un bug de aplicación puede saltarse.


---

## ADR-021 — Conceptos fijos del colaborador: se materializan como movimientos

**Estado:** ✅ Aceptado · **Depende de:** `ADR-002`, `ADR-004`, `ADR-001`

### El problema

La ficha del colaborador tenía una columna `gasto_rep` y **el cálculo no la
miraba**. El dato estaba capturado, el usuario asumía razonablemente que se
pagaría, y la planilla lo ignoraba en silencio — que es la peor de las tres
opciones posibles. Todo lo recurrente (gastos de representación, dietas, un
descuento pactado) había que volver a teclearlo como movimiento en cada
quincena, o no se pagaba.

### La decisión

Una tabla `colaborador_concepto` con vigencia, y —esta es la parte que importa—
sus filas **se materializan como `movimiento` con `origen = 'ficha'` al crear
la planilla**, en vez de tratarse como una rama nueva dentro del motor.

Materializar en vez de bifurcar es lo que hace barato todo lo demás. Al ser
movimientos normales heredan, sin una sola línea nueva en el cálculo:

- la matriz de incidencia del catálogo (`ADR-002`) — y con ella su régimen de
  ISR propio, sus bases de CSS, su entrada o no al promedio de vacaciones;
- los topes del Art. 161 si resultan ser descuentos de acreedor (`ADR-004`);
- la traza que responde "¿por qué esta cifra?" (`ADR-005`).

La alternativa —un `if` en el motor que sume los conceptos de la ficha— habría
duplicado toda esa lógica en una segunda ruta que envejecería aparte.

### Por qué al CREAR y no al calcular

Se materializan cuando se abre el período, no cuando se calcula. Así aparecen
en el panel de movimientos **antes** de producir ninguna cifra, y el operador
puede ajustarlos o quitarlos en ese período concreto sin tocar la ficha. Es
justo la mezcla que se pidió: automático, pero no impuesto.

Recalcular no vuelve a materializar: los movimientos ya están, y volver a
insertarlos duplicaría el monto.

### Vigencia, y por qué no se borra

`vigente_desde` / `vigente_hasta` por la misma razón que todo lo demás en Nomix
(`ADR-001`): estas asignaciones caducan —un descuento se termina de pagar, una
dieta se aprueba por un semestre— y reabrir la planilla de marzo tiene que
resolverse con lo que estaba pactado en marzo.

Por eso el endpoint de baja **cierra con una fecha en vez de borrar**. Un
DELETE reescribiría el pasado: recalcular una planilla anterior daría otro
resultado y nada explicaría por qué.

Un índice único parcial impide dos asignaciones **abiertas** del mismo concepto
para el mismo colaborador. Sin él, la planilla materializaría las dos y
duplicaría el monto sin que nadie lo notara; el historial ya cerrado sí puede
tener varias, que es como se representa "le subieron la dieta en julio".

### El XIII queda fuera, a propósito

Una planilla de XIII no materializa nada: su base se reconstruye de lo ya
percibido en la ventana de la partida (`ADR-015`), así que un movimiento ahí no
se sumaría — se ignoraría. Repetir el error que este ADR viene a corregir.

### Verificado

Contra el entorno real: una asignación de B/. 250 de gastos de representación
apareció sola en la planilla siguiente, entró como ingreso, **no** incidió en
CSS y tributó por su régimen de ISR propio (`isr_retencion_gastos_representacion`
= 25.00, separado del ordinario en 0.00) — es decir, la matriz de incidencia
operó sobre un concepto inyectado automáticamente exactamente igual que sobre
uno capturado a mano.


---

## ADR-022 — Documentos del colaborador: la fila en la base, el archivo en disco

**Estado:** ✅ Aceptado · **Depende de:** `ADR-012`, `ADR-018`, `ADR-019`

### La decisión de fondo

El archivo va a **disco** y la base guarda solo su descripción. La alternativa
—`bytea` en PostgreSQL— tiene a favor la consistencia transaccional y un único
respaldo, pero un contrato escaneado por cada colaborador infla la base y con
ella cada `pg_dump` y cada restauración PITR (`ADR-012`). Es decir, encarece
justo la operación que uno necesita rápida y predecible el día que hace falta.

El precio que se paga: el archivo puede quedar huérfano si algo falla entre la
escritura y el commit. Se acepta a sabiendas, y se ordena la secuencia para que
el fallo caiga del lado barato — **primero el archivo, después la fila**. Un
archivo sin fila es basura recuperable; una fila sin archivo es una ficha que
miente sobre lo que tiene.

### El nombre del archivo NO es el que subió el usuario

En disco, el archivo se llama como el UUID de su fila. El nombre original se
guarda aparte y solo se usa para mostrarlo y para la cabecera de descarga.

Usar el nombre del usuario como ruta es una travesía de directorios esperando a
ocurrir (`../../etc/passwd`), y aun sin malicia hace que dos "contrato.pdf" se
pisen. La ruta se construye con `resolve()` y se **verifica que caiga dentro**
del directorio de almacén antes de tocar el disco: los identificadores ya vienen
validados como UUID, pero un escape de la raíz es un fallo demasiado caro para
confiarlo a una sola capa.

Los tipos aceptados son una **lista blanca** (PDF, JPG, PNG, Word), no una lista
negra: enumerar lo prohibido siempre deja algo fuera, y aquí el coste de
equivocarse es guardar un ejecutable que alguien descargará creyendo que es un
contrato. El tope de 15 MB se declara además en el plugin de multipart, para
cortar el flujo mientras llega en vez de después de cargarlo entero en memoria.

### La descarga pasa por la API, nunca por un servidor de estáticos

Es lo que permite aplicar el RLS del inquilino y dejar rastro en la bitácora
(`ADR-019`) en cada lectura. Servir esa carpeta con nginx entregaría el contrato
de cualquier empresa a quien adivinara un UUID, sin registro de que ocurrió. Un
contrato lleva el salario pactado: su lectura es exactamente el tipo de acceso
que `ADR-007` se comprometió a auditar.

La respuesta va como `attachment` y no `inline`, para que el navegador no
renderice en el origen de la aplicación un archivo subido por un usuario.

### Aquí sí se borra de verdad

A diferencia de los conceptos fijos (`ADR-021`), que se cierran con fecha porque
el pasado depende de ellos, un documento **se elimina**: no participa de ningún
cálculo y ninguna planilla anterior cambia por su ausencia. Además, subir por
error un documento personal equivocado debe poder deshacerse, no solo ocultarse.
Si el archivo ya no estaba en disco, la fila se borra igual — el objetivo era
que dejara de existir y se cumplió.

### Dónde vive la carpeta

`DOCUMENTOS_DIR`, con un default relativo que sirve para desarrollo y **no**
para producción: cae dentro del repositorio, así que está en `.gitignore` para
que un `git add -A` distraído no commitee cédulas reales. En el servidor debe
apuntar a un directorio dentro del volumen que entra al respaldo; si no, los
documentos no sobreviven a un redespliegue.


---

## Hoja de ruta revisada

La Fase 1 original ("Estructuración Laravel / DB / API REST" + "Extracción y testing de motores legal/nómina") **ya no aplica tal cual**: no hay motores que extraer, y la base legal ya está hecha.

| Fase | Contenido | Estado |
|---|---|---|
| **0. Base legal** | Investigación normativa verificada con fuentes | ✅ **Completada** |
| **0b. Consultas** | Cuestionario a profesional (`07_consultas...`) | 📤 **Listo para enviar** |
| **1. Núcleo temporal** | Esquema de reglas con vigencia · catálogo de conceptos · motor de resolución (`ADR-001`, `ADR-002`, `ADR-003`) | 🔓 Desbloqueado |
| **2. Motor de cálculo** | CSS, SE, ISR, recargos, provisiones · asignación de descuentos (`ADR-004`) · trazabilidad (`ADR-005`) | 🔓 Desbloqueado |
| **3. Datos y acceso** | Multi-tenancy con RLS · cifrado selectivo (`ADR-007`) · roles (`ADR-018`) · auditoría (`ADR-019`) · vigencia en la base (`ADR-020`) | ✅ **Completada** |
| **4. Prestaciones** | Vacaciones, XIII Mes, liquidaciones (Art. 210–227) | 🟡 Parcial — falta el Bloque D del cuestionario |
| **5. Interfaz** | Layout responsivo · Cmd+K · wizard de colaborador · Inspection Drawer | ✅ **Completada** — y consciente del rol (`ADR-018`) |
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
| 014 | Retención de ISR por método acumulativo, con sus supuestos declarados | ✅ |
| 015 | El XIII Mes es un proceso sobre el histórico, no un concepto que se devenga | ✅ |
| 016 | Vacaciones: ayuda de cálculo sobre el histórico, sin ciclo persistido | ✅ |
| 017 | Liquidación: propuesta de solo lectura, separada de la baja | ✅ |
| 018 | Autorización por rol: verbos en las rutas, matriz en el código (`GAP-005`) | ✅ |
| 019 | Bitácora de acceso inmutable — la contrapartida de `ADR-007` | ✅ |
| 020 | La membresía vigente se comprueba en la base de datos (§5.4) | ✅ |
| 021 | Conceptos fijos del colaborador materializados como movimientos | ✅ |
| 022 | Documentos del colaborador: fila en la base, archivo en disco | ✅ |

**No queda ninguna decisión de arquitectura abierta.** El detalle operativo está en
[`ARCHITECTURE.md`](../../ARCHITECTURE.md).
