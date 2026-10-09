# Catálogo de Reglas Legales de Nómina: Nomix

**Documento:** `04_catalogo_reglas_legales.md`  
**Proyecto:** **Nomix - Nómina inteligente**  
**Estado:** `EN VALIDACIÓN` — ninguna regla está `VALIDADA` todavía  
**Jurisdicción:** República de Panamá  
**Última revisión de fuentes:** 2026-10-07

---

## 0. Cómo usar este catálogo

Este documento es la **fuente de verdad legal** del motor de nómina. Ver la sección 4 de [00_decisiones_stack_nomix.md](00_decisiones_stack_nomix.md) para el porqué.

### 0.1 Estados de verificación

| Estado | Significado | ¿Se puede programar? | ¿Se puede usar en producción? |
|---|---|---|---|
| `CONFIRMADO_SECUNDARIO` | Coincide en dos o más fuentes secundarias (prensa, firmas legales, guías). Falta contrastar con el texto oficial. | Sí | No, hasta pasar a `VALIDADO` |
| `PARCIAL` | Parte de la regla está confirmada; algún detalle (base de cálculo, excepciones) no. | Sí, con el detalle como parámetro | No |
| `PENDIENTE` | Dato incierto, contradictorio o sin fuente. Puede venir solo de PlaniFácil (`OBSERVED`). | Solo como parámetro configurable, nunca como constante | No |
| `VALIDADO` | Revisado por un profesional idóneo (abogado laboral o contador) contra el texto oficial. | Sí | Sí |

> **Puerta de salida a producción:** todas las reglas usadas por el MVP deben estar en `VALIDADO`. Ver ticket `NMX-090` en [07_alcance_mvp_y_backlog.md](07_alcance_mvp_y_backlog.md).

### 0.2 Reglas de implementación (obligatorias)

1. Cada regla vive en código con su ID (`RULE-xxx`) en un comentario o atributo, y el cálculo devuelve una **traza** (regla, fórmula, entradas, resultado) para el *Inspection Drawer*.
2. Tasas, topes y tramos se guardan en la tabla `parametros_legales` con `vigente_desde` / `vigente_hasta`. **Nunca como constantes.**
3. Todo cálculo monetario usa decimales exactos (`brick/math`). Nunca `float`.
4. Cada regla tiene pruebas con los casos de la sección final de cada regla. Las pruebas las escribe el agente que **no** implementó la regla.
5. Si una regla cambia de estado o de valor, se actualiza este documento en el mismo PR.

### 0.3 Advertencia sobre la ingeniería inversa

Los documentos `docs/01`–`07` reflejan lo que hacía PlaniFácil (`OBSERVED`). **Al menos un valor ya está desactualizado**: la cuota patronal de la CSS era 12.25% y desde abril de 2025 es 13.25% (RULE-002). No usar esos documentos como fuente de tasas.

---

## 1. Seguridad Social (CSS)

### RULE-001 — Cuota obrera CSS sobre salario
- **Valor:** 9.75% del salario bruto gravable. Sin tope de cotización.
- **Fuente:** Ley Orgánica de la CSS (Ley 51 de 2005), reformada por la Ley 462 de 18 de marzo de 2025 (no modificó la cuota obrera).
- **Estado:** `CONFIRMADO_SECUNDARIO`
- **Pendiente de confirmar:** qué conceptos forman la base gravable (horas extra, comisiones, bonificaciones, gastos de representación, vacaciones).
- **Casos de prueba:**
  - Bruto quincenal 500.00 → 48.75
  - Bruto quincenal 1,234.56 → 120.37 (120.3696, redondeo según RULE-080)

### RULE-002 — Cuota patronal CSS sobre salario
- **Valores por vigencia** (según el *mes de cuota*):

| Vigente desde | Vigente hasta | Tasa |
|---|---|---|
| (histórico) | 2025-03-31 | 12.25% |
| 2025-04-01 | 2027-02-28 | **13.25%** |
| 2027-03-01 | 2029-02-28 | 14.25% |
| 2029-03-01 | — | 15.25% |

