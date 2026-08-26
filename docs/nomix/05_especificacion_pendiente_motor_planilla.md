# Especificación Pendiente del Motor de Planilla

**Documento:** `05_especificacion_pendiente_motor_planilla.md`
**Proyecto:** **Nomix - Nómina inteligente**
**Estado:** `OPEN QUESTIONS`
**Fecha:** 2026-08-26
**Alcance:** Únicamente la **lógica de cálculo** de la planilla. No cubre infraestructura, UI, roles ni formatos de archivo de salida.
**Método:** Recorrido del pipeline de cálculo de una quincena, paso por paso, contrastado contra los 10 documentos existentes.

---

## 0. Cómo leer este documento

Cada pregunta abierta está clasificada por **origen de la respuesta**, porque determina a quién hay que preguntarle:

| Tipo | Significado | Dónde se resuelve |
|---|---|---|
| 🏛️ **LEGAL** | Es un hecho del Código de Trabajo, CSS o DGI | Ley / asesor laboral / contador |
| 📋 **CONVENCIÓN** | La ley no lo fija; el mercado panameño tiene una práctica establecida | Un talonario real + un operador de nómina |
| 🎯 **PRODUCTO** | Es una decisión tuya de diseño | Tú |

**Distinción importante:** como el objetivo es *superar* a PlaniFácil y no replicarlo, los ítems 🏛️ hay que resolverlos contra la ley, no contra lo que haga PlaniFácil. Pero los ítems 📋 sí conviene alinearlos con la práctica del mercado: si tu sistema da un neto distinto al que el contador espera, aunque tengas razón, pierdes la venta.

---

## 1. 🚨 El hueco central: la Matriz de Incidencia de Conceptos

**Este es el 60% de lo que falta.** Todo lo demás son detalles comparados con esto.

Un motor de nómina no es una fórmula: es un **catálogo de conceptos** donde cada uno declara en qué bases entra. `SCR-036` menciona *"clasificación de gravable / no gravable a CSS/ISR"* pero **nunca da la clasificación**. Sin esta matriz no hay motor, solo aritmética suelta.

### 1.1 La matriz a completar

| # | Concepto | ¿Grava CSS? | ¿Grava SE? | ¿Grava ISR? | ¿Entra al XIII? | ¿Entra al promedio de vacaciones? | ¿Entra a base de liquidación? |
|---|---|---|---|---|---|---|---|
| 1 | Salario ordinario | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 2 | Horas extra diurnas (25%) | ❓ | ❓ | ❓ | ❓ *(el doc dice que sí)* | ❓ | ❓ |
| 3 | Horas extra nocturnas (50%) | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| 4 | Horas extra mixtas (75%?) | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| 5 | Recargo día de descanso / feriado (150%) | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| 6 | Recargo de domingo | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| 7 | Recargo por nocturnidad (jornada, no extra) | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| 8 | Comisiones | ❓ | ❓ | ❓ | ❓ *(el doc dice que sí)* | ❓ | ❓ |
| 9 | Bonificaciones / incentivos | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| 10 | **Gastos de representación** | ❌ *(confirmado)* | ❌ *(confirmado)* | ⚠️ **régimen especial — ver §5** | ❓ | ❓ | ❓ |
| 11 | Viáticos | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| 12 | Dietas | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| 13 | Vacaciones pagadas | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| 14 | XIII Mes | **7.25%** *(confirmado)* | **0%** *(confirmado)* | ⚠️ *"si supera límites"* — sin regla | n/a | ❓ | ❓ |
| 15 | Prima de producción | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| 16 | Subsidio de incapacidad (parte empleador) | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| 17 | Subsidio de incapacidad (parte CSS) | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |
| 18 | Prima de antigüedad | ❓ | ❓ | ❓ | n/a | n/a | n/a |
| 19 | Indemnización por despido | ❓ | ❓ | ⚠️ ver `liqisr.php` — sin regla | n/a | n/a | n/a |
| 20 | Preaviso pagado | ❓ | ❓ | ❓ | n/a | n/a | n/a |
| 21 | Recargos de construcción (CAPAC) | ❓ | ❓ | ❓ | ❓ | ❓ | ❓ |

> **Acción:** completar las ~110 celdas con ❓. Tipo 🏛️ LEGAL en su mayoría. Es la tarea de mayor rendimiento de todo el proyecto: cada celda mal puesta es un error que se replica en miles de cálculos.

