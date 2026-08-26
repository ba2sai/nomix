# Base Legal de Panamá — Cerebro de Cálculo de Nomix

**Documento:** `06_base_legal_panama.md`
**Proyecto:** **Nomix - Nómina inteligente**
**Versión:** `1.0.0`
**Fecha de investigación:** 2026-08-26
**Jurisdicción:** República de Panamá
**Propósito:** Fuente única de verdad para **todos** los cálculos de nómina, prestaciones, retenciones y liquidaciones. Ningún número debe aparecer en el código sin estar registrado aquí con su base legal.

---

## 0. Cómo usar este documento

### 0.1 Regla de oro
> **Ninguna constante numérica vive en el código.** Toda tasa, tramo, divisor, umbral y recargo se carga desde configuración versionada por fecha de vigencia, sembrada desde este documento. Cuando la ley cambie, se agrega un registro nuevo — nunca se edita el código ni se sobrescribe el valor anterior.

Esto no es purismo: la Ley 462 de 2025 ya cambió la cuota patronal y va a cambiarla dos veces más (2027 y 2029). Un sistema con `0.1225` escrito en el código queda obsoleto solo, en silencio, y recalcula mal los períodos históricos.

### 0.2 Niveles de confianza
Cada dato lleva una marca:

| Marca | Significado |
|---|---|
| ✅ **VERIFICADO** | Confirmado contra fuente oficial (Gaceta, DGI, CSS, MITRADEL) o múltiples fuentes profesionales concordantes |
| ⚠️ **VERIFICAR** | Fuentes secundarias concordantes, pero conviene confirmación con asesor antes de producción |
| ❓ **PENDIENTE** | No se pudo determinar con confianza; requiere consulta profesional |

### 0.3 Correcciones a la documentación previa del repositorio
**Esta investigación contradice varios datos de `docs/01..07`.** Ver §11 para la lista completa. Los más importantes:

1. La cuota patronal de CSS **ya no es 12.25%** — es **13.25%** desde abril 2025 (Ley 462 de 2025).
2. **No existe deducción de ISR de $250 por dependiente** en la normativa panameña.
3. Los gastos de representación **no se retienen al 10% plano** — tienen una escala propia.
4. El **recargo de domingo (50%)** faltaba por completo en la documentación previa.

---

## 1. Seguridad Social (CSS)

### 1.1 Cuotas — Régimen general

**Base legal:** Ley 51 de 2005 (Orgánica de la CSS), reformada por la **Ley 462 de 18 de marzo de 2025**.

| Parámetro | Valor | Vigencia | Confianza |
|---|---|---|---|
| Cuota obrera (empleado) | **9.75%** | Sin cambios desde 2013 | ✅ VERIFICADO |
| Cuota patronal | **13.25%** | Abril 2025 – febrero 2027 | ✅✅ **DOBLE-VERIFICADO** |

> ✅✅ **Confirmado contra datos de producción.** El asiento contable real de El Príncipe Azul
> (junio 2026, `reportes PFacil/asiento_planilla.pdf`) arroja una cuota patronal de
> `933.52 ÷ 7,045.41 = 13.2500%` exacto. Ver [`09_formatos_reales_planifacil.md`](09_formatos_reales_planifacil.md) §1.
> Esto cierra cualquier duda: PlaniFácil ya opera con la tasa de la Ley 462, y la
> documentación previa del repositorio (12.25%) estaba simplemente desactualizada.
| Cuota patronal | **14.25%** | Marzo 2027 – febrero 2029 | ✅ VERIFICADO |
| Cuota patronal | **15.25%** | Desde marzo 2029 | ✅ VERIFICADO |

> ⚠️ **Corrección crítica:** `docs/04_payroll_and_liquidation_workflows.md` §1.1.3 declara la cuota patronal en **12.25%**. Ese valor estuvo vigente hasta marzo de 2025 y **hoy está desactualizado**. A la fecha de este documento (agosto 2026) la cuota correcta es **13.25%**.

> **Implicación de diseño:** el escalonamiento hasta 2029 es la prueba definitiva de que las tasas deben ser configuración con vigencia por fecha. Un recálculo de una planilla de 2024 debe usar 12.25%; uno de hoy, 13.25%.

### 1.2 Tope salarial cotizable
⚠️ **VERIFICAR** — Las fuentes consultadas indican que la cuota de **9.75% se aplica sobre el 100% del salario bruto sin límite máximo**. Existe un tope aplicable al **cálculo de la pensión** (B/.1,500 estándar, hasta B/.2,000–2,500 bajo condiciones especiales), pero eso es un tope de *beneficio*, no de *cotización*.

> **Acción:** confirmar con la CSS antes de producción. Si apareciera un tope de cotización, es una regla estructural del motor.

### 1.3 Base cotizable — qué entra y qué no

| Concepto | ¿Cotiza CSS? | Confianza |
|---|---|---|
| Salario ordinario | ✅ Sí | ✅ VERIFICADO |
| Horas extra | ✅ Sí | ✅✅ DOBLE-VERIFICADO (asiento real jun-2026) |
| Comisiones | ✅ Sí | ✅ VERIFICADO |
| Bonificaciones regulares | ✅ Sí | ✅ VERIFICADO |
| Décimo Tercer Mes | ✅ Sí — **tasa especial 7.25%**, ver §3 | ✅ VERIFICADO |
| Vacaciones pagadas | ✅ Sí | ✅✅ DOBLE-VERIFICADO (asiento real jun-2026) |
| **Gastos de representación** | ❌ **No** | ✅ VERIFICADO |
| **Prima de antigüedad** | ❌ **No** | ✅ VERIFICADO |
| **Indemnización** | ❌ **No** | ✅ VERIFICADO |
| **Viáticos no cotizables** | ❌ No | ✅ VERIFICADO |
| Gastos reembolsables | ❌ No | ✅ VERIFICADO |
| **Subsidio de incapacidad** | ❌ **No** — no es salario, ver §7 | ⚠️ VERIFICAR |

> **Error frecuente documentado:** las fuentes profesionales señalan que los empleadores olvidan sistemáticamente incluir **comisiones y horas extra** en la base de CSS. Nomix debe validarlo activamente — es un Factor WOW real y barato.

### 1.4 Riesgos Profesionales (RP)

**Base legal:** Resolución **JD-CSS 12,260-2024**; clasificación por Resolución 224 de 2006.

| Parámetro | Valor | Confianza |
|---|---|---|
| Rango de tarifas | **0.56% – 6.25%** del salario | ⚠️ VERIFICAR |
| Quién paga | **Solo el empleador** | ✅ VERIFICADO |
| Criterio de asignación | Actividad económica principal (CIIU), asignada por la CSS | ✅ VERIFICADO |

**Clases de riesgo (Resolución 224 de 2006):**

| Clase | Actividad |
|---|---|
| I | Administrativas y financieras |
| II | Comerciales y de servicios |
| III | Industriales y manufactureras |
| IV | Agropecuarias, forestales y pesqueras |
| V | Mineras y de construcción |

> **Modelo de datos:** `empresa.tasa_riesgo_profesional` es un `NUMERIC(6,4)` configurable por empresa, con validación de rango y fecha de vigencia. Corresponde al campo `rp_por` observado en PlaniFácil.

---

## 2. Seguro Educativo (SE)

**Base legal:** Ley 13 de 1987 y concordantes.

| Parámetro | Valor | Confianza |
|---|---|---|
| Cuota obrera | **1.25%** | ✅ VERIFICADO |
| Cuota patronal | **1.50%** | ✅ VERIFICADO |
| **Total combinado** | **2.75%** | ✅ VERIFICADO |
| Sobre Décimo Tercer Mes | **0%** — no aplica | ✅ VERIFICADO |
| Empleados de embajadas | **1.25%** (régimen especial) | ✅ VERIFICADO |

> **Nota técnica:** el instructivo de la DGI (línea 35, e-Tax 2.0) aplica **2.75%** a la base de "otras remuneraciones sin retención" — es el total combinado obrero + patronal, usado para ingresos sin patrono retenedor. No confundir con el 1.25% de planilla.

### 2.1 Carga total de seguridad social (referencia rápida)

