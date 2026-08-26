# Documentación de Nomix

**Nomix — Nómina inteligente** · Plataforma de nómina para la República de Panamá

---

## Jerarquía de autoridad

Cuando dos documentos se contradigan, **gana el de mayor autoridad**:

| Nivel | Documento | Autoridad |
|---|---|---|
| 1️⃣ | [`nomix/06_base_legal_panama.md`](nomix/06_base_legal_panama.md) | **Normativa.** Fuente única de verdad para todo cálculo |
| 2️⃣ | [`nomix/08_decisiones_arquitectura.md`](nomix/08_decisiones_arquitectura.md) | **Arquitectura.** Decisiones técnicas vinculantes |
| 3️⃣ | [`nomix/01`](nomix/01_propuesta_mejora_planifacil.md) · [`nomix/02`](nomix/02_vision_producto_nomix_factor_wow.md) · [`nomix/03`](nomix/03_arquitectura_docker_seguridad_nomix.md) | **Propuesta y visión.** Dirección de producto |
| 4️⃣ | [`01`](01_application_overview.md) – [`07`](07_final_reverse_engineering_specification.md) | **Registro forense.** Lo observado en PlaniFácil — valor de alcance funcional, **no normativo** |

> ⚠️ **Los documentos `01`–`07` documentan lo que hace PlaniFácil, y parte de eso está desactualizado o es incorrecto.** No implementar reglas de cálculo a partir de ellos. Ver [`nomix/08`](nomix/08_decisiones_arquitectura.md) §0.

---

## Índice

### Base normativa y técnica

| Doc | Contenido |
|---|---|
| [`nomix/06_base_legal_panama.md`](nomix/06_base_legal_panama.md) | 🧠 **El cerebro.** Toda la normativa panameña verificada con fuentes: CSS, Seguro Educativo, ISR, jornadas y recargos, vacaciones, XIII Mes, incapacidades, terminación laboral, descuentos, salario mínimo. Incluye la configuración semilla en YAML |
| [`nomix/08_decisiones_arquitectura.md`](nomix/08_decisiones_arquitectura.md) | Los 10 ADR que definen el sistema |
| [`nomix/07_consultas_profesional_planilla.md`](nomix/07_consultas_profesional_planilla.md) | 📤 Cuestionario listo para enviar a un CPA / abogado laboralista / operador de nómina |

### Planificación

| Doc | Contenido |
|---|---|
| [`nomix/04_checklist_arranque_nomix.md`](nomix/04_checklist_arranque_nomix.md) | Qué información tenemos y qué falta, con estado actualizado |
| [`nomix/05_especificacion_pendiente_motor_planilla.md`](nomix/05_especificacion_pendiente_motor_planilla.md) | Huecos específicos de la lógica de planilla |

### Producto

| Doc | Contenido |
|---|---|
| [`nomix/01_propuesta_mejora_planifacil.md`](nomix/01_propuesta_mejora_planifacil.md) | Propuesta de modernización — 4 pilares |
| [`nomix/02_vision_producto_nomix_factor_wow.md`](nomix/02_vision_producto_nomix_factor_wow.md) | Los diferenciadores "Factor WOW" |
| [`nomix/03_arquitectura_docker_seguridad_nomix.md`](nomix/03_arquitectura_docker_seguridad_nomix.md) | Despliegue Docker, seguridad y respaldos |

### Registro de ingeniería inversa (PlaniFácil)

| Doc | Contenido |
|---|---|
| [`01_application_overview.md`](01_application_overview.md) | Visión general y stack observado |
| [`02_application_map.md`](02_application_map.md) | Las 88 pantallas catalogadas |
| [`03_entities_and_data_model.md`](03_entities_and_data_model.md) | Modelo de datos observado |
| [`04_payroll_and_liquidation_workflows.md`](04_payroll_and_liquidation_workflows.md) | Workflows de nómina y liquidación |
| [`05_api_and_endpoints_inventory.md`](05_api_and_endpoints_inventory.md) | 55+ endpoints |
| [`06_security_and_ux_findings.md`](06_security_and_ux_findings.md) | Hallazgos de seguridad y UX |
| [`07_final_reverse_engineering_specification.md`](07_final_reverse_engineering_specification.md) | Informe maestro |

