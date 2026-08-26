# Consultas para Profesional de Planilla — Panamá

**Proyecto:** Nomix — Sistema de nómina para la República de Panamá
**Fecha:** 26 de agosto de 2026
**Documento:** `07_consultas_profesional_planilla.md`

---

## Para quien responde

Estamos desarrollando un sistema de nómina para Panamá. Ya hicimos la investigación normativa y tenemos resuelta la mayor parte (tasas de CSS y Seguro Educativo, tramos de ISR, recargos de jornada, escalas de indemnización del Art. 225, prima de antigüedad, Fondo de Cesantía, inembargabilidad).

Lo que sigue son **las preguntas que no pudimos resolver con confianza a partir de fuentes públicas**, o donde encontramos **fuentes contradictorias**. Cada pregunta indica por qué importa para el sistema.

**Cómo responder:** basta con escribir la respuesta debajo de cada pregunta. Si alguna no es de su área, márquela y seguimos con otro especialista. Si una respuesta es "depende", díganos **de qué depende** — eso normalmente significa que necesitamos un campo configurable.

**Perfil sugerido para cada bloque:**

| Bloque | Perfil |
|---|---|
| A. Retenciones y tributación | Contador Público Autorizado (CPA) |
| B. Prestaciones | CPA / Operador de nómina |
| C. Incapacidades y licencias | Operador de nómina / especialista CSS |
| D. Terminación laboral | Abogado laboralista |
| E. Descuentos de terceros | Abogado laboralista |
| F. Convenciones operativas | **Operador de nómina con experiencia** ← el más importante |
| G. Regímenes especiales | Según aplique |

> El **Bloque F** es el que más nos urge y el que ningún texto legal responde: son las convenciones que usa la industria en Panamá en la práctica diaria.

---

# BLOQUE A — Retenciones y Tributación

### A1. Método de retención de ISR en planilla 🔴 CRÍTICA

El instructivo de la DGI describe la **declaración anual**, pero no encontramos una norma que prescriba **cómo debe retener el empleador quincena a quincena**.

**a)** ¿Existe un método de retención obligatorio, o el empleador puede elegir?

**b)** El método tradicional proyecta la renta anual y divide entre 24 quincenas. ¿Es correcto? ¿Es el que exige la DGI?

**c)** ¿Es admisible el **método acumulativo** (recalcular el impuesto del año a la fecha en cada corte y restar lo ya retenido)? Nos interesa porque absorbe automáticamente comisiones, horas extra y cambios de salario.

**Respuesta:**

---

### A2. El Décimo Tercer Mes dentro de la base anual de ISR 🔴 CRÍTICA

La fórmula tradicional estima la renta anual como `Salario Mensual × 13`. Ese `13` parece incluir el Décimo. Pero el Décimo **también se grava con ISR al momento de pagarse**.

**a)** ¿Se está gravando dos veces? ¿O el `× 13` es precisamente el mecanismo para no gravarlo aparte?

**b)** ¿Cuál es el tratamiento correcto: incluir el XIII en la proyección anual, o retenerlo de forma independiente en cada partida?

**Respuesta:**

---

### A3. Deducción por dependientes 🔴 CRÍTICA

El instructivo oficial de la DGI (*Renta Natural — Asalariado Puro*) enumera las deducciones personales y **no incluye ninguna deducción por hijos o dependientes**. Sin embargo, el software de nómina que analizamos tiene un campo `dependientes` que aplicaría **B/. 250 anuales por dependiente**.

**a)** ¿Existe actualmente una deducción de ISR por dependiente? ¿De cuánto?

**b)** Si no existe, ¿existió antes? ¿Hasta qué año?

**c)** ¿Para qué se usa entonces el campo "dependientes" en los sistemas de nómina panameños?

**Respuesta:**

---

### A4. La deducción básica de B/. 800

Entendemos que los B/. 800 son la **deducción básica de los cónyuges cuando presentan declaración conjunta** (Art. 709 num. 2 del Código Fiscal).

**a)** ¿Es correcto?

