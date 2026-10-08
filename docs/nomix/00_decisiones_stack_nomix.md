# Registro de Decisiones de Stack: Nomix

**Documento:** `00_decisiones_stack_nomix.md`  
**Proyecto:** **Nomix - Nómina inteligente**  
**Estado:** `ACCEPTED`  
**Alcance:** Este documento es la fuente de verdad del stack. Si otro documento de `docs/nomix/` lo contradice, prevalece este.

---

## 1. Stack Final (MVP)

```
Frontend:   React 19 + Vite + TypeScript + Tailwind CSS + Shadcn UI + TanStack Query
Backend:    Laravel 11+ / PHP 8.3+ (Clean Arch / DDD ligero) + Laravel Sanctum (modo SPA)
Datos:      PostgreSQL 16 (Row-Level Security) + Redis (colas con Laravel Horizon)
Seguridad:  AES-256-GCM + blind index, KMS gestionado, 2FA, auditoría inmutable
Infra:      Docker Compose + Traefik/NGINX + Cloudflare (WAF/DDoS)
Respaldos:  WAL-G / pgBackRest → S3 cifrado (PITR)
```

## 2. Decisiones y Justificación

| # | Tema | Decisión | Alternativa descartada | Justificación |
|---|---|---|---|---|
| D-01 | Backend | **Laravel 11+ / PHP 8.3+** | NestJS | Un solo framework cubre API, colas (Horizon), autenticación (Sanctum), autorización, migraciones y generación de PDFs/Excel, lo que reduce la complejidad del MVP. Tiene librerías maduras de decimales exactos (`brick/math`, `bcmath`). **Nota:** no existe código PHP de PlaniFácil que reutilizar; la lógica fiscal se modela desde la legislación (ver sección 4). |
| D-02 | Frontend | **React 19 + Vite + TypeScript (SPA)** | Next.js | Es una aplicación autenticada de uso interno: no necesita SEO ni SSR. El build estático se sirve con Nginx, sin operar un servidor Node en producción. Menor superficie de ataque. **Versión:** se aprobó React 19 en lugar de 18 el 7 de octubre de 2026, durante NMX-003 (ver D-13). |
| D-03 | Autenticación | **Laravel Sanctum (SPA con cookies `httpOnly` + CSRF)** + 2FA desde el inicio | OAuth2 / Passport | No se guardan tokens en el navegador. OAuth2 solo hará falta si se expone una API a terceros (fase posterior). |
| D-04 | Infraestructura | **Docker Compose** con CI/CD y *rolling updates* | Kubernetes / Swarm | K8s agrega complejidad que el MVP no justifica. Se mantienen imágenes versionadas y configuración 12-factor para migrar después. |
| D-05 | Base de datos | **PostgreSQL 16 con RLS** | MySQL 8.0 | Tipos numéricos exactos, transacciones robustas, JSONB y aislamiento multi-inquilino a nivel de motor. |
| D-06 | Réplica de lectura | **Fase 2** | Réplica desde el MVP | Para el MVP basta el primario con PITR bien probado. |
| D-07 | Cifrado PII | **AES-256-GCM en la aplicación + blind index** para búsquedas (p. ej. cédula) | Cifrado solo en disco | Un campo cifrado no se puede filtrar ni ordenar en SQL; el blind index (hash con clave) permite buscar sin exponer el dato. |
| D-08 | Claves | **KMS gestionado (AWS KMS)** | HashiCorp Vault autooperado | Evita operar y asegurar un servicio crítico adicional. |
| D-09 | Redis | **Instancia única** en el MVP | Sentinel | Sentinel se agrega cuando haya requisitos de alta disponibilidad. |
| D-10 | Estado en cliente | **Solo TanStack Query**; Zustand si hace falta estado local complejo | TanStack Query + Zustand desde el inicio | Menos dependencias hasta que haya una necesidad real. |
| D-11 | n8n | **Aplazado a post-MVP** | Incluido en el MVP | No es necesario para el MVP y agrega superficie de ataque en un sistema de nómina. |
| D-12 | Cloudflare WAF | **Se mantiene** | — | Costo bajo y valor alto en protección y DDoS. |
| D-13 | Versión de React | **React 19** (con React Router 8) | React 18 con React Router 7 | Aprobada por el dueño del producto el 7 de octubre de 2026, a raíz de la revisión cruzada de NMX-003. React 19 es la versión estable vigente y la que exigen React Router 8 y los componentes actuales de shadcn/ui. Quedarse en 18 obligaba a fijar versiones anteriores desde el primer día. No había código que migrar. |

## 3. Reglas Técnicas Derivadas