| Período | Obrero | Patronal | Total |
|---|---|---|---|
| Hasta marzo 2025 | 11.00% | 13.75% + RP | 24.75% + RP |
| **Abril 2025 – feb 2027 (hoy)** | **11.00%** | **14.75% + RP** | **25.75% + RP** |
| Marzo 2027 – feb 2029 | 11.00% | 15.75% + RP | 26.75% + RP |
| Desde marzo 2029 | 11.00% | 16.75% + RP | 27.75% + RP |

*(Obrero = CSS 9.75% + SE 1.25%. Patronal = CSS + SE 1.50%. RP variable 0.56%–6.25%.)*

---

## 3. Décimo Tercer Mes (XIII Mes)

**Base legal:** Decreto de Gabinete **N° 221 de 18 de noviembre de 1971**, reglamentado por el **Decreto N° 19 de 7 de septiembre de 1973** (Ministerio de Trabajo y Bienestar Social), publicado en **Gaceta Oficial N° 17,436 de 20 de septiembre de 1973**.

> 📄 **Fuente primaria verificada:** el texto del Decreto 19 de 1973 se obtuvo del repositorio oficial Legispan de la Asamblea Nacional y se leyó directamente del facsímil de la Gaceta Oficial. Es la **interpretación oficial vinculante** del Decreto 221.

### 3.1 Partidas

| Partida | Período de acumulación | Fecha de pago |
|---|---|---|
| 1ª | 16 de diciembre – 15 de abril | 15 de abril |
| 2ª | 16 de abril – 15 de agosto | 15 de agosto |
| 3ª | 16 de agosto – 15 de diciembre | 15 de diciembre |

✅ VERIFICADO — coincide con la documentación previa del repositorio.

### 3.2 Cálculo

```
XIII Mes (partida) = Σ(salarios devengados en el período de 4 meses) / 12
```

✅ VERIFICADO. El divisor es **12**, no 3, aunque la partida cubra 4 meses — es la fracción anual correspondiente a un mes de salario repartido en tres pagos.

### 3.3 Retenciones sobre el XIII Mes

| Retención | Tasa | Base legal | Confianza |
|---|---|---|---|
| CSS obrero | **7.25%** | Art. 101 numeral 5, Ley Orgánica CSS | ✅ VERIFICADO |
| Seguro Educativo | **0.00%** | No aplica | ✅ VERIFICADO |
| ISR | Sí, si el trabajador es sujeto | Decreto 221/1971 | ✅ VERIFICADO |
| CSS patronal sobre XIII | ❓ **PENDIENTE** | — | ❓ |

> ❓ **Hueco abierto:** no se logró determinar con confianza la **cuota patronal aplicable al XIII Mes**. El decreto original establecía que el XIII no estaba sujeto a cuotas obrero-patronales *salvo* impuesto sobre la renta, pero la práctica actual sí aplica el 7.25% obrero. **Consultar con asesor antes de implementar la parte patronal.**

### 3.4 Base de cálculo — ✅ RESUELTO POR NORMA EXPRESA

**Artículo Cuarto del Decreto 19 de 1973** — texto literal:

> *"El pago o consignación de cada una de las tres partidas del Décimo Tercer Mes debe calcularse sobre el **promedio de los salarios percibidos** por el trabajador durante el período que corresponde a cada partida, incluyendo **salario base, jornadas extraordinarias, jornadas con recargos legales, comisiones, primas, licencia por enfermedad pagada por el empleador, licencia de maternidad, vacaciones, permisos remunerados, riesgos profesional y bonificaciones** recibidas durante el período respectivo.*
>
> *El Tiempo de servicio para los efectos del Décimo Tercer Mes se computará en la forma indicada por el Artículo 2º del Decreto de Gabinete No. 221 de 18 de noviembre de 1971."*

#### Conceptos que integran la base — lista taxativa ✅ VERIFICADO

| # | Concepto | Nota |
|---|---|---|
| 1 | Salario base | |
| 2 | **Jornadas extraordinarias** | Horas extra |
| 3 | **Jornadas con recargos legales** | Domingo (50%), feriado (150%), nocturnidad |
| 4 | **Comisiones** | |
| 5 | **Primas** | |
| 6 | **Licencia por enfermedad pagada por el empleador** | ⚠️ Calificada — solo la porción del empleador |
| 7 | **Licencia de maternidad** | Sin calificar respecto de quién paga |
| 8 | **Vacaciones** | |
| 9 | **Permisos remunerados** | |
| 10 | **Riesgos profesional** | Sin calificar respecto de quién paga |
| 11 | **Bonificaciones** | |

#### 🚨 El parámetro `decimo_salario_base` es no conforme
PlaniFácil (`ENT-003`) permite configurar el XIII sobre *"únicamente salario base"*. **Esa opción viola el Artículo Cuarto**, que incluye expresamente horas extra, recargos, comisiones, primas y bonificaciones. Y el **Artículo Quinto** cierra la puerta: *"Cualquier cláusula Contractual o Convencional dirigida a variar o impedir los efectos del Décimo Tercer Mes sólo es válida en lo que resulte más favorable al trabajador"* — y "solo salario base" es siempre menos favorable.

> **Decisión de producto:** Nomix **no ofrece** el modo "solo salario base". Si se importan datos de un sistema que lo usaba, se advierte que el histórico puede estar subcalculado.

#### Coherencia del divisor
El artículo dice *"promedio de los salarios percibidos"*, mientras que la práctica usa *"suma del período ÷ 12"*. **Son equivalentes:**

```
suma de 4 meses ÷ 12  =  (promedio mensual × 4) ÷ 12  =  promedio mensual ÷ 3
```

Y `promedio mensual ÷ 3` es exactamente un mes de salario repartido en tres partidas. ✅ El divisor **12** queda confirmado por dos vías.

### 3.5 Regla del Aguinaldo — Artículo Tercero ⚠️ REGLA DE NEGOCIO NUEVA

> *"La Tercera Partida del Décimo Tercer Mes equivale a un Aguinaldo o Bonificación de Navidad. En los casos de Aguinaldos o Bonificaciones de Navidad pactadas o acostumbradas de manera reiterada, los empleadores deben pagar **la suma que resulte más favorable a cada trabajador**, según sea la Tercera Partida del Décimo Tercer Mes o el Aguinaldo o Bonificación de Navidad. Este pago debe hacerse sin perjuicio del pago completo de las otras dos partidas..."*

**Regla implementable:**
```
si la empresa paga aguinaldo pactado o acostumbrado de forma reiterada:
    tercera_partida = MAX(tercera_partida_xiii, aguinaldo)
sino:
    tercera_partida = tercera_partida_xiii

En ambos casos, 1ª y 2ª partida se pagan completas e íntegras.
```

> Esta regla **no aparecía en ningún documento previo** y es exactamente el tipo de detalle que produce reclamos laborales. Requiere un campo `paga_aguinaldo_acostumbrado` a nivel de empresa y `monto_aguinaldo` por colaborador.

### 3.6 Piso irrenunciable — Artículo Quinto

> *"Cualquier cláusula Contractual o Convencional dirigida a variar o impedir los efectos del Décimo Tercer Mes sólo es válida en lo que resulte más favorable al trabajador."*

**Implicación para `ADR-002`:** cuando un convenio colectivo sobrescriba reglas del XIII Mes, el motor debe **validar que el resultado sea ≥ al de la regla general**, y advertir si no lo es. La sobrescritura por empresa no es libre: es unidireccional.

### 3.7 Interacción con subsidios de la CSS — ❓ PENDIENTE

El Artículo Cuarto crea una **tensión** con lo indicado en §7.2 (fuentes secundarias sostienen que el subsidio de la CSS no genera XIII):

- *"licencia por enfermedad **pagada por el empleador**"* → calificada. Solo la porción del empleador.
- *"licencia de maternidad"* y *"riesgos profesional"* → **sin calificar**, pese a que en ambos casos paga la CSS.

**Lectura preliminar:** al ser el Decreto 19 fuente primaria oficial y §7.2 fuentes secundarias marcadas ⚠️ VERIFICAR, **prevalece el Decreto**. Pero queda sin resolver **qué monto** entra en el promedio cuando paga la CSS: ¿el subsidio efectivamente percibido, el salario completo, o nada?

> Elevado como consulta **B2.e** en [`07_consultas_profesional_planilla.md`](07_consultas_profesional_planilla.md). **No implementar hasta resolverlo.**

### 3.8 Pendiente derivado
El Artículo Cuarto remite al **Artículo 2º del Decreto de Gabinete 221 de 1971** para el cómputo del tiempo de servicio. Ese artículo aún no se ha consultado — es lo que determina el prorrateo de quien no trabajó el período completo (consulta **B2.c**).

