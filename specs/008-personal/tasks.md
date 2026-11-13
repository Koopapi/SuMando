# Tareas — Spec 008

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Dominio, archivos y esquema

- [x] **T1 — Documentos, archivos y expediente**
  - RF: RF-9, RF-13, RF-16, RF-18, RF-20, RF-21, RF-22, RF-23, RF-28, RF-29, RF-30
  - Depende de: —
  - Hecho cuando: `documents.test.ts`, `files.test.ts` y `employee.test.ts` en verde.
- [x] **T2 — Puerto de archivos**
  - RF: RF-18, RF-27
  - Depende de: —
  - Hecho cuando: adaptador en disco y falso en memoria con su test.
- [x] **T3 — Migración y repositorios**
  - RF: RF-1, RF-15, RF-26, RF-33
  - Depende de: —
  - Hecho cuando: `0006_personal` aplica y el test de esquema comprueba tablas e índices.

## Entrega 2 — Servicios y API

- [x] **T4 — Puestos y lista de documentos**
  - RF: RF-10, RF-11, RF-16, RF-17
  - Depende de: T3
  - Hecho cuando: tests de integración de puestos, lista inicial sin duplicar y cambios de la lista en verde.
- [x] **T5 — Expedientes, sueldo, bajas y cambios**
  - RF: RF-1, RF-2, RF-3, RF-4, RF-6, RF-7, RF-8, RF-9, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34, RF-35
  - Depende de: T1, T3
  - Hecho cuando: tests de integración de alta con aviso, permisos de sueldo, baja, reingreso, cambio de sucursal y aislamiento en verde.
- [x] **T6 — Documentos y archivos**
  - RF: RF-5, RF-7, RF-18, RF-19, RF-20, RF-21, RF-22, RF-23, RF-24, RF-25, RF-26, RF-27, RF-40, RF-41, RF-42
  - Depende de: T2, T5
  - Hecho cuando: tests de subida, tipos y tamaño, vencido, reemplazo, retiro, apertura solo del dueño y registro en verde.
- [x] **T7 — Consulta y API**
  - RF: RF-2, RF-6, RF-7, RF-36, RF-37, RF-38
  - Depende de: T6
  - Hecho cuando: tests de lista con filtros, conteos del inicio y handlers con contrato y aislamiento en verde.

## Entrega 3 — Pantallas

- [x] **T8 — Lista, alta y expediente**
  - RF: RF-9, RF-12, RF-13, RF-14, RF-15, RF-21, RF-22, RF-23, RF-24, RF-25, RF-28, RF-29, RF-30, RF-31, RF-32, RF-33, RF-34, RF-35, RF-36, RF-37, RF-38, RF-39
  - Depende de: T7
  - Hecho cuando: `/personal`, `/personal/nuevo` y `/personal/[id]` con documentos por cámara, a 360 px y en escritorio.
- [x] **T9 — Documentos y puestos**
  - RF: RF-11, RF-17
  - Depende de: T8
  - Hecho cuando: `/personal/documentos` y `/personal/puestos`.

## Entrega 4 — Cierre

- [x] **T10 — E2E, volumen y barrido**
  - RF: RF-3, RF-4, RF-5, RF-9, RF-13, RF-18, RF-21, RF-22, RF-28, RF-32, RF-36, RF-37, RF-39
  - Depende de: T9
  - Hecho cuando: `e2e/personal.spec.ts` en verde con 200 empleados y las páginas en el barrido con axe.
- [x] **T11 — Validación y documentos**
  - RF: todos
  - Depende de: T10
  - Hecho cuando: `validation.md` 42 de 42; reglas en «Vigente»; roadmap, arquitectura y despliegue al día; Vitest y E2E de escritorio en verde.

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T3, T5, T11 |
| RF-2 | T5, T7, T11 |
| RF-3 | T5, T10, T11 |
| RF-4 | T5, T10, T11 |
| RF-5 | T6, T10, T11 |
| RF-6 | T5, T7, T11 |
| RF-7 | T5, T6, T7, T11 |
| RF-8 | T5, T11 |
| RF-9 | T1, T5, T8, T10, T11 |
| RF-10 | T4, T5, T11 |
| RF-11 | T4, T5, T9, T11 |
| RF-12 | T5, T8, T11 |
| RF-13 | T1, T5, T8, T10, T11 |
| RF-14 | T5, T8, T11 |
| RF-15 | T3, T5, T8, T11 |
| RF-16 | T1, T4, T11 |
| RF-17 | T4, T9, T11 |
| RF-18 | T1, T2, T6, T10, T11 |
| RF-19 | T6, T11 |
| RF-20 | T1, T6, T11 |
| RF-21 | T1, T6, T8, T10, T11 |
| RF-22 | T1, T6, T8, T10, T11 |
| RF-23 | T1, T6, T8, T11 |
| RF-24 | T6, T8, T11 |
| RF-25 | T6, T8, T11 |
| RF-26 | T3, T6, T11 |
| RF-27 | T2, T6, T11 |
| RF-28 | T1, T5, T8, T10, T11 |
| RF-29 | T1, T5, T8, T11 |
| RF-30 | T1, T5, T8, T11 |
| RF-31 | T5, T8, T11 |
| RF-32 | T5, T8, T10, T11 |
| RF-33 | T3, T5, T8, T11 |
| RF-34 | T5, T8, T11 |
| RF-35 | T5, T8, T11 |
| RF-36 | T7, T8, T10, T11 |
| RF-37 | T7, T8, T10, T11 |
| RF-38 | T7, T8, T11 |
| RF-39 | T8, T10, T11 |
| RF-40 | T6, T11 |
| RF-41 | T6, T11 |
| RF-42 | T6, T11 |
