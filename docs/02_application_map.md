# APP-001: Mapa de la Aplicación e Inventario de Pantallas

**Documento:** `02_application_map.md`  
**Estado:** `CONFIRMED`  
**Total de Pantallas Catalogadas:** 88 pantallas y submódulos

---

## 1. Módulo 01: Perfil y Sesión (`MOD-001`)

| ID | Nombre de Pantalla | URL / Endpoint | Propósito Funcional | Componentes Clave Observados |
|---|---|---|---|---|
| `SCR-001` | Iniciar Sesión | `https://www.planifacil.com/signin` | Autenticación de usuario con CSRF | Formulario login (`username`, `password`, `_token`), enlace de recuperación |
| `SCR-002` | Recuperar Contraseña | `https://www.planifacil.com/forgot` | Solicitud de restablecimiento | Formulario de correo / usuario |
| `SCR-003` | Información de Empresa | `mod_empresa.php` | Configuración de datos fiscales y legales de la empresa activa | Campos: `nombre_comercial`, `ruc`, `n_patronal`, `seguro_patronal`, `rp_por`, `logo`, endpoints `savempre.php`, `empresa_img.php` |
| `SCR-004` | Información de Usuario | `usr_emp.php` | Datos del perfil de operador y cambio de clave | Campos de contraseña, email, datos personales |
| `SCR-005` | Solicitud de Soporte | `tickets.php` | Apertura y seguimiento de tickets de ayuda | Formulario de tickets, historial de solicitudes |
| `SCR-006` | Cierre de Sesión | `../cerses.php` | Destrucción de sesión y retorno a login | Redirección a portal inicial |

---

## 2. Módulo 02: Configuraciones (`MOD-002`)

| ID | Nombre de Pantalla | URL / Endpoint | Propósito Funcional | Componentes Clave Observados |
|---|---|---|---|---|
| `SCR-007` | Parámetros Generales | `confparam.php` | Reglas globales de cálculo, tolerancias y correlativos | Configuración de tolerancia reloj, tiempos mínimos horas extra, correlativos automáticos, banco ACH por defecto (`id_banco_ach`), modelo de comprobante |
| `SCR-008` | Notificaciones y Avisos | `confavisos.php` | Alertas automáticas de vencimiento de contratos y probatorios | Configuración de alertas tempranas por email/sistema |
| `SCR-009` | Horarios Laborales | `confhorarios.php` | Catálogo de horarios regulares, mixtos y nocturnos | Definición de horas entrada/salida por día de la semana (Lunes a Domingo), horas diarias, días de descanso |
| `SCR-010` | Retenciones de Ley | `confreten.php` | Tasas de Seguro Social, Seguro Educativo y Riesgos Profesionales | Parámetros patronales y de empleado de CSS (9.75%), SE (1.25%), Riesgos Profesionales |
| `SCR-011` | Días Libres y Feriados | `confdiaslibres.php` | Calendario de feriados y días de duelo nacional | Catálogo de fechas con recargos de ley en Panamá |
| `SCR-012` | Tipos de Descuentos | `confdesc.php` | Catálogo de tipos de deducciones de nómina | Descuentos judiciales, préstamos, comerciales, cooperativas |
| `SCR-013` | Balances Acumulados | `confbalan.php` | Acumulados salariales históricos y anuales | 180+ campos para balances de XIII Mes, Vacaciones, Indemnizaciones y Fondo de Cesantía |
| `SCR-014` | Cuentas del Mayor | `confcontab.php` | Plan de cuentas contables para interfaz contable | Asignación de códigos contables de gasto, pasivos de retenciones, salarios por pagar |
| `SCR-015` | Copias de Seguridad | `backups.php` | Generación y descarga de respaldos de datos | Generador de dump/backup de la base de datos de la empresa |

---

## 3. Módulo 03: Mantenimiento Base (`MOD-003`)