**b)** ¿Puede el empleador aplicarla en la **retención quincenal**, o es exclusiva de la declaración anual?

**c)** Si se aplica en planilla, ¿qué debe acreditar el trabajador?

**Respuesta:**

---

### A5. Base gravable del ISR

**a)** Para calcular la base del ISR, ¿se deduce la cuota de CSS del trabajador (9.75%)?

**b)** ¿Se deduce también el Seguro Educativo (1.25%)?

**c)** ¿Algún otro concepto se resta antes de aplicar la tabla del Art. 700?

**Respuesta:**

---

### A6. Tope de cotización de la CSS 🟠

**a)** ¿Existe un **salario máximo cotizable** para la CSS, o el 9.75% / 13.25% se aplica sobre el 100% del salario sin límite?

**b)** Sabemos que hay un tope para el **cálculo de la pensión**. ¿Es distinto del tope de cotización, o no existe tope de cotización?

**Respuesta:**

---

### A7. Cuota patronal sobre el Décimo Tercer Mes 🔴 CRÍTICA

Confirmamos que el trabajador aporta **7.25%** de CSS sobre el XIII Mes y **0%** de Seguro Educativo.

**a)** ¿Cuánto aporta el **empleador** sobre el Décimo Tercer Mes?

**b)** ¿Aplica también el Seguro Educativo patronal (1.50%) sobre el XIII?

**c)** ¿Aplica la prima de Riesgos Profesionales sobre el XIII?

**Respuesta:**

---

### A8. ISR sobre indemnizaciones y prima de antigüedad 🟠

Encontramos fuentes contradictorias sobre el Art. 708 literal y) del Código Fiscal.

**a)** ¿La **prima de antigüedad** está totalmente exenta de ISR, o sujeta con exención parcial?

**b)** ¿La exención de **B/. 5,000** aplica al conjunto de las sumas de terminación (preaviso + prima + indemnización + bonificación), o a cada concepto por separado?

**c)** ¿Qué es exactamente el monto adicional del Art. 701 lit. j) num. 2 que menciona la norma?

**d)** ¿Los **salarios caídos** tributan como salario ordinario?

**Respuesta:**

---

### A9. Gastos de representación

Confirmamos la escala: 10% hasta B/. 25,000, y B/. 2,500 + 15% sobre el excedente.

**a)** ¿Es correcto que **no cotizan** CSS ni Seguro Educativo?

**b)** ¿Existe un tope respecto al salario? Vimos referencias a un límite del **100% del salario** — ¿sigue vigente?

**c)** ¿La escala se aplica sobre el **monto anual** o sobre el monto del período de pago?

**d)** ¿Los gastos de representación entran en la base del Décimo Tercer Mes? ¿Y en el promedio de vacaciones?

**Respuesta:**

---

# BLOQUE B — Prestaciones

### B1. Matriz de incidencia de conceptos 🔴 LA MÁS IMPORTANTE DE TODO EL DOCUMENTO

Necesitamos saber, **por cada concepto de pago**, en qué bases entra. Le agradecemos completar esta tabla — es el corazón del motor de cálculo.

> Marque: **Sí** / **No** / **Parcial** (y explique)

> **Nota:** la columna *"¿Entra al XIII Mes?"* ya viene **prellenada** con lo que establece el Artículo Cuarto del Decreto 19 de 1973. Le pedimos que la **confirme o corrija**, y que complete el resto.

