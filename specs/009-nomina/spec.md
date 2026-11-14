# Spec 009 — Nómina

**Aprobada por el dueño el 13 de noviembre de 2026.**

## Contexto y objetivo
Cada sucursal paga a su gente por semana con una hoja de cálculo: una fila por persona con los días trabajados de
lunes a domingo, los retardos, el pago por día y la media jornada, los extras, los bonos, la comida y los préstamos,
y al final el total a pagar. Las fórmulas se copian a mano cada semana, los préstamos se llevan aparte y nadie sabe
qué billetes preparar hasta contar sobre por sobre. Esta spec da a SuMando la semana de nómina de cada sucursal: el
administrador marca quién trabajó y quién llegó tarde, el dueño agrega extras, bonos, comida y préstamos, ve el neto
de cada persona y el total, cierra la semana y obtiene la hoja de pago con billetes y la semana en Excel. Parte del
sueldo por día que el dueño fija en el expediente (spec 008). No calcula impuestos ni seguro social.

## Usuarios / actores
- **Dueño**: ve y captura todo, incluidos los montos; cierra, reabre, paga y registra préstamos.
- **Administrador**: en las sucursales que tiene asignadas, marca días trabajados, medias jornadas y retardos; no ve
  ningún monto en pesos.

## Historias de usuario
- H1: Como administrador quiero marcar en el teléfono quién trabajó cada día y quién llegó tarde, sin ver sueldos.
- H2: Como dueño quiero ver al instante cuánto le toca a cada persona y el total de la semana.
- H3: Como dueño quiero anotar extras, bonos y comida de la semana a cada persona.
- H4: Como dueño quiero registrar un préstamo una vez y que el abono se descuente solo cada semana hasta liquidarse.
- H5: Como dueño quiero cerrar la semana y saber qué billetes preparar para cada sobre.
- H6: Como dueño quiero corregir una semana cerrada reabriéndola, sin perder el rastro de lo que cambió.
- H7: Como dueño quiero bajar la semana en Excel y consultar las semanas pagadas.

## Requisitos funcionales (criterios de aceptación en EARS)

### Pertenencia y permisos
- RF-1: EL SISTEMA llevará una nómina por semana para cada sucursal.
- RF-2: EL SISTEMA definirá la semana de nómina de lunes a domingo para todos los negocios.
- RF-3: MIENTRAS hay una sucursal activa, EL SISTEMA mostrará solo la nómina de esa sucursal.
- RF-4: EL SISTEMA permitirá al dueño y a los administradores de la sucursal marcar días trabajados, medias jornadas y retardos.
- RF-5: EL SISTEMA mostrará los montos en pesos de la nómina (sueldos, percepciones, deducciones, netos y totales) solo al dueño.
- RF-6: EL SISTEMA permitirá solo al dueño capturar extras, bonos, comida y abonos de préstamo, registrar préstamos, cerrar y reabrir la semana, y obtener la hoja de pago y el Excel.
- RF-7: SI un administrador pide un monto, un préstamo, la hoja de pago o el Excel por dirección directa, ENTONCES EL SISTEMA lo rechazará por falta de permiso.
- RF-8: SI alguien pide la nómina de una sucursal a la que no tiene acceso, aunque sea por dirección directa, ENTONCES EL SISTEMA lo rechazará sin revelar si existe.

### Quién aparece en la semana
- RF-9: EL SISTEMA incluirá en la semana a cada empleado de la sucursal que estuvo activo al menos un día entre el lunes y el domingo.
- RF-10: SI un día de la semana es anterior a la fecha de ingreso o posterior a la fecha de baja de un empleado, ENTONCES EL SISTEMA no permitirá marcarlo.
- RF-11: EL SISTEMA mostrará a los empleados de la semana agrupados por puesto.
- RF-12: MIENTRAS un empleado de la semana no tiene sueldo por día, EL SISTEMA lo marcará «sin sueldo» para el dueño.

### Asistencia
- RF-13: EL SISTEMA permitirá marcar cada día de cada empleado como vacío, trabajado o media jornada.
- RF-14: EL SISTEMA permitirá marcar un retardo en un día marcado como trabajado o media jornada.
- RF-15: CUANDO un día se deja vacío, EL SISTEMA quitará el retardo de ese día.
- RF-16: SI se intenta marcar un día posterior a la fecha de hoy, ENTONCES EL SISTEMA lo rechazará.
- RF-17: EL SISTEMA mostrará por empleado el número de días trabajados, de medias jornadas y de retardos de la semana.

