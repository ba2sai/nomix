# Formatos Reales Extraídos de PlaniFácil

**Documento:** `09_formatos_reales_planifacil.md`
**Proyecto:** **Nomix - Nómina inteligente**
**Fecha:** 2026-08-26
**Origen:** Exportaciones reales de la cuenta piloto (El Príncipe Azul, S.A.), en `reportes PFacil/`
**Estado:** `OBSERVED` — datos de producción

> ⚠️ **PII real.** Los archivos de origen contienen cédulas y nombres reales de empleados de
> un cliente (El Príncipe Azul). Este documento reproduce **estructura y valores agregados**,
> no el padrón completo. Los archivos crudos **no deben commitearse sin anonimizar** — ver §6.

---

## 0. Qué llegó y qué desbloquea

| Archivo | Tipo | Período | Desbloquea |
|---|---|---|---|
| `Informe03_2673456-1-844087_202604.xlsx` | Formulario 03 DGI | Abril 2026 | `GAP-002` (DGI) — layout completo |
| `SIPE_JUNIO2026.xls` | SIPE / CSS | Junio 2026 | `GAP-002` (CSS) — layout completo |
| `asiento_planilla.pdf` | Asiento contable | Junio 2026 | Validación del motor + estructura contable |
| `Planilla Quincenal.png` | Captura de pantalla | Varias quincenas 2026 | Estructura de la planilla + estados |
| `ach.txt` | Archivo ACH | — | ❌ **Vacío (0 bytes)** — reexportar |

> 🔴 **`ach.txt` llegó vacío.** El layout de ACH (`GAP-001`) sigue abierto. Ver §5.

---

## 1. 🎯 VALIDACIÓN DEL MOTOR contra datos de producción

El `asiento_planilla.pdf` de **junio 2026** permite verificar las tasas de la base legal
contra números reales. **Todo cuadra al centavo.**

### Base cotizable observada
```
Salarios           6,114.65
Horas extra          123.93
Vacaciones           806.83
─────────────────────────────
Base cotizable     7,045.41   ← salario + horas extra + vacaciones
```

### Tasas verificadas contra el asiento

| Concepto | Tasa | Cálculo sobre 7,045.41 | Asiento real | ✓ |
|---|---|---|---|---|
| CSS obrero | 9.75% | 686.93 | **686.93** | ✅ |
| Seguro Educativo obrero | 1.25% | 88.07 | **88.07** | ✅ |
| **CSS patronal** | **13.25%** | 933.52 | **933.52** | ✅ |
| Seguro Educativo patronal | 1.50% | 105.68 | **105.68** | ✅ |

El asiento cuadra: débito 8,084.61 = crédito 8,084.61. Neto (salarios por pagar) 6,269.09.

### 🚨 Los tres hallazgos que esto CONFIRMA con datos reales

1. **La cuota patronal es 13.25%, no 12.25%.** `933.52 ÷ 7,045.41 = 13.2500%` exacto. La
   Ley 462 de 2025 ya está aplicada en producción. **Esto valida definitivamente la
   corrección más importante que hicimos** — y confirma que la documentación de PlaniFácil
   (`docs/04`) estaba desactualizada, no la investigación.

2. **Las vacaciones cotizan CSS y Seguro Educativo.** Los 806.83 de vacaciones están dentro
   de la base de 7,045.41. Sube de ⚠️ VERIFICAR a ✅ VERIFICADO en la base legal.

3. **Las horas extra cotizan CSS y Seguro Educativo.** Los 123.93 también están en la base.
   Confirma la fila correspondiente de la matriz de incidencia (`ADR-002`).

### Validación adicional — planilla quincenal
`GONZALEZ, ÁNGEL GABRIEL`: bruto (204.70 + 8.24 HE) = 212.94 → 11% = 23.42 (Desc/Legales) →
neto 189.52. Cuadra exacto. **Confirma que CSS+SE obrero (11%) se aplica sobre bruto +
horas extra a nivel quincenal.**

