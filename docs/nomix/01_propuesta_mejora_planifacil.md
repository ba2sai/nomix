# APP-001: Propuesta Estratégica de Modernización e Ingeniería para PlaniFácil

**Documento:** `propuesta_mejora_planifacil.md`  
**Autor:** Antigravity AI  
**Estado:** `ACCEPTED` (stack cerrado; ver [00_decisiones_stack_nomix.md](00_decisiones_stack_nomix.md))  
**Referencia Base:** Diagnóstico de Ingeniería Inversa (`01_application_overview.md` - `07_final_reverse_engineering_specification.md`)  
**Jurisdicción Legal:** República de Panamá (Código de Trabajo, DGI, CSS/SIPE, MITRADEL)

---

## Executive Summary

Tras el análisis defensivo y la ingeniería inversa efectuada sobre la plataforma **PlaniFácil** (`APP-001`), se concluye que el sistema posee una **lógica de negocio madura y altamente alineada con la legislación laboral panameña** (manejo de retenciones CSS/DGI, partidas de XIII mes, liquidaciones según Art. 212/213/224/225 y generador ACH multi-banca). Sin embargo, presenta **deuda técnica considerable** en la capa de presentación (layout fijo `1200px` en `<iframe>`, formularios monolíticos de 110+ campos), acoplamiento procesal en PHP legado (`.php` monolíticos), y riesgos de seguridad defensiva (ausencia de anti-CSRF en endpoints internos, IDs secuenciales propensos a IDOR y codificación `iso-8859-1`).

Este documento detalla la propuesta integral de modernización estructurada en 4 pilares estratégicos: **Stack Tecnológico**, **Interfaz y Experiencia de Usuario (UI/UX)**, **Lógica de Negocio y Reglas Panamá**, y **Seguridad Defensiva**.

---

## 1. Pillar 1: Stack Tecnológico y Arquitectura

### 1.1 Estado Actual (`OBSERVED`)
- **Arquitectura:** Monolito PHP procedimental en pila LAMP legado (`plaquincenal.php`, `plaliquida.php`, `placolaborador.php`).
- **Contenedor UI:** HTML en tablas fijas (`1200px`) cargadas dentro de un `<iframe>` (`#ejecucion` de `1400px`).
- **Frontend Client:** jQuery 1.10.2, jQuery UI, jQuery BlockUI.
- **Exportaciones:** FPDF/TCPDF y PHPSpreadsheet síncronos en el hilo HTTP principal.

### 1.2 Arquitectura Propuesta: Headless REST/GraphQL API + Modern SPA Client

```mermaid
graph TD
    subgraph Frontend ["Capa de Presentación (SPA Client)"]
        SPA["React 18 + Vite (TypeScript)"]
        UI["Tailwind CSS + Shadcn UI"]
        STATE["TanStack Query (React Query)"]
    end

    subgraph API ["Capa de Servicios & API (Backend)"]
        GATEWAY["API Gateway / Middleware Auth (Laravel Sanctum SPA + 2FA)"]
        PE["Motor de Nómina (PHP 8.3 / Laravel 11 DDD)"]
        QUEUE["Redis Queue + Horizon Workers"]
    end

    subgraph Data ["Capa de Datos & Servicios Externos"]
        DB[(PostgreSQL 16 - UTF-8 + RLS)]
        S3["Almacenamiento de Reportes PDF/ACH (S3 / Encrypted Vault)"]
        BIO["Servicio de Integración Biométrica (Webhooks)"]
    end

    SPA -->|HTTPS REST / JSON| GATEWAY
    GATEWAY --> PE
    PE --> DB
    PE --> QUEUE
    QUEUE --> S3
    BIO --> GATEWAY
```

### 1.3 Matriz de Decisión y Justificación Técnica