- **Fuente:** Ley 462 de 18 de marzo de 2025 (aumento escalonado de 3 puntos).
- **Estado:** `CONFIRMADO_SECUNDARIO`
- **Casos de prueba:**
  - Bruto 500.00, cuota de octubre 2026 → 66.25
  - Bruto 500.00, cuota de marzo 2027 → 71.25
  - Bruto 500.00, cuota de marzo 2025 → 61.25 (recálculo histórico)

### RULE-003 — Cuota obrera CSS sobre XIII mes
- **Valor:** 7.25%
- **Estado:** `PARCIAL` (una fuente secundaria más PlaniFácil). Confirmar vigencia tras la Ley 462.
- **Caso de prueba:** XIII mes 500.00 → 36.25

### RULE-004 — Cuota patronal CSS sobre XIII mes
- **Valor:** 10.75%
- **Estado:** `PENDIENTE`. Confirmar si la Ley 462 la modificó.
- **Caso de prueba:** XIII mes 500.00 → 53.75 (si se confirma 10.75%)

### RULE-005 — Seguro Educativo obrero
- **Valor:** 1.25% del salario bruto. **No se aplica al XIII mes.**
- **Estado:** `CONFIRMADO_SECUNDARIO`
- **Casos de prueba:** bruto 500.00 → 6.25; XIII mes 500.00 → 0.00

### RULE-006 — Seguro Educativo patronal
- **Valor:** 1.50% del salario bruto.
- **Estado:** `CONFIRMADO_SECUNDARIO`
- **Caso de prueba:** bruto 500.00 → 7.50

### RULE-007 — Riesgos Profesionales (patronal)
- **Valor:** tasa propia de cada empresa, asignada por la CSS según su actividad económica. Las fuentes secundarias reportan un rango aproximado de 0.98% a 5.67%. No hay aporte del trabajador.
- **Implementación:** parámetro por empresa (`empresas.tasa_riesgo_profesional`), con historial de vigencia.
- **Estado:** `PARCIAL`. Pendiente: base de cálculo y si aplica sobre el XIII mes.
- **Caso de prueba:** bruto 500.00, tasa 2.10% → 10.50

---

## 2. Impuesto sobre la Renta (ISR)

### RULE-010 — Tarifa anual de ISR para personas naturales
| Renta gravable anual | Impuesto |
|---|---|
| Hasta 11,000.00 | 0% |
| De 11,000.01 a 50,000.00 | 15% sobre el excedente de 11,000.00 |
| Más de 50,000.00 | 5,850.00 + 25% sobre el excedente de 50,000.00 |

- **Fuente:** Código Fiscal, Art. 700 (tarifa publicada por la DGI).
- **Estado:** `CONFIRMADO_SECUNDARIO`
- **Casos de prueba (impuesto anual):**
  - 10,000.00 → 0.00
  - 11,000.00 → 0.00
  - 30,000.00 → 2,850.00
  - 50,000.00 → 5,850.00
  - 60,000.00 → 8,350.00

### RULE-011 — Método de retención de ISR en planilla
- **Lo que se sabe:** la práctica común proyecta la renta anual como salario mensual × 13 (12 meses más el XIII mes), aplica RULE-010 y reparte el impuesto entre los pagos del año.
- **Lo que NO está confirmado (las fuentes se contradicen):**
  1. Si el impuesto anual se divide entre 12 meses o entre el número de pagos del periodo (24 quincenas, 26 bisemanas).
  2. Qué deducciones aplican hoy en la retención: deducción básica por declaración conjunta (PlaniFácil usaba 800.00), dependientes (PlaniFácil usaba 250.00), y si la CSS y el SE se restan de la base.
  3. Cómo se retiene el ISR sobre el XIII mes y sobre ingresos variables (horas extra, bonos).
  4. Cómo se ajusta la retención cuando el salario cambia a mitad de año.
- **Implementación:** estrategia intercambiable (`IsrWithholdingStrategy`) con estos puntos como parámetros.
- **Estado:** `PENDIENTE`. **Prioridad máxima de validación con el contador.**

### RULE-012 — ISR sobre gastos de representación
| Gastos de representación anuales | Impuesto |
|---|---|
| Hasta 25,000.00 | 10% |
| Más de 25,000.00 | 2,500.00 + 15% sobre el excedente |