> **Consecuencia para `qa-calculos`:** el `asiento_planilla.pdf` de junio 2026 es la
> **primera prueba de aceptación real** del motor. Cualquier implementación de CSS/SE debe
> reproducir estos números exactos.

---

## 2. Formulario 03 (DGI) — layout completo

**Archivo:** `Informe03_2673456-1-844087_202604.xlsx` · **"INFORME 03v5 — vigente 2022 en
adelante"** · una fila por empleado, datos desde la **línea 5**.

### Columnas (en orden exacto del archivo)

| # | Columna | Notas observadas |
|---|---|---|
| 1 | `ID_PLANILLA` | Vacío en la muestra |
| 2 | `AÑO_MES_CUOTA` | `202604` (formato `AAAAMM`) |
| 3 | `TIPO_DOCUMENTO` | `1` = Cédula · `2` = Pasaporte |
| 4 | `NUMERO_DOCUMENTO` | Cédula `8-848-1493` o pasaporte `PasC02689207` |
| 5 | `DV` | Dígito verificador (vacío para pasaportes) |
| 6 | `NOMBRE_EMPLEADO` | Nombre completo |
| 7 | `SALARIO` | (columna presente, 0 en la muestra) |
| 8 | `SUELDO` | Sueldo del mes |
| 9 | `HORAS EXTRAS` | |
| 10 | `VACACIONES` | |
| 11 | `COMISIONES` | |
| 12 | `BONIFICACIONES` | |
| 13 | `SALARIO_ESPECIE` | |
| 14 | `DIETA` | |
| 15 | `PRIMA_PRODUCCIÓN` | |
| 16 | `DTM` | Décimo tercer mes |
| 17 | `GRATIFICACIONES_AGUINALDOS` | |
| 18 | `GASTO_REPRESENTACIÓN` | |
| 19 | `DEDUCCION CONJUNTA` | La deducción básica de B/.800 (cónyuges) |
| 20 | `INTERESES HIPOTECARIOS` | |
| 21 | `INTERESES EDUCATIVOS` | |
| 22 | `PRIMAS SEGURO` | |
| 23 | `APORTE FONDOS DE JUBILACIÓN` | |
| 24 | `TOTAL DE DEDUCCIONES` | |
| 25 | `RENTA NETA GRAVABLE` | |
| 26 | `IMPUESTO_RENTA` | |
| 27 | `IMPUESTO_RENTA_REPRESENTACION` | ISR de gastos de representación (escala aparte) |
| 28 | `RETENCIONES DURANTE EL MES EN SALARIOS` | |
| 29 | `RETENCIONES DURANTE EL MES EN GASTOS DE REPRESENTACIÓN` | |
| 30 | `LIQUIDACIÓN - TERMINACIÓN LABORAL` | |
| 31 | `ISR LIQUIDACIÓN - TERMINACIÓN LABORAL` | |
| 32 | `A FAVOR DEL FISCO` | |
| 33 | `A FAVOR DEL EMPLEADO` | |

### 🔑 Lo que este layout confirma sobre el ISR (cierra huecos de la base legal §4)

- **Las columnas de deducciones personales son exactamente las del instructivo de la DGI**:
  deducción conjunta, intereses hipotecarios, intereses educativos, primas de seguro,
  aporte a fondos de jubilación. **No hay columna de "dependientes".** Esto **confirma con
  el formato oficial** que la deducción de $250 por dependiente no existe (era `GAP` /
  consulta A3). El formato de la DGI no la contempla.
- **El ISR de gastos de representación es una columna separada** (`IMPUESTO_RENTA_REPRESENTACION`),
  confirmando que tributa bajo su propia escala — como documentamos en §4.4.
- Estructura clave a modelar: dos flujos de ISR paralelos (salario y gastos de representación),
  cada uno con su retención, más las columnas de liquidación.

