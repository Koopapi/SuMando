# Tareas — Spec 012

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Dominio y esquema

- [x] **T1 — Periodos y periodo anterior**
  - RF: RF-11, RF-12, RF-13, RF-14, RF-15, RF-16, RF-17, RF-18
  - Depende de: —
  - Hecho cuando: `domain/reports/period.test.ts` pasa (hoy, semana, mes 31 contra 30, rango, errores).
- [x] **T2 — Comparación y semana de nómina por domingo**
  - RF: RF-19, RF-20, RF-32
  - Depende de: T1
  - Hecho cuando: tests de cambio, porcentaje, «sin periodo anterior» y pertenencia de la semana en verde.
- [x] **T3 — Alertas puras**
  - RF: RF-43, RF-44
  - Depende de: —
  - Hecho cuando: `domain/reports/alerts.test.ts` pasa (semanas sin cerrar desde la primera captura, corte con
    diferencia de un peso).
- [x] **T4 — Migración `0010_tablero` y repositorio**
  - RF: RF-47, RF-48
  - Depende de: —
  - Hecho cuando: `pnpm db:generate` crea `reviewed_at` y `reviewed_by` en `cash_cuts` y los tests de integración
    aplican la migración.

## Entrega 2 — Servicios y API

- [x] **T5 — Alcance del tablero**
  - RF: RF-1, RF-2, RF-3, RF-4, RF-5, RF-6
  - Depende de: T1
  - Hecho cuando: tests de integración: el dueño ve todos sus negocios, el administrador solo sus sucursales y sin
    secciones de dinero.
- [x] **T6 — Ventas**
  - RF: RF-21, RF-22, RF-23, RF-24, RF-25, RF-26, RF-27, RF-28
  - Depende de: T2, T5
  - Hecho cuando: test con dos negocios y tres sucursales: total, por negocio, por sucursal, por forma de pago,
    ceros y reapertura.
- [x] **T7 — Gastos, nómina y lo que queda**
  - RF: RF-29, RF-30, RF-31, RF-33, RF-34, RF-35, RF-36
  - Depende de: T6
  - Hecho cuando: tests de gastos sin retiros ni cancelados, semanas cerradas por domingo, reapertura y negativo.
- [x] **T8 — Alertas**
  - RF: RF-37, RF-38, RF-39, RF-40, RF-41, RF-42, RF-43, RF-44, RF-45, RF-50
  - Depende de: T3, T5
  - Hecho cuando: tests de los cuatro tipos, «Todo en orden», archivados y aislamiento.
- [x] **T9 — Marcar como revisado**
  - RF: RF-47, RF-48, RF-49, RF-55
  - Depende de: T4
  - Hecho cuando: el dueño marca, el administrador no, la alerta se va, se registra y al reabrir se quita.
- [x] **T10 — Excel**
  - RF: RF-51, RF-52, RF-53, RF-54
  - Depende de: T7, T8
  - Hecho cuando: test que abre el archivo: nombre, periodo, desglose y montos numéricos.
- [x] **T11 — API del tablero**
  - RF: RF-5, RF-13, RF-14, RF-15
  - Depende de: T7, T8, T9, T10
  - Hecho cuando: `api-dashboard.test.ts` pasa (403 del administrador, 422 del rango, Excel).

## Entrega 3 — Pantallas

- [x] **T12 — Página del tablero, periodo y secciones**
  - RF: RF-1, RF-7, RF-8, RF-9, RF-10, RF-16, RF-19, RF-20
  - Depende de: T11
  - Hecho cuando: `/tablero` muestra las secciones con su número y abre el detalle en la misma pantalla.
- [x] **T13 — Detalle con desglose por negocio y sucursal**
  - RF: RF-21, RF-22, RF-23, RF-24, RF-27, RF-30, RF-34, RF-36
  - Depende de: T12
  - Hecho cuando: el detalle de cada sección de dinero se ve y se desglosa.
- [x] **T14 — Alertas con enlace y revisado**
  - RF: RF-37, RF-40, RF-45, RF-46, RF-48, RF-50
  - Depende de: T12
  - Hecho cuando: cada alerta abre su módulo con su sucursal activa; el detalle del corte muestra la marca.

## Entrega 4 — Cierre

- [x] **T15 — E2E y barrido**
  - RF: RF-1 a RF-55 (recorrido)
  - Depende de: T13, T14
  - Hecho cuando: `e2e/tablero.spec.ts` y `qa-sweep` en verde en escritorio.
- [x] **T16 — Volumen, validación y documentos**
  - RF: todos
  - Depende de: T15
  - Hecho cuando: test de volumen bajo 2 s, `rf-coverage` 55/55, `reglas-de-negocio.md` en «Vigente».

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 a RF-6 | T5, T11, T12 |
| RF-7 a RF-10 | T12 |
| RF-11 a RF-18 | T1, T11 |
| RF-19, RF-20 | T2, T12 |
| RF-21 a RF-28 | T6, T13 |
| RF-29 a RF-36 | T2, T7, T13 |
| RF-37 a RF-46 | T3, T8, T14 |
| RF-47 a RF-49 | T4, T9, T14 |
| RF-50 | T8, T14 |
| RF-51 a RF-54 | T10 |
| RF-55 | T9 |