### Percepciones y deducciones
- RF-18: EL SISTEMA calculará el pago de los días como el sueldo por día por cada día trabajado más la mitad del sueldo por día por cada media jornada.
- RF-19: EL SISTEMA descontará por cada retardo la mitad del sueldo por día del empleado.
- RF-20: EL SISTEMA permitirá al dueño capturar a cada empleado en la semana un monto de extras, un monto de bonos con su concepto (hasta 80 caracteres) y un monto de comida.
- RF-21: SI un monto de extras, bonos, comida o abono es negativo o tiene más de 2 decimales, ENTONCES EL SISTEMA lo rechazará e indicará el formato válido.
- RF-22: EL SISTEMA calculará el neto de cada empleado como el pago de los días más extras y bonos, menos retardos, comida y abonos de préstamo.
- RF-23: EL SISTEMA redondeará cada monto calculado al centavo, con los medios centavos hacia arriba.
- RF-24: CUANDO cambia un día, un retardo o un monto, EL SISTEMA mostrará al dueño el neto del empleado y el total de la semana actualizados sin recargar la pantalla.
- RF-25: EL SISTEMA mostrará al dueño el total a pagar de la semana y los subtotales de pago de días, extras y bonos, retardos, comida y abonos de préstamo.
- RF-26: MIENTRAS la semana está abierta, EL SISTEMA calculará con el sueldo por día y el puesto vigentes en el expediente.

### Préstamos
- RF-27: EL SISTEMA permitirá al dueño registrar a un empleado un préstamo con fecha, monto y abono semanal, ambos mayores que cero y con hasta 2 decimales.
- RF-28: SI el abono semanal es mayor que el monto del préstamo, ENTONCES EL SISTEMA lo rechazará.
- RF-29: MIENTRAS un préstamo tiene saldo, EL SISTEMA propondrá en cada semana abierta posterior a su fecha un abono igual al abono semanal o al saldo, el que sea menor.
- RF-30: EL SISTEMA permitirá al dueño cambiar el abono de un préstamo en una semana abierta, incluso a cero.
- RF-31: SI el abono de una semana es mayor que el saldo del préstamo, ENTONCES EL SISTEMA no permitirá cerrar la semana e indicará el préstamo.
- RF-32: CUANDO se cierra la semana, EL SISTEMA restará del saldo de cada préstamo el abono de esa semana.
- RF-33: CUANDO el saldo de un préstamo llega a cero, EL SISTEMA lo marcará liquidado y dejará de proponer abonos.
- RF-34: EL SISTEMA mostrará al dueño los préstamos de cada empleado con su monto, saldo y cada abono con su semana.

### Cerrar y reabrir
- RF-35: CUANDO el dueño cierra la semana, EL SISTEMA congelará los días, retardos, sueldos, puestos, montos y netos de esa semana.
- RF-36: SI al cerrar algún empleado queda con neto negativo, ENTONCES EL SISTEMA no cerrará la semana e indicará a quién.
- RF-37: SI al cerrar algún empleado con días marcados no tiene sueldo por día, ENTONCES EL SISTEMA no cerrará la semana e indicará a quién.
- RF-38: MIENTRAS la semana está cerrada, EL SISTEMA rechazará cualquier cambio en ella, aunque sea por dirección directa.
- RF-39: CUANDO el dueño reabre una semana cerrada con un motivo, EL SISTEMA devolverá a cada préstamo el abono que le restó esa semana.
- RF-40: SI se intenta reabrir una semana sin motivo, ENTONCES EL SISTEMA lo rechazará.

### Hoja de pago y Excel
- RF-41: EL SISTEMA mostrará al dueño la hoja de pago de una semana, con un bloque por empleado con su nombre, puesto, desglose, neto y una línea de firma.
- RF-42: EL SISTEMA desglosará el neto de cada empleado en billetes de 1000, 500, 200, 100, 50 y 20 pesos y monedas de 10, 5, 2 y 1 peso y de 50 centavos, usando primero la denominación más alta.
- RF-43: EL SISTEMA mostrará en la hoja de pago el total de cada denominación para toda la semana.
- RF-44: EL SISTEMA permitirá imprimir la hoja de pago desde el navegador.
- RF-45: EL SISTEMA permitirá al dueño descargar la semana en Excel, con una fila por empleado y las columnas puesto, días, medias jornadas, retardos, sueldo por día, pago de días, extras, bonos, concepto del bono, descuento por retardos, comida, abono de préstamos y neto, más una fila de totales.