| ID | Nombre de Pantalla | URL / Endpoint | Propósito Funcional | Componentes Clave Observados |
|---|---|---|---|---|
| `SCR-016` | Sucursales | `mantsucursal.php` | Administración de sedes y centros de costo | CRUD de sucursales, código consecutivo, reportes PDF (`pdfsucursales.php`) |
| `SCR-017` | Gerencias | `mantgerencias.php` | Estructura organizativa superior | CRUD de gerencias |
| `SCR-018` | Departamentos | `mantdeptos.php` | Estructura funcional operativa | CRUD de departamentos asociados a gerencias |
| `SCR-019` | Posiciones / Cargos | `mantposiciones.php` | Catálogo de cargos y funciones | CRUD de posiciones salariales |
| `SCR-020` | Acreedores | `mantacre.php` | Bancos, financieras, juzgados y casas comerciales | CRUD de acreedores, datos bancarios para pago directo ACH (`pdfacreedores.php`) |
| `SCR-021` | Usuarios del Sistema | `mantuser.php` | Cuentas de usuario de la empresa y roles | Alta, modificación, estatus activo/inactivo |

---

## 4. Módulo 04: Gestión Operativa de Planilla (`MOD-004`)

| ID | Nombre de Pantalla | URL / Endpoint | Propósito Funcional | Componentes Clave Observados |
|---|---|---|---|---|
| `SCR-022` | Colaboradores (Listado) | `placolaboradores.php` | Grid de búsqueda y gestión de empleados | Filtros por código, cédula, nombre, apellido, sucursal. Enlaces a sub-formularios (`placolaborador.php`, `placolaborador_vip.php`) |
| `SCR-023` | Ficha de Colaborador | `placolaborador.php` | Formulario integral con 110+ campos de RRHH | Datos personales, laborales, tributarios, bancarios, descuentos, historial salarial, vacaciones, cartas de trabajo |
| `SCR-024` | Turnos de Trabajo | `platurnos.php` | Asignación de turnos a colaboradores | Matriz de rotación y turnos asignados |
| `SCR-025` | Marcaciones de Reloj | `plamarcacion.php` | Importación e inspección de marcas de asistencia | 8 tablas de inspección, carga de archivos de reloj biométrico |
| `SCR-026` | Planilla Quincenal | `plaquincenal.php` | Procesamiento central de nómina quincenal | Generación de cálculos, cierre de nómina, exportación a 8 bancos (BAC, Banistmo, General, Banesco, Multibank, Credicorp, Caja de Ahorros), 20+ reportes PDF/XLS |
| `SCR-027` | Servicios Profesionales | `plaservprof.php` | Planilla de honorarios y contratos profesionales | Retención de 10% ISR y exportación específica |
| `SCR-028` | Transacciones Sin Reloj | `platransac.php` | Captura directa de horas ordinarias y extras | Grid de digitación masiva rápida |
| `SCR-029` | Horas Extra por Pagar | `platransac2.php` | Liquidación de sobretiempos, domingos y feriados | Recargos del 25%, 50%, 75%, 150% según legislación panameña |
| `SCR-030` | Incapacidades y Ausencias | `plaincapacidades.php` | Registro de licencias médicas, CSS y permisos | Control de días acumulados del fondo de incapacidad (18 días anuales) |
| `SCR-031` | Vacaciones | `plavacaciones.php` | Programación, cálculo y emisión de vacaciones | Cálculo sobre promedio de salarios de los últimos 11 meses (30 días por cada 11 meses) |
| `SCR-032` | Décimo Tercer Mes (XIII) | `plaxiiimes.php` | Liquidación de las 3 partidas del XIII mes (Abril, Agosto, Diciembre) | Cálculo de 1 día de salario por cada 11 días de trabajo efectivo |
| `SCR-033` | Proyección XIII Mes | `xlsproyeccionxiii.php` | Estimación presupuestaria del décimo | Exportador Excel de provisiones |
| `SCR-034` | Ajustes de Renta (ISR) | `plajustesrenta.php` | Recálculo y regularización de retenciones DGI | Ajustes anuales o de fin de período |
| `SCR-035` | Ajustes de Retenciones | `plajusteseg.php` | Ajustes manuales de CSS y Seguro Educativo | Correcciones de cuotas patronales/obreras |
| `SCR-036` | Otros Ingresos | `plaotrosing.php` | Bonificaciones, comisiones, dietas y viáticos | Clasificación de gravable / no gravable a CSS/ISR |
| `SCR-037` | Ajustes de Descuentos | `plajustes.php` | Modificación de saldos en préstamos y acreedores | Abonos directos y condonaciones |
| `SCR-038` | Planilla Extraordinaria | `plaextraord.php` | Pagos especiales fuera de ciclo quincenal | Bonos anuales, incentivos |
| `SCR-039` | Recargos Construcción | `platransaccontruc.php` | Régimen especial CAPAC-SUNTRACS | Recargos de altura, agua, turnos especiales |
| `SCR-040` | Ajuste Horas Laboradas | `plajustehoras.php` | Modificación puntual de horas auditadas | Correcciones de tarjeta de tiempo |

