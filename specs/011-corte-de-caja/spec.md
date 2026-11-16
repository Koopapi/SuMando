# Spec 011 — Corte de caja

**Aprobada por el dueño el 13 de noviembre de 2026.**

## Contexto y objetivo
Hoy el corte se hace en una hoja: se cuenta el efectivo por denominación, se resta el fondo, se anotan los gastos
pagados de la caja (compras, transporte, nóminas), lo de cada terminal bancaria y las transferencias, y se saca la
venta final. No se compara contra lo que reporta el punto de venta, así que un faltante en una terminal o en el
efectivo pasa sin que nadie lo vea. Esta spec da a SuMando el corte de caja de cada sucursal: apertura con fondo,
gastos, retiros e ingresos de caja durante el turno, conteo del efectivo por denominación y de cada forma de pago,
el reporte del punto de venta capturado por un administrador y la diferencia de cada forma de pago. El conteo lo
puede hacer el cajero en el teléfono de piso (spec 010), a ciegas: no ve lo que dice el punto de venta. SuMando no
cobra: el punto de venta de cada negocio sigue siendo el que registra las ventas.

## Usuarios / actores
- **Dueño**: configura cada sucursal (cortes por día, formas de pago, si el teléfono de piso hace cortes), hace y ve
  todos los cortes y es el único que reabre un corte cerrado.
- **Administrador**: en sus sucursales abre, registra movimientos de caja, cuenta, captura el reporte del punto de
  venta, cierra y consulta los cortes.
- **Cajero** (sin cuenta): donde el dueño lo permite, en el teléfono de piso elige su nombre, abre la caja, registra
  movimientos y cuenta, sin ver lo que dice el punto de venta.

## Historias de usuario
- H1: Como dueño quiero decidir por sucursal si hay un corte por día o varios, y qué terminales y formas de pago
  tiene.
- H2: Como cajero quiero abrir la caja con su fondo y anotar los gastos que pago de ella durante el turno.
- H3: Como cajero quiero contar el efectivo por denominación y lo de cada terminal sin ver lo que espera el sistema.
- H4: Como administrador quiero capturar el reporte del punto de venta y ver al momento qué forma de pago no cuadra.
- H5: Como dueño quiero el historial de cortes de cada sucursal con su venta, sus gastos y sus diferencias.

## Requisitos funcionales (criterios de aceptación en EARS)

### Pertenencia y permisos
- RF-1: EL SISTEMA guardará cada corte como parte de una sola sucursal.
- RF-2: MIENTRAS hay una sucursal activa, EL SISTEMA mostrará solo los cortes de esa sucursal.
- RF-3: EL SISTEMA permitirá al dueño y a los administradores de la sucursal abrir, registrar movimientos, contar, capturar el reporte del punto de venta, cerrar y consultar los cortes.
- RF-4: EL SISTEMA permitirá solo al dueño cambiar la configuración de corte de una sucursal y reabrir un corte cerrado.
- RF-5: SI alguien pide un corte de una sucursal a la que no tiene acceso, aunque sea por dirección directa, ENTONCES EL SISTEMA lo rechazará sin revelar si existe.

### Configuración de la sucursal
- RF-6: EL SISTEMA permitirá al dueño elegir por sucursal entre un corte por día o varios cortes por día.
- RF-7: EL SISTEMA dará a cada sucursal la forma de pago Efectivo, que no se puede quitar.
- RF-8: EL SISTEMA permitirá al dueño dar de alta, renombrar, ordenar y archivar las demás formas de pago de cada sucursal (terminales, transferencias, otros), con nombre de hasta 40 caracteres único en la sucursal.
- RF-9: CUANDO se archiva una forma de pago, EL SISTEMA dejará de pedirla en los cortes nuevos y la conservará en los cortes que ya la tienen.
- RF-10: EL SISTEMA permitirá al dueño habilitar o no, por sucursal, que el teléfono de piso haga cortes.

### Apertura
- RF-11: EL SISTEMA permitirá abrir un corte con un fondo inicial en pesos, de cero o más y con hasta 2 decimales.
- RF-12: SI ya hay un corte abierto en la sucursal, ENTONCES EL SISTEMA no abrirá otro e indicará el abierto.
- RF-13: MIENTRAS la sucursal tiene un corte por día, SI ya hay un corte de la fecha de hoy, ENTONCES EL SISTEMA no abrirá otro.
- RF-14: EL SISTEMA guardará con cada corte la fecha de la Ciudad de México, la hora de apertura y quién lo abrió.