### Historial y registro
- RF-46: EL SISTEMA mostrará las semanas de la sucursal de la más reciente a la más antigua, con su estado (abierta o cerrada) y, solo al dueño, su total.
- RF-47: EL SISTEMA permitirá abrir cualquier semana anterior y capturarla mientras no esté cerrada.
- RF-48: EL SISTEMA registrará cada cambio de días, retardos, montos, préstamos, cierre y reapertura con quién, cuándo y el valor anterior.

## Requisitos no funcionales
- **Datos personales protegidos** (constitución, principio 9): ningún monto llega al administrador por ninguna ruta;
  tests de integración lo comprueban.
- **Aislamiento**: tests de integración demuestran que una sucursal no ve ni cambia la nómina de otra.
- **Dinero exacto**: los montos se manejan en centavos, sin errores de redondeo de punto flotante; los cálculos de la
  hoja de referencia (días, medias jornadas, retardos de media jornada, extras y bonos) dan el mismo neto en SuMando.
- **Nada se borra**: las reaperturas y los cambios quedan en el registro (principio 8).
- **Volumen**: con 60 empleados en la semana, la pantalla abre en menos de 2 segundos y el neto se actualiza en menos
  de 300 ms en escritorio.
- **Sistema de diseño**: pantallas con componentes de la spec 002, desde 360 px; marcar un día es un solo toque.

## Casos límite
- Un empleado entra el jueves: lunes a miércoles no se pueden marcar.
- Un empleado se da de baja el martes con días marcados: sigue en la semana con esos días y se le paga.
- Un empleado sin días marcados en la semana: aparece con neto cero (o negativo si tiene comida o abono, lo que
  impide cerrar hasta corregirlo).
- Media jornada con retardo: paga la mitad del día y descuenta la mitad del sueldo; el neto de ese día es cero.
- El dueño cambia el sueldo por día a media semana: la semana abierta se recalcula con el nuevo sueldo; las cerradas
  no cambian.
- Un empleado cambia de sucursal a media semana: aparece en la semana de cada sucursal en la que estuvo activo;
  cada una paga lo que se marcó en ella.
- Sueldo por día impar (por ejemplo 333.33): la media jornada se redondea al centavo hacia arriba (166.67).
- Neto con centavos menores a 50: el desglose de billetes deja el sobrante en centavos y lo indica.
- Préstamo de 1,000 con abono de 300: tres semanas de 300 y una de 100.
- Se reabre una semana y se cambia el abono: al volver a cerrar se aplica el abono nuevo; el saldo queda exacto.
- Un empleado con préstamo se da de baja: el préstamo conserva su saldo y queda a la vista del dueño.
- Dos personas capturan la misma semana a la vez: cada cambio se guarda; el último en guardar un mismo día gana.
- El dueño cierra mientras un administrador está marcando: los cambios posteriores al cierre se rechazan y se avisa.
- Semana sin empleados: se puede abrir, no tiene nada que pagar y se puede cerrar en cero.

## Fuera de alcance
- ISR, IMSS, INFONAVIT, recibos timbrados (CFDI) o cualquier cálculo fiscal.
- Checador, PIN o que el empleado registre su propia asistencia.
- Horas extra calculadas por hora: los extras son un monto.
- Pago por transferencia o depósito: la hoja de pago es en efectivo.
- Vacaciones, aguinaldo, prima vacacional, finiquitos e incapacidades.
- Semanas con otro día de inicio o periodos quincenales.
- Conceptos de nómina configurables más allá de extras, bonos, comida y préstamos.
- Que el administrador vea montos, aunque sean los suyos.

## Criterios de finalización
- Todos los RF con al menos un test en verde (`validation.md` 48 de 48).
- E2E de escritorio de la spec en verde, con el barrido en claro y oscuro con axe. Los teléfonos los prueba el dueño.
- Recorrido manual: el administrador marca la semana en el teléfono sin ver montos; el dueño agrega extras, bonos,
  comida y un préstamo, cierra, revisa la hoja de pago con billetes, baja el Excel, reabre con motivo y vuelve a
  cerrar.
- Una semana de la hoja de referencia capturada en SuMando da los mismos netos y el mismo total.
- `docs/reglas-de-negocio.md` actualizado.

## Dudas abiertas
Ninguna. Resueltas en la entrevista (13 de noviembre de 2026): el administrador captura días, medias jornadas y
retardos sin ver montos, y lo demás es del dueño; cada retardo descuenta media jornada del sueldo de la persona;
los préstamos llevan abono semanal automático que el dueño puede cambiar en una semana; la comida es un monto que se
teclea; la semana va de lunes a domingo para todos; al cerrar se obtiene la hoja de pago con billetes y la semana en
Excel.