---

## 3. SIPE (CSS) — layout completo

**Archivo:** `SIPE_JUNIO2026.xls` · una fila por empleado.

### Columnas (en orden exacto)

| # | Columna | Notas |
|---|---|---|
| 1 | `Tipo de Documento` | `Cedula` / `Pasaporte` (texto, no código) |
| 2 | `Número de Documento` | `8-997-2024` / `C02689207` |
| 3 | `Numero de Seguro Social` | En la muestra = igual a la cédula |
| 4 | `Nombre` | Nombres |
| 5 | `Apellido` | Apellidos |
| 6 | `Sueldo` | |
| 7 | `HorasExtras` | |
| 8 | `ImpuestoSobreRenta` | |
| 9 | `DecimoTercerMes` | |
| 10 | `Vacaciones` | |
| 11 | `Comisiones` | |
| 12 | `Bonificaciones` | |
| 13 | `Combustible` | |
| 14 | `Dieta` | |
| 15 | `SalarioenEspecie` | |
| 16 | `Viaticos` | |
| 17 | `GastodeRepresentacion` | |
| 18 | `ImpuestoSobreRentaGastoRepresentacion` | |
| 19 | `DecimoTercerMesGastoRepresentacion` | |
| 20 | `PrimasdeProduccion` | |
| 21 | `Dividendo` | |
| 22 | `ParticipacionBeneficioIngresos` | |
| 23 | `GratificacionAguinaldo` | 220.00 en un empleado — confirma que el aguinaldo se reporta |
| 24 | `Preaviso` | |
| 25 | `Indemnizacion` | |
| 26 | `hidden` | Columna interna (un valor `6549445` en una fila; vacía en el resto) |

### Diferencias clave frente al Formulario 03 (importan para el motor)

- El SIPE usa **texto** para el tipo de documento (`Cedula`), el Form. 03 usa **código** (`1`).
- El SIPE separa `Nombre` y `Apellido`; el Form. 03 los une en `NOMBRE_EMPLEADO`.
- El SIPE incluye conceptos que el Form. 03 no desglosa: `Combustible`, `Viaticos`,
  `Dividendo`, `ParticipacionBeneficioIngresos`.
- Ambos separan el componente de **gastos de representación** (sueldo, ISR y XIII propios).

> **Implicación de arquitectura:** los adaptadores de SIPE y Form. 03 son **dos serializadores
> distintos sobre el mismo modelo de conceptos** (`ADR-002`). Cada columna del archivo mapea a
> un `concepto.codigo`. Esto valida el diseño de la matriz de incidencia: si los conceptos son
> datos, generar ambos archivos es recorrer el catálogo, no escribir dos exportadores a mano.

---

## 4. Asiento contable — estructura de cuentas

El `asiento_planilla.pdf` da el plan de cuentas de nómina que el sistema debe producir
(corresponde a `repasiento.php` / `SCR-088`):

**Débito (gastos y cargas):** Salarios · Horas Extra · Gastos de Representación · Vacaciones ·
Décimo Tercer Mes · Bonificación · Viáticos · Indemnización · Prima de Antigüedad · Preaviso ·
Seguro Social Patronal · Seguro Educativo Patronal · Riesgos Profesionales · Cuentas por Cobrar
Empleados.

**Crédito (pasivos por pagar):** Salarios por Pagar · Seguro Social Obrero por Pagar · Seguro
Social Patronal por Pagar · Seguro Educativo Obrero por Pagar · Seguro Educativo Patronal por
Pagar · Riesgos Profesionales por Pagar · ISR Obrero por Pagar · Descuentos a Empleados por Pagar.

> Este es el `payload` que en el futuro `n8n` empujará a QuickBooks/Odoo (`ADR-013`). El motor
> lo produce; n8n lo transporta.