- **Fuente:** Código Fiscal, Art. 700 (vigente desde julio de 2010, Ley 8 de 2010).
- **Estado:** `CONFIRMADO_SECUNDARIO` para la tarifa. `PENDIENTE` si cotizan CSS y SE (PlaniFácil asumía que no).
- **Casos de prueba (anual):** 20,000.00 → 2,000.00; 30,000.00 → 3,250.00

---

## 3. Jornada, Sobretiempo y Recargos

### RULE-020 — Recargos por horas extra
| Situación | Recargo sobre el salario por hora |
|---|---|
| Hora extra en período diurno | +25% |
| Hora extra en período nocturno, o extensión de jornada mixta iniciada en período diurno | +50% |
| Extensión de jornada nocturna, o de jornada mixta iniciada en período nocturno | +75% |

- **Límites:** máximo 3 horas extra diarias y 9 semanales (generar alerta, no bloquear el cálculo).
- **Fuente:** Código de Trabajo, Art. 33.
- **Estado:** `CONFIRMADO_SECUNDARIO`
- **Casos de prueba:** salario por hora 5.00 → 2 h diurnas = 12.50; 2 h nocturnas = 15.00; 2 h al +75% = 17.50

### RULE-021 — Recargos por domingo, día de descanso y días de fiesta o duelo nacional
- **Valores observados en PlaniFácil:** domingo / descanso semanal +50%; día de fiesta o duelo nacional +150%; horas extra en día de fiesta con recargos acumulados.
- **Implementación:** parámetros configurables y calendario de feriados nacionales por año (tabla `feriados`).
- **Estado:** `PENDIENTE` (sin fuente confirmada)

### RULE-022 — Conversión de salario mensual a salario por hora
- **Observado en PlaniFácil:** salario mensual / horas mensuales (208 para jornada de 48 h semanales).
- **Estado:** `PENDIENTE`. Confirmar la fórmula legal (p. ej. salario mensual × 12 / 52 / horas semanales) y su tratamiento para jornadas de 44 h u otras.

---

## 4. Décimo Tercer Mes

### RULE-030 — XIII mes
- **Partidas:**

| Partida | Período | Pago |
|---|---|---|
| 1 | 16 de diciembre al 15 de abril | 15 de abril |
| 2 | 16 de abril al 15 de agosto | 15 de agosto |
| 3 | 16 de agosto al 15 de diciembre | 15 de diciembre |

- **Cálculo:** total de salarios devengados en la partida ÷ 12.
- **Fuente:** Decreto de Gabinete 221 de 1971 y sus reformas.
- **Estado:** `PARCIAL`. Pendiente: qué conceptos entran en la base (horas extra, comisiones, bonos, vacaciones) y el tratamiento de ausencias e incapacidades.
- **Deducciones:** RULE-003, RULE-004 y ISR (RULE-011). No aplica Seguro Educativo (RULE-005).
- **Caso de prueba:** devengado en la partida 6,000.00 → 500.00

---

## 5. Vacaciones

### RULE-040 — Vacaciones
- **Derecho:** 30 días por cada 11 meses continuos de trabajo, a razón de 1 día por cada 11 días de servicio.
- **Fuente:** Código de Trabajo, Art. 54.
- **Estado:** `CONFIRMADO_SECUNDARIO` para la acumulación. `PENDIENTE` para la base de pago (salario actual o promedio del período) y sus deducciones.
- **Casos de prueba (acumulación):** 110 días trabajados → 10 días; 330 días → 30 días

---

## 6. Terminación de la Relación Laboral

> Esta sección requiere **revisión de un abogado laboral** antes de programar los escenarios de liquidación completos.

### RULE-050 — Prima de antigüedad
- **Valor:** 1 semana de salario por cada año de servicio continuo, con la parte proporcional por fracción de año.
- **Aplica:** contratos por tiempo indefinido, sin importar la causa de terminación (incluida la renuncia).
- **Fuente:** Código de Trabajo, Art. 224.
- **Estado:** `PARCIAL`. Pendiente: salario base (último salario o promedio, y de qué período).
- **Caso de prueba:** 5 años y 6 meses, salario semanal 300.00 → 1,650.00