| Componente | Selección Recomendada | Alternativa Considerada | ¿Por qué esta decisión? (Rationale) |
|---|---|---|---|
| **Backend Framework** | **Laravel 11+ / PHP 8.3 (Clean Arch / DDD)** | Node.js (NestJS) — descartado | Un solo framework cubre API, colas, autenticación, autorización y generación de PDFs/Excel. Arquitectura limpia con Type Hinting, Enums y DTOs estrictos. No hay código PHP de PlaniFácil que reutilizar: la lógica tributaria se modela desde la legislación panameña (ver `00_decisiones_stack_nomix.md`, sección 4). |
| **Frontend Framework** | **React 18 + Vite + TypeScript (SPA)** | Next.js / Vue 3 + Inertia.js — descartados | Elimina definitivamente la dependencia de `<iframe>`. Brinda tipado estricto para evitar errores en campos de nómina y permite renderizado reactivo e instantáneo. Al ser una aplicación autenticada de uso interno no requiere SEO ni SSR; el build estático se sirve con Nginx sin operar un servidor Node. |
| **Diseño UI / CSS** | **Tailwind CSS + Shadcn UI / Radix UI** | Bootstrap 5 | Shadcn/Tailwind permite construir interfaces modernas, accesibles, totalmente responsivas (móvil/desktop) y personalizables con baja sobrecarga de bundle CSS. |
| **Base de Datos** | **PostgreSQL 16 (UTF-8)** | MySQL 8.0 | PostgreSQL ofrece un manejo superior de tipos numéricos exactos (`NUMERIC`/`DECIMAL` para cálculos de centavos en planilla), transacciones complejas e indexación JSONB para configuraciones de acreedores. |
| **Tareas Asíncronas** | **Redis (instancia única en MVP) + Laravel Horizon** | Procesamiento Síncrono PHP | La generación de lotes ACH multi-banca, reportes SIPE y PDFs de planillas masivas se mueven a colas en segundo plano, liberando el hilo HTTP y eliminando timeouts. |
| **Autenticación** | **Laravel Sanctum (SPA, cookies `httpOnly` + CSRF) + 2FA** | OAuth2 / Passport | No se guardan tokens en el navegador. OAuth2 solo se justifica si se expone una API a terceros. |
| **Infraestructura** | **Docker Compose + Traefik/NGINX + Cloudflare** | Kubernetes / Swarm | Suficiente para el MVP con CI/CD y *rolling updates*; se evita la complejidad de K8s hasta que se justifique. |

---

## 2. Pillar 2: Interfaz y Experiencia de Usuario (UI/UX)

### 2.1 Hallazgos Actuales (`UX-001` a `UX-005`)
1. `UX-001`: Ancho fijo de `1200px` destruye la operabilidad en laptops y tabletas.
2. `UX-002`: Contenedor `<iframe>` fuerza doble barra de desplazamiento y pierde URLs navegables.
3. `UX-003`: Formularios monolíticos de 110+ campos (`placolaborador.php`) producen fatiga cognitiva y errores de digitación.
4. `UX-004`: Codificación `iso-8859-1` corrompe caracteres con tildes y eñes.
5. `UX-005`: Uso de `$.blockUI()` genérico congela la pantalla sin feedback progresivo.

### 2.2 Propuesta de Rediseño UI/UX

#### A. Wizard Modular para la Ficha del Colaborador (`placolaborador.php`)
Reorganizar los 110+ campos en un **Stepper / Wizard interactivo de 5 pasos**:

```mermaid
graph LR
    P1["1. Datos Personales<br/>(Cédula, Tipo Sangre, Contacto)"] --> P2["2. Contrato & Cargo<br/>(Fecha Ingreso, Tipo Contrato, Depto)"]
    P2 --> P3["3. Salario & Banco<br/>(Salario Base, Tipo Pago, Cuenta ACH)"]
    P3 --> P4["4. Horario & Turno<br/>(Horario Fijo/Rotativo, Reloj)"]
    P4 --> P5["5. Retenciones & Acreedores<br/>(ISR, Préstamos, Descuentos)"]
```

#### B. Layout Responsivo Moderno (Sidebar + Content Workspace)
- Sustituir `#cssmenu` y el `<iframe>` por un layout responsivo estándar con **Sidebar retráctil**, **Header con buscador global (Cmd+K)** y un **Workspace fluido con auto-scroll**.
- Implementar **Live Preview Calculations**: Al ajustar un salario base u horas extras en la pantalla, mostrar un cálculo en tiempo real de los aportes CSS (9.75%), SE (1.25%) e ISR estimado.