---

## 4. Impuesto Sobre la Renta (ISR) — Asalariados

**Base legal:** Código Fiscal, Artículos 700, 701, 708, 709; Ley 8 de 15 de marzo de 2010; Decreto Ejecutivo 170 de 1993.
**Fuente primaria consultada:** Instructivo oficial *"Renta Natural — Asalariado Puro"*, DGI / e-Tax 2.0.

### 4.1 Tabla de tramos (Art. 700 CF)

| Renta neta gravable anual | Impuesto |
|---|---|
| Hasta B/. 11,000.00 | **0%** (exento) |
| B/. 11,000.01 – B/. 50,000.00 | **15%** sobre el excedente de B/. 11,000 |
| Más de B/. 50,000.00 | **B/. 5,850.00 + 25%** sobre el excedente de B/. 50,000 |

✅ VERIFICADO — coincide con la documentación previa.

### 4.2 Deducciones personales — ⚠️ CORRECCIÓN IMPORTANTE

El instructivo oficial de la DGI (líneas 18–24) enumera **exhaustivamente** las deducciones personales admitidas:

| # | Deducción | Monto / Límite | Base legal |
|---|---|---|---|
| 18 | **Deducción básica** — cónyuges que presenten declaración **conjunta** | **B/. 800.00** | Art. 709 num. 2 CF, mod. Art. 25 Ley 8 de 2010 |
| 19 | Gastos médicos | Comprobados, territorio nacional | Art. 709 num. 7 CF |
| 20 | Intereses hipotecarios (vivienda principal en Panamá) | Máximo **B/. 15,000.00** | — |
| 21 | Intereses de préstamos educativos | Sin tope indicado | — |
| 22 | Gastos escolares | Según Ley 37 de 2018 | — |
| 23 | Gastos escolares de dependientes discapacitados | Según Ley 37 de 2018 | — |
| 24 | Fondo de jubilaciones/pensiones | Menor entre **10% del ingreso bruto anual** o **B/. 15,000** | Art. 6 Ley 10 de 1993 |

> 🚨 **CORRECCIÓN A LA DOCUMENTACIÓN PREVIA:**
>
> 1. **No existe una deducción de B/. 250 por dependiente.** `docs/03_entities_and_data_model.md` y `docs/04_payroll_and_liquidation_workflows.md` la declaran; **el instructivo oficial de la DGI no la contempla**. El campo `dependientes` de PlaniFácil puede corresponder a un régimen derogado o a un uso interno distinto.
> 2. **Los B/. 800 no son "por cónyuge no perceptor".** Son la **deducción básica que aplica a los cónyuges cuando presentan declaración conjunta**. Es una figura de la declaración anual, no una deducción automática de planilla.
>
> **Acción obligatoria:** validar ambos puntos con un contador panameño antes de implementar la retención. Es el tipo de error que produce retenciones incorrectas a escala.

### 4.3 Secuencia de cálculo (según instructivo DGI)

```
(6)  Total de Ingresos            = salarios + otras remuneraciones + especies
                                     + gastos de representación + dietas
(7)  Gastos de Representación     = se aíslan (tributan aparte, ver §4.4)
(8)  Total de Ingresos Gravables  = (6) − (7)
(15) Gastos deducibles
(16) Renta Gravable               = (8) − (15)
(25) Renta Neta Gravable          = (16) − deducciones personales (18–24)
(27) Impuesto Causado             = tarifa Art. 700 aplicada a (25)
(28) Impuesto por Gasto de Repr.  = escala propia (ver §4.4)
(32) Impuesto a Pagar             = (27) + (28) − retenciones − créditos
```

**Punto clave:** los gastos de representación **se restan de la base gravable ordinaria** y tributan bajo su propia escala. Esto **resuelve la ambigüedad** de `docs/04_payroll` §1.1.5 (*"10% fijo o escala especial según tramo"*): son ambas cosas, en tramos distintos.

### 4.4 Gastos de Representación — escala propia (Art. 701 lit. l CF, Ley 8 de 2010)

| Monto anual de gastos de representación | Retención |
|---|---|
| Hasta B/. 25,000.00 | **10%** |
| Más de B/. 25,000.00 | **B/. 2,500.00 + 15%** sobre el excedente de B/. 25,000 |

✅ VERIFICADO — instructivo DGI, línea 28.

**Reglas adicionales:**
- ❌ **No cotizan CSS ni Seguro Educativo** ✅ VERIFICADO
- **Tope:** no pueden exceder el **100% del salario** del trabajador ⚠️ VERIFICAR
- Se reportan en casilla separada de la planilla de la CSS ✅ VERIFICADO

### 4.5 Método de retención en planilla
❓ **PENDIENTE — el hueco más importante del ISR.**

El instructivo de la DGI describe la **declaración anual**, no el **método de retención quincenal**. La documentación previa propone proyección anual `(Salario × 13) / 24`, pero:

- Ese `× 13` presupone el XIII Mes dentro de la base anual, **y el XIII también se grava en su propio pago** → riesgo de doble gravamen.
- El método de proyección falla ante ingreso variable (comisiones, horas extra) y cambios de salario.
- `plajustesrenta.php` (`SCR-034`) existe precisamente para corregir la proyección, y no está documentado.

**Preguntas a resolver con asesor:**
- [ ] ¿El XIII Mes entra en la proyección anual o se retiene de forma independiente?
- [ ] ¿Se deduce de la base el Seguro Educativo, o solo la CSS?
- [ ] ¿La DGI prescribe un método de retención obligatorio, o el empleador elige?

> 🎯 **Oportunidad de producto:** el **método acumulativo** (recalcular el ISR del año a la fecha en cada corte, restar lo ya retenido) es más exacto, absorbe el ingreso variable automáticamente y elimina el ajuste traumático de fin de año. Es más complejo de implementar y es un argumento de venta real. Recomendado como modo predeterminado, con el método de proyección disponible por compatibilidad.

### 4.6 Exención sobre sumas de terminación (Art. 708 lit. y CF)

| Concepto | Tratamiento | Confianza |
|---|---|---|
| Preaviso, prima de antigüedad, indemnización, bonificación y demás beneficios de terminación | **Exentos hasta B/. 5,000.00**, más el monto resultante del Art. 701 lit. j) num. 2 | ⚠️ VERIFICAR |
| Prima de antigüedad (bono de antigüedad) | Exenta del ISR | ⚠️ VERIFICAR |

> Las fuentes son parcialmente contradictorias sobre si la prima de antigüedad está **totalmente exenta** o **sujeta con exención parcial de B/.5,000**. **Confirmar antes de implementar `liqisr.php` / `SCR-054`.**

---

## 5. Jornada de Trabajo y Recargos

**Base legal:** Código de Trabajo, Artículos 30–36, 46, 48, 49.

### 5.1 Tipos de jornada

| Jornada | Horario | Máx. diario | Máx. semanal |
|---|---|---|---|
| **Diurna** | 6:00 a.m. – 6:00 p.m. | 8 horas | 48 horas |
| **Nocturna** | 6:00 p.m. – 6:00 a.m. | 7 horas | 42 horas |
| **Mixta** | Combinada, **máx. 3 horas nocturnas** | 7.5 horas | 45 horas |

✅ VERIFICADO — **cierra el `GAP-008`**: los rangos horarios que faltaban por completo en la documentación previa.

> **Nota:** si una jornada mixta excede 3 horas nocturnas, se reclasifica íntegramente como nocturna.

### 5.2 Recargos por horas extra (Art. 33) — ⚠️ MATIZ IMPORTANTE

| Situación | Recargo |
|---|---|
| Hora extra en **jornada diurna** | **+25%** |
| Hora extra en **jornada nocturna**, o prolongación de **jornada mixta iniciada de día** | **+50%** |
| Hora extra que **prolonga la jornada nocturna**, o **jornada mixta iniciada de noche** | **+75%** |

✅ VERIFICADO — **resuelve el `GAP-008`** pero corrige su planteamiento.

> 🚨 **La documentación previa estaba mal formulada.** `docs/02` y `docs/04` presentan el 75% como *"recargo de jornada mixta"*. **No es así:** el recargo depende de **qué jornada se prolonga**, no del tipo de jornada del trabajador. Una jornada mixta puede generar recargo del **50%** (si inició de día) o del **75%** (si inició de noche). El motor debe evaluar el momento de inicio, no una etiqueta en la ficha del colaborador.