### RULE-051 — Indemnización por despido injustificado (contrato indefinido)
- **Escala vigente:** 3.4 semanas de salario por cada año durante los primeros 10 años, y 1 semana por cada año adicional, con la parte proporcional por fracción.
- **Fuente:** Código de Trabajo, Art. 225, modificado por la Ley 44 de 1995.
- **Estado:** `PARCIAL`. Pendiente: escalas especiales según la fecha de inicio de la relación laboral, salario base, y si existe un mínimo.
- **Caso de prueba:** 12 años, salario semanal 300.00 → (3.4 × 10 + 1 × 2) × 300 = 10,800.00

### RULE-052 — Preaviso
- **Observado en PlaniFácil:** despido sin preaviso → el empleador paga 30 días de salario. Renuncia sin el preaviso de 15 días → se descuenta 1 semana de salario.
- **Estado:** `PENDIENTE` (confirmar artículos y montos).

### RULE-053 — Matriz de causales de terminación
- **Causales a modelar:** renuncia, renuncia sin preaviso, mutuo acuerdo, despido justificado, despido injustificado, vencimiento de contrato definido, terminación anticipada de contrato definido, período probatorio.
- **Para cada causal:** qué rubros aplican (salario pendiente, vacaciones proporcionales, XIII proporcional, prima de antigüedad, indemnización, preaviso, salarios caídos).
- **Estado:** `PENDIENTE`. La matriz de `docs/04_payroll_and_liquidation_workflows.md` es solo una referencia `OBSERVED`.

### RULE-054 — Deducciones sobre los rubros de liquidación
- **Pregunta:** qué rubros cotizan CSS y SE, y cuáles están sujetos a ISR.
- **Estado:** `PENDIENTE`

---

## 7. Salario Mínimo

### RULE-060 — Validación de salario mínimo
- **Norma vigente:** Decreto Ejecutivo N.° 13 de 31 de diciembre de 2025 (Gaceta Oficial 30438). Rige desde el 16 de enero de 2026 para el período 2026–2027. Tiene 59 tasas para 74 actividades económicas y divide el país en dos regiones.
- **Implementación:** tabla `salarios_minimos` (actividad, región, tasa, vigencia). Advertir si un salario queda por debajo del mínimo; no bloquear el cálculo.
- **Estado:** `PARCIAL`. Falta cargar la tabla oficial de tasas.

---

## 8. Descuentos a Terceros

### RULE-070 — Límites y prioridad de descuentos
- **Preguntas:** porcentaje máximo del salario que se puede descontar, orden de prioridad (pensión alimenticia, embargos judiciales, préstamos) y qué ocurre si el neto no alcanza.
- **Estado:** `PENDIENTE`

---

## 9. Redondeo y Precisión

### RULE-080 — Política de redondeo
- **Propuesta:** cálculos intermedios con al menos 6 decimales y redondeo a 2 decimales con `HALF_UP` al final de cada concepto (cada deducción y cada ingreso por separado). El neto es la suma de conceptos ya redondeados.
- **Estado:** `PENDIENTE`. Confirmar con el contador y con el formato que exige el SIPE.

---

## 10. Protección de Datos

### RULE-090 — Ley 81 de 2019
- **Aplicación al producto:** cifrado de datos personales sensibles, control de acceso por rol, registro de auditoría, consentimiento y derechos ARCO de los colaboradores.
- **Estado:** `PENDIENTE` de revisión legal. El diseño técnico está en [03_arquitectura_docker_seguridad_nomix.md](03_arquitectura_docker_seguridad_nomix.md).

---

## 11. Resumen y Preguntas para el Profesional

| Prioridad | Regla | Pregunta |
|---|---|---|
| 1 | RULE-011 | Método exacto de retención de ISR en planilla, deducciones vigentes y tratamiento del XIII mes. |
| 2 | RULE-001 | Conceptos que forman la base gravable de CSS y SE. |
| 3 | RULE-004 / RULE-003 | Tasas vigentes de CSS sobre el XIII mes tras la Ley 462. |
| 4 | RULE-053 / RULE-054 | Matriz de causales y deducciones sobre liquidaciones. |
| 5 | RULE-021 / RULE-022 | Recargos de domingo y feriados; fórmula de salario por hora. |
| 6 | RULE-070 | Límites y prioridad de descuentos. |
| 7 | RULE-080 | Política de redondeo. |