| Concepto | ¿Cotiza CSS? | ¿Cotiza S. Educativo? | ¿Grava ISR? | ¿Entra al XIII Mes? | ¿Entra al promedio de vacaciones? |
|---|---|---|---|---|---|
| Salario ordinario | | | | **Sí** *(Art. 4º)* | |
| Horas extra (todas las modalidades) | | | | **Sí** *("jornadas extraordinarias")* | |
| Recargo de domingo / día de descanso (50%) | | | | **Sí** *("recargos legales")* | |
| Recargo de día feriado (150%) | | | | **Sí** *("recargos legales")* | |
| Comisiones | | | | **Sí** *(Art. 4º)* | |
| Bonificaciones regulares | | | | **Sí** *(Art. 4º)* | |
| Bonificaciones extraordinarias / discrecionales | | | | ❓ *¿"bonificaciones" las cubre?* | |
| Viáticos | | | | ❓ *no listadas* | |
| Dietas | | | | ❓ *no listadas* | |
| Vacaciones pagadas | | | | **Sí** *(Art. 4º)* | |
| Permisos remunerados | | | | **Sí** *(Art. 4º)* | |
| Primas (de producción u otras) | | | | **Sí** *(Art. 4º)* | |
| Días de incapacidad pagados por el **empleador** | | | | **Sí** *(Art. 4º, expreso)* | |
| Subsidio de enfermedad pagado por la **CSS** | | | | ❓ **ver B2.e** | |
| Licencia de **maternidad** (paga la CSS) | | | | **Sí** *(Art. 4º, sin calificar)* → ¿por qué monto? | |
| **Riesgos profesionales** (paga la CSS) | | | | **Sí** *(Art. 4º, sin calificar)* → ¿por qué monto? | |
| Gastos de representación | **No** *(verificado)* | **No** *(verificado)* | Escala propia | ❓ *no listados* | |
| Ingresos en especie | | | | ❓ *no listados* | |

**Observaciones adicionales:**

---

### B2. Base del Décimo Tercer Mes — ✅ mayormente resuelta

> **Ya resuelto** por el **Artículo Cuarto del Decreto N.º 19 de 7 de septiembre de 1973** (Gaceta Oficial 17,436), que reglamenta el Decreto de Gabinete 221 de 1971. La base incluye expresamente: *salario base, jornadas extraordinarias, jornadas con recargos legales, comisiones, primas, licencia por enfermedad pagada por el empleador, licencia de maternidad, vacaciones, permisos remunerados, riesgos profesional y bonificaciones.*
>
> Solo quedan abiertos los puntos **c** y **e**.

**a)** ~~¿Salario base o todo lo devengado?~~ → **Todo lo devengado.** Solo necesitamos que nos confirme que no hay norma posterior que lo modifique.

**b)** ~~¿Por qué existe la opción "solo salario base" en los sistemas?~~ → Entendemos que esa opción es **no conforme** (además, el Artículo Quinto establece que toda cláusula solo vale *"en lo que resulte más favorable al trabajador"*). ¿Coincide? ¿Ve empresas usándola en la práctica?

**c)** 🔴 **ABIERTA.** Si un trabajador ingresó o salió a mitad de partida, ¿cómo se prorratea? El Art. 4º remite al **Artículo 2º del Decreto de Gabinete 221 de 1971** para el cómputo del tiempo de servicio. ¿Qué establece ese artículo en la práctica?

**d)** ~~¿Incapacidad y vacaciones suman a la base?~~ → **Sí**, ambas están en la lista expresa.

**e)** 🔴 **ABIERTA Y CRÍTICA — es la duda que nos queda sobre el XIII.**

El Artículo Cuarto califica *"licencia por enfermedad **pagada por el empleador**"*, pero menciona *"licencia de maternidad"* y *"riesgos profesional"* **sin calificar quién paga** — y en ambos casos paga la CSS mediante subsidio.

Entonces, cuando el pago lo hace la CSS y no el empleador, **¿qué monto entra en el promedio del XIII?**

- ¿El **subsidio efectivamente percibido** (60–70%)?
- ¿El **salario completo** que el trabajador habría devengado?
- ¿**Nada**, porque el subsidio no es salario?

Y en consecuencia: **¿quién paga el XIII correspondiente a esos días — el empleador o la CSS?**

**Respuesta:**

---

### B2-bis. Regla del Aguinaldo (Artículo Tercero del Decreto 19 de 1973)

El Artículo Tercero establece que cuando una empresa paga Aguinaldo o Bonificación de Navidad *"pactada o acostumbrada de manera reiterada"*, debe pagar **la suma que resulte más favorable al trabajador** entre la Tercera Partida del XIII y el Aguinaldo.