---

## 5. Módulo 05: Liquidaciones Laborales (`MOD-005`)

| ID | Causal / Tipo de Salida | URL / Endpoint | Base Legal (Código de Trabajo de Panamá) |
|---|---|---|---|
| `SCR-041` | Vencimiento de Contrato | `plaliquida.php?mod=vc` | Contratos a término definido |
| `SCR-042` | Menos de 2 Años | `plaliquida.php?mod=md` | Artículo 212 |
| `SCR-043` | Mutuo Consentimiento | `plaliquida.php?mod=mc` | Artículo 210, Numeral 1 |
| `SCR-044` | Muerte del Trabajador | `plaliquida.php?mod=mm` | Artículo 210, Numeral 4 |
| `SCR-045` | Decisión del Empleador | `plaliquida.php?mod=du` | Artículo 210, Numeral 8 |
| `SCR-046` | Renuncia Voluntaria | `plaliquida.php?mod=re` | Renuncia con previo aviso formal |
| `SCR-047` | Renuncia Sin Previo Aviso | `plaliquida.php?mod=r2` | Deducción de preaviso de 1 semana según Art. 222 |
| `SCR-048` | Despido Justificado (Disciplina) | `plaliquida.php?mod=d1` | Artículo 213, Acápite A |
| `SCR-049` | Despido Justificado (Incapacidad) | `plaliquida.php?mod=d2` | Artículo 213, Acápite B |
| `SCR-050` | Despido Justificado (Económica) | `plaliquida.php?mod=d3` | Artículo 213, Acápite C |
| `SCR-051` | Despido Antes del Término | `plaliquida.php?mod=d4` | Artículo 227 (Pago de salarios restantes) |
| `SCR-052` | Período Probatorio | `plaliquida.php?mod=p1` | Artículo 78 (Hasta 3 meses de prueba) |
| `SCR-053` | Consulta de Liquidaciones | `liqconsul.php` | Historial de finiquitos procesados |
| `SCR-054` | Ajuste ISR Liquidaciones | `liqisr.php` | Cálculo de impuesto sobre la renta en indemnizaciones |
| `SCR-055` | Liquidaciones Estimadas | `reservaliq.php` | Proyección de pasivo laboral |
| `SCR-056` | Reporte Liquidaciones Emitidas | `repliquidaciones.php` | Listado formal de finiquitos y pagos |
| `SCR-057` | Revertir Liquidación | `plaliqdel.php` | Anulación y reapertura de expediente de colaborador |

---

## 6. Módulo 06: Catálogo de Reportes (`MOD-006`)