---

## Fuentes consultadas (secundarias)

- [TVN: Cuota patronal, primer aumento escalonado desde el 1 de abril](https://www.tvn-2.com/nacionales/reformas-a-la-css-aumento-escalonado-cuota-patronal-caja-de-seguro-social_1_2182102.html)
- [La Estrella de Panamá: CSS anuncia aumento de cuota a empleadores](https://www.laestrella.com.pa/panama/caja-de-seguro-social-anuncia-aumento-de-cuota-a-empleadores-a-partir-de-abril-GK11288428)
- [Prensa CSS: Aumento de la cuota de los empleadores desde abril de 2025](https://prensa.css.gob.pa/2025/03/21/aumento-en-el-pago-de-la-cuota-de-los-empleadores-se-pagara-a-partir-de-abril-de-2025/)
- [Fábrega Molino: Aspectos relevantes de la Ley 462 (2025)](https://fmm.com.pa/es/reforma-a-la-ley-de-la-caja-de-seguro-social-aspectos-relevantes-de-la-ley-n-o-462-2025/)
- [BDO Panamá: Texto de la Ley 462 de 18 de marzo de 2025](https://www.bdo.com.pa/getattachment/88ab8c33-0f4f-424c-8d19-09ebb8aaaea6/Ley-N%C2%B0-462-del-18-de-marzo-de-2025-(CSS)-(3).pdf?lang=es-PA)
- [DGI: Tarifa de personas naturales](https://dgi.mef.gob.pa/DInforme/Tarifa)
- [DGI: Renta de asalariados](https://dgi.mef.gob.pa/DInforme/pdf/RENTA%20-%20ASALARIADOS.pdf)
- [BDO Panamá: Deducciones de ISR por pagos de planilla](https://www.bdo.com.pa/getattachment/0075cacb-c358-49c1-a7c1-740cba842d7a/Deducciones-de-Impuesto-sobre-la-Renta-por-Pagos-de-Planilla-en-Panama.pdf?lang=es-PA)
- [Ley 8 de 2010 (Órgano Judicial)](https://www.organojudicial.gob.pa/uploads/wp_repo/blogs.dir/cendoj/novedades_normativas/ley_8_2010.pdf)
- [NóminaHQ: Gastos de representación, 10% y 15% de ISR](https://nominahq.cloud/guias/gastos-de-representacion)
- [Código de Trabajo (Órgano Judicial)](https://www.organojudicial.gob.pa/uploads/wp_repo/uploads/2016/11/código-detrabajo.pdf)
- [Ley 44 de 1995](https://www.defensoria.gob.pa/wp-content/uploads/Ley-No.-44-de1995-12-agosto.pdf)
- [MITRADEL: Boletín de prestaciones laborales](https://mitradel.gob.pa/wp-content/uploads/2019/12/BOLETIN-DE-PRESTACIONES-LABORALES.docx)
- [Jibble: Horas extra en Panamá](https://www.jibble.io/es/legislacion-laboral/panama/horas-extras)
- [FiniquitoJusto: Base legal de liquidaciones](https://finiquitojusto.com/?p=2507)
- [EY: Salario mínimo 2026 en Panamá](https://www.ey.com/es_ce/technical/tax/tax-alerts/panama-salario-minimo-2026)
- [Softland: Salario mínimo en Panamá 2026](https://softland.com/pa/salario-minimo-en-panama-2026/)
- [Rivermate: Calculadora de costo de empleado en Panamá](https://rivermate.com/es/guias/panama/calculadora-costo-empleado)

> Las páginas oficiales (CSS, DGI, Gaceta Oficial) no se pudieron abrir desde el entorno de trabajo; los datos se tomaron de resúmenes de búsqueda. Por eso ninguna regla está en `VALIDADO`.