#### C. Sistema de Feedback y Notificaciones
- Reemplazar `$.blockUI()` por **Skeleton Loaders** durante la carga de datos y **Sonner / Toast Notifications** para confirmaciones de guardado.
- Para operaciones extensas (ej. Cálculo Quincenal o Exportación ACH), mostrar un **Progress Bar modal** impulsado por WebSockets / Server-Sent Events (SSE).

---

## 3. Pillar 3: Lógica de Negocio y Reglas Panamá

### 3.1 Hallazgos de Lógica Actual (`WF-001` a `WF-004`)
- Los cálculos de Seguro Social (9.75% / 12.25%), Seguro Educativo (1.25% / 1.50%), ISR DGI (tabla progresiva anual / 24 quincenas), XIII Mes (3 partidas) y Liquidaciones (Art. 212, 213, 224, 225) están **mezclados con código HTML/SQL** en archivos procedimentales.

### 3.2 Estrategia de Modernización de Lógica

> **Fuente de verdad:** no se dispone del código fuente de PlaniFácil. Las fórmulas se extraen del Código de Trabajo, la Ley Orgánica de la CSS, el Código Fiscal (ISR) y la normativa del Seguro Educativo, con tasas y tramos parametrizados por fecha de vigencia. Los porcentajes citados en este documento provienen de PlaniFácil (`OBSERVED`) y deben verificarse contra la legislación vigente. Ver `00_decisiones_stack_nomix.md`, sección 4.

#### A. Patrón Domain Service & Calculation Engine (Pure Functions)
> **Regla:** toda cifra monetaria usa decimales exactos (`brick/math` o `bcmath`) y `NUMERIC` en PostgreSQL. Nunca `float`.

Aislar las fórmulas de nómina en **Clases puras desacopladas de la base de datos y la vista**, permitiendo Pruebas Unitarias automatizadas (`100% Code Coverage`):

```php
// Ejemplo de interfaz de Dominio para Panamá
interface PanamaTaxCalculatorInterface {
    // Money: decimal exacto (brick/math o bcmath). Nunca float.
    public function calculateCSS(Money $grossSalary): DeductionResult;
    public function calculateSE(Money $grossSalary): DeductionResult;
    public function calculateISR(Money $annualEstimatedIncome, int $dependents, bool $hasSpouse): DeductionResult;
    public function calculateLiquidation(Colaborador $colaborador, CausalSalida $causal, DateTime $fechaCese): LiquidationResult;
}
```

#### B. Patrón Strategy para Generación de Archivos ACH Multi-Banco
En lugar de scripts aislados (`xls_ach_bac.php`, `gen_ach_banistmo.php`), implementar una estrategia unificada con adaptadores por entidad financiera:

```mermaid
graph TD
    ENGINE["Motor de Nómina"] --> FACTORY["ACHExporterFactory"]
    FACTORY --> AD1["BAC Credomatic Adapter (TXT/XLS)"]
    FACTORY --> AD2["Banistmo Adapter (CSV/ISO20022)"]
    FACTORY --> AD3["Banco General Adapter (PAIN.001)"]
    FACTORY --> AD4["Global Bank Adapter (Fixed-Width)"]
```

#### C. Motor de Reglas de Sobretiempo y Convenios Colectivos
- Implementar un motor de reglas parametrizable para recargos de horas extras según el Código de Trabajo de Panamá:
  - **Diurna (+25%)**
  - **Nocturna (+50%)**
  - **Mixta (+50% o +75%)**
  - **Día de Fiesta / Duelo Nacional (+150%)**
  - **Horas Excedentes en Día de Fiesta (+150% + 50%)**
- Permitir configuraciones personalizadas por empresa para recargos superiores a los de ley (Convenios Colectivos).

---

## 4. Pillar 4: Seguridad Defensiva y Protección de Datos

### 4.1 Matriz de Hallazgos y Soluciones Defensivas

