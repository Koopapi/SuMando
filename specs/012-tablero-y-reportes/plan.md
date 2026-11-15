# Plan 012 — Tablero y reportes

Plan técnico de `spec.md` (55 RF). Respeta `docs/constitution.md` y `docs/architecture.md`. Es la primera spec que
autoriza consultas que cruzan negocios (constitución, principio 6): solo el tablero, y siempre limitado a las
sucursales que quien consulta puede ver.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/reports/period.ts` | Periodos (hoy, semana, mes, rango), validación del rango, periodo anterior, cambio en pesos y porcentaje, a qué periodo pertenece una semana de nómina | 11–20, 32 |
| `domain/reports/alerts.ts` | Semanas terminadas sin cerrar de una sucursal; si un corte tiene diferencia | 43, 44 |
| `server/services/reports/scope.ts` | Alcance del tablero: sucursales activas de negocios activos que la persona puede ver; secciones permitidas | 1–6 |
| `server/services/reports/figures.ts` | Ventas, gastos de caja, nómina y lo que queda, con total, negocio, sucursal, forma de pago y listas | 21–36 |
| `server/services/reports/alerts.ts` | Existencias bajas, requisiciones pendientes, nómina por cerrar, cortes con diferencia | 37–46, 50 |
| `server/services/reports/export.ts` | Excel de la sección abierta con `server/adapters/xlsx-writer.ts` | 51–54 |
| `server/services/cash/cuts.ts` | Marcar como revisado (solo dueño), quitar la marca al reabrir, mostrarla en el detalle | 47–49, 55 |
| `app/api/dashboard/*`, `app/api/cash/cuts/[id]/review` | Handlers | 1–55 |
| `app/(app)/tablero`, `features/dashboard/*` | Periodo, secciones con su número, detalle en la misma pantalla, desglose por negocio, alertas con enlace | 7–10, 16, 19–24, 36–37, 45–46, 50 |

## 2. Modelo de datos (migración `0010_tablero`)

- **`cash_cuts`**: columnas nuevas `reviewed_at` (timestamp, nulo) y `reviewed_by` (usuario, nulo). Solo añade
  columnas nulas: no toca datos existentes (RF-47 a RF-49).
- **`audit_log`**: acción `cash_cut.reviewed` (RF-55).
- Nada más: el tablero lee las tablas de las specs 003, 005, 007, 009 y 011.

## 3. Algoritmos

- **Periodo (RF-11 a RF-18).** Con la fecha de México de hoy `t`: Hoy = [t, t], anterior [t−1, t−1]. Semana =
  [lunes de t, t], anterior = las mismas fechas −7 días. Mes = [día 1, t], anterior = [día 1 del mes anterior, mismo
  día o el último del mes anterior si no existe]. Rango [a, b] de `n` días: anterior = [a−n, a−1]. Se rechaza b < a,
  n > 366 y b > t.
- **Comparación (RF-19, RF-20).** Cambio = actual − anterior; porcentaje = cambio / anterior × 100 con un decimal;
  si anterior = 0, sin porcentaje.
- **Ventas y gastos (RF-25 a RF-30).** Cortes cerrados de las sucursales del alcance con `date` en el periodo; la
  venta es `salesBefore` de `cutFigures` (spec 011) con los movimientos no cancelados; por forma de pago, lo contado
  de cada una (el efectivo, la venta en efectivo: contado − fondo − ingresos + gastos + retiros). Gastos = movimientos
  `expense` no cancelados de esos cortes.
- **Nómina (RF-31 a RF-34).** Semanas cerradas cuyo domingo (`week_start` + 6) cae en el periodo; se suma su
  `total_cents` congelado.
- **Lo que queda (RF-35).** Ventas − gastos − nómina por cada nivel (total, negocio, sucursal).
- **Nómina por cerrar (RF-43).** Por sucursal: desde la primera semana con captura (la menor `week_start` de sus
  semanas) hasta la última semana cuyo domingo es anterior a hoy, cada semana no cerrada en la que algún empleado
  de la sucursal con sueldo tenía un periodo de trabajo que la toca.
- **Corte con diferencia (RF-44).** Cerrado, sin `reviewed_at`, y alguna diferencia por forma de pago ≠ 0 (la total
  es su suma, así que basta con las de cada forma).
- **Existencia baja (RF-39).** Almacenes activos del alcance (de la sucursal o del negocio completo de un negocio del
  alcance), productos activos, mínimo fijado, existencia (cero si no hay fila) menor que el mínimo; incluye la
  negativa.

## 4. Contrato de la API

| Ruta | Quién | Entrada / salida |
|---|---|---|
| `GET /api/dashboard?period=today\|week\|month\|range&from&to` | dueño y administrador | `{ period, sections: { alerts, sales, expenses?, payroll?, remaining? } }` con el número principal y su comparación |
| `GET /api/dashboard/[section]?period…` | `alerts`, `sales`: los dos; `expenses`, `payroll`, `remaining`: dueño | detalle de la sección |
| `GET /api/dashboard/[section]/excel?period…` | igual que el detalle | archivo `.xlsx` |
| `POST /api/cash/cuts/[id]/review` | dueño | corte con la marca |

Errores nuevos: `range_order` (422, RF-13), `range_too_long` (422, RF-14), `range_future` (422, RF-15). Sin permiso:
`forbidden` (403, RF-5, RF-47).

## 5. Decisiones técnicas

- **Se calcula al momento, sin tablas de resumen** (RF-6): los volúmenes (meses de cortes de unas pocas sucursales)
  caben en memoria; una tabla de resumen pediría mantenerla al día con cada reapertura. Si el test de volumen no
  cumple los 2 segundos, se añaden consultas agregadas en el adaptador, sin cambiar el servicio.
- **El periodo y la sección viven en la dirección (`?periodo=…&seccion=…`)**: la página es un Server Component que
  calcula el resumen y el detalle elegido; cambiar de sección o de periodo reemplaza la dirección sin salir de la
  pantalla (RF-8 a RF-10) y se puede volver con «atrás».
- **El alcance sale de `accessibleFor` (spec 001)**: las mismas sucursales activas de negocios activos que ya ve
  la persona; así una sucursal archivada no aparece (casos límite) y un administrador nunca ve otra.
- **El enlace de una alerta cambia la sucursal activa con la API existente (`PUT /api/session/branch`)** y luego
  abre la pantalla del módulo (RF-46). Una alerta de un almacén del negocio completo activa la primera sucursal del
  negocio que la persona puede ver.
- **Las cifras se recalculan desde los movimientos**, no desde la foto del cierre, para usar una sola fórmula
  (`cutFigures`).

## 6. Dependencias

Ninguna nueva.

## 7. Estrategia de tests

- **Unitarios** (`domain/reports`): periodos, rango inválido, anterior de semana y mes (31 contra 30, lunes), cambio
  y porcentaje, semana por domingo, semanas sin cerrar, corte con diferencia (RF-11–20, 32, 43, 44).
- **Integración** (`tests/integration/dashboard-service.test.ts`, `api-dashboard.test.ts`): alcance de dueño y
  administrador, secciones prohibidas, cifras con varios negocios, reapertura, alertas de los cuatro tipos, marca de
  revisado, Excel, aislamiento, volumen (RF-1–55).
- **E2E de escritorio** (`e2e/tablero.spec.ts`): el recorrido de los criterios de finalización; `/tablero` en
  `qa-sweep`.

## 8. Entregas

1. **Dominio y esquema**: periodos, alertas puras, migración. 2. **Servicios y API**. 3. **Pantallas**. 4. **Cierre**:
E2E, barrido, volumen, validación.