### 5.3 Límite legal de horas extra (Art. 36)

| Parámetro | Valor |
|---|---|
| Máximo diario | **3 horas** |
| Máximo semanal | **9 horas** |

✅ VERIFICADO

> 🎯 **Decisión de producto:** ¿Nomix bloquea, advierte o solo registra al exceder el límite? **Recomendación:** advertir de forma prominente y permitir el registro con justificación auditable — bloquear rompe la operación real, ignorar deja a la empresa expuesta ante MITRADEL.

### 5.4 Recargo por día de descanso semanal / domingo (Art. 48)

| Parámetro | Valor |
|---|---|
| Trabajo en domingo o día de descanso semanal | **+50%** sobre la jornada ordinaria |

✅ VERIFICADO — 🚨 **Este dato NO aparecía en ninguno de los 10 documentos previos**, pese a que PlaniFácil tiene el campo `omitir_rec_domingo`. Cierra un hueco que habría producido cálculos incorrectos.

### 5.5 Recargo por día de fiesta o duelo nacional (Art. 49)

| Parámetro | Valor |
|---|---|
| Trabajo en día de fiesta o duelo nacional | **+150%** sobre el salario de la jornada ordinaria |
| Trabajo en el **día compensatorio** otorgado | **+50%** |

✅ VERIFICADO

> **Regla crítica de acumulación:** *"El recargo del 150 por ciento **incluye** la remuneración del día de descanso."* Es decir, el 150% **ya contiene** el pago del día — no se paga el día ordinario *más* un 150% adicional.
>
> 🚨 Esto **contradice** la propuesta de `docs/nomix/01` línea 139 (*"Horas Excedentes en Día de Fiesta (+150% + 50%)"*), que no citaba base legal. Prevalece el texto del Art. 49.

### 5.6 Días de fiesta y duelo nacional (Art. 46)

| Fecha | Ocasión |
|---|---|
| 1 de enero | Año Nuevo |
| 9 de enero | Día de los Mártires |
| Martes de Carnaval | *(móvil)* |
| Viernes Santo | *(móvil)* |
| 1 de mayo | Día del Trabajador |
| 3 de noviembre | Separación de Colombia |
| 5 de noviembre | Día de Colón |
| 10 de noviembre | Primer Grito de Independencia |
| 28 de noviembre | Independencia de España |
| 8 de diciembre | Día de la Madre |
| 25 de diciembre | Navidad |
| Toma de posesión presidencial | *(cada 5 años)* |

✅ VERIFICADO

> **Implicación:** dos fechas son **móviles** (Carnaval y Viernes Santo, dependientes de la Pascua) y una es **quinquenal**. El calendario de feriados debe ser una tabla con generación automática de fechas móviles, no una lista fija. Corresponde a `confdiaslibres.php` (`SCR-011`).

---

## 6. Vacaciones

**Base legal:** Código de Trabajo, Artículos 54–62.

| Parámetro | Valor | Confianza |
|---|---|---|
| Derecho | **30 días** por cada **11 meses** continuos de trabajo | ✅ VERIFICADO |
| Equivalencia | 1 día de vacaciones por cada **11 días** trabajados | ✅ VERIFICADO |
| Base de pago | Salario regular + **promedio de prestaciones variables de los 11 meses anteriores** | ⚠️ VERIFICAR |
| Momento de pago | **Anticipado**, al inicio del período | ✅ VERIFICADO |
| Fraccionamiento (Art. 56) | Solo en **2 fracciones iguales máximo**, y únicamente si lo permite convención colectiva **y** hay acuerdo del trabajador en cada ocasión | ✅ VERIFICADO |
| Preaviso del empleador (Art. 57) | **2 meses** de antelación para señalar la fecha | ✅ VERIFICADO |
| CSS obrero sobre vacaciones | **9.75%** | ⚠️ VERIFICAR |
| Seguro Educativo sobre vacaciones | **1.25%** | ⚠️ VERIFICAR |
| ISR sobre vacaciones | Sí, como cualquier componente salarial | ⚠️ VERIFICAR |
| **Inembargabilidad** | **Totalmente inembargables** (Art. 161) | ✅ VERIFICADO |

> **Regla de negocio destacada:** las vacaciones son **inembargables en su cuantía completa**. El motor de descuentos **no debe aplicar ningún embargo ni descuento de acreedor** sobre el pago de vacaciones. Esto no estaba documentado y es una fuente directa de responsabilidad legal.

> ⚠️ **Restricción del Art. 56 poco conocida:** el fraccionamiento **no es libre** — exige convención colectiva vigente. La mayoría de los sistemas lo permiten sin validar. Una advertencia aquí es un Factor WOW barato.

> **Cierra `GAP-010`** (`WF-003`, el workflow de vacaciones que nunca se escribió).

---

## 7. Incapacidades y Licencias

**Base legal:** Ley Orgánica de la CSS y reglamentos.

### 7.1 Subsidio por enfermedad común

| Parámetro | Valor | Confianza |
|---|---|---|
| Primer día | Lo paga el **empleador** como salario normal | ⚠️ VERIFICAR |
| A partir del 2º día | Lo asume la **CSS** como subsidio | ⚠️ VERIFICAR |
| Porcentaje del subsidio | **60% – 70%** del salario promedio | ❓ **PENDIENTE** |
| Naturaleza del subsidio | **No es salario** | ⚠️ VERIFICAR |

> ❓ **Fuentes contradictorias.** Una fuente indica *"60% del salario desde el día 4"*; otra, *"70% del salario medio diario de los dos últimos meses de cotizaciones"*. **No implementar sin confirmación oficial de la CSS.**

### 7.2 Consecuencias de que el subsidio NO sea salario
⚠️ VERIFICAR — pero de altísimo impacto en el motor:

- ❌ No se registra como salario en la planilla
- ❌ **No genera cargas sociales** (no cotiza CSS ni SE)
- ❌ **No entra en la base del Décimo Tercer Mes** ← 🚨 **CONTRADICHO, ver abajo**
- ❌ **No entra en el promedio de vacaciones**

> 🚨 **CONTRADICCIÓN CON FUENTE PRIMARIA.**
>
> El **Artículo Cuarto del Decreto 19 de 1973** (§3.4) incluye **expresamente** en la base del XIII Mes: *"licencia por enfermedad pagada por el empleador, licencia de maternidad, ... riesgos profesional"*.
>
> | Concepto | Fuente secundaria (§7.2) | Decreto 19 de 1973, Art. 4º |
> |---|---|---|
> | Licencia por enfermedad pagada por el **empleador** | No entra al XIII | **Sí entra** — expresamente |
> | Licencia de **maternidad** | No entra al XIII | **Sí entra** — sin calificar quién paga |
> | **Riesgos profesionales** | No entra al XIII | **Sí entra** — sin calificar quién paga |
>
> **Jerarquía:** el Decreto 19 es fuente primaria oficial (Gaceta Oficial 17,436) e interpretación vinculante; §7.2 proviene de fuentes secundarias marcadas ⚠️ VERIFICAR. **Prevalece el Decreto.**
>
> **Lo que queda genuinamente sin resolver** es *qué monto* entra en el promedio cuando el pago lo hace la CSS y no el empleador: ¿el subsidio percibido, el salario que habría devengado, o nada? El artículo califica *"pagada por el empleador"* únicamente para la licencia por enfermedad, lo que sugiere que en maternidad y riesgos profesionales el criterio es distinto — pero no lo dice.
>
> **Estado: ❓ PENDIENTE.** Consulta **B2.e**. No implementar hasta resolverlo.
>
> La afirmación sobre **vacaciones** sigue en pie como ⚠️ VERIFICAR: el Art. 4º no la contradice porque habla de la base del XIII, no del promedio de vacaciones — son bases distintas.

### 7.3 Licencia de maternidad

| Parámetro | Valor | Confianza |
|---|---|---|
| Duración total | **14 semanas** | ⚠️ VERIFICAR |
| Distribución | **6 semanas antes** del parto + **8 semanas después** | ⚠️ VERIFICAR |
| Quién paga | **CSS**, como subsidio de maternidad | ⚠️ VERIFICAR |
| Relación laboral | **Se mantiene** durante el período | ✅ VERIFICADO |

