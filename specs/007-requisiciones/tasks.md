# Tareas — Spec 007

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Dominio y esquema

- [x] **T1 — Sugerencias y suma de repetidos**
  - RF: RF-10, RF-14, RF-15, RF-16
  - Depende de: —
  - Hecho cuando: `suggest.test.ts` en verde (sin máximo, negativo, redondeo a cartones, cálculo con y sin presentación).
- [x] **T2 — Estados, pendiente y montos**
  - RF: RF-22, RF-23, RF-24, RF-25, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34, RF-37, RF-38, RF-39, RF-40, RF-46
  - Depende de: —
  - Hecho cuando: `state.test.ts` y `money.test.ts` en verde.
- [x] **T3 — Migración y repositorios**
  - RF: RF-1, RF-2, RF-7, RF-44, RF-45
  - Depende de: —
  - Hecho cuando: `0005_requisiciones` aplica y el test de esquema comprueba tablas, índices y la columna nueva de movimientos.

## Entrega 2 — Servicios y API

- [x] **T4 — Alta, edición, sugerencias y plantillas**
  - RF: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6, RF-7, RF-8, RF-9, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-23, RF-24, RF-46
  - Depende de: T1, T3
  - Hecho cuando: tests de integración de alta, folio, permisos, edición, sugerencias desde mínimos, cálculo y plantilla, y plantillas en verde.
- [x] **T5 — Aprobación, compra, recepción y cierre**
  - RF: RF-5, RF-25, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34, RF-35, RF-36, RF-37, RF-38, RF-39, RF-40, RF-41, RF-44, RF-45
  - Depende de: T2, T4
  - Hecho cuando: tests de integración de aprobar con cambios, rechazar, cancelar, comprador, importes, recepción parcial con entrada, excedente, concurrencia y cierre en verde.
- [x] **T6 — Consulta, inicio y API**
  - RF: RF-3, RF-6, RF-42, RF-43, RF-44, RF-45, RF-46, RF-47
  - Depende de: T5
  - Hecho cuando: tests de lista con filtros, historial, conteos del inicio y handlers con contrato y aislamiento en verde.

## Entrega 3 — Pantallas

- [ ] **T7 — Lista y armado**
  - RF: RF-3, RF-7, RF-8, RF-9, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21, RF-42, RF-43, RF-48
  - Depende de: T6
  - Hecho cuando: `/requisiciones` con filtros; `/requisiciones/nueva` arma desde mínimos, cálculo, plantilla y a mano, a 360 px y en escritorio.
- [ ] **T8 — Detalle: aprobación, compra y recepción**
  - RF: RF-22, RF-23, RF-24, RF-25, RF-26, RF-27, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34, RF-35, RF-36, RF-37, RF-38, RF-39, RF-40, RF-41, RF-44, RF-45, RF-47
  - Depende de: T7
  - Hecho cuando: detalle con aprobar, rechazar, cancelar, comprador, comprado con importes, recibir y cerrar; plantillas en `/requisiciones/plantillas`.

## Entrega 4 — Cierre

- [ ] **T9 — E2E, volumen y barrido**
  - RF: RF-14, RF-22, RF-25, RF-27, RF-29, RF-30, RF-34, RF-35, RF-38, RF-39, RF-40, RF-42, RF-47, RF-48
  - Depende de: T8
  - Hecho cuando: `e2e/requisiciones.spec.ts` en verde con 300 renglones y las páginas en el barrido con axe.
- [ ] **T10 — Validación y documentos**
  - RF: todos
  - Depende de: T9
  - Hecho cuando: `validation.md` 48 de 48; reglas en «Vigente»; roadmap y arquitectura al día; Vitest y E2E de escritorio en verde.

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T3, T4, T10 |
| RF-2 | T3, T4, T10 |
| RF-3 | T4, T6, T7, T10 |
| RF-4 | T4, T10 |
| RF-5 | T4, T5, T10 |
| RF-6 | T4, T6, T10 |
| RF-7 | T3, T4, T7, T10 |
| RF-8 | T4, T7, T10 |
| RF-9 | T4, T7, T10 |
| RF-10 | T1, T4, T7, T10 |
| RF-11 | T4, T7, T10 |
| RF-12 | T4, T7, T10 |
| RF-13 | T4, T7, T10 |
| RF-14 | T1, T4, T7, T9, T10 |
| RF-15 | T1, T4, T7, T10 |
| RF-16 | T1, T4, T7, T10 |
| RF-17 | T4, T7, T10 |
| RF-18 | T4, T7, T10 |
| RF-19 | T4, T7, T10 |
| RF-20 | T4, T7, T10 |
| RF-21 | T4, T7, T10 |
| RF-22 | T2, T4, T8, T9, T10 |
| RF-23 | T2, T4, T8, T10 |
| RF-24 | T2, T4, T8, T10 |
| RF-25 | T2, T5, T8, T9, T10 |
| RF-26 | T2, T5, T8, T10 |
| RF-27 | T2, T5, T8, T9, T10 |
| RF-28 | T2, T5, T8, T10 |
| RF-29 | T2, T5, T8, T9, T10 |
| RF-30 | T2, T5, T8, T9, T10 |
| RF-31 | T2, T5, T8, T10 |
| RF-32 | T2, T5, T8, T10 |
| RF-33 | T2, T5, T8, T10 |
| RF-34 | T2, T5, T8, T9, T10 |
| RF-35 | T5, T8, T9, T10 |
| RF-36 | T5, T8, T10 |
| RF-37 | T2, T5, T8, T10 |
| RF-38 | T2, T5, T8, T9, T10 |
| RF-39 | T2, T5, T8, T9, T10 |
| RF-40 | T2, T5, T8, T9, T10 |
| RF-41 | T5, T8, T10 |
| RF-42 | T6, T7, T9, T10 |
| RF-43 | T6, T7, T10 |
| RF-44 | T3, T5, T6, T8, T10 |
| RF-45 | T3, T5, T6, T8, T10 |
| RF-46 | T2, T4, T6, T10 |
| RF-47 | T6, T8, T9, T10 |
| RF-48 | T7, T9, T10 |
