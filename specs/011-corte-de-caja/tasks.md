# Tareas — Spec 011

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Dominio y esquema

- [x] **T1 — Cálculo del corte**
  - RF: RF-18, RF-19, RF-21, RF-24, RF-25, RF-26, RF-27, RF-28, RF-29
  - Depende de: —
  - Hecho cuando: `calc.test.ts` en verde, con la hoja de referencia.
- [x] **T2 — Migración y repositorios**
  - RF: RF-1, RF-7, RF-11, RF-12, RF-15
  - Depende de: —
  - Hecho cuando: `0009_corte_de_caja` aplica y el test de esquema comprueba tablas, únicos y checks.

## Entrega 2 — Servicios y API

- [x] **T3 — Configuración y formas de pago**
  - RF: RF-4, RF-6, RF-7, RF-8, RF-9, RF-10, RF-42
  - Depende de: T2
  - Hecho cuando: tests de integración de configuración y formas de pago en verde.
- [x] **T4 — Abrir, movimientos y conteo**
  - RF: RF-1, RF-2, RF-3, RF-5, RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18, RF-19, RF-20, RF-21, RF-22, RF-42
  - Depende de: T1, T3
  - Hecho cuando: tests de integración de apertura, movimientos, cancelación y conteo en verde.
- [x] **T5 — Reporte, cierre, reapertura e historial**
  - RF: RF-23, RF-24, RF-25, RF-26, RF-27, RF-28, RF-29, RF-34, RF-35, RF-36, RF-37, RF-38, RF-39, RF-40, RF-41, RF-42
  - Depende de: T4
  - Hecho cuando: tests de integración del reporte, el cierre, la reapertura y el historial en verde.
- [x] **T6 — Teléfono de piso a ciegas y rutas**
  - RF: RF-30, RF-31, RF-32, RF-33
  - Depende de: T5
  - Hecho cuando: tests de integración y de API del teléfono (habilitado o no, sin datos del punto de venta) en verde.

## Entrega 3 — Pantallas

- [x] **T7 — Corte actual y conteo en pantalla**
  - RF: RF-11, RF-15, RF-17, RF-18, RF-20, RF-22, RF-31
  - Depende de: T6
  - Hecho cuando: se abre, se registran movimientos y se cuenta con el asistente, también en `/piso/caja`.
- [x] **T8 — Reporte, diferencias, historial y configuración**
  - RF: RF-6, RF-8, RF-10, RF-23, RF-26, RF-29, RF-34, RF-38, RF-40, RF-41
  - Depende de: T7
  - Hecho cuando: el administrador captura el reporte, ve las diferencias y cierra; el dueño configura y reabre; Corte de caja en «Más», menú lateral e inicio.

## Entrega 4 — Cierre

- [x] **T9 — E2E, barrido y validación**
  - RF: RF-1 a RF-42
  - Depende de: T8
  - Hecho cuando: `e2e/corte.spec.ts` y `qa-sweep` en verde en escritorio, `validation.md` 42 de 42 y `docs/reglas-de-negocio.md` en «Vigente».

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T2, T4, T9 |
| RF-2 | T4, T9 |
| RF-3 | T4, T9 |
| RF-4 | T3, T9 |
| RF-5 | T4, T9 |
| RF-6 | T3, T8, T9 |
| RF-7 | T2, T3, T9 |
| RF-8 | T3, T8, T9 |
| RF-9 | T3, T9 |
| RF-10 | T3, T8, T9 |
| RF-11 | T2, T4, T7, T9 |
| RF-12 | T2, T4, T9 |
| RF-13 | T4, T9 |
| RF-14 | T4, T9 |
| RF-15 | T2, T4, T7, T9 |
| RF-16 | T4, T9 |
| RF-17 | T4, T7, T9 |
| RF-18 | T1, T4, T7, T9 |
| RF-19 | T1, T4, T9 |
| RF-20 | T4, T7, T9 |
| RF-21 | T1, T4, T9 |
| RF-22 | T4, T7, T9 |
| RF-23 | T5, T8, T9 |
| RF-24 | T1, T5, T9 |
| RF-25 | T1, T5, T9 |
| RF-26 | T1, T5, T8, T9 |
| RF-27 | T1, T5, T9 |
| RF-28 | T1, T5, T9 |
| RF-29 | T1, T5, T8, T9 |
| RF-30 | T6, T9 |
| RF-31 | T6, T7, T9 |
| RF-32 | T6, T9 |
| RF-33 | T6, T9 |
| RF-34 | T5, T8, T9 |
| RF-35 | T5, T9 |
| RF-36 | T5, T9 |
| RF-37 | T5, T9 |
| RF-38 | T5, T8, T9 |
| RF-39 | T5, T9 |
| RF-40 | T5, T8, T9 |
| RF-41 | T5, T8, T9 |
| RF-42 | T3, T4, T5, T9 |
