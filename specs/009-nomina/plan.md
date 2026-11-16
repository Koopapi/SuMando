# Plan 009 — Nómina

Plan técnico de `spec.md` (48 RF). Respeta `docs/constitution.md` y `docs/architecture.md`.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/payroll/week.ts` | Lunes de la semana, sus siete fechas, días posteriores a hoy, días dentro de los periodos de un empleado | 2, 9, 10, 16 |
| `domain/payroll/calc.ts` | Estado de cada día, conteos, pago de días, media jornada redondeada, retardos, neto y totales en centavos | 13–15, 17–19, 22, 23, 25 |
| `domain/payroll/loans.ts` | Abono propuesto, validación de monto y abono, aplicar y devolver abonos | 27–33 |
| `domain/payroll/cash.ts` | Desglose del neto en billetes y monedas y total por denominación | 42, 43 |
| `server/ports/payroll.ts`, `server/adapters/drizzle/payroll.ts` | Semanas, renglones, días, préstamos y abonos | 1, 27–39 |
| `server/services/payroll/*` | Vista de la semana por rol, marcar días, montos, préstamos, cierre, reapertura, historial, Excel | 1–48 |
| `server/adapters/xlsx-writer.ts` | Escribe un libro .xlsx de una hoja (zip con `node:zlib`, sin dependencias) | 45 |
| `app/api/payroll/*`, `app/api/employees/[id]/loans` | Handlers finos | 1–48 |
| `app/(app)/nomina/*`, `features/payroll/*` | Semana, historial, hoja de pago imprimible; préstamos en el expediente | 3–47 |

## 2. Modelo de datos (migración `0007_nomina`)

- **`payroll_weeks`**: `business_id`, `branch_id`, `week_start` (`date`, lunes), `status` (`open`, `closed`),
  `total_cents` (al cerrar), `closed_at`, `closed_by`, `created_by`, marcas de tiempo; único (`branch_id`,
  `week_start`) (RF-1, RF-2, RF-35).
- **`payroll_lines`**: `week_id`, `employee_id`, `extras_cents`, `bonus_cents`, `bonus_concept` (80),
  `meal_cents`, todos ≥ 0; al cerrar se congelan `daily_pay_cents`, `position_name`, `days_count`, `half_count`,
  `late_count`, `days_cents`, `late_cents`, `loan_cents` y `net_cents` (nulos mientras está abierta); único
  (`week_id`, `employee_id`) (RF-20, RF-35).
- **`payroll_days`**: `line_id`, `day` (0 = lunes … 6 = domingo), `state` (`worked`, `half`), `late`; único
  (`line_id`, `day`); un día vacío no tiene fila (RF-13 a RF-15).
- **`loans`**: `business_id`, `employee_id`, `lent_on`, `amount_cents`, `weekly_cents`, `balance_cents` (≥ 0),
  `settled_at`, `created_by`, marcas de tiempo (RF-27, RF-33).
- **`loan_payments`**: `loan_id`, `week_id`, `amount_cents` (≥ 0), `applied`; único (`loan_id`, `week_id`). Una
  fila existe cuando el dueño cambia el abono o al cerrar; sin fila, el abono es el propuesto (RF-29 a RF-32, RF-39).
- **`audit_log`**: tipos `payroll_week` y `loan` (RF-48).

## 3. Algoritmos

- **Media jornada (RF-18, RF-19, RF-23).** `half = (sueldo + 1) / 2` en centavos enteros (división entera): el
  medio centavo sube. Pago de días = `sueldo × trabajados + half × medias`; retardos = `half × retardos`.
- **Neto (RF-22).** `pago de días + extras + bonos − retardos − comida − abonos`.
- **Quién aparece (RF-9).** Empleados con `branch_id` de la sucursal cuyo algún periodo cruza la semana, más los que
  ya tienen renglón en esa semana (así quien cambió de sucursal sigue en la semana donde se le marcó).
- **Abono (RF-29).** Para cada préstamo del empleado con `lent_on ≤ domingo`: si hay fila en `loan_payments` para la
  semana, ese monto; si no, `min(abono semanal, saldo)` cuando el saldo > 0.
- **Cierre (RF-31, RF-35 a RF-37).** En una transacción con cerrojo de la semana: recalcula, valida (sin sueldo con
  días, neto negativo, abono mayor que el saldo), crea renglones para todos los que aparecen, congela, escribe las
  filas de abono con `applied = true`, resta saldos y liquida los que llegan a cero.
- **Reapertura (RF-39).** Suma de vuelta cada abono aplicado de la semana al saldo de su préstamo, quita la marca de
  liquidado, deja las filas como abonos fijados (`applied = false`) y borra el congelado de los renglones.
- **Billetes (RF-42).** De la denominación más alta a la más baja, en centavos; lo que queda bajo 50 centavos se
  indica aparte.

## 4. Contrato de la API

| Ruta | Entrada | Salida |
|---|---|---|
| `GET /api/payroll/weeks` | — | historial de la sucursal (total solo al dueño) |
| `GET /api/payroll/weeks/[start]` | — | la semana según el rol |
| `PUT /api/payroll/weeks/[start]/days` | `{ employeeId, day, state: "empty"\|"worked"\|"half", late }` | renglón y totales |
| `PATCH /api/payroll/weeks/[start]/lines/[employeeId]` | `{ extras?, bonus?, bonusConcept?, meal? }` (dueño) | renglón y totales |
| `PUT /api/payroll/weeks/[start]/loans/[loanId]` | `{ amount }` (dueño) | renglón y totales |
| `POST /api/payroll/weeks/[start]/close`, `…/reopen` | — / `{ reason }` (dueño) | la semana |
| `GET /api/payroll/weeks/[start]/excel` | — (dueño) | `.xlsx` |
| `GET/POST /api/employees/[id]/loans` | `{ lentOn, amount, weekly }` (dueño) | préstamos del empleado |

Errores nuevos: `invalid_week` (422), `week_closed` (409, RF-38), `future_day` (422, RF-16), `outside_period`
(422, RF-10), `invalid_amount` (422, RF-21), `weekly_over_amount` (422, RF-28), `close_negative` (409, RF-36),
`close_missing_pay` (409, RF-37), `close_loan_over` (409, RF-31), `reason_required` (422, RF-40).

## 5. Decisiones técnicas

- **Días en filas propias** (`payroll_days`) en vez de un texto de siete letras: dos personas marcando días
  distintos no se pisan, y el último en marcar el mismo día gana.
- **Lo calcula el servidor** (constitución, principio 3): cada cambio devuelve el renglón y los totales recalculados
  y la pantalla los pinta (RF-24). Descartado: calcular en el navegador, que necesitaría mandarle el sueldo al
  administrador.
- **Vista por rol**: el servicio arma la del administrador sin ningún campo en pesos; las rutas de montos, préstamos,
  cierre y Excel responden `owner_only`.
- **Excel sin dependencias**: el escritor de zip de las pruebas pasa a `server/adapters/xlsx-writer.ts` con números
  como celdas numéricas. Descartado: `exceljs` (dependencia grande para una sola hoja).
- **Hoja de pago como página** imprimible con estilos de impresión; el botón llama a `window.print()`.

## 6. Dependencias

Ninguna nueva.

## 7. Estrategia de tests

- **Unitarios**: semana y fechas, cálculo con la semana de la hoja de referencia (mismos netos), redondeo, abonos,
  billetes, escritor de Excel (RF-2, 9, 10, 13–19, 22, 23, 25, 27–33, 42, 43, 45).
- **Integración**: permisos y vistas sin montos, aislamiento, quién aparece, días futuros y fuera de periodo, montos,
  préstamos, cierre con sus rechazos, congelado, reapertura con saldo exacto, historial, Excel y registro (RF-1–48).
- **E2E de escritorio** (`e2e/nomina.spec.ts`): el administrador marca sin ver pesos; el dueño captura, presta,
  cierra, ve la hoja de pago, baja el Excel, reabre y vuelve a cerrar; volumen de 60 empleados; páginas en `qa-sweep`.

## 8. Entregas

1. **Dominio y esquema**. 2. **Servicios y API**. 3. **Pantallas**. 4. **Cierre** (E2E, barrido, validación).

## Ajustes al construir

- El día de nómina es un componente nuevo del sistema de diseño (`ui/day-mark.tsx`); la media jornada se marca con
  una barra bajo la letra del día (el texto «½» rompía la regla de axe de nombre accesible).
- Nómina está en «Más» y en el menú lateral después de Personal (icono `cash`); el inicio suma la fila «Nómina» en
  la sección de Personal y la quita de «Próximamente».
- Los préstamos se registran y se consultan en el expediente del empleado (vista del dueño).
- Al cerrar, los renglones de todos los que aparecen se crean aunque no tengan días, para congelar la semana
  completa; quien cambió de sucursal sigue en la semana donde ya tenía renglón.