| ID | Nombre de Reporte | URL / Endpoint | Destinatario / Propósito |
|---|---|---|---|
| `SCR-058` | Horarios Individual | `rephorarios.php` | Operativo / Turnos de un colaborador |
| `SCR-059` | Horarios Mensual | `rephoratot.php` | Operativo / Programación mensual general |
| `SCR-060` | Horarios Semanal | `rephorasem.php` | Operativo / Programación semanal |
| `SCR-061` | Lista de Colaboradores | `repcolabora.php` | RRHH / Directorio general y estatus |
| `SCR-062` | Estadística Salarial | `repcolabsal.php` | Gerencial / Distribución por escalas |
| `SCR-063` | Rotación / Novedades | `repcolabrota.php` | RRHH / Altas, bajas y rotación |
| `SCR-064` | Detalle de Vacaciones | `repdetvacaciones.php` | RRHH / Días disfrutados vs pendientes |
| `SCR-065` | Incapacidades Mensuales | `repcolabinc2.php` | RRHH / Reporte de bajas médicas |
| `SCR-066` | Estadística Incapacidades | `repcolabinc.php` | Gerencial / Índices de morbilidad |
| `SCR-067` | Inasistencias Mensuales | `repinasistenmensual.php` | Control de asistencia |
| `SCR-068` | Inasistencias x Empleado | `repinasisten.php` | Expediente disciplinario |
| `SCR-069` | Incapacidades 24 Meses | `repincapacidades.php` | Auditoría de fondo de incapacidad |
| `SCR-070` | Ausentismo Global | `repausentismo.php` | Métricas de productividad |
| `SCR-071` | Descuentos Globales | `repdesctos.php` | Nómina / Total de deducciones aplicadas |
| `SCR-072` | Descuentos x Empleado | `repdesctoxcolab.php` | Auditoría de préstamos y embargos |
| `SCR-073` | Descuentos x Acreedor | `repdesxacre.php` | Conciliación de pagos a terceros |
| `SCR-074` | Pagos a Acreedores | `reppagacre.php` | Tesorería / Emisión de cheques/ACH a financieras |
| `SCR-075` | Marcaciones de Reloj | `repmarcaciones.php` | Auditoría de entradas y salidas biométricas |
| `SCR-076` | Pago por Hora Detalle | `repdetallepaghrx.php` | Verificación de liquidación horaria |
| `SCR-077` | Formulario 03 (DGI) | `repform03.php` | Informe tributario anual de retenciones de ISR de empleados |
| `SCR-078` | Saldos Mes/Año | `repsaldos.php` | Acumulados mensuales por colaborador |
| `SCR-079` | Saldos por Año | `repsalacu.php` | Acumulados anuales para cálculo de prestaciones |
| `SCR-080` | Salarios Pagados Año | `repsalpag.php` | Constancias salariales anuales |
| `SCR-081` | Detalle de Pago x Fecha | `repdetallepago.php` | Histórico detallado de pagos de nómina |
| `SCR-082` | Resumen de Nómina | `rep_resumen.php` | Total general de salarios, descuentos y cuotas patronales |
| `SCR-083` | Vacaciones Emitidas | `repvacaciones.php` | Registro formal para auditoría MITRADEL |
| `SCR-084` | Fondo de Cesantía | `repcesantia.php` | Cálculo de aporte del 1.92% (Ley 44 de 1995) |
| `SCR-085` | Reservas Cargas Sociales | `represervas.php` | Provisiones contables (Vacaciones 9.09%, XIII 8.33%, Cesantía, Prima) |
| `SCR-086` | Servicios Profesionales | `replaniservprof.php` | Informe de retenciones de honorarios |
| `SCR-087` | Excel SIPE (CSS) | `rep_sipe.php` | Archivo estructurado para carga en la plataforma de la CSS |
| `SCR-088` | Asiento de Planilla | `repasiento.php` | Comprobante contable de débito/crédito para el Mayor General |
