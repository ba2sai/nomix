# APP-001: Evaluación Defensiva de Seguridad y Usabilidad (UX)

**Documento:** `06_security_and_ux_findings.md`  
**Estado:** `OBSERVED` & `CONFIRMED`  
**Metodología:** OWASP Web Security Testing Guide (Defensivo) & Nielsen Norman Usability Heuristics

---

## 1. Matriz de Hallazgos de Seguridad Defensiva (`FIND-xxx`)

| ID | Categoría | Severidad | Componente Afectado | Descripción | Recomendación |
|---|---|---|---|---|---|
| `FIND-001` | CSRF | **Medium** | Formularios internos de `app.planifacil.com/empresas/` | Aunque el login en `www.planifacil.com` utiliza token `_token`, los formularios internos de la aplicación en PHP dependen exclusivamente de cookies `PHPSESSID` sin tokens anti-CSRF por petición. | Implementar tokens CSRF sincronizados (`X-CSRF-TOKEN` o campos ocultos) en todos los formularios de guardado (`placolaborador.php`, `savempre.php`, `save_descto.php`). |
| `FIND-002` | HTTP Headers | **Low** | Cabeceras de Servidor Web | Ausencia de cabeceras de seguridad modernas como `Content-Security-Policy` (CSP) y `Strict-Transport-Security` (HSTS). | Configurar CSP estricto y habilitar HSTS en el servidor web NGINX/Apache. |
| `FIND-003` | Cookie Security | **Low** | Cookies de Sesión (`PHPSESSID`) | La cookie de sesión `PHPSESSID` se envía con el atributo `SameSite=Lax` pero debe asegurarse la bandera `Secure` y `HttpOnly` en todas las rutas. | Configurar `session.cookie_secure = true` y `session.cookie_httponly = true` en `php.ini`. |
| `FIND-004` | Control de Acceso (IDOR) | **Medium** | Parámetros de consulta `id2`, `id_empresa` | En varias pantallas (`mod_empresa.php`, `mantsucursal.php`), los identificadores se transmiten en parámetros numéricos secuenciales. | Validar siempre a nivel de sesión que el `id_empresa` y el `id_colaborador` pertenezcan a la empresa y permisos autorizados para el usuario activo en el backend. |

---

## 2. Matriz de Hallazgos de Usabilidad y UX/UI (`UX-xxx`)

| ID | Heurística / Área | Severidad | Pantalla / Módulo | Problema Observado | Impacto en el Usuario | Recomendación de Modernización |
|---|---|---|---|---|---|---|
| `UX-001` | Diseño Responsivo | **High** | Contenedor Global (`index.php`) | Estructura fija en tabla HTML de `1200px` sin soporte para pantallas móviles o tablets. | Dificultad para operar la aplicación desde dispositivos móviles o laptops pequeñas sin scroll horizontal forzado. | Migrar el contenedor principal a un layout moderno CSS Grid / Flexbox responsivo. |
| `UX-002` | Iframe Container | **Medium** | Contenedor de Ejecución (`#ejecucion`) | Todas las pantallas operativas se renderizan dentro de un `<iframe>` de altura fija (`1400px`), generando dobles barras de desplazamiento. | Experiencia de navegación inconsistente y pérdida de contexto de la URL al refrescar. | Migrar a Single Page Application (SPA) con React / Vue o enrutamiento estándar multi-página sin iframes. |
| `UX-003` | Carga Cognitiva | **High** | Ficha de Colaborador (`placolaborador.php`) | Formulario monolítico masivo con más de 110 campos en una sola vista continua. | Sobrecarga de información, fatiga visual y riesgo de errores de captura. | Dividir la ficha en un Wizard o Tabs lógicos: (1) Datos Personales, (2) Contrato y Salario, (3) Horarios y Turnos, (4) Bancos y ACH, (5) Descuentos. |
| `UX-004` | Codificación de Caracteres | **Low** | Todo el sistema | Cabeceras HTML declaran `charset=iso-8859-1` (Latin-1) mientras ciertas exportaciones usan UTF-8. | Ocasional corrupción de caracteres con tildes, letras ñ o símbolos monetarios. | Estandarizar toda la aplicación, base de datos y salidas a `UTF-8` nativo. |
| `UX-005` | Feedback Visual | **Medium** | Acciones de Guardado | Bloqueo de pantalla con `$.blockUI()` genérico sin notificaciones toast o mensajes de éxito contextuales. | El usuario no recibe confirmaciones claras con animación de estado de éxito o detalles de validación. | Implementar sistema de notificaciones Toast (ej. SweetAlert2 / Toaster). |