1. **Aritmética monetaria exacta:** todos los cálculos de nómina usan decimales exactos (`brick/math` o `bcmath`) y `NUMERIC` en PostgreSQL. **Nunca `float`.**
2. **Cálculos solo en el backend:** impuestos, neto, prestaciones y liquidaciones se calculan de forma determinista en Laravel. El frontend solo muestra resultados (incluida la vista previa en vivo, que consulta al backend).
3. **Multi-inquilino:** RLS en PostgreSQL más `TenantScope` en la aplicación (defensa en profundidad).
4. **Sin estado en contenedores:** archivos y reportes van a S3 o volúmenes montados.

## 4. Fuente de la Lógica Fiscal y Laboral

**No se dispone del código fuente de PlaniFácil.** Los documentos `01`–`07` de `docs/` describen su comportamiento observado, pero no son fuente de verdad legal. Toda regla de cálculo se extrae de la normativa panameña vigente:

| Dominio | Fuente normativa |
|---|---|
| Salarios, jornadas, sobretiempo, vacaciones, XIII mes, prima de antigüedad, indemnizaciones y liquidaciones | Código de Trabajo de Panamá y normas del MITRADEL |
| Cuotas de Seguro Social (obrero y patronal) y riesgos profesionales | Ley Orgánica de la CSS y sus reformas (incluida la reforma de 2025) |
| Seguro Educativo | Normativa vigente del Seguro Educativo |
| Impuesto sobre la Renta (ISR) de asalariados | Código Fiscal y reglamentación de la DGI |
| Protección de datos personales | Ley 81 de 2019 y su reglamento |

### 4.1 Reglas para modelar la lógica legal

1. **Trazabilidad:** cada regla en código cita su fuente (ley, artículo y fecha de vigencia) en un catálogo de reglas (`RULE-xxx`).
2. **Vigencia por fecha:** tasas, topes y tramos (CSS, SE, ISR) se guardan como tablas parametrizadas con `vigente_desde` / `vigente_hasta`, nunca como constantes en el código. Así se recalculan periodos pasados con la norma de su momento.
3. **Verificación de tasas:** las tasas que aparecen en la ingeniería inversa (p. ej. CSS 9.75% / 12.25%, SE 1.25% / 1.50%) son `OBSERVED` en PlaniFácil y **deben verificarse** contra la legislación vigente antes de usarse. Ya se detectó una desactualizada: la CSS patronal es 13.25% desde abril de 2025 (Ley 462). El estado de cada regla está en [04_catalogo_reglas_legales.md](04_catalogo_reglas_legales.md).
4. **Casos de prueba legales:** cada regla tiene pruebas unitarias con ejemplos calculados a mano y documentados (casos normales, límites y casos especiales).
5. **Validación profesional:** un abogado laboral o contador idóneo revisa el catálogo de reglas antes de salir a producción.
6. **Contraste opcional:** cuando sea posible, comparar resultados con planillas reales de PlaniFácil para detectar diferencias, entendiendo que la norma prevalece sobre el sistema anterior.

## 5. Supuestos y Riesgos Abiertos

| ID | Supuesto / Riesgo | Cómo se resuelve |
|---|---|---|
| R-01 | **Confirmado:** no hay código fuente de PlaniFácil. La lógica fiscal se modela desde cero a partir de la legislación, lo que aumenta el esfuerzo y el riesgo de error de la Fase 1. | Aplicar las reglas de la sección 4.1, con validación profesional y pruebas legales por regla. |
| R-03 | La legislación cambia (reformas de la CSS, tablas de ISR). | Tablas con vigencia por fecha y un responsable de seguimiento normativo. |
| R-02 | Se asume que el equipo tiene experiencia en PHP/Laravel. | Si no es así, revisar D-01 antes de iniciar la Fase 1. |

## 6. Documentos Relacionados

- [01_propuesta_mejora_planifacil.md](01_propuesta_mejora_planifacil.md): modernización, UI/UX, lógica de negocio y seguridad.
- [02_vision_producto_nomix_factor_wow.md](02_vision_producto_nomix_factor_wow.md): visión de producto.
- [03_arquitectura_docker_seguridad_nomix.md](03_arquitectura_docker_seguridad_nomix.md): despliegue, seguridad y respaldos.
- [04_catalogo_reglas_legales.md](04_catalogo_reglas_legales.md): reglas legales con fuente, vigencia y estado de verificación.
- [05_arquitectura_codigo_y_convenciones.md](05_arquitectura_codigo_y_convenciones.md): estructura del código, motor de nómina, API, pruebas y CI.
- [06_modelo_datos_mvp.md](06_modelo_datos_mvp.md): modelo de datos del MVP.
- [07_alcance_mvp_y_backlog.md](07_alcance_mvp_y_backlog.md): alcance, hitos y tickets.