### 1.2 Por qué esto define la arquitectura
Si el motor se construye sobre esta matriz como **dato configurable** en vez de como `if` cableados, ganas gratis: convenios colectivos, regímenes especiales (CAPAC-SUNTRACS de `SCR-039`) y la expansión regional de `DEC-003`. Si se cablea, cada excepción es una rama nueva de código. **Esta decisión hay que tomarla antes de escribir la primera línea del motor.**

---

## 2. Definición del período y prorrateo

Los documentos listan 5 tipos de planilla en `ENT-001` (`Quincenal`, `Bisemanal`, `Quincenal Pago x Hora`, `Mensual 1ra Qna`, `Mensual 2da Qna`) y **no definen ninguno**.

- [ ] 📋 **Corte de la quincena** — ¿del 1 al 15 y del 16 al fin de mes?
- [ ] 📋 **El problema de febrero:** si la 2ª quincena de febrero tiene 13 días y la de enero 16, ¿se paga lo mismo (salario mensual ÷ 2) o se paga por días reales? Ambas prácticas existen y dan resultados distintos. **Esta sola pregunta cambia todos los netos del sistema.**
- [ ] 📋 ¿Qué significan exactamente **"Mensual 1ra Qna"** y **"Mensual 2da Qna"**? ¿Salario mensual pagado íntegro en una de las dos quincenas?
- [ ] 📋 **Bisemanal** — 26 períodos al año de 14 días. ¿Cuál es la fecha ancla del calendario? ¿Cómo se maneja el mes con 3 cortes?
- [ ] 📋 **Quincenal Pago x Hora** — ¿se paga estrictamente por horas marcadas, sin salario base garantizado?
- [ ] 🏛️ **Prorrateo por alta/baja a mitad de período** — ¿por días calendario o por días laborables?
- [ ] 📋 **Cambio de salario a mitad de período** — `save_ajus.php` (`API-007`) registra el cambio con `ajuste_desde`. ¿Se parte el período en dos tramos o se aplica el nuevo salario a todo el período?

---

## 3. Divisores y convenciones de conversión salarial

**Ninguna de estas está definida en los documentos, y todas cambian el resultado en centavos o en dólares.**

`ENT-001` define `salario_hora = salario_mensual / horas_mensuales` con `horas_mensuales` ∈ {208, 192}. Eso resuelve la hora ordinaria. Nada más está resuelto.

- [ ] 📋 **Salario diario** — ¿`mensual / 30`? ¿`mensual / días del mes`? ¿`mensual × 12 / 365`?
- [ ] 📋 **Salario semanal** — necesario para la Prima de Antigüedad (1 semana por año, Art. 224) y para el preaviso. ¿`mensual × 12 / 52`? ¿`mensual / 4.33`? ¿`diario × 7`? Las tres dan números distintos y sobre un pasivo de años la diferencia es material.
- [ ] 📋 **Base de la hora extra** — ¿se calcula sobre el `salario_hora` ordinario, o la base incluye otros conceptos fijos?
- [ ] 🏛️ ¿Por qué 208 vs 192 horas mensuales? ¿Corresponden a jornadas distintas (48h vs 44h semanales)? ¿Quién elige?
- [ ] 🎯 **Política de redondeo** — no aparece en ningún documento:
  - ¿Medio arriba (`HALF_UP`), bancario (`HALF_EVEN`) o truncado?
  - ¿Se redondea **cada concepto** a 2 decimales, o se acumula con precisión completa y solo se redondea el neto?
  - ¿Cuántos decimales internos? (recomendación: `NUMERIC(18,6)` interno, redondeo a 2 solo en presentación y en archivos de salida)
  - **Por qué importa:** los totales patronales que reporta el sistema deben cuadrar exactamente contra lo que calcula la CSS. Un descuadre de centavos por 200 empleados es un rechazo.

---

## 4. Impuesto Sobre la Renta — la lógica más ambigua de todo el material

`04_payroll` §1.1.4 da esta fórmula:

```
Renta Anual Gravable = (Salario Mensual × 13) − $800 (cónyuge) − (Dependientes × $250) − CSS anual
Cuota Quincenal = ISR Anual / 24
```

La **tabla de tramos sí está confirmada** (exento ≤$11,000; 15% de $11,000.01–$50,000; $5,850 + 25% sobre el excedente de $50,000). El problema es todo lo demás:

- [ ] 🏛️ **El `× 13`** — presupone que el XIII Mes está dentro de la base anual. Pero el XIII también se procesa por separado (`WF-002`) y ahí también se dice que está *"sujeto a retención de ISR"*. **¿Se está gravando dos veces?** Hay que definir sin ambigüedad si el XIII entra en la proyección anual o se retiene aparte.
- [ ] 🏛️ **¿El Seguro Educativo se deduce de la base?** La fórmula resta solo CSS. ¿Es correcto que SE no se reste?
- [ ] 🏛️ **Vigencia de las deducciones** — ¿siguen siendo $800 por cónyuge y $250 por dependiente? ¿Hay otras deducciones aplicables a nivel de planilla (intereses hipotecarios, gastos médicos) o solo en la declaración anual?
- [ ] 🏛️ **Qué es el `grupo_renta` A/B/C** de `ENT-001` — se documenta como *"tabla de retención DGI según dependientes"*, pero con `dependientes` y `conyugue_renta` como campos separados, no queda claro qué aporta el grupo. Puede ser un vestigio de un régimen anterior.
- [ ] 🏛️ **Método de proyección vs. acumulado** — la fórmula proyecta un año completo y divide entre 24. Eso falla cuando hay ingreso variable (comisiones, horas extra) o cambio de salario. ¿Se recalcula la proyección cada quincena con lo realmente devengado? ¿O se ajusta al cierre? `plajustesrenta.php` (`SCR-034`) existe justamente para esto y **no está documentado**.
- [ ] 🏛️ **Ingreso variable** — ¿las horas extra y comisiones se anualizan (× 24) para proyectar, o se gravan solo en el período en que ocurren?
- [ ] 🎯 **Oportunidad de diferenciación:** el método acumulativo (recalcular el ISR del año a la fecha en cada corte) da un resultado más exacto y evita el ajuste traumático de fin de año. Es más complejo pero es un argumento de venta real contra el método de proyección simple.

### 4.1 Gastos de representación — ambigüedad literal
`04_payroll` §1.1.5 dice textualmente: *"Gravan ISR de Gastos de Representación: **10% fijo (o escala especial según tramo)**"*. El paréntesis con "o" hace la frase inutilizable.

- [ ] 🏛️ ¿Es una retención plana del 10% o una escala progresiva propia?
- [ ] 🏛️ ¿Tiene tope respecto al salario base? (suele limitarse a un % del salario)
- [ ] 🏛️ ¿Se declara junto al salario o en una casilla separada del Formulario 03?

---

## 5. Incapacidades — sin ninguna regla documentada

`SCR-030` es la única referencia y dice solo: *"Control de días acumulados del fondo de incapacidad (18 días anuales)"*. Eso no alcanza ni para empezar.

- [ ] 🏛️ **¿Quién paga qué?** — típicamente el empleador cubre los primeros días y la CSS el resto. ¿Cuántos días? ¿A qué porcentaje del salario cada parte?
- [ ] 🏛️ **¿Qué son exactamente los "18 días anuales"?** ¿Es el tope de días con cargo al empleador?
- [ ] 🏛️ **¿Los días de incapacidad cotizan CSS y SE?** ¿Sobre el salario completo o sobre el subsidio?
- [ ] 🏛️ **¿La incapacidad computa para el XIII Mes?** ¿Y para la antigüedad? ¿Y para el promedio de vacaciones?
- [ ] 🏛️ **Regímenes distintos** — enfermedad común, riesgo profesional (accidente laboral) y maternidad tienen tratamientos diferentes. Hay que especificar los tres.
- [ ] 🏛️ **Licencia de maternidad** — duración, quién paga, cómo se refleja en planilla. No se menciona en ningún documento.
- [ ] 🏛️ ¿Hay otras licencias con goce de sueldo (duelo, matrimonio, paternidad)? `confdiaslibres.php` menciona "días de duelo nacional" pero no licencias personales.

---

## 6. Vacaciones — mecánica incompleta

Confirmado en documentos: 30 días por cada 11 meses; promedio de los últimos 11 meses. Falta todo lo operativo:

- [ ] 🏛️ **Tasa de acumulación** — ¿1 día por cada 11 días trabajados (como dice `04_payroll` §3.1 para las proporcionales), o 30 días por cada 11 meses? Son formulaciones distintas de lo mismo pero redondean diferente.
- [ ] 🏛️ **Promedio de 11 meses: ¿promedio de qué?** ¿Todos los conceptos devengados? ¿Solo ordinario + horas extra? Esto conecta con la columna "promedio de vacaciones" de la matriz de §1.
- [ ] 📋 **¿Se pagan por adelantado** antes de que el colaborador salga, o en la quincena normal?
- [ ] 🏛️ **¿Qué retenciones aplican** sobre el pago de vacaciones? (CSS, SE, ISR — ¿los tres?)
- [ ] 🏛️ **¿Se pueden fraccionar?** ¿Mínimo de días por bloque?
- [ ] 🏛️ **¿Se pueden compensar en dinero** sin gozarlas? ¿Con qué límite?
- [ ] 📋 **Traslape con la quincena** — si las vacaciones cubren parte de un período de pago, ¿cómo se compone el talonario?
- [ ] 🏛️ **¿Hay tope de acumulación?** El Factor WOW menciona alertar sobre *"más de 30 días no gozados"*, lo que sugiere que sí.
- [ ] ⚠️ **`WF-003` nunca se escribió** — existen `WF-001`, `WF-002` y `WF-004`; el hueco de numeración corresponde justamente a Vacaciones.

---

## 7. XIII Mes — casi completo, faltan piezas

Confirmado: 3 partidas con períodos exactos, divisor /12, CSS obrero 7.25%, SE 0%.

- [ ] 🏛️ **Cuota patronal sobre el XIII** — el documento da la obrera (7.25%) y omite la patronal.
- [ ] 🏛️ **Regla de ISR sobre el XIII** — el documento dice solo *"sujeto a retención si supera los límites gravables"*. ¿Qué límites? ¿Se suma a la proyección anual o se grava de forma independiente? (conecta con §4)
- [ ] 📋 **El parámetro `decimo_salario_base`** — `ENT-003` lo describe como *"si el XIII mes usa únicamente salario base o incluye variables"*. Hay que especificar **ambos modos**, no solo uno.
- [ ] 🏛️ **Colaborador con período incompleto** — ingresó o salió a mitad de partida: ¿prorrateo por días trabajados o por salarios efectivamente devengados?
- [ ] 📋 **`aplica_dic` en descuentos** — `ENT-005` tiene este flag, lo que implica que en la partida de diciembre los descuentos se comportan distinto. ¿Cuál es la regla?
- [ ] 🏛️ ¿Los días de incapacidad y vacaciones suman a la base del XIII?

---

## 8. Horas extra, recargos y jornada

### 8.1 Contradicción a resolver
| Fuente | Jornada mixta |
|---|---|
| `02_application_map.md` `SCR-029` y `01_application_overview.md` | **75%** |
| `04_payroll_and_liquidation_workflows.md` | **75%** |
| `nomix/01_propuesta_mejora_planifacil.md` §3.2.C | **"+50% o +75%"** ← indeciso |

- [ ] 🏛️ Resolver el recargo de jornada mixta contra el Código de Trabajo.

### 8.2 Reglas faltantes
- [ ] 🏛️ **Rangos horarios** que definen jornada diurna, mixta y nocturna. Sin esto no se puede clasificar una hora extra. **Bloqueante.**
- [ ] 🏛️ **Recargo de domingo** — `ENT-001` tiene el campo `omitir_rec_domingo`, lo que confirma que existe un recargo dominical. **Su valor nunca se menciona en ningún documento.**
- [ ] 🏛️ **¿Día de descanso semanal y día feriado tienen el mismo 150%?** Se agrupan en los documentos pero legalmente pueden diferir.
- [ ] 🏛️ **Acumulación de recargos** — `nomix/01` línea 139 propone *"Horas Excedentes en Día de Fiesta (+150% + 50%)"* sin citar base legal. ¿Se suman los porcentajes, se multiplican los factores, o aplica solo el mayor?
- [ ] 🏛️ **Límite legal de horas extra** — ¿máximo diario, semanal y anual? ¿Qué hace el sistema al excederlo: bloquea, advierte o solo registra? (🎯 decisión de producto sobre la reacción)
- [ ] 📋 **`tiempo_min_hrx`** — `ENT-003` define un umbral mínimo en minutos para computar hora extra. Falta la regla de redondeo de la fracción: ¿se redondea a la fracción más cercana? ¿Se trunca? ¿A qué granularidad (15 min, 30 min)?
- [ ] 📋 **`tolerancia`** — existe el parámetro en minutos, pero no hay ninguna regla de qué pasa con la tardanza: ¿se descuenta el tiempo exacto? ¿Se descuenta redondeado? ¿Hay sanción escalonada?
- [ ] 🏛️ **Ausencia injustificada** — ¿descuenta solo el día, o también afecta proporcionalmente el día de descanso semanal remunerado?