### Movimientos de caja
- RF-15: MIENTRAS un corte está abierto, EL SISTEMA permitirá registrar gastos, retiros e ingresos de caja (dinero que entra al cajón sin ser venta, como cambio) con un concepto (hasta 80 caracteres) y un monto mayor que cero con hasta 2 decimales.
- RF-16: EL SISTEMA guardará con cada movimiento quién lo registró y la hora del servidor.
- RF-17: MIENTRAS un corte está abierto, EL SISTEMA permitirá cancelar un movimiento con motivo, sin borrarlo.

### Conteo
- RF-18: EL SISTEMA pedirá el efectivo contado como cantidad de piezas de cada denominación: billetes de 1000, 500, 200, 100, 50 y 20 pesos y monedas de 10, 5, 2 y 1 peso y de 50 centavos.
- RF-19: EL SISTEMA sumará el efectivo contado a partir de las piezas de cada denominación.
- RF-20: EL SISTEMA pedirá el monto contado de cada forma de pago activa distinta de Efectivo.
- RF-21: SI una cantidad de piezas no es un entero de cero o más, o un monto es negativo o tiene más de 2 decimales, ENTONCES EL SISTEMA lo rechazará e indicará el formato válido.
- RF-22: CUANDO se entrega el conteo, EL SISTEMA guardará quién contó y la hora, y dejará de permitir cambios en el conteo y en los movimientos.

### Reporte del punto de venta
- RF-23: EL SISTEMA permitirá al dueño y a los administradores capturar lo que reporta el punto de venta en cada forma de pago del corte.
- RF-24: EL SISTEMA calculará el efectivo esperado como lo que reporta el punto de venta en efectivo más el fondo inicial y los ingresos, menos los gastos y los retiros.
- RF-25: EL SISTEMA calculará la diferencia de cada forma de pago como lo contado menos lo que reporta el punto de venta, y la de Efectivo como el efectivo contado menos el efectivo esperado.
- RF-26: EL SISTEMA mostrará en rojo cada forma de pago con diferencia distinta de cero, como faltante o sobrante.
- RF-27: EL SISTEMA calculará la venta antes de gastos como el efectivo contado menos el fondo y los ingresos, más los gastos y los retiros, más lo contado en las demás formas de pago.
- RF-28: EL SISTEMA calculará la venta después de gastos como la venta antes de gastos menos los gastos y los retiros.
- RF-29: EL SISTEMA mostrará la venta del punto de venta, la venta antes y después de gastos, el total de gastos y la diferencia total.

### Conteo a ciegas y teléfono de piso
- RF-30: MIENTRAS la sucursal permite cortes en el teléfono de piso, EL SISTEMA permitirá al teléfono abrir un corte, registrar movimientos y contar.
- RF-31: EL SISTEMA pedirá en el teléfono de piso que el cajero elija su nombre antes de abrir, registrar o contar, y guardará su nombre y el del teléfono.
- RF-32: EL SISTEMA no mostrará al teléfono de piso lo que reporta el punto de venta, lo esperado, las diferencias ni los cortes anteriores.
- RF-33: SI la sucursal no permite cortes en el teléfono de piso, ENTONCES EL SISTEMA rechazará cualquier petición de corte del teléfono.

### Cierre y reapertura
- RF-34: EL SISTEMA permitirá cerrar un corte con el conteo entregado y el reporte del punto de venta capturado, con una nota opcional de hasta 300 caracteres.
- RF-35: SI se intenta cerrar un corte sin conteo entregado o sin reporte del punto de venta, ENTONCES EL SISTEMA lo rechazará e indicará qué falta.
- RF-36: CUANDO se cierra un corte, EL SISTEMA guardará quién lo cerró, la hora y lo que mostraba (montos, esperado y diferencias).
- RF-37: MIENTRAS un corte está cerrado, EL SISTEMA rechazará cambios en él, aunque sea por dirección directa.
- RF-38: EL SISTEMA permitirá al dueño reabrir un corte cerrado con un motivo, dejándolo con el conteo entregado.
- RF-39: SI se intenta reabrir sin motivo, ENTONCES EL SISTEMA lo rechazará.

