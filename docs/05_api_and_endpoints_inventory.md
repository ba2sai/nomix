# APP-001: Inventario de APIs, Endpoints y Controladores Backend

**Documento:** `05_api_and_endpoints_inventory.md`  
**Estado:** `OBSERVED` & `CONFIRMED`  
**Host:** `https://app.planifacil.com/empresas/`

---

## 1. Endpoints de Transacciones y Persistencia de Datos (`API-001` a `API-015`)

| ID | Endpoint | Método HTTP | Parámetros Clave | Tipo de Respuesta | Propósito |
|---|---|---|---|---|---|
| `API-001` | `https://www.planifacil.com/signin` | `POST` | `_token`, `username`, `password` | `302 Redirect` / Cookies | Autenticación y creación de sesión de usuario |
| `API-002` | `savempre.php` | `POST` | `id_empresa`, `nombre_comercial`, `ruc`, `n_patronal`, `seguro_patronal`, `rp_por`, `logo` | `text/html` | Guardar cambios en la ficha de la empresa activa |
| `API-003` | `empresa_img.php` | `POST` / `GET` | `id_empresa`, `imagen` | `image/jpeg` / `text/html` | Subida y renderizado del logotipo empresarial |
| `API-004` | `placolaborador.php` | `POST` | `cod_empleado`, `nombres`, `apellidos`, `id_identificacion`, `salario_mensual`, etc. (110+ campos) | `text/html` | Alta y actualización integral de colaborador |
| `API-005` | `save_descto.php` | `POST` | `cod_acre`, `monto_total`, `letra_mensual`, `fecha_ini`, `id_colaborador` | `text/html` | Registro de nuevo descuento/préstamo de empleado |
| `API-006` | `del_descto.php` | `POST` / `GET` | `id_descto`, `id2` | `text/html` | Cancelación/eliminación de descuento |
| `API-007` | `save_ajus.php` | `POST` | `salario_new`, `gastos_rep_new`, `ajuste_motivo`, `ajuste_desde` | `text/html` | Registro de cambio histórico de salario |
| `API-008` | `plaliqdel.php` | `POST` | `id_liquidacion`, `id_colaborador` | `text/html` | Reversión de liquidación emitida |
| `API-009` | `backups.php` | `POST` / `GET` | `tipo_backup`, `id_empresa` | `application/octet-stream` (SQL/ZIP) | Generación y descarga de respaldo |

---

## 2. Generadores de Archivos Bancarios ACH (`API-016` a `API-026`)

| ID | Endpoint | Método | Formato de Salida | Banco / Destino en Panamá |
|---|---|---|---|---|
| `API-016` | `gen_ach.php` | `GET`/`POST` | Archivo plano ACH NACHA | Formato estándar ACH Panamá |
| `API-017` | `xls_ach_bac.php` | `GET`/`POST` | `application/vnd.ms-excel` | BAC International Bank Panamá |
| `API-018` | `gen_ach_banistmo.php`| `GET`/`POST`| Archivo de texto estructurado | Banistmo (Bancolombia) |
| `API-019` | `gen_ach_banesco.php` | `GET`/`POST` | Archivo plano | Banesco Panamá |
| `API-020` | `gen_ach_multibank.php`| `GET`/`POST`| Archivo texto/plano | Multibank |
| `API-021` | `gen_ach_credicorp.php`| `GET`/`POST`| Archivo texto/plano | Credicorp Bank |
| `API-022` | `gen_ach_ca.php` | `GET`/`POST` | Archivo de texto | Caja de Ahorros de Panamá |
| `API-023` | `gen_ach_global.php` | `GET`/`POST` | Archivo plano | Global Bank Panamá |
| `API-024` | `gen_ach_suc.php` | `GET`/`POST` | Archivo ACH por Sucursal | Desembolsos segregados por centro de costo |
| `API-025` | `xlsach.php` | `GET`/`POST` | Excel consolidado | Resumen general de transferencias ACH |

---

## 3. Generadores de Informes PDF y Documentos Oficiales (`API-027` a `API-040`)

| ID | Endpoint | Formato de Salida | Propósito Funcional |
|---|---|---|---|
| `API-027` | `pdfplanilla.php` | `application/pdf` | Resumen general de planilla quincenal para auditoría |
| `API-028` | `pdfcomprob.php` | `application/pdf` | Talonarios/Comprobantes de pago individuales para entrega a empleados |
| `API-029` | `pdfcheque.php` | `application/pdf` | Impresión de cheques de nómina con vouchers |
| `API-030` | `pdfplanillasuc.php` | `application/pdf` | Planilla agrupada por sucursal |
| `API-031` | `pdfplanilladepto.php`| `application/pdf` | Planilla agrupada por departamento |
| `API-032` | `pdfsucursales.php` | `application/pdf` | Listado oficial de sucursales |
| `API-033` | `rep_sipe.php` | `application/vnd.ms-excel` | Archivo de importación oficial para el sistema SIPE de la Caja de Seguro Social (CSS) |
| `API-034` | `gen_pla03.php` | `application/vnd.ms-excel` / Text | Reporte Formulario 03 de la DGI (Dirección General de Ingresos) |
| `API-035` | `repasiento.php` | `text/html` / PDF | Asiento contable de nómina (Cuentas de Gasto vs Retenciones y Sueldos por Pagar) |

---

## 4. Endpoints de Liquidaciones Laborales (`API-041` a `API-055`)

| ID | Endpoint | Causal Legal Asociada |
|---|---|---|
| `API-041` | `plaliq210-1.php` | Mutuo Consentimiento (Art. 210 Numeral 1) |
| `API-042` | `plaliq210-4.php` | Muerte del Trabajador (Art. 210 Numeral 4) |
| `API-043` | `plaliq210-8.php` | Decisión del Empleador (Art. 210 Numeral 8) |
| `API-044` | `plaliq212.php` | Trabajadores con menos de 2 años de servicio (Art. 212) |
| `API-045` | `plaliq213-1.php` | Despido justificado de naturaleza disciplinaria (Art. 213 Acápite A) |
| `API-046` | `plaliq213-2.php` | Despido justificado de naturaleza no imputable (Art. 213 Acápite B) |
| `API-047` | `plaliq213-3.php` | Despido justificado de naturaleza económica (Art. 213 Acápite C) |
| `API-048` | `plaliq227.php` | Despido antes del término en contratos definidos (Art. 227) |
| `API-049` | `plarenuncia.php` | Renuncia con previo aviso |
| `API-050` | `plarenuncia2.php` | Renuncia sin previo aviso |
| `API-051` | `plaliqvenci.php` | Vencimiento de Contrato |
| `API-052` | `liqisr.php` | Determinación del ISR en indemnizaciones y prima de antigüedad |