---

## 9. Descuentos de terceros — falta lo que protege legalmente al colaborador

`ENT-005` define bien la **estructura** del descuento (acreedor, monto, cuota, frecuencia, fechas, estatus). No define nada del **comportamiento**.

- [ ] 🏛️ **Porción inembargable del salario** — Panamá protege un mínimo del salario frente a embargos. **No se menciona en ningún documento.** Sin esta regla el sistema puede dejar un neto en cero, lo cual es ilegal y es exactamente el tipo de error que genera demandas. **Bloqueante.**
- [ ] 🏛️ **Orden de prelación** cuando el neto no alcanza para todos los descuentos. ¿Pensión alimenticia primero, luego embargo judicial, luego préstamos comerciales? El orden es jurídicamente relevante.
- [ ] 🎯 **Qué pasa con el saldo no descontado** — ¿se arrastra al siguiente período, se pierde, o se marca para gestión manual?
- [ ] 🏛️ **Pensión alimenticia** — ¿tiene tope propio, distinto del embargo ordinario?
- [ ] 📋 **`frecuencia_descto`** tiene 3 valores (`Quincenal`, `Sólo Primera`, `Sólo Última`). Si la cuota es mensual y la frecuencia quincenal, ¿se parte en dos? ¿Se cobra completa en cada quincena?
- [ ] 📋 **Cierre automático** — cuando `monto_total` se salda, ¿el descuento se cancela solo? ¿Qué pasa si la última cuota es menor que `letra_mensual`?

---

## 10. Cargas patronales y provisiones

Confirmado: CSS patronal **13.25%** 🔴 (no 12.25% — Ley 462 de 2025), SE patronal 1.50%.

- [ ] 🏛️ **Tasa de Riesgos Profesionales** — `rp_por` es un campo configurable por empresa (`API-002`), pero no hay rango, tabla ni criterio de asignación. ¿Lo asigna la CSS según actividad económica?
- [ ] 🏛️ **¿Existe tope de cotización de CSS?** Los documentos no lo mencionan en absoluto. Si existe un salario máximo cotizable, es una regla estructural del motor.
- [ ] 🏛️ **Fondo de Cesantía 1.92%** (`SCR-084`, Ley 44 de 1995) — se nombra sin desglose. ¿Sobre qué base? ¿Es la suma de la provisión de prima de antigüedad más la de indemnización? ¿Aplica a todos los contratos o solo a indefinidos? ¿Es un depósito en fideicomiso con periodicidad propia?
- [ ] 📋 **Provisiones de `SCR-085`** — se dan los porcentajes (Vacaciones 9.09%, XIII 8.33%) pero no la **base** sobre la que se aplican ni la periodicidad del asiento contable.
- [ ] 🏛️ **Cuota de extranjeros** — Panamá limita el porcentaje de trabajadores extranjeros en planilla. ¿El sistema debe validarlo o alertarlo? (🎯 decisión de producto, pero conecta con MITRADEL)

---

## 11. Validaciones que un buen motor debe tener y no están en los documentos

Estas no las tiene PlaniFácil según lo documentado — son **oportunidad de diferenciación directa**:

- [ ] 🏛️ **Salario mínimo** — no se menciona en ninguno de los 10 documentos. Panamá tiene salario mínimo diferenciado por región, sector y tamaño de empresa. Un motor serio valida contra él. **Hace falta la tabla vigente.**
- [ ] 🏛️ **Jornada máxima** — límites diarios y semanales para validar la carga de horas.
- [ ] 🏛️ **Trabajadores menores de edad** — restricciones de jornada y de tipo de trabajo.
- [ ] 🏛️ **Servicios profesionales** (`SCR-027`) — se documenta la retención de 10% de ISR. Falta: ¿cotizan CSS? ¿Generan XIII y vacaciones? ¿Cuándo un "servicio profesional" es legalmente una relación laboral encubierta? (una alerta aquí sería un Factor WOW real)
- [ ] 🏛️ **Régimen CAPAC-SUNTRACS** (`SCR-039`) — recargos de altura, agua y turnos especiales de construcción. Cero reglas documentadas. 🎯 ¿Entra en el MVP?