### Historial y registro
- RF-40: EL SISTEMA mostrará los cortes de la sucursal del más reciente al más antiguo, con fecha, apertura, estado, venta del punto de venta, venta contada y diferencia total.
- RF-41: EL SISTEMA mostrará en cada corte el fondo, los movimientos (con los cancelados aparte), el conteo por denominación, cada forma de pago con lo contado, lo reportado y la diferencia, y quién hizo cada paso.
- RF-42: EL SISTEMA registrará cada apertura, movimiento, cancelación, conteo, captura del reporte, cierre, reapertura y cambio de configuración con quién, cuándo y el valor anterior.

## Requisitos no funcionales
- **Dinero exacto**: todo en centavos, sin errores de redondeo; la hoja de corte de referencia capturada en SuMando
  da el mismo efectivo contado y los mismos gastos; la venta difiere porque la hoja suma los ingresos, que no son venta.
- **Conteo a ciegas comprobado en el servidor**: tests de integración prueban que ninguna respuesta al teléfono de
  piso lleva lo reportado, lo esperado ni las diferencias.
- **Aislamiento**: tests de integración demuestran que una sucursal no ve ni cambia los cortes de otra.
- **Nada se borra**: los movimientos se cancelan con motivo y las reaperturas quedan registradas (principio 8).
- **Sistema de diseño**: pantallas con componentes de la spec 002, desde 360 px; las piezas se capturan con teclado
  numérico y botones de − y + de 44 px; el conteo es un asistente por pasos.

## Casos límite
- Fondo inicial de cero: válido.
- Una sucursal con un corte por día abre a las 9 y cierra a las 23:30; al día siguiente puede abrir otro.
- Una sucursal con varios cortes: el matutino se cierra y se abre el vespertino con su propio fondo.
- Un corte abierto que pasa de medianoche: sigue abierto y conserva la fecha en que se abrió.
- Un gasto mal capturado: se cancela con motivo y se registra de nuevo.
- Una terminal sin ventas: se cuenta en cero; si el punto de venta también dice cero, cuadra.
- El reporte del punto de venta se captura antes de que el cajero cuente: el cajero sigue sin verlo.
- Se archiva una terminal con un corte abierto que ya la tiene: ese corte la conserva.
- El dueño desactiva los cortes en el teléfono de piso con un corte abierto desde el teléfono: el corte sigue y lo
  termina un administrador.
- Diferencia de 50 centavos en efectivo: se marca en rojo como cualquier otra.

## Fuera de alcance
- Cobrar, emitir tickets o conectarse al punto de venta: el reporte se captura a mano.
- Tolerancia de diferencias, motivos obligatorios o revisión del dueño de cada corte con diferencia.
- Avisos o notificaciones de cortes con diferencia (spec 012).
- Descontar faltantes de la nómina.
- Varias cajas simultáneas en la misma sucursal.
- Firma dibujada o foto de los vouchers.
- Depósitos bancarios y conciliación con el banco.

## Criterios de finalización
- Todos los RF con al menos un test en verde (`validation.md` 42 de 42).
- E2E de escritorio de la spec en verde, con el barrido en claro y oscuro con axe. Los teléfonos los prueba el dueño.
- Recorrido manual: el dueño configura una sucursal con tres terminales y cortes en el teléfono de piso; el cajero
  abre con fondo, registra un gasto y cuenta a ciegas; el administrador captura el reporte del punto de venta, ve una
  diferencia en una terminal y cierra; el dueño reabre con motivo.
- La hoja de corte de referencia capturada en SuMando da el mismo efectivo contado ($98,200.00) y los mismos gastos
  ($18,351.00).
- `docs/reglas-de-negocio.md` actualizado.

## Dudas abiertas
Ninguna. Resueltas en la entrevista (13 de noviembre de 2026): el dueño decide por sucursal si hay un corte por día o
varios; se compara contra el punto de venta por forma de pago; lo hace el administrador y, si el dueño lo permite, el
cajero en el teléfono de piso; el cajero cuenta a ciegas; los gastos son de concepto libre y se registran durante el
turno; las diferencias solo se marcan; los ingresos de caja son dinero que entra al cajón sin ser venta.