**a)** ¿Se aplica esta regla en la práctica hoy?

**b)** ¿Qué califica como *"acostumbrada de manera reiterada"* — cuántos años seguidos?

**c)** ¿La comparación es solo contra la **Tercera Partida**, o contra el XIII completo del año?

**d)** ¿El aguinaldo que "gana" la comparación cotiza CSS al 7.25% como el XIII, o al 9.75% ordinario?

**Respuesta:**

---

### B3. Cálculo del pago de vacaciones

El Art. 54 establece 30 días por cada 11 meses. Sobre el monto a pagar:

**a)** ¿Se paga el salario ordinario del mes, o el **promedio de los últimos 11 meses**?

**b)** Si es promedio: ¿promedio de **qué conceptos** exactamente?

**c)** ¿Qué retenciones se aplican sobre el pago de vacaciones (CSS, SE, ISR)?

**d)** ¿A qué tasa cotiza CSS sobre vacaciones — 9.75% ordinario, o alguna tasa especial?

**Respuesta:**

---

### B4. Operativa de vacaciones

**a)** Si el período de vacaciones se traslapa con una quincena, ¿cómo se compone el comprobante de pago?

**b)** ¿Se pueden **compensar en dinero** sin gozarlas? ¿Con qué límite?

**c)** ¿Existe un **tope de acumulación** de vacaciones no gozadas?

**d)** El Art. 56 permite fraccionar solo si hay **convención colectiva**. En la práctica, ¿se respeta? ¿Debería el sistema bloquearlo o solo advertir?

**Respuesta:**

---

# BLOQUE C — Incapacidades y Licencias

### C1. Subsidio por enfermedad común 🔴 CRÍTICA — fuentes contradictorias

Encontramos versiones incompatibles: una fuente indica *"60% del salario desde el día 4"*; otra, *"70% del salario medio diario de los dos últimos meses de cotizaciones"*.

**a)** ¿Cuántos días paga el **empleador** y desde qué día paga la **CSS**?

**b)** ¿Cuál es el **porcentaje exacto** del subsidio y sobre qué base se calcula?

**c)** ¿Cuál es la **duración máxima** del subsidio?

**d)** ¿Qué requisitos de cotización previa debe cumplir el trabajador?

**Respuesta:**

---

### C2. Naturaleza del subsidio

Entendemos que el subsidio de incapacidad **no es salario**, y por tanto no cotiza, no entra al XIII ni al promedio de vacaciones.

**a)** ¿Es correcto?

**b)** ¿Cómo debe reflejarse en la planilla de la CSS?

**c)** ¿Cómo debe reflejarse en el comprobante de pago del trabajador?

**d)** Los días de incapacidad, ¿computan para la **antigüedad**?

**Respuesta:**

---

### C3. Los "18 días" 🟡

El software que analizamos controla *"días acumulados del fondo de incapacidad — 18 días anuales"*. **No encontramos respaldo legal para esa cifra.**

**a)** ¿Qué son esos 18 días?

**b)** ¿Es una norma vigente, un beneficio convencional, o una práctica de la industria?

**Respuesta:**

---

### C4. Regímenes distintos de incapacidad

**a)** ¿En qué se diferencia el tratamiento en planilla de **enfermedad común** vs. **riesgo profesional (accidente laboral)**?

**b)** ¿Quién paga y a qué porcentaje en cada caso?

**c)** ¿El accidente laboral tiene algún efecto sobre la prima de Riesgos Profesionales de la empresa?

**Respuesta:**

---

### C5. Licencia de maternidad

**a)** Confirmar: ¿14 semanas (6 antes + 8 después del parto)?

**b)** ¿La CSS paga el 100% del salario o un porcentaje?

**c)** ¿El empleador debe pagar algún diferencial?

**d)** ¿El período de maternidad cotiza? ¿Genera XIII y vacaciones?

**Respuesta:**

---

### C6. Otras licencias

**a)** ¿Existe licencia de **paternidad**? ¿Duración y quién paga?

