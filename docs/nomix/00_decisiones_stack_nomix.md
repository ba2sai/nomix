# Registro de Decisiones de Stack: Nomix

**Documento:** `00_decisiones_stack_nomix.md`  
**Proyecto:** **Nomix - Nómina inteligente**  
**Estado:** `ACCEPTED`  
**Alcance:** Este documento es la fuente de verdad del stack. Si otro documento de `docs/nomix/` lo contradice, prevalece este.

---

## 1. Stack Final (MVP)

```
Frontend:   React 18 + Vite + TypeScript + Tailwind CSS + Shadcn UI + TanStack Query
Backend:    Laravel 11+ / PHP 8.3 (Clean Arch / DDD ligero) + Laravel Sanctum (modo SPA)
Datos:      PostgreSQL 16 (Row-Level Security) + Redis (colas con Laravel Horizon)
Seguridad:  AES-256-GCM + blind index, KMS gestionado, 2FA, auditoría inmutable
Infra:      Docker Compose + Traefik/NGINX + Cloudflare (WAF/DDoS)
Respaldos:  WAL-G / pgBackRest → S3 cifrado (PITR)
```

## 2. Decisiones y Justificación

| # | Tema | Decisión | Alternativa descartada | Justificación |
|---|---|---|---|---|
| D-01 | Backend | **Laravel 11+ / PHP 8.3** | NestJS | Se reutiliza la lógica tributaria panameña (SS, SE, ISR, liquidaciones) en lugar de reescribirla. Laravel ya incluye colas (Horizon), autenticación (Sanctum), autorización, migraciones y generación de PDFs. |
| D-02 | Frontend | **React 18 + Vite + TypeScript (SPA)** | Next.js | Es una aplicación autenticada de uso interno: no necesita SEO ni SSR. El build estático se sirve con Nginx, sin operar un servidor Node en producción. Menor superficie de ataque. |
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

## 3. Reglas Técnicas Derivadas

1. **Aritmética monetaria exacta:** todos los cálculos de nómina usan decimales exactos (`brick/math` o `bcmath`) y `NUMERIC` en PostgreSQL. **Nunca `float`.**
2. **Cálculos solo en el backend:** impuestos, neto, prestaciones y liquidaciones se calculan de forma determinista en Laravel. El frontend solo muestra resultados (incluida la vista previa en vivo, que consulta al backend).
3. **Multi-inquilino:** RLS en PostgreSQL más `TenantScope` en la aplicación (defensa en profundidad).
4. **Sin estado en contenedores:** archivos y reportes van a S3 o volúmenes montados.

## 4. Supuestos y Riesgos Abiertos

| ID | Supuesto / Riesgo | Cómo se resuelve |
|---|---|---|
| R-01 | Los documentos `01`–`07` de `docs/` son ingeniería inversa de PlaniFácil; **puede que no exista acceso a su código fuente PHP**. Si solo hay especificación, "reutilizar" la lógica significa reimplementarla en Laravel a partir de la especificación. | Validar con casos de prueba contra resultados conocidos de PlaniFácil antes de dar por buena cada fórmula. |
| R-02 | Se asume que el equipo tiene experiencia en PHP/Laravel. | Si no es así, revisar D-01 antes de iniciar la Fase 1. |

## 5. Documentos Relacionados

- [01_propuesta_mejora_planifacil.md](01_propuesta_mejora_planifacil.md): modernización, UI/UX, lógica de negocio y seguridad.
- [02_vision_producto_nomix_factor_wow.md](02_vision_producto_nomix_factor_wow.md): visión de producto.
- [03_arquitectura_docker_seguridad_nomix.md](03_arquitectura_docker_seguridad_nomix.md): despliegue, seguridad y respaldos.