| ID | Hallazgo Observado (`FIND-xxx`) | Severidad | Solución Defensiva Propuesta | Impacto de la Mejora |
|---|---|---|---|---|
| `FIND-001` | Formularios sin token Anti-CSRF en `app.planifacil.com/empresas/` | **Medium** | Protección CSRF de Laravel Sanctum (modo SPA, cookie `XSRF-TOKEN` + cabecera `X-XSRF-TOKEN`) en todas las peticiones POST/PUT/DELETE. | Previene ataques de falsificación de peticiones en acciones críticas como modificar cuentas ACH o aprobar planillas. |
| `FIND-002` | Faltan cabeceras HTTP de seguridad (CSP, HSTS, X-Frame-Options) | **Low** | Configuración estricta de NGINX/Cloudflare: `Strict-Transport-Security: max-age=31536000`, `X-Frame-Options: DENY`, `Content-Security-Policy`. | Evita ataques de Clickjacking, man-in-the-middle y ejecuciones de scripts no autorizados (XSS). |
| `FIND-003` | Atributos de Cookie de Sesión inseguros (`Secure`, `HttpOnly`) | **Low** | Forzar `session.cookie_secure = true`, `session.cookie_httponly = true`, `SameSite = Strict`. | Protege las galletas de sesión de ser interceptadas en redes Wi-Fi no cifradas o leídas vía JavaScript malicioso. |
| `FIND-004` | Identificadores secuenciales expuestos (`id2`, `id_empresa`) propensos a IDOR | **Medium** | 1. Reemplazar IDs enteros por **UUIDv4** o **Hashids**.<br/>2. Imponer `TenantScope Middleware` (Global Scope por `id_empresa` de la sesión). | Garantiza que un usuario de la Empresa A no pueda consultar ni modificar colaboradores de la Empresa B alterando la URL. |
| **NUEVO** | Datos sensibles de colaboradores almacenados en texto plano | **High** | Cifrado a nivel de aplicación (AES-256-GCM) para campos PII: Cédula, Número de Cuenta Bancaria y Salario Base, con *blind index* para búsquedas por cédula y claves en KMS. | Cumplimiento estricto con la Ley 81 de Protección de Datos Personales de la República de Panamá. |
| **NUEVO** | Ausencia de Trail de Auditoría inmutable | **Medium** | Implementar `AuditLogService` que registre: Usuario, Fecha/Hora, IP, Acción, Valor Anterior, Valor Nuevo. | Permite auditorías forenses exigidas por firmas contables y autoridades fiscales (DGI/MITRADEL). |

## 5. Integración de n8n: Automatización de Workflows y Conectividad Externa

> **Decisión D-11:** n8n queda **aplazado a post-MVP**. Esta sección describe el diseño objetivo para cuando se incorpore (fase posterior al lanzamiento inicial), no el alcance del MVP.

**n8n** (plataforma open-source de orquestación y automatización de flujos de trabajo) tiene un **lugar estratégico y de altísimo valor** en el ecosistema de **PlaniFácil**, actuando como el **motor de integración asíncrono y notificaciones**.

```mermaid
graph TD
    subgraph Core ["PlaniFácil Core (API Rest)"]
        API["API Core (Nómina & DB)"]
    end

    subgraph n8n ["n8n Workflow Engine"]
        WEBHOOK["Webhook Listener"]
        CRON["Cron Triggers"]
        NOTIF["Notificaciones (Email / WhatsApp / Telegram)"]
        ERP["Conectores ERP (QuickBooks / SAP / Odoo)"]
        BIO_SYNC["Ingesta Biométrica / Relojes"]
    end

    API -->|Webhook: PlanillaAprobada| WEBHOOK
    WEBHOOK --> NOTIF
    WEBHOOK --> ERP
    CRON --> API
    BIO_SYNC --> API
```

### 5.1 Casos de Uso Concretos para n8n en PlaniFácil

1. **Envío Masivo de Comprobantes de Pago (Talonarios) y Notificaciones:**
   - **Flujo:** Al aprobar una planilla quincenal, la API emite un evento Webhook a n8n.
   - **Acción n8n:** n8n descarga los PDFs de comprobantes de pago de forma asíncrona y los distribuye a cada colaborador por correo electrónico (SMTP/Resend) y WhatsApp, liberando al servidor principal de enviar cientos de correos síncronos.