**b)** ¿Licencias con goce de sueldo por **duelo familiar**, **matrimonio** u otras causas?

**c)** ¿Cómo se reflejan en planilla?

**Respuesta:**

---

# BLOQUE D — Terminación de la Relación Laboral

### D1. Prima de antigüedad — proporción de años incompletos

El Art. 224 concede 1 semana de salario por año, con proporción por años incompletos.

**a)** ¿Cómo se calcula exactamente la proporción — por meses cumplidos, por días, o algún redondeo?

**b)** ¿Sobre qué salario se calcula: el último, el promedio de los últimos meses, o el mejor para el trabajador?

**Respuesta:**

---

### D2. Salario base de indemnización y prima 🔴 CRÍTICA

**a)** Para calcular la indemnización del Art. 225 y la prima del Art. 224, ¿qué salario se usa: el **último devengado**, el **promedio de los últimos 6 meses**, o el más favorable al trabajador?

**b)** ¿Ese salario incluye horas extra, comisiones y bonos, o solo el salario base?

**c)** ¿Cuál es el divisor correcto para obtener el **salario semanal**? Vimos `salario mensual / 4.333`. ¿Es el aceptado en la práctica y ante MITRADEL?

**Respuesta:**

---

### D3. Régimen aplicable del Art. 225

El Art. 225 contiene escalas para relaciones anteriores al 2 de abril de 1972, un régimen intermedio, y el vigente desde la Ley 44 de 1995 (3.4 semanas/año los primeros 10 años, 1 semana/año después).

**a)** ¿Con qué frecuencia se presentan hoy casos de los regímenes antiguos?

**b)** ¿Cómo se **combinan** los regímenes para un trabajador que atraviesa varios?

**c)** ¿Vale la pena implementarlos, o basta con el régimen vigente?

**Respuesta:**

---

### D4. Fondo de Cesantía — operativa

**a)** El aporte es 1.92% (prima) + 5% de la cuota parte de indemnización. ¿Sobre qué base exacta se calcula ese 5%?

**b)** ¿El aporte es trimestral sobre los salarios del trimestre?

**c)** ¿Qué pasa si la empresa no tiene el fondo al día al momento de una terminación?

**d)** ¿El Fondo de Cesantía aplica a todos los contratos o solo a los indefinidos?

**Respuesta:**

---

### D5. Preaviso

**a)** ¿Qué define a un **"trabajador técnico"** para el plazo de 2 meses del Art. 222?

**b)** Cuando el empleador paga el preaviso en vez de otorgarlo, ¿ese pago cotiza CSS? ¿Grava ISR?

**c)** Cuando el trabajador renuncia sin aviso y se le deduce una semana, ¿esa deducción está sujeta al tope del 50% del Art. 161?

**Respuesta:**

---

### D6. Salarios caídos

**a)** ¿En qué causales proceden y cómo se calculan?

**b)** ¿Cotizan CSS y Seguro Educativo?

**c)** ¿Tienen tope temporal?

**Respuesta:**

---

### D7. Vacaciones y XIII proporcionales en liquidación

**a)** ¿Cómo se calculan las vacaciones proporcionales al momento del cese?

**b)** ¿Y el Décimo Tercer Mes proporcional de la partida en curso?

**c)** ¿Esas sumas proporcionales cotizan CSS, o se tratan como parte de la liquidación exenta?

**Respuesta:**

---

# BLOQUE E — Descuentos de Terceros

### E1. Orden de prelación 🔴 CRÍTICA

El Art. 161 fija un tope global del 50% del salario en dinero (salvo pensión alimenticia), y un tope del 30% para compra de vivienda. Pero no establece qué descuento se aplica primero cuando el 50% no alcanza para todos.

**a)** ¿Existe un orden de prelación establecido en norma o jurisprudencia?

**b)** En la práctica, ¿qué orden se usa? (¿pensión alimenticia → embargo judicial → vivienda → préstamos bancarios → casas comerciales → cooperativas?)

**c)** Entre acreedores del mismo tipo, ¿se ordena por antigüedad de la orden, prorrateo, u otro criterio?

