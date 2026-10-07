# AGENTS.md — Reglas para los agentes de Nomix

Este archivo lo leen **Codex** (directamente) y **Claude Code** (a través de `CLAUDE.md`). Las reglas aplican a los dos por igual.

Nomix es una plataforma de nómina para Panamá. Un error de cálculo afecta el salario de personas reales y genera multas. **La corrección está por encima de la velocidad.**

## Documentos que debes conocer

| Documento | Cuándo leerlo |
|---|---|
| `docs/nomix/00_decisiones_stack_nomix.md` | Siempre. Es la fuente de verdad del stack. |
| `docs/nomix/04_catalogo_reglas_legales.md` | Antes de tocar cualquier cálculo. |
| `docs/nomix/05_arquitectura_codigo_y_convenciones.md` | Antes de crear archivos o carpetas. |
| `docs/nomix/06_modelo_datos_mvp.md` | Antes de crear migraciones. |
| `docs/nomix/07_alcance_mvp_y_backlog.md` | Para saber qué ticket toca y sus criterios de aceptación. |

Los documentos `docs/01`–`07` describen el sistema anterior (PlaniFácil). Son referencia funcional, **no** fuente de tasas ni de reglas legales. Si trabajas en ingeniería inversa, sigue `.agents/AGENTS.md`.

## Stack (decidido, no reabrir)

Laravel (PHP 8.3+) · React + Vite + TypeScript · PostgreSQL 16 con RLS · Redis + Horizon · Sanctum SPA + 2FA · Docker Compose.

## Reglas innegociables

1. **Nunca `float` para dinero.** Usa `Money` (`brick/math`). En BD, `NUMERIC`. En JSON, string con 2 decimales.
2. **Nunca constantes para tasas legales.** Todo valor legal sale de `parametros_legales` con su vigencia, vía `LegalParameters::forDate()`.
3. **Cada cálculo cita su regla.** Usa el ID `RULE-xxx` del catálogo y devuelve una traza.
4. **No inventes reglas legales.** Si el catálogo no cubre un caso o una regla está `PENDIENTE`, impleméntala como parámetro, márcalo en la traza y avisa en el PR. No completes huecos con suposiciones.
5. **`app/Domain` es puro.** Sin Laravel, sin Eloquent, sin fechas del sistema, sin BD.
6. **Multi-inquilino siempre.** Toda tabla de negocio tiene `empresa_id` y RLS. Toda funcionalidad nueva incluye una prueba de aislamiento entre empresas.
7. **Datos sensibles cifrados.** Cédula, número de cuenta y salario base nunca se guardan ni se registran en claro (tampoco en logs, trazas o snapshots).
8. **Planillas aprobadas son inmutables.**
9. **Nada de secretos ni datos reales** en el repo, en pruebas ni en ejemplos.

## Flujo de trabajo

1. Toma un ticket de `docs/nomix/07_alcance_mvp_y_backlog.md`. Un ticket = una rama = un PR.
2. Rama: `nmx-<número>-<descripcion-corta>`. Commits: Conventional Commits con el ticket como alcance, p. ej. `feat(nmx-005): add Money value object`.
3. Antes de abrir el PR, ejecuta y deja en verde: `make lint` y `make test`.
4. Completa la plantilla del PR, incluidos los criterios de aceptación del ticket y las reglas legales tocadas.
5. **Revisión cruzada:** el PR lo revisa el otro agente (Claude revisa a Codex y viceversa) antes de que el dueño del producto lo apruebe.
6. **Pruebas legales por el revisor:** en los tickets del motor legal, las pruebas de `backend/tests/Legal/` las escribe el agente que **no** implementó la regla, a partir del catálogo, sin mirar la implementación primero.
7. Si cambias una regla, una tasa o el modelo de datos, actualiza el documento correspondiente en el mismo PR.
8. Nunca hagas *merge* de tu propio PR ni fusiones con CI en rojo.

## Al revisar un PR del otro agente

Verifica, en este orden:
1. ¿Los cálculos coinciden con el catálogo y con los casos de prueba? Recalcula al menos un caso a mano.
2. ¿Hay `float`, tasas fijas en el código o reglas sin `RULE-xxx`?
3. ¿Hay prueba de aislamiento entre empresas si el cambio toca datos?
4. ¿Algún dato sensible queda en claro (BD, logs, respuestas, snapshots)?
5. ¿Se cumplen los criterios de aceptación del ticket?

## Comandos

```bash
make up        # levantar el entorno
make setup     # dependencias, migraciones y datos de prueba
make test      # pruebas de backend y frontend
make lint      # Pint, PHPStan, ESLint, tsc
make down      # detener
```

(Disponibles a partir del ticket NMX-001.)

## Idioma

- Documentación, PRs y mensajes al usuario: **español**.
- Dominio de negocio (tablas, columnas, rutas, conceptos legales): **español**.
- Código técnico (clases, métodos, variables genéricas): **inglés**.