### 7.4 Riesgos profesionales (accidente laboral)
❓ **PENDIENTE** — régimen distinto del de enfermedad común, con cobertura propia. No se investigó en profundidad. Requiere consulta específica.

### 7.5 Los "18 días" de PlaniFácil
❓ **PENDIENTE** — `SCR-030` menciona *"control de días acumulados del fondo de incapacidad (18 días anuales)"*. **No se encontró respaldo legal para esta cifra** en la investigación. Puede ser una regla interna, un beneficio convencional o una interpretación de PlaniFácil. **Verificar antes de replicarla.**

---

## 8. Terminación de la Relación Laboral

**Base legal:** Código de Trabajo, Título VI, Artículos 210–229.

### 8.1 Prima de Antigüedad (Art. 224)

| Parámetro | Valor | Confianza |
|---|---|---|
| Derecho | **1 semana de salario por cada año laborado** | ✅ VERIFICADO |
| Desde cuándo | **Desde el inicio de la relación laboral** | ✅ VERIFICADO |
| Años incompletos | **Proporcional** | ✅ VERIFICADO |
| Aplicabilidad | Contratos indefinidos, **cualquiera sea la causa de terminación** | ✅ VERIFICADO |

**Provisión mensual:**
```
1 semana / 52 semanas / 12 meses ≈ 1.92% del salario mensual
```
✅ VERIFICADO — esto **explica el origen del 1.92%** que `SCR-084` mencionaba sin desglose. **Cierra ese hueco de `GAP-003`.**

### 8.2 Fondo de Cesantía (Ley 44 de 12 de agosto de 1995)

| Componente | Valor | Confianza |
|---|---|---|
| Cuota por prima de antigüedad | **1.92%** del salario mensual | ✅ VERIFICADO |
| Cuota por indemnización | **5%** de la cuota parte mensual de la indemnización que correspondería por despido injustificado o renuncia justificada | ✅ VERIFICADO |
| Periodicidad de aporte | **Trimestral** | ✅ VERIFICADO |
| Naturaleza | Fideicomiso en entidad autorizada, **separado del patrimonio de la empresa** | ✅ VERIFICADO |

> **Cierra `GAP-003`**: la composición del Fondo de Cesantía que faltaba. Son **dos componentes**, no uno. La documentación previa solo mencionaba el 1.92%.

### 8.3 Indemnización por despido injustificado (Art. 225)

**Régimen vigente (desde la Ley 44 de 1995):**

| Antigüedad | Indemnización |
|---|---|
| **Primeros 10 años** | **3.4 semanas de salario por cada año laborado** |
| **Cada año posterior al décimo** | **1 semana de salario adicional por año** |
| Mínimo absoluto | **1 semana de salario** |

✅ VERIFICADO — **cierra el `GAP-003`**, la escala que `docs/04_payroll` dejaba abierta con *"Siguientes años: escalas progresivas"*.

**Ejemplo (salario mensual B/. 1,000):**
```
Salario semanal = 1,000 / 4.333 = B/. 230.79

15 años de servicio:
  Primeros 10 años : 10 × 3.4 = 34.0 semanas
  Años 11 al 15    :  5 × 1.0 =  5.0 semanas
  Total            = 39.0 semanas × 230.79 = B/. 9,000.81
```

> ⚠️ **Régimen histórico:** el Art. 225 conserva escalas para relaciones anteriores al 2 de abril de 1972 (con topes en meses: 3, 4, 5, 6 y 7 meses por tramo de antigüedad) y un régimen intermedio. Son **combinables** para trabajadores de larga data. Para el MVP se puede implementar solo el régimen vigente, **pero el modelo de datos debe permitir régimen por fecha de ingreso** para no bloquear casos reales de empresas antiguas.

### 8.4 Preaviso

| Situación | Regla | Base legal | Confianza |
|---|---|---|---|
| **Empleador despide** (casos del Art. 212) | Notificar con **30 días** de anticipación **o pagar el preaviso** | Art. 212 | ✅ VERIFICADO |
| **Trabajador renuncia** | Avisar con **15 días** de anticipación | Art. 222 | ✅ VERIFICADO |
| **Trabajador técnico renuncia** | Avisar con **2 meses** de anticipación | Art. 222 | ✅ VERIFICADO |
| **Trabajador renuncia sin avisar** | Debe pagar **1 semana de salario** al empleador | Art. 222 | ✅ VERIFICADO |

> 🚨 **Corrección:** `docs/04_payroll` §4 afirma *"Si el trabajador renuncia sin dar **15 días** de preaviso: deducción de 1 semana"*. El plazo es correcto, pero **omite el caso del trabajador técnico (2 meses)**. El motor necesita el flag `es_tecnico` en la ficha del colaborador — un campo que **no existe** en el modelo relevado.

### 8.5 Casos especiales

| Artículo | Situación | Consecuencia |
|---|---|---|
| **Art. 211** | Regla general | No se puede terminar contrato indefinido sin causa justificada |
| **Art. 213** | Causas justificadas | A) Disciplinarias · B) No imputables · C) Económicas |
| **Art. 214** | Formalidad | Notificación **previa y por escrito** con fecha y causa **específica** |
| **Art. 219** | Reintegro ordenado | Empleador puede pagar indemnización con recargo de **50%** (trabajadores activos al inicio de la ley) o **25%** (nuevos sin fondo al día), **más salarios caídos** |
| **Art. 227** | Contrato definido roto antes del término | Indemnización = **salarios restantes hasta el vencimiento** |

✅ VERIFICADO

> **`Art. 212` — excepciones al requisito de causa justificada** (aplica el régimen de despido sin causa con preaviso de 30 días):
> - Trabajadores con **menos de 2 años** de servicio
> - Trabajadores domésticos
> - **Pequeñas empresas:** agrícolas ≤10, agroindustriales ≤20, manufactureras ≤15 trabajadores
> - Naves de servicio internacional
> - Aprendices
> - Establecimientos de venta al por menor con ≤5 trabajadores
>
> **Implicación de modelo de datos:** la empresa necesita `tipo_actividad` y `cantidad_trabajadores` para que el motor determine si le aplica el Art. 212. Ninguno de los dos campos existe en el modelo relevado.

---

## 9. Descuentos, Retenciones e Inembargabilidad

**Base legal:** Código de Trabajo, Artículos 161–162.

### 9.1 Descuentos permitidos (Art. 161)

| Concepto | Límite |
|---|---|
| ISR y cuota obrera de seguro social | Sin límite (retención de ley) |
| Cuotas mensuales por compra de vivienda (entidad vendedora o crediticia) | **Hasta 30% del salario** |
| Pensiones alimenticias | Solo si es **decretada y ordenada por autoridad competente** |

✅ VERIFICADO

### 9.2 Tope global de deducciones — 🚨 REGLA CRÍTICA

| Regla | Valor |
|---|---|
| Total de deducciones y retenciones | **No excederá el 50% del salario en dinero** |
| Excepción | **Pensiones alimenticias** (no sujetas a este tope) |

✅ VERIFICADO — **cierra el hueco de inembargabilidad de `docs/nomix/05` §9**, que era riesgo legal directo.

### 9.3 Inembargabilidad

| Concepto | Regla |
|---|---|
| Salario | **Inembargable hasta el importe del mínimo legal** |
| Vacaciones | **Inembargables en cuantía completa** |
| Jubilaciones y pensiones | **Inembargables en cuantía completa** |
| Indemnizaciones (Código, convenciones colectivas, contratos, planes de empresa) | **Inembargables en cuantía completa** |

✅ VERIFICADO

### 9.4 Algoritmo de aplicación de descuentos (derivado)

```
1. Calcular salario bruto del período
2. Aplicar retenciones de ley (CSS 9.75%, SE 1.25%, ISR) — sin tope
3. Calcular "salario en dinero" base para el tope del 50%
4. Aplicar pensiones alimenticias      → EXENTAS del tope del 50%
5. Aplicar descuento de vivienda        → tope propio del 30%
6. Aplicar descuentos restantes por orden de prelación,
   deteniéndose al alcanzar el 50% acumulado
7. Verificar que el neto resultante no vulnere el salario mínimo legal
8. Registrar el saldo no aplicado de cada descuento (arrastre)

EXCEPCIÓN: sobre pagos de vacaciones, indemnizaciones y jubilaciones
           NO se aplica ningún descuento de acreedor (inembargables).
```