---

## Estado del proyecto

| | |
|---|---|
| **Fase actual** | Arquitectura cerrada → lista para implementar |
| **Stack** | TypeScript · NestJS + React · PostgreSQL 16 con RLS · Docker sobre VPS |
| **Decisiones de arquitectura abiertas** | Ninguna — `ADR-001` a `ADR-012` aceptados |
| **Pendiente de diseño** | Máquina de estados de la planilla · roles y permisos (`GAP-005`) |
| **Bloqueado por terceros** | Layouts de ACH, SIPE y Formulario 03 — **desbloqueables desde la cuenta piloto** |

📄 **[`ARCHITECTURE.md`](../ARCHITECTURE.md)** — stack, modelo de datos y convenciones.
Lectura obligatoria antes de escribir código.

### Próximos pasos

1. 🔥 **Extraer datos de la cuenta piloto** — archivos ACH por banco, SIPE,
   Formulario 03, un talonario y una planilla completa. Desbloquea los dos únicos
   bloqueantes externos del proyecto y produce la suite de aceptación del motor.
2. 📤 Enviar [`nomix/07`](nomix/07_consultas_profesional_planilla.md) a un profesional de planilla
3. 🔓 Scaffolding del monorepo + regla de lint decimal
4. 🔓 Núcleo temporal de reglas y catálogo de conceptos (`ADR-001`, `ADR-002`, `ADR-003`)
5. ⏸️ Definir la máquina de estados de la planilla
6. ⏳ Descargar las 59 tasas de salario mínimo y las tarifas de Riesgos Profesionales

---

## Agentes del proyecto

Definidos en [`.claude/agents/`](../.claude/agents/), según la especificación de
`agentes-app-nomina.md`. Cada uno está anclado a los documentos de esta carpeta.

| Agente | Rol | Estado |
|---|---|---|
| `orquestador-pm` | Descompone requerimientos, coordina, vigila dependencias | Transversal |
| `arquitecto-soluciones` | Decide el stack y produce `ARCHITECTURE.md` | ⏸️ **Siguiente en ejecutar** |
| `legal-laboral-panama` | Reglas legales panameñas | 🟡 Base hecha; cierra huecos abiertos |
| `seguridad-datos` | Roles, permisos, Ley 81 | 🔴 `GAP-005` sin avance — le pertenece |
| `backend-nomina` | Motor de cálculo y APIs | ⏸️ Espera `ARCHITECTURE.md` |
| `frontend-ux` | Dashboard RRHH + portal del colaborador | ⏸️ Espera `ARCHITECTURE.md` |
| `qa-calculos` | Exactitud numérica y legal | Continuo |
| `devops-infra` | CI/CD, respaldos, monitoreo | Paralelo, bloqueante antes de producción |
| `documentacion-producto` | Mantiene esta carpeta sincronizada | Continuo |

> **Orden obligatorio:** `arquitecto-soluciones` produce `ARCHITECTURE.md` antes de
> que backend, frontend o devops escriban una línea de código.

---

## Convenciones

- **Ningún número legal se escribe en el código.** Todo vive en configuración versionada por fecha de vigencia, sembrada desde [`nomix/06`](nomix/06_base_legal_panama.md). Ver `ADR-001`.
- **Todo cambio normativo se registra primero en [`nomix/06`](nomix/06_base_legal_panama.md)**, con su fecha de vigencia, y de ahí se propaga. Nunca al revés.
- Los datos llevan marca de confianza: ✅ VERIFICADO · ⚠️ VERIFICAR · ❓ PENDIENTE.
- Prefijos de identificación: `APP-` `MOD-` `SCR-` `WF-` `API-` `ENT-` `FIND-` `GAP-` `DEC-` `ADR-`.