**Respuesta:**

---

### E2. Base del tope del 50%

**a)** ¿El 50% se calcula sobre el **salario bruto** o sobre el **neto después de retenciones de ley** (CSS, SE, ISR)?

**b)** ¿Las retenciones de ley cuentan dentro del 50% o van aparte?

**Respuesta:**

---

### E3. Pensión alimenticia

**a)** Está exenta del tope del 50%. ¿Tiene algún tope propio?

**b)** ¿Puede llevar el neto del trabajador a cero?

**c)** ¿Se aplica sobre el bruto o sobre el neto?

**Respuesta:**

---

### E4. Inembargabilidad en la práctica

El Art. 161 declara inembargables en cuantía completa las vacaciones, jubilaciones, pensiones e indemnizaciones.

**a)** ¿Significa que **ningún** descuento de acreedor se aplica sobre el pago de vacaciones? ¿Ni siquiera un préstamo voluntario autorizado por el trabajador?

**b)** ¿Y sobre el Décimo Tercer Mes? (el Art. 161 no lo menciona)

**c)** ¿Y sobre la liquidación final?

**d)** ¿El "inembargable hasta el mínimo legal" se refiere al salario mínimo de la actividad y región del trabajador?

**Respuesta:**

---

### E5. Saldos no descontados

**a)** Si por el tope del 50% no se pudo descontar una cuota completa, ¿el saldo se arrastra al período siguiente?

**b)** ¿Genera intereses o mora frente al acreedor?

**c)** ¿Debe notificarse al acreedor?

**Respuesta:**

---

# BLOQUE F — Convenciones Operativas ⭐ EL MÁS IMPORTANTE

> Estas preguntas no las responde ningún texto legal — son las convenciones que usa la industria en Panamá. Si nuestro sistema arroja un neto distinto al que espera el contador, aunque tengamos razón, el producto fracasa. **Idealmente las responde un operador de nómina con años de práctica.**

### F1. El corte de la quincena y el problema de febrero 🔴 CRÍTICA

**a)** ¿La quincena corta del 1 al 15 y del 16 al fin de mes?

**b)** La segunda quincena de febrero tiene 13 o 14 días; la de enero tiene 16. ¿Se paga **lo mismo** en ambas (salario mensual ÷ 2), o **por días reales**?

**c)** Si se paga por días reales, ¿qué divisor se usa: 30 días fijos o los días reales del mes?

> Esta sola respuesta cambia **todos los netos** del sistema.

**Respuesta:**

---

### F2. Tipos de planilla

El software que analizamos maneja: Quincenal, Bisemanal, Quincenal Pago x Hora, Mensual 1ra Quincena, Mensual 2da Quincena.

**a)** ¿Qué significan exactamente **"Mensual 1ra Qna"** y **"Mensual 2da Qna"**?

**b)** En la planilla **bisemanal** (26 períodos al año), ¿cuál es la fecha ancla? ¿Cómo se maneja el mes con 3 cortes?

**c)** En **"Pago x Hora"**, ¿se paga estrictamente por horas marcadas sin salario base garantizado?

**Respuesta:**

---

### F3. Divisores salariales 🔴 CRÍTICA

**a)** **Salario diario** = ¿salario mensual ÷ 30? ¿÷ días del mes? ¿× 12 ÷ 365?

**b)** **Salario semanal** = ¿÷ 4.333? ¿× 12 ÷ 52? ¿salario diario × 7?

**c)** **Salario por hora** = ¿÷ 208? ¿÷ 240? ¿Cuándo se usa 192?

**d)** ¿Se usan divisores **distintos** según el propósito (hora extra vs. prima de antigüedad vs. descuento por ausencia)?

**Respuesta:**

---

### F4. Redondeo 🔴 CRÍTICA

**a)** ¿Se redondea **cada concepto** a 2 decimales, o se acumula con precisión completa y solo se redondea el neto?

**b)** ¿Método: medio arriba, truncado, u otro?

**c)** ¿Cómo evita usted que los totales patronales descuadren contra lo que calcula la CSS?