> ❓ **PENDIENTE:** el **orden de prelación** entre descuentos ordinarios (préstamos bancarios, casas comerciales, cooperativas) cuando el 50% no alcanza para todos. El Art. 161 no lo establece. **Decisión de producto** (recomendación: por antigüedad de la orden, con override manual auditable).

---

## 10. Salario Mínimo

**Base legal:** **Decreto Ejecutivo N° 13 de 31 de diciembre de 2025** (MITRADEL).

| Parámetro | Valor | Confianza |
|---|---|---|
| Vigencia | Desde el **16 de enero de 2026** | ✅ VERIFICADO |
| Número de tasas | **59 tasas diferenciadas** | ✅ VERIFICADO |
| Actividades cubiertas | **74 actividades económicas** | ✅ VERIFICADO |
| Criterios de diferenciación | **Región · Tamaño de empresa · Actividad económica** | ✅ VERIFICADO |
| Rango | **B/. 1.64/hora** (pequeña empresa agrícola, Región 2) a **B/. 5.01/hora** (tripulantes de vuelos internacionales) | ✅ VERIFICADO |

**Regiones:**
- **Región 1:** Panamá, Colón, San Miguelito, David, Santiago, Chitré, Aguadulce, Penonomé, Bocas del Toro, La Chorrera, Arraiján, Capira, Chame, Antón, Natá, Las Tablas, Bugaba, Boquete, Taboga, San Carlos, Chepo, Guararé, Los Santos, Pedasí, Dolega, San Félix, Barú, Boquerón, Portobelo, Donoso, Santa Isabel, Santa María, Parita, Pesé, Atalaya, Changuinola, Chiriquí Grande, Almirante, Tierras Altas y Omar Torrijos Herrera.
- **Región 2:** el resto de los distritos del país.

**Consulta oficial:** https://apps.mitradel.gob.pa/SalarioMinimo/

> 🚨 **El salario mínimo no aparecía en ninguno de los 10 documentos previos.** Es una validación obligatoria y una oportunidad de diferenciación directa: PlaniFácil, según lo documentado, no la implementa.

> **Modelo de datos requerido:** tabla `salario_minimo` con dimensiones `(region, actividad_ciiu, tamano_empresa, vigencia_desde, vigencia_hasta, tarifa_hora)`. La empresa declara región y actividad; el colaborador hereda o sobrescribe. **59 tasas × múltiples vigencias** — es una tabla, nunca una constante.

> **Acción pendiente:** descargar la tabla completa de las 59 tasas del portal de MITRADEL para sembrar la configuración.

---

## 11. Correcciones a la Documentación Previa del Repositorio

Resumen de las discrepancias detectadas entre esta investigación y `docs/01..07`:

| # | Documento afectado | Afirmación previa | Hallazgo verificado | Severidad |
|---|---|---|---|---|
| 1 | `04_payroll` §1.1.3 | CSS patronal **12.25%** | **13.25%** desde abril 2025 (Ley 462/2025), escalonado a 15.25% en 2029 | 🔴 **Crítica** |
| 2 | `03_entities` §1.4, `04_payroll` §1.1.4 | Deducción ISR de **$250 por dependiente** | **No existe** en el instructivo oficial de la DGI | 🔴 **Crítica** |
| 3 | `03_entities` §1.4 | **$800 por cónyuge no perceptor** | Es la **deducción básica para cónyuges en declaración conjunta** | 🟠 Alta |
| 4 | `04_payroll` §1.1.5 | Gastos de representación: *"10% fijo (o escala especial)"* | Escala definida: **10% hasta B/.25,000; B/.2,500 + 15% sobre el excedente** | 🟠 Alta |
| 5 | `02_application_map`, `04_payroll` | Jornada mixta = **75%** | El recargo depende de **qué jornada se prolonga**, no del tipo de jornada: 50% o 75% según inicio diurno o nocturno | 🟠 Alta |
| 6 | Todos | **Recargo de domingo: ausente** | **+50%** (Art. 48) | 🟠 Alta |
| 7 | `nomix/01` línea 139 | *"Feriado +150% + 50%"* | El 150% **ya incluye** la remuneración del día (Art. 49) | 🟠 Alta |
| 8 | `04_payroll` §3.1.3 | *"Siguientes años: escalas progresivas"* (sin tabla) | **3.4 semanas/año** los primeros 10 años; **1 semana/año** posteriores | 🟠 Alta |
| 9 | `02_application_map` `SCR-084` | Fondo de Cesantía **1.92%** sin desglose | **1.92% (prima) + 5% (cuota parte de indemnización)**, aporte trimestral | 🟡 Media |
| 10 | `04_payroll` §4 | Renuncia sin preaviso: 15 días | Correcto, **pero omite el trabajador técnico: 2 meses** | 🟡 Media |
| 11 | Todos | **Salario mínimo: ausente** | 59 tasas vigentes, D.E. 13 de 2025 | 🟡 Media |
| 12 | Todos | **Inembargabilidad: ausente** | Tope del **50%**, vacaciones e indemnizaciones **totalmente inembargables** | 🔴 **Crítica** |
| 13 | `02_application_map` `SCR-030` | *"18 días anuales de incapacidad"* | **Sin respaldo legal encontrado** — verificar | 🟡 Media |

---

## 12. Convenciones de Cálculo

### 12.1 Divisores salariales

| Conversión | Fórmula | Confianza |
|---|---|---|
| **Salario semanal** | `salario_mensual / 4.333` | ⚠️ VERIFICAR — convención de mercado confirmada por múltiples calculadoras profesionales |
| **Salario por hora** | `salario_mensual / horas_mensuales` (208 o 192) | ✅ VERIFICADO (observado en PlaniFácil `ENT-001`) |
| **Salario diario** | ❓ **PENDIENTE** — ¿/30, /días del mes, o × 12/365? | ❓ |

> El divisor **4.333** (= 52 semanas / 12 meses) es el que usan las calculadoras profesionales panameñas para prima de antigüedad e indemnización. Es coherente con la derivación del 1.92% (1/52/12). **Cierra parcialmente `GAP-007`.**

### 12.2 Correspondencia horas / jornada

| Horas mensuales | Derivación | Jornada |
|---|---|---|
| **208** | 8 h/día × 26 días | Jornada diurna de 48 h semanales |
| **192** | ~7.4 h/día × 26 días | Jornadas reducidas / mixtas |

⚠️ VERIFICAR

### 12.3 Redondeo
❓ **PENDIENTE — decisión de producto, no legal.**

**Recomendación técnica:**
- Almacenamiento y cálculo interno: `NUMERIC(18,6)`
- Redondeo a 2 decimales **solo** en presentación y en archivos de salida (ACH, SIPE, DGI)
- Método: `HALF_UP` (medio arriba), que es el usual en cálculos monetarios en la región
- **Nunca** redondear resultados intermedios encadenados

> **Por qué importa:** los totales patronales de Nomix deben cuadrar **al centavo** contra lo que calcula la CSS. Redondear en cada paso intermedio con 200 empleados produce descuadres de dólares.

---

## 13. Configuración Semilla del Motor

Traducción directa de este documento a la configuración inicial. **Todos los valores llevan `vigencia_desde` / `vigencia_hasta`.**