---

## 12. Lo que sí está listo para codificar hoy

Para que quede claro que no todo está bloqueado — esto se puede implementar y testear ya:

| Componente | Estado |
|---|---|
| CSS obrero 9.75% / patronal **13.25%** | ✅ Tasas verificadas — ver base legal §1 |
| SE obrero 1.25% / patronal 1.50% | ✅ Tasas confirmadas |
| Tabla de tramos ISR (0% / 15% / 25%) | ✅ Confirmada — falta solo definir la base |
| Deducciones ISR ($800 cónyuge, $250 dependiente) | ✅ Confirmadas — verificar vigencia |
| Períodos de las 3 partidas del XIII Mes | ✅ Fechas exactas confirmadas |
| Divisor /12 del XIII y CSS 7.25% / SE 0% | ✅ Confirmados |
| Estructura de descuentos (`ENT-005`) | ✅ Campos definidos — falta el comportamiento |
| Parámetros de empresa (`ENT-003`) | ✅ 8 parámetros definidos |
| Validador de cédula panameña y DV de RUC | ✅ Algoritmo público, independiente de los documentos |
| Las 12 causales de terminación y su artículo | ✅ Mapeadas — faltan las escalas de monto |

**Estrategia recomendada:** implementar el motor con todas las tasas, tramos, divisores, umbrales y reglas de redondeo como **configuración versionada por fecha de vigencia**, nunca como constantes en el código. Así cada respuesta que llegue de las secciones anteriores es un registro de configuración nuevo, no una refactorización. Y como efecto secundario obtienes recálculo histórico correcto — que es exactamente lo que exige el Factor WOW #1.

---

## 13. La vía rápida: qué pedir para cerrar la mayoría de esto

| # | Qué conseguir | Cierra | Esfuerzo |
|---|---|---|---|
| 1 | **Un talonario real** (comprobante de pago de un colaborador, anonimizado) | Casi todos los ítems 📋: divisores, redondeo, corte de período, qué conceptos aparecen y cómo se agrupan | 5 minutos |
| 2 | **Una planilla completa de una quincena real** con sus totales patronales | Verificación cruzada del motor completo — es tu suite de tests de aceptación | 10 minutos |
| 3 | **Sesión de 1 hora con un operador de nómina** (Marisol Barria o equivalente) | Todos los ítems 📋 restantes + el orden real de trabajo | 1 hora |
| 4 | **Consulta con asesor laboral / contador panameño** | Los ítems 🏛️: matriz de incidencia, incapacidades, inembargabilidad, escalas de liquidación | 2-3 horas |
| 5 | **Texto vigente del Código de Trabajo + reglamentos CSS/DGI** | Fuente de verdad para todo lo 🏛️ y para el Copiloto IA del Factor WOW #2 | Descarga |

> Los ítems 1 y 2 son extraordinariamente baratos y resuelven de golpe la mayor parte de las convenciones que ningún documento captura. **Empezaría por ahí.**

---

## 14. Resumen ejecutivo

**Lo que falta en la lógica de planilla, en orden de impacto:**

1. **La matriz de incidencia de conceptos** (§1) — es el 60% del hueco. Sin ella no hay motor.
2. **Convenciones de divisores y redondeo** (§3) — invisibles hasta que los números no cuadran contra la CSS.
3. **Definición de períodos y prorrateo** (§2) — afecta todos los netos del sistema.
4. **Lógica completa del ISR** (§4) — el material actual es ambiguo y posiblemente grava el XIII dos veces.
5. **Reglas de incapacidades** (§5) — hoy hay una sola línea de texto para un módulo entero.
6. **Inembargabilidad y prelación de descuentos** (§9) — riesgo legal directo si se omite.
7. **Rangos horarios de jornada y recargo dominical** (§8) — bloquean la clasificación de horas extra.

**La buena noticia:** casi nada de esto se resuelve investigando PlaniFácil. Son hechos de la ley panameña (🏛️) o convenciones que un talonario real revela en cinco minutos (📋). Como el objetivo es *superar* a PlaniFácil, resolverlos contra la ley —y no contra lo que hace el competidor— es precisamente lo que produce un producto mejor.