> **Nota:** Riesgos Profesionales figura en 0.00 para esta empresa. Confirmar si El Príncipe
> Azul tiene tarifa RP configurada o si es un caso de exención — relevante para validar el
> rango 0.56%–6.25% (`GAP` abierto en base legal §1.4).

---

## 5. Planilla quincenal — estructura y estados

De `Planilla Quincenal.png`:

### Cabecera (listado de planillas)
Columnas: `Número` · `Desde` · `Hasta` · `Fecha/Pago` · `Monto/Bruto` · `Monto/Neto` · `Status`.

- **Estados observados:** todas las planillas del histórico están en `Cerrada`. Confirma que
  existe una máquina de estados (al menos `Abierta`/`Generada` → `Cerrada`), pendiente de
  modelar (`ARCHITECTURE.md` paso 8).
- **Acciones observadas en la barra:** `Buscar`, `Generar`, `Regenerar` (deshabilitado cuando
  está cerrada), `Imprimir`, `RE-Email`, `Print-Comprob`, `ACH/TXT`, `Salir`.
- **La numeración salta** (1, 2, 4, 5, 7, 9, 10, 13) — los huecos sugieren planillas
  extraordinarias o anuladas intercaladas.
- **Quincenas de 15/16 días:** Desde 2026-07-26 Hasta 2026-08-10 = una quincena "16→10"
  (cruza fin de mes). Confirma el corte quincenal por rango de fechas, no por mes calendario.

### Desglose por colaborador
Columnas: `Depto` · `Apellidos` · `Nombres` · `Sal/Bruto` · `Hrs/Extra` · `Aus/Tardan` ·
`Desc/Legales` · `Desc/Varios` · `Sal/Neto`.

- **`Desc/Legales`** = CSS + SE + ISR (las retenciones de ley).
- **`Desc/Varios`** = descuentos de acreedores (préstamos, embargos). En la muestra casi todos
  en 0.00 salvo `BRAVO SANCHEZ` con 21.43.
- **`Aus/Tardan`** es una columna separada del bruto → el descuento por ausencia/tardanza se
  maneja aparte, no restándolo del salario base directamente. **Esto conecta con la consulta
  F5/F6 del cuestionario** (mecánica de tardanza) — el talonario individual la aclarará del todo.

---

## 6. Pendientes derivados de esta extracción

- [ ] 🔴 **Reexportar el ACH** — `ach.txt` llegó vacío. Es el único formato de salida que
  sigue sin resolverse. Al reexportar, generar **uno por cada banco** configurado.
- [ ] 🟡 **Talonario individual** (`pdfcomprob.php`) — aún no extraído. Es el que revela el
  detalle de divisores y el tratamiento exacto de tardanza (`Aus/Tardan`).
- [ ] 🟢 **Anonimizar antes de commitear** — los archivos de `reportes PFacil/` tienen PII real
  de El Príncipe Azul. Recomendación: mantenerlos fuera de git (o en `.gitignore`) y commitear
  solo versiones con cédulas/nombres sustituidos. Ver §7.
- [ ] Confirmar la tarifa de Riesgos Profesionales de la empresa (aparece en 0.00).
- [ ] Verificar el cálculo de ISR contra un empleado que sí retenga (en estas muestras casi
  todos los sueldos están bajo el umbral exento de B/.11,000 anuales, por eso ISR ≈ 0).

---

## 7. Actualizaciones aplicadas a la base legal

A raíz de esta validación, en `06_base_legal_panama.md` se promovieron a ✅ VERIFICADO
(con nota "confirmado contra asiento real de producción, jun-2026"):

- CSS patronal **13.25%** (antes ✅ por fuente oficial; ahora **doblemente** confirmado)
- Vacaciones cotizan CSS y Seguro Educativo (antes ⚠️ VERIFICAR)
- Horas extra cotizan CSS y Seguro Educativo (antes parcial)
- Inexistencia de deducción por dependiente (antes consulta A3; el formato oficial de la
  DGI no tiene la columna)
