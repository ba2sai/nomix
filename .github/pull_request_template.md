## Ticket

NMX-XXX — <!-- título del ticket -->

## Qué cambia

<!-- Resumen breve -->

## Criterios de aceptación

<!-- Copiar los criterios del ticket (docs/nomix/07_alcance_mvp_y_backlog.md) y marcar los cumplidos -->

- [ ] 

## Reglas legales tocadas

<!-- RULE-xxx y su estado de verificación. Escribir "Ninguna" si no aplica. -->

## Checklist

- [ ] `make lint` y `make test` en verde
- [ ] Sin `float` para dinero ni tasas fijas en el código
- [ ] Prueba de aislamiento entre empresas (si toca datos)
- [ ] Ningún dato sensible en claro (BD, logs, respuestas)
- [ ] Documentación actualizada (catálogo, modelo de datos o backlog), si aplica

## Revisión

- Implementó: <!-- Claude / Codex -->
- Revisión técnica independiente: <!-- agente y resultado, o "No disponible; revisó el responsable" -->
- Hallazgos y resolución: <!-- enlace al comentario o resumen; "Ninguno" si aplica -->
- CI / Lint y pruebas: <!-- verde en el commit <SHA> -->
- Decisión de integración: <!-- responsable del producto; solo integrar con CI verde y sin hallazgos bloqueantes -->