```yaml
jurisdiccion: PA
moneda: PAB          # paridad 1:1 con USD

seguridad_social:
  css_obrero:
    - { valor: 0.0975, desde: 2013-01-01, hasta: null }
  css_patronal:
    - { valor: 0.1225, desde: 2013-01-01, hasta: 2025-03-31 }
    - { valor: 0.1325, desde: 2025-04-01, hasta: 2027-02-28 }
    - { valor: 0.1425, desde: 2027-03-01, hasta: 2029-02-28 }
    - { valor: 0.1525, desde: 2029-03-01, hasta: null }
  css_obrero_xiii:
    - { valor: 0.0725, desde: 2013-01-01, hasta: null }
  seguro_educativo_obrero:
    - { valor: 0.0125, desde: 1987-01-01, hasta: null }
  seguro_educativo_patronal:
    - { valor: 0.0150, desde: 1987-01-01, hasta: null }
  seguro_educativo_xiii:
    - { valor: 0.0000, desde: 1987-01-01, hasta: null }
  riesgos_profesionales:
    rango_min: 0.0056
    rango_max: 0.0625
    por_empresa: true          # asignado por la CSS según CIIU
    resolucion: JD-CSS 12,260-2024

isr:
  tramos:
    - { desde: 0.00,     hasta: 11000.00, tasa: 0.00, base_fija: 0.00 }
    - { desde: 11000.01, hasta: 50000.00, tasa: 0.15, base_fija: 0.00 }
    - { desde: 50000.01, hasta: null,     tasa: 0.25, base_fija: 5850.00 }
  deducciones_personales:
    deduccion_basica_conyuges_conjunta: 800.00   # ⚠️ solo declaración conjunta
    intereses_hipotecarios_max:       15000.00
    fondo_jubilacion_max:             15000.00
    fondo_jubilacion_pct_ingreso:         0.10
    # ⚠️ NO existe deducción por dependiente — ver §4.2
  gastos_representacion:
    - { hasta: 25000.00, tasa: 0.10, base_fija: 0.00 }
    - { hasta: null,     tasa: 0.15, base_fija: 2500.00 }
    cotiza_css: false
    cotiza_se:  false
    tope_pct_salario: 1.00        # ⚠️ VERIFICAR
  exencion_terminacion: 5000.00   # ⚠️ VERIFICAR — Art. 708 lit. y CF

jornadas:
  diurna:   { inicio: "06:00", fin: "18:00", max_diario: 8.0, max_semanal: 48 }
  nocturna: { inicio: "18:00", fin: "06:00", max_diario: 7.0, max_semanal: 42 }
  mixta:    { max_horas_nocturnas: 3, max_diario: 7.5, max_semanal: 45 }

recargos:
  extra_diurna:                 0.25   # Art. 33
  extra_nocturna:               0.50   # Art. 33
  extra_prolonga_mixta_diurna:  0.50   # Art. 33
  extra_prolonga_nocturna:      0.75   # Art. 33
  extra_mixta_inicio_nocturno:  0.75   # Art. 33
  domingo_descanso_semanal:     0.50   # Art. 48
  dia_fiesta_duelo:             1.50   # Art. 49 — INCLUYE el pago del día
  dia_compensatorio:            0.50   # Art. 49
  limite_extra_diario:          3.0    # Art. 36
  limite_extra_semanal:         9.0    # Art. 36

prestaciones:
  vacaciones:
    dias_por_periodo:      30
    meses_periodo:         11
    ratio_dias:            "1:11"
    pago_anticipado:       true         # Art. 55
    max_fracciones:        2            # Art. 56 — requiere convención colectiva
    preaviso_empleador_meses: 2         # Art. 57
    inembargable:          true         # Art. 161
  decimo_tercer_mes:
    divisor:               12
    partidas:
      - { nombre: "1ra", desde: "12-16", hasta: "04-15", pago: "04-15" }
      - { nombre: "2da", desde: "04-16", hasta: "08-15", pago: "08-15" }
      - { nombre: "3ra", desde: "08-16", hasta: "12-15", pago: "12-15" }
    # Decreto 19 de 1973, Art. 4º — lista taxativa de conceptos que integran la base
    conceptos_base:
      - salario_base
      - jornadas_extraordinarias        # horas extra
      - jornadas_recargos_legales       # domingo, feriado, nocturnidad
      - comisiones
      - primas
      - licencia_enfermedad_empleador   # solo la porción del empleador
      - licencia_maternidad             # ❓ monto pendiente — ver §3.7
      - vacaciones
      - permisos_remunerados
      - riesgos_profesionales           # ❓ monto pendiente — ver §3.7
      - bonificaciones
    permite_modo_solo_salario_base: false   # no conforme — Art. 4º y 5º
    # Art. 3º — la 3ra partida es el mayor entre XIII y aguinaldo acostumbrado
    regla_aguinaldo:
      aplica_a_partida: "3ra"
      criterio: "max(tercera_partida_xiii, aguinaldo_acostumbrado)"
      partidas_1_y_2_intactas: true
    # Art. 5º — los convenios solo pueden mejorar, nunca reducir
    piso_irrenunciable: true

terminacion:
  prima_antiguedad:
    semanas_por_anio:      1.0          # Art. 224
    proporcional:          true
    provision_mensual_pct: 0.0192
    aplica_causal:         "todas"      # contratos indefinidos
  fondo_cesantia:                       # Ley 44 de 1995
    cuota_prima_antiguedad_pct: 0.0192
    cuota_indemnizacion_pct:    0.05
    periodicidad:               "trimestral"
  indemnizacion_art225:
    - { desde_anio: 0,  hasta_anio: 10,   semanas_por_anio: 3.4 }
    - { desde_anio: 10, hasta_anio: null, semanas_por_anio: 1.0 }
    minimo_semanas: 1.0
  preaviso:
    empleador_dias:            30       # Art. 212
    trabajador_dias:           15       # Art. 222
    trabajador_tecnico_dias:   60       # Art. 222 ⚠️ requiere flag es_tecnico
    penalidad_sin_aviso_semanas: 1.0    # Art. 222
  reintegro_art219:
    recargo_trabajador_activo: 0.50
    recargo_trabajador_nuevo:  0.25

descuentos:
  tope_global_pct:                0.50  # Art. 161
  tope_vivienda_pct:              0.30  # Art. 161
  pension_alimenticia_exenta_tope: true # Art. 161
  conceptos_inembargables:              # Art. 161
    - vacaciones
    - jubilaciones
    - pensiones
    - indemnizaciones

feriados:                               # Art. 46
  fijos:
    - { fecha: "01-01", nombre: "Año Nuevo" }
    - { fecha: "01-09", nombre: "Día de los Mártires" }
    - { fecha: "05-01", nombre: "Día del Trabajador" }
    - { fecha: "11-03", nombre: "Separación de Colombia" }
    - { fecha: "11-05", nombre: "Día de Colón" }
    - { fecha: "11-10", nombre: "Primer Grito de Independencia" }
    - { fecha: "11-28", nombre: "Independencia de España" }
    - { fecha: "12-08", nombre: "Día de la Madre" }
    - { fecha: "12-25", nombre: "Navidad" }
  moviles:
    - { calculo: "pascua-47", nombre: "Martes de Carnaval" }
    - { calculo: "pascua-2",  nombre: "Viernes Santo" }
  quinquenales:
    - { nombre: "Toma de posesión presidencial" }

convenciones:
  divisor_semanal:   4.333             # ⚠️ VERIFICAR
  horas_mensuales:   [208, 192]
  precision_interna: 6
  precision_salida:  2
  metodo_redondeo:   "HALF_UP"         # 🎯 decisión de producto

salario_minimo:
  decreto:   "D.E. 13 de 31-dic-2025"
  vigencia:  2026-01-16
  tasas:     59
  actividades: 74
  regiones:  2
  rango_hora: { min: 1.64, max: 5.01 }
  # ⚠️ tabla completa pendiente de descarga desde MITRADEL
```

---

## 14. Trabajo Pendiente

### 14.1 Bloqueantes para producción (consulta profesional obligatoria)

- [ ] 🔴 **Deducciones ISR por dependiente** — confirmar que efectivamente **no existen** (§4.2)
- [ ] 🔴 **Método de retención de ISR en planilla** — proyección vs. acumulativo; tratamiento del XIII (§4.5)
- [ ] 🔴 **Cuota patronal de CSS sobre el XIII Mes** (§3.3)
- [ ] 🔴 **Monto que entra al XIII cuando el subsidio lo paga la CSS** — maternidad y riesgos profesionales están en la lista del Art. 4º sin calificar quién paga (§3.7 / §7.2)
- [ ] 🟠 **Artículo 2º del Decreto de Gabinete 221 de 1971** — cómputo del tiempo de servicio para el prorrateo del XIII (§3.8)
- [ ] 🟡 **Regla del Aguinaldo** — qué califica como *"acostumbrada de manera reiterada"* y a qué tasa cotiza (§3.5)
- [ ] 🔴 **Subsidio de incapacidad** — porcentaje exacto y día de inicio; fuentes contradictorias (§7.1)
- [ ] 🟠 **Tope de cotización de CSS** — confirmar que no existe (§1.2)
- [ ] 🟠 **ISR sobre indemnizaciones y prima de antigüedad** — exención total vs. parcial de B/.5,000 (§4.6)
- [ ] 🟠 **Régimen de riesgos profesionales** (accidente laboral) — no investigado (§7.4)
- [ ] 🟡 **Los "18 días" de incapacidad** de PlaniFácil — sin respaldo legal encontrado (§7.5)
- [ ] 🟡 **Salario diario** — divisor correcto (§12.1)

