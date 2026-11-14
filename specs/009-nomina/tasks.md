# Tareas — Spec 009

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Dominio y esquema

- [x] **T1 — Semana y fechas**
  - RF: RF-2, RF-9, RF-10, RF-16
  - Depende de: —
  - Hecho cuando: `week.test.ts` en verde (lunes de cualquier fecha, siete días, futuro, periodos).
- [x] **T2 — Cálculo de la nómina**
  - RF: RF-13, RF-14, RF-15, RF-17, RF-18, RF-19, RF-22, RF-23, RF-25
  - Depende de: —
  - Hecho cuando: `calc.test.ts` en verde, incluida una semana de la hoja de referencia con sus netos.
- [x] **T3 — Préstamos y billetes**
  - RF: RF-27, RF-28, RF-29, RF-31, RF-32, RF-33, RF-42, RF-43
  - Depende de: —
  - Hecho cuando: `loans.test.ts` y `cash.test.ts` en verde.
- [x] **T4 — Migración y repositorios**
  - RF: RF-1, RF-20, RF-27, RF-35
  - Depende de: —
  - Hecho cuando: `0007_nomina` aplica y el test de esquema comprueba tablas, únicos y checks.

## Entrega 2 — Servicios y API

- [x] **T5 — Vista de la semana y asistencia**
  - RF: RF-1, RF-3, RF-4, RF-5, RF-8, RF-9, RF-10, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-26, RF-47
  - Depende de: T1, T2, T4
  - Hecho cuando: tests de integración de quién aparece, marcar días, rechazos y vista sin montos en verde.
- [x] **T6 — Montos y préstamos**
  - RF: RF-6, RF-7, RF-18, RF-19, RF-20, RF-21, RF-22, RF-24, RF-25, RF-27, RF-28, RF-29, RF-30, RF-34
  - Depende de: T3, T5
  - Hecho cuando: tests de integración de montos, préstamos y permisos del dueño en verde.
- [x] **T7 — Cerrar, reabrir e historial**
  - RF: RF-31, RF-32, RF-33, RF-35, RF-36, RF-37, RF-38, RF-39, RF-40, RF-46, RF-48
  - Depende de: T6
  - Hecho cuando: tests de integración de cierre, rechazos, congelado, reapertura con saldo exacto y registro en verde.
- [x] **T8 — Excel y rutas**
  - RF: RF-7, RF-45, RF-8
  - Depende de: T7
  - Hecho cuando: el escritor de Excel tiene test, el Excel de una semana se lee de vuelta con sus columnas y las
    rutas responden con sus errores.

## Entrega 3 — Pantallas

- [x] **T9 — Semana en el teléfono y el escritorio**
  - RF: RF-3, RF-11, RF-12, RF-13, RF-14, RF-17, RF-24, RF-25
  - Depende de: T8
  - Hecho cuando: la semana se marca con un toque y el dueño ve netos y totales al instante.
- [x] **T10 — Montos, préstamos, cierre e historial**
  - RF: RF-20, RF-30, RF-34, RF-35, RF-39, RF-46, RF-47
  - Depende de: T9
  - Hecho cuando: el dueño captura, presta desde el expediente, cierra, reabre con motivo y navega semanas.
- [x] **T11 — Hoja de pago y navegación**
  - RF: RF-41, RF-42, RF-43, RF-44, RF-45
  - Depende de: T10
  - Hecho cuando: hoja de pago imprimible con billetes, Excel descargable, Nómina en «Más», menú lateral e inicio.

## Entrega 4 — Cierre

- [x] **T12 — E2E, volumen, barrido y validación**
  - RF: RF-1 a RF-48
  - Depende de: T11
  - Hecho cuando: `e2e/nomina.spec.ts` y `qa-sweep` en verde en escritorio, `validation.md` 48 de 48 y
    `docs/reglas-de-negocio.md` en «Vigente».

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T4, T5, T12 |
| RF-2 | T1, T12 |
| RF-3 | T5, T9, T12 |
| RF-4 | T5, T12 |
| RF-5 | T5, T12 |
| RF-6 | T6, T12 |
| RF-7 | T6, T8, T12 |
| RF-8 | T5, T8, T12 |
| RF-9 | T1, T5, T12 |
| RF-10 | T1, T5, T12 |
| RF-11 | T5, T9, T12 |
| RF-12 | T5, T9, T12 |
| RF-13 | T2, T5, T9, T12 |
| RF-14 | T2, T5, T9, T12 |
| RF-15 | T2, T5, T12 |
| RF-16 | T1, T5, T12 |
| RF-17 | T2, T5, T9, T12 |
| RF-18 | T2, T6, T12 |
| RF-19 | T2, T6, T12 |
| RF-20 | T4, T6, T10, T12 |
| RF-21 | T6, T12 |
| RF-22 | T2, T6, T12 |
| RF-23 | T2, T12 |
| RF-24 | T6, T9, T12 |
| RF-25 | T2, T6, T9, T12 |
| RF-26 | T5, T12 |
| RF-27 | T3, T4, T6, T12 |
| RF-28 | T3, T6, T12 |
| RF-29 | T3, T6, T12 |
| RF-30 | T6, T10, T12 |
| RF-31 | T3, T7, T12 |
| RF-32 | T3, T7, T12 |
| RF-33 | T3, T7, T12 |
| RF-34 | T6, T10, T12 |
| RF-35 | T4, T7, T10, T12 |
| RF-36 | T7, T12 |
| RF-37 | T7, T12 |
| RF-38 | T7, T12 |
| RF-39 | T7, T10, T12 |
| RF-40 | T7, T12 |
| RF-41 | T11, T12 |
| RF-42 | T3, T11, T12 |
| RF-43 | T3, T11, T12 |
| RF-44 | T11, T12 |
| RF-45 | T8, T11, T12 |
| RF-46 | T7, T10, T12 |
| RF-47 | T5, T10, T12 |
| RF-48 | T7, T12 |