**Respuesta:**

---

### F5. Horas extra en la práctica

**a)** Si un trabajador hace 20 minutos extra, ¿se pagan? ¿Se redondea a la fracción más cercana? ¿A cuánto (15 min, 30 min, hora completa)?

**b)** ¿Cuál es la **tolerancia** habitual de entrada antes de considerar tardanza?

**c)** ¿Cómo se descuenta una tardanza — el tiempo exacto, redondeado, o con sanción?

**d)** Si un trabajador excede el límite legal de 3h/día o 9h/semana, ¿qué hace usted en la práctica?

**Respuesta:**

---

### F6. Ausencias

**a)** Una ausencia injustificada, ¿descuenta solo el día, o también afecta proporcionalmente el día de descanso semanal remunerado?

**b)** ¿Cómo se calcula el valor del día a descontar?

**Respuesta:**

---

### F7. Cambios a mitad de período

**a)** Si el salario cambia a mitad de quincena, ¿se parte el período en dos tramos o se aplica el nuevo salario a todo el período?

**b)** Si un trabajador ingresa o sale a mitad de período, ¿el prorrateo es por días calendario o por días laborables?

**Respuesta:**

---

### F8. Flujo real de trabajo

**a)** Descríbanos su proceso de cierre de una quincena, paso a paso.

**b)** ¿Cuáles son los **estados** por los que pasa una planilla? (¿borrador, calculada, revisada, aprobada, cerrada, pagada?)

**c)** ¿Quién aprueba y quién puede revertir?

**d)** Una vez cerrada una planilla, si aparece un error, ¿se **corrige la planilla** o se hace un **ajuste** en el período siguiente?

**e)** ¿Qué le hace **perder más tiempo** en cada cierre de quincena?

> La última pregunta es la más valiosa para nosotros.

**Respuesta:**

---

### F9. Los errores que más ve

**a)** ¿Cuáles son los errores más frecuentes en planillas en Panamá?

**b)** ¿Qué es lo que más rechaza la CSS al presentar el SIPE?

**c)** ¿Qué es lo que más rechazan los bancos al subir un archivo ACH?

**d)** ¿Qué revisa usted **antes** de aprobar una planilla?

**Respuesta:**

---

# BLOQUE G — Regímenes Especiales

### G1. Servicios profesionales

**a)** La retención de ISR es del 10%. ¿Sobre el monto bruto?

**b)** ¿Cotizan CSS? ¿Generan XIII Mes y vacaciones?

**c)** ¿Cuándo un "servicio profesional" se considera legalmente una **relación laboral encubierta**? ¿Qué señales lo delatan?

**Respuesta:**

---

### G2. Construcción (CAPAC / SUNTRACS)

**a)** ¿Qué recargos especiales aplican (altura, agua, turnos)? ¿Porcentajes?

**b)** ¿La convención colectiva modifica las tasas de ley o solo agrega conceptos?

**c)** ¿Qué tan común es en el mercado? ¿Justifica soportarlo desde la primera versión?

**Respuesta:**

---

### G3. Trabajadores extranjeros

**a)** ¿Cuál es el límite de trabajadores extranjeros en planilla (porcentaje)?

**b)** ¿Debe el sistema validarlo o solo alertarlo?

**c)** ¿Hay diferencias en cotización o retención?

**Respuesta:**

---

### G4. Otros

**a)** ¿Restricciones para **menores de edad** que afecten el cálculo de nómina?

**b)** ¿Régimen especial para **trabajadores domésticos**?

**c)** ¿Alguna otra modalidad frecuente que debamos contemplar?

**Respuesta:**

---

# BLOQUE H — Documentos que Necesitamos

Si tiene acceso a cualquiera de estos, nos ahorraría semanas:

- [ ] **Un comprobante de pago (talonario) real**, con datos anonimizados — nos resuelve casi todas las convenciones del Bloque F de una sola vez
- [ ] **Una planilla completa de una quincena** con sus totales patronales — sería nuestra prueba de aceptación
- [ ] **Un archivo SIPE** aceptado por la CSS (con datos anonimizados) + su especificación de formato
- [ ] **Un archivo ACH** de cualquier banco panameño + el manual de formato del banco
- [ ] **Formulario 03 de la DGI** presentado + su especificación
- [ ] **Tabla completa de las 59 tasas de salario mínimo** vigentes
- [ ] **Tabla de tarifas de Riesgos Profesionales** por actividad (Resolución JD-CSS 12,260-2024)
- [ ] Ejemplo de **liquidación laboral** calculada y aceptada por MITRADEL

---

# Anexo — Lo que ya tenemos resuelto

Para que no gaste tiempo en esto. Si detecta algún error, **por favor corríjanos**:

| Tema | Valor confirmado |
|---|---|
| CSS obrero | 9.75% |
| CSS patronal | 13.25% (abr-2025 → feb-2027) · 14.25% (mar-2027) · 15.25% (mar-2029) — Ley 462/2025 |
| Seguro Educativo | 1.25% obrero / 1.50% patronal |
| CSS sobre XIII Mes | 7.25% obrero / 0% Seguro Educativo |
| Riesgos Profesionales | 0.56% – 6.25% según CIIU, solo empleador |
| ISR — tramos | 0% hasta 11,000 · 15% de 11,000 a 50,000 · 5,850 + 25% sobre el excedente de 50,000 |
| Gastos de representación | 10% hasta 25,000 · 2,500 + 15% sobre el excedente |
| Jornada diurna | 6:00–18:00 · 8h diarias · 48h semanales |
| Jornada nocturna | 18:00–6:00 · 7h diarias · 42h semanales |
| Jornada mixta | máx. 3h nocturnas · 7.5h diarias · 45h semanales |
| Horas extra (Art. 33) | 25% diurna · 50% nocturna o prolongación de mixta iniciada de día · 75% prolongación de nocturna o mixta iniciada de noche |
| Límite de horas extra | 3h diarias / 9h semanales |
| Domingo o día de descanso (Art. 48) | +50% |
| Día feriado o duelo (Art. 49) | +150%, **incluye** la remuneración del día |
| Vacaciones (Art. 54) | 30 días por cada 11 meses · pago anticipado · máx. 2 fracciones con convención colectiva |
| XIII Mes | 3 partidas (15-abr, 15-ago, 15-dic) · divisor 12 |
| **Base del XIII Mes** | Decreto 19 de 1973 Art. 4º: salario base + jornadas extraordinarias + recargos legales + comisiones + primas + licencia por enfermedad pagada por el empleador + licencia de maternidad + vacaciones + permisos remunerados + riesgos profesional + bonificaciones |
| **Aguinaldo vs. 3ª partida** | Decreto 19 de 1973 Art. 3º: se paga lo más favorable al trabajador |
| **Piso irrenunciable del XIII** | Decreto 19 de 1973 Art. 5º: toda cláusula contractual o convencional solo vale en lo más favorable al trabajador |
| Prima de antigüedad (Art. 224) | 1 semana por año · provisión 1.92% mensual |
| Fondo de Cesantía (Ley 44/1995) | 1.92% + 5% de cuota parte de indemnización · aporte trimestral |
| Indemnización (Art. 225) | 3.4 semanas/año los primeros 10 años · 1 semana/año después · mínimo 1 semana |
| Preaviso | empleador 30 días · trabajador 15 días (técnico: 2 meses) · sin aviso: 1 semana |
| Descuentos (Art. 161) | tope global 50% del salario en dinero · vivienda 30% · pensión alimenticia exenta del tope |
| Inembargabilidad (Art. 161) | salario hasta el mínimo legal · vacaciones, jubilaciones e indemnizaciones en cuantía completa |
| Salario mínimo | D.E. 13 de 31-dic-2025 · vigente 16-ene-2026 · 59 tasas · 74 actividades · 2 regiones |

---

**Contacto del proyecto:** _______________________

**Gracias.** Cada respuesta se convierte directamente en una regla del motor de cálculo, con su base legal citada.