### 14.2 Datos a descargar

- [ ] **Tabla completa de las 59 tasas de salario mínimo** — https://apps.mitradel.gob.pa/SalarioMinimo/
- [ ] **Tabla completa de tarifas de Riesgos Profesionales por CIIU** — Resolución JD-CSS 12,260-2024
- [ ] **Texto íntegro del Código de Trabajo** — https://www.mitradel.gob.pa/wp-content/uploads/2016/12/código-detrabajo.pdf
- [ ] **Texto íntegro de la Ley 462 de 2025**
- [ ] **Escalas históricas del Art. 225** (regímenes pre-1972 e intermedio) para empresas antiguas

### 14.3 Campos de modelo de datos que esta investigación reveló como faltantes

| Campo | Entidad | Por qué se necesita |
|---|---|---|
| `es_tecnico` | Colaborador | Preaviso de renuncia de 2 meses (Art. 222) |
| `region_salario_minimo` | Empresa / Sucursal | Validación de salario mínimo (2 regiones) |
| `actividad_ciiu` | Empresa | Salario mínimo + tarifa de Riesgos Profesionales |
| `tamano_empresa` | Empresa | Salario mínimo + excepciones del Art. 212 |
| `cantidad_trabajadores` | Empresa | Excepciones del Art. 212 (pequeña empresa) |
| `fecha_ingreso_regimen_art225` | Colaborador | Régimen de indemnización aplicable (pre/post 1972/1995) |
| `tipo_incapacidad` | Incapacidad | Enfermedad común / riesgo profesional / maternidad — regímenes distintos |
| `paga_aguinaldo_acostumbrado` | Empresa | Regla del Art. 3º del Decreto 19 de 1973: la 3ª partida es el mayor entre XIII y aguinaldo |
| `monto_aguinaldo` | Colaborador | Término de comparación de la regla anterior |

---

## 15. Fuentes

### Oficiales
- **DGI / MEF** — Instructivo *Renta Natural, Asalariado Puro* (e-Tax 2.0): https://dgi.mef.gob.pa/DInforme/pdf/RENTA%20-%20ASALARIADOS.pdf
- **DGI / MEF** — Generalidades de la Declaración del ISR: https://dgi.mef.gob.pa/DInforme/GD-ISR
- **MITRADEL** — Código de Trabajo: https://www.mitradel.gob.pa/wp-content/uploads/2016/12/c%C3%B3digo-detrabajo.pdf
- **MITRADEL** — Consulta de Salario Mínimo: https://apps.mitradel.gob.pa/SalarioMinimo/
- **MITRADEL** — Jornada laboral en días nacionales y su remuneración: https://www.mitradel.gob.pa/jornada-laboral-en-dias-nacionales-y-su-remuneracion-segun-el-codigo-de-trabajo/
- **CSS** — Subsidio por Enfermedad Común: https://www.css.gob.pa/subsidio-por-enfermedad-comun/
- **CSS** — Riesgos Profesionales: https://w3.css.gob.pa/riesgos-profesionales-2/
- **CSS Noticias** — Aumento de cuota patronal desde abril 2025: https://prensa.css.gob.pa/2025/03/21/aumento-en-el-pago-de-la-cuota-de-los-empleadores-se-pagara-a-partir-de-abril-de-2025/
- **OAS** — Ley Orgánica de la CSS y reglamentos: https://www.oas.org/juridico/PDFs/mesicic4_pan_ley114.pdf
- **Superintendencia de Bancos** — Ley 44 de 1995 (Fondo de Cesantía): https://www.superbancos.gob.pa/documentos/fiduciarias/leyes/ley44_1995.pdf
- **Justia Panamá** — Código Fiscal: https://docs.panama.justia.com/federales/codigos/codigo-fiscal.pdf
- **Justia Panamá** — Código de Trabajo: https://docs.panama.justia.com/federales/codigos/codigo-de-trabajo.pdf
- **OIT / NATLEX** — Decreto de Gabinete 221 de 1971: https://natlex.ilo.org/dyn/natlex2/r/natlex/fe/details?p3_isn=31843
- **Asamblea Nacional / Legispan** — Decreto N° 19 de 7 de septiembre de 1973 (reglamenta el XIII Mes), Gaceta Oficial 17,436: https://legispan.asamblea.gob.pa/norms/db9109fc-cebe-4e0a-a695-caf5e778c3a0 · [PDF facsímil](https://s3-legispan.asamblea.gob.pa/legispan/NORMAS/1970/1973/DECRETO/Administrador%20Legispan_17436_1973_9_20_MINISTERIO%20DE%20TRABAJO%20Y%20BIENESTAR%20SOCIAL_19.pdf)
- **Procuraduría de la Administración** — Jurisprudencia sobre Art. 225: https://jurisis.procuraduria-admon.gob.pa/wp-content/uploads/2016/12/Samuel-N----ez.pdf

### Firmas legales y profesionales
- **Fábrega Molino** — Ley 462 de 2025, aspectos relevantes: https://fmm.com.pa/es/reforma-a-la-ley-de-la-caja-de-seguro-social-aspectos-relevantes-de-la-ley-n-o-462-2025/
- **Icaza, González-Ruiz & Alemán** — Reforma de la seguridad social: https://icazalaw.com/es/2025/06/reforma-de-la-seguridad-social-de-panama-ley-462/
- **LexLatin** — Nuevo régimen de pensiones: https://lexlatin.com/reportajes/ley-462-reforma-caja-seguro-social-panama-pensiones
- **EY Centroamérica** — Salario mínimo 2026: https://www.ey.com/es_ce/technical/tax/tax-alerts/panama-salario-minimo-2026
- **RSM Panamá** — Guía del ISR para personas naturales: https://www.rsm.global/panama/es/insights/guia-completa-del-impuesto-sobre-la-renta-para-personas-naturales-en-panama
- **Colegio de CPA de Panamá** — El Fondo de Cesantía y la Prima de Antigüedad: https://www.colegiocpapanama.org/articulos/sala-de-expresidentes/el-fondo-de-cesantia-y-la-prima-de-antiguedad
- **Laboremia** — Código de Trabajo, Título VI (Terminación): https://blog.laboremia.com/leyes-detalle/codigo-del-trabajo-titulo-vi-terminacion-de-las-relaciones-de-trabajo
- **Laboremia** — Título IV (Derechos y Obligaciones): https://blog.laboremia.com/leyes-detalle/codigo-del-trabajo-titulo-iv-derechos-y-obligaciones-de-los-trabajadores-empleadores-126-196
- **Pluxee Panamá** — Prima de antigüedad y reforma CSS: https://www.pluxee.pa/blog/prima-antiguedad-panama/
- **Jurídica Panamá** — Art. 161 del Código de Trabajo: https://www.juridicapanama.com/articles/7513
- **Jibble** — Leyes sobre horas extras en Panamá: https://www.jibble.io/es/legislacion-laboral/panama/horas-extras
- **La Prensa** — Salario mínimo 2026 por actividad y región: https://www.prensa.com/economia/salario-minimo-2026-en-panama-estas-son-las-nuevas-tarifas-por-actividad-y-region/
- **KPMG** — Aumento de cuotas obrero-patronales 2026: https://kpmg.com/cr/es/home/tendencias/2025/10/newsflash-oct-29-2025.html

---

## 16. Advertencia Legal

Este documento es una **investigación técnica para el diseño de software**, no asesoría legal. Fue elaborado a partir de fuentes públicas consultadas el **26 de agosto de 2026**.

**Antes de operar en producción con datos reales:**
1. Un **abogado laboralista panameño** debe validar las secciones 5, 6, 7, 8 y 9.
2. Un **contador público autorizado (CPA) panameño** debe validar las secciones 1, 2, 3, 4 y 10.
3. Todos los ítems marcados ⚠️ **VERIFICAR** y ❓ **PENDIENTE** deben resolverse.
4. Debe establecerse un **proceso de vigilancia normativa** — la Ley 462 de 2025 ya tiene dos cambios de tasa programados (marzo 2027 y marzo 2029) y el salario mínimo se revisa cada dos años.

**Control de versiones:** este documento es la fuente de verdad. Cualquier cambio legal se registra aquí primero, con su fecha de vigencia, y de ahí se propaga a la configuración del motor. Nunca al revés.