2. **Ingesta e Integración con Relojes Marcadores Biométricos:**
   - **Flujo:** Relojes de control de asistencia (ZKTeco, Hikvision, Anviz) o servicios en la nube (Toggl, Clockify, Google Sheets).
   - **Acción n8n:** n8n realiza llamadas periódicas o recibe webhooks de los relojes en sucursales, transforma las marcaciones (Cédula, Hora Entrada/Salida) al formato estándar de PlaniFácil y las inyecta en la API `/api/v1/marcaciones`.

3. **Alertas de Cumplimiento Legal y RRHH (Cron Workflows):**
   - **Vencimiento de Contratos:** Tarea programada diaria en n8n que consulta contratos definidos que vencen en los próximos 15 a 30 días y notifica al departamento de RRHH por Slack/WhatsApp.
   - **Recordatorio de Vencimientos Fiscales:** Notificaciones 3 días antes de la fecha límite de presentación del SIPE (CSS) y Formulario 03 (DGI).
   - **Acumulación Excesiva de Vacaciones:** Alertas sobre colaboradores con más de 30 días de vacaciones no gozadas.

4. **Integración B2B con ERPs y Contabilidad de Clientes:**
   - **Flujo:** Generación del asiento contable de nómina (`repasiento.php`).
   - **Acción n8n:** n8n recibe el payload JSON del asiento contable y lo transforma para enviarlo automáticamente a APIs de sistemas contables como **QuickBooks Online, SAP Business One, Odoo, Zoho Books o Xero**.

### 5.2 Regla de Frontera: ¿Qué NO debe hacer n8n?
- ❌ **No calcular impuestos, neto ni prestaciones:** Los cálculos matemáticos del Seguro Social, Seguro Educativo, ISR y Liquidaciones **DEBEN** ser ejecutados de forma determinista y estricta en el Backend Core de PlaniFácil (Laravel).
- ❌ **No reemplazar la base de datos principal:** n8n no almacena el estado maestro de los colaboradores, solo orquesta mensajes y payloads en tránsito.

---

## 6. Plan de Ejecución Continuo y Hoja de Ruta (Roadmap)

```mermaid
gantt
    title Hoja de Ruta de Modernización PlaniFácil (6 Meses)
    dateFormat  YYYY-MM-DD
    section Fase 1: Arquitectura & Backend Core
    Estructuración Laravel 11 / DB PostgreSQL / API REST :2026-09-01, 45d
    Modelado de Reglas desde la Ley & Testing Legal     :2026-09-15, 60d
    section Fase 2: Rediseño Frontend & UI/UX
    Layout Responsivo Tailwind + React SPA Client       :2026-10-15, 45d
    Wizard Ficha Colaborador & Live Calculator          :2026-11-01, 30d
    section Fase 3: Seguridad & Módulos Avanzados
    Sanctum SPA + 2FA / UUIDs / Cifrado Ley 81          :2026-11-15, 30d
    Exportadores ACH Multi-Banco                         :2026-12-01, 30d
    section Fase 4: QA, Migración & Despliegue
    QA Automatizado (PHPUnit + Playwright E2E)          :2027-01-01, 30d
    Migración Gradual & Salida a Producción             :2027-01-15, 30d
```

---

## 7. Conclusión y Recomendación Final

Al no disponer del código fuente de **PlaniFácil**, las reglas fiscales y laborales panameñas se modelarán desde la legislación vigente, con trazabilidad por artículo, tablas con vigencia por fecha y validación profesional. Además, el plan se enfoca en **desacoplar el frontend del backend**, eliminar la fragilidad del contenedor `<iframe>`, elevar la experiencia de usuario a estándares modernos responsivos y cerrar las brechas de seguridad defensiva y privacidad de datos (Ley 81 de Panamá). La incorporación posterior de **n8n** (post-MVP) completará la solución con el envío masivo de comprobantes, alertas automáticas de RRHH y conectividad B2B con sistemas contables externos.

