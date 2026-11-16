# Spec 012 — Tablero y reportes

## Contexto y objetivo
El dueño opera varios negocios y hoy, para saber cómo va, entra a cada uno y revisa módulo por módulo: inventario,
requisiciones, nómina y corte de caja. Esta spec da a SuMando un tablero dividido en secciones: alertas de lo que
requiere atención (existencias bajas, requisiciones pendientes, nómina por cerrar y cortes con diferencia) y cifras
de ventas, gastos de caja, nómina y lo que queda, con un total general y su comparación por negocio y sucursal, en
periodos fijos o en un rango libre, comparados con el periodo anterior. Al elegir una sección, su detalle se abre en
la misma pantalla y se puede exportar a Excel tal como se ve.

## Usuarios / actores
- **Dueño**: ve todas las secciones de todos sus negocios y sucursales, y marca como revisados los cortes con
  diferencia.
- **Administrador**: ve las alertas y las ventas solo de las sucursales donde está asignado; no ve gastos de caja,
  nómina ni lo que queda.

## Historias de usuario
- H1: Como dueño quiero ver en una sola pantalla lo que requiere atención en todos mis negocios para no revisar
  módulo por módulo.
- H2: Como dueño quiero ver cuánto vendí, cuánto gasté en caja, cuánto pagué de nómina y cuánto queda, en total y por
  negocio y sucursal, para comparar cómo va cada uno.
- H3: Como dueño quiero comparar el periodo con el anterior para saber si voy mejor o peor.
- H4: Como dueño quiero marcar como revisado un corte con diferencia para que deje de aparecer en las alertas.
- H5: Como administrador quiero ver las alertas y las ventas de mis sucursales para atender lo pendiente.
- H6: Como dueño quiero exportar a Excel lo que estoy viendo para guardarlo o compartirlo.

## Requisitos funcionales (criterios de aceptación en EARS)

### Acceso y alcance
- RF-1: EL SISTEMA ofrecerá el tablero como una entrada propia de la navegación, disponible para el dueño y para los administradores.
- RF-2: EL SISTEMA mostrará al dueño la información de todos los negocios donde es dueño y de todas sus sucursales activas.
- RF-3: EL SISTEMA mostrará a un administrador solo la información de las sucursales donde está asignado.
- RF-4: EL SISTEMA mostrará a un administrador solo las secciones de alertas y de ventas.
- RF-5: SI un administrador pide al servidor gastos de caja, nómina, lo que queda o su exportación, ENTONCES EL SISTEMA lo rechazará como sin permiso.
- RF-6: EL SISTEMA calculará cada cifra en el servidor al abrir el tablero o cambiar el periodo, con los datos guardados en ese momento.

### Secciones
- RF-7: EL SISTEMA dividirá el tablero en las secciones Alertas, Ventas, Gastos de caja, Nómina y Lo que queda, cada una con su número principal visible sin abrirla.
- RF-8: CUANDO se elige una sección, EL SISTEMA abrirá su detalle en la misma pantalla, sin cambiar de página.
- RF-9: CUANDO se elige otra sección, EL SISTEMA cerrará el detalle anterior y abrirá el de la elegida.
- RF-10: EL SISTEMA mantendrá abierta la sección elegida al cambiar el periodo.

### Periodos y comparación
- RF-11: EL SISTEMA ofrecerá los periodos Hoy, Esta semana (lunes a domingo, como la nómina) y Este mes, según la fecha de México.
- RF-12: EL SISTEMA permitirá elegir un rango libre con fecha inicial y fecha final, ambas incluidas.
- RF-13: SI la fecha final del rango es anterior a la inicial, ENTONCES EL SISTEMA lo rechazará e indicará que la final debe ser igual o posterior.
- RF-14: SI el rango abarca más de 366 días, ENTONCES EL SISTEMA lo rechazará e indicará el máximo.
- RF-15: SI el rango termina después de hoy, ENTONCES EL SISTEMA lo rechazará e indicará que no puede pasar de hoy.
- RF-16: EL SISTEMA mostrará Hoy como periodo inicial al abrir el tablero.
- RF-17: EL SISTEMA comparará cada cifra de dinero con la del periodo anterior de la misma duración, que termina el día antes de que empiece el elegido.
- RF-18: MIENTRAS el periodo es Esta semana o Este mes, EL SISTEMA lo comparará con los mismos días transcurridos de la semana o del mes anterior.
- RF-19: EL SISTEMA mostrará la comparación como el cambio en pesos y en porcentaje, con flecha hacia arriba o hacia abajo.
- RF-20: SI la cifra del periodo anterior es cero, ENTONCES EL SISTEMA mostrará el cambio en pesos y en lugar del porcentaje el texto «sin periodo anterior».

### Total general y comparación por negocio
- RF-21: EL SISTEMA mostrará en el detalle de cada sección de dinero el total general del periodo arriba y, debajo, una fila por negocio con su total.
- RF-22: CUANDO se elige un negocio en el detalle, EL SISTEMA desglosará su total en una fila por sucursal en la misma pantalla.
- RF-23: EL SISTEMA mostrará en cada fila de negocio y de sucursal su comparación con el periodo anterior.
- RF-24: EL SISTEMA mostrará los negocios y las sucursales que no tienen movimientos en el periodo con su total en cero.

### Ventas
- RF-25: EL SISTEMA tomará como venta de un corte su venta antes de gastos (spec 011).
- RF-26: EL SISTEMA contará en las ventas solo los cortes cerrados cuya fecha de apertura cae en el periodo.
- RF-27: EL SISTEMA mostrará en el detalle de ventas, además, el total del periodo por forma de pago.
- RF-28: CUANDO un corte se reabre, EL SISTEMA dejará de contarlo hasta que se vuelva a cerrar.

### Gastos de caja
- RF-29: EL SISTEMA sumará como gastos de caja los gastos no cancelados de los cortes cerrados del periodo, sin contar retiros ni ingresos.
- RF-30: EL SISTEMA mostrará en el detalle de gastos de caja la lista de gastos del periodo con fecha, sucursal, concepto y monto, del más reciente al más antiguo.

### Nómina
- RF-31: EL SISTEMA sumará como nómina el total a pagar de las semanas cerradas que pertenecen al periodo.
- RF-32: EL SISTEMA contará cada semana de nómina en el periodo que contiene su domingo.
- RF-33: CUANDO una semana de nómina se reabre, EL SISTEMA dejará de contarla hasta que se vuelva a cerrar.
- RF-34: EL SISTEMA mostrará en el detalle de nómina una fila por semana cerrada con su sucursal y su total.

### Lo que queda
- RF-35: EL SISTEMA calculará lo que queda como ventas menos gastos de caja menos nómina, del mismo periodo y del mismo alcance.
- RF-36: SI lo que queda es negativo, ENTONCES EL SISTEMA lo mostrará en rojo con signo menos.

### Alertas
- RF-37: EL SISTEMA mostrará en la sección Alertas el número de alertas de cada tipo y el total.
- RF-38: EL SISTEMA mostrará las alertas según su estado al momento, sin importar el periodo elegido.
- RF-39: EL SISTEMA mostrará una alerta de existencia baja por cada producto activo cuya existencia en un almacén activo sea menor que el mínimo fijado (spec 003, RF-22).
- RF-40: EL SISTEMA mostrará en cada alerta de existencia baja el producto, el almacén, la existencia y el mínimo, en la presentación de conteo.
- RF-41: EL SISTEMA mostrará una alerta de requisición pendiente por cada requisición solicitada sin aprobar o rechazar.
- RF-42: EL SISTEMA mostrará una alerta de requisición pendiente por cada requisición aprobada que tiene renglones por recibir.
- RF-43: EL SISTEMA mostrará una alerta de nómina por cerrar por cada semana ya terminada (su domingo es anterior a hoy) sin cerrar, en cada sucursal que tenía personal activo con sueldo esa semana, desde la primera semana con captura de esa sucursal.
- RF-44: EL SISTEMA mostrará una alerta de corte con diferencia por cada corte cerrado cuya diferencia total o de alguna forma de pago no sea cero, aunque sea de un peso, mientras no se marque como revisado.
- RF-45: EL SISTEMA mostrará en cada alerta su negocio y su sucursal.
- RF-46: CUANDO se elige una alerta, EL SISTEMA abrirá la pantalla de su módulo con el negocio y la sucursal de la alerta activos.
- RF-47: EL SISTEMA permitirá solo al dueño marcar como revisado un corte con diferencia.
- RF-48: CUANDO el dueño marca como revisado un corte con diferencia, EL SISTEMA quitará su alerta y lo mostrará en el detalle del corte como revisado, con quién y cuándo.
- RF-49: CUANDO se reabre un corte revisado, EL SISTEMA quitará la marca de revisado.
- RF-50: SI no hay alertas, ENTONCES EL SISTEMA mostrará en la sección el texto «Todo en orden».

### Exportar
- RF-51: EL SISTEMA permitirá exportar a Excel la sección abierta, con su periodo y su desglose por negocio y sucursal.
- RF-52: EL SISTEMA incluirá en el Excel solo lo que quien exporta puede ver en el tablero.
- RF-53: EL SISTEMA nombrará el archivo con la sección y las fechas del periodo.
- RF-54: EL SISTEMA guardará los montos del Excel como números en pesos con dos decimales, para poder sumarlos.

### Registro
- RF-55: EL SISTEMA registrará cada marca de revisado de un corte con quién y cuándo.

## Requisitos no funcionales
- El tablero responde en menos de 2 segundos con 3 negocios, 10 sucursales y un año de cortes, semanas de nómina y
  movimientos de inventario (test de volumen).
- Ninguna consulta del tablero incluye negocios donde quien consulta no es dueño o sucursales donde no está asignado
  (tests de aislamiento).
- Textos en español; montos en pesos con dos decimales; fechas de México (UTC−6).
- Funciona a 360 px de ancho, en claro y oscuro, con los componentes del sistema de diseño (dirección Tablero).

## Casos límite
- Un negocio sin cortes, sin nómina o sin sucursales con información: aparece con ceros, no se oculta.
- Una sucursal archivada: no aparece en las cifras ni en las alertas; sus cortes y semanas anteriores tampoco.
- Un producto sin mínimo fijado o un almacén archivado: nunca generan alerta de existencia baja.
- Existencia negativa con mínimo fijado: genera alerta y se muestra en rojo (spec 005, RF-21).
- Un administrador sin sucursales asignadas: ve el tablero vacío con el texto «Sin sucursales asignadas».
- Periodo Hoy un lunes: la comparación es contra el domingo anterior.
- Rango de un solo día: se compara contra el día anterior.
- Mes con días de más (el 31) contra un mes más corto: se compara hasta el último día del mes anterior.
- Dos dueños marcan el mismo corte como revisado a la vez: queda una sola marca.

## Fuera de alcance
- Notificaciones por correo, push o WhatsApp: las alertas solo se ven en el tablero.
- Gráficas de tendencia: las cifras se muestran como números y comparaciones.
- Exportar a PDF o un reporte completo con todas las secciones en un solo archivo.
- Costo de insumos, margen por producto, valor del inventario y compras de requisiciones como gasto.
- Metas o presupuestos por negocio.
- Configurar qué alertas ver o umbrales: la diferencia de corte alerta desde un peso.
- Marcar como revisadas las demás alertas: se quitan cuando se resuelve lo pendiente en su módulo.

## Criterios de finalización
- Todos los RF con test en verde (`scripts/rf-coverage.mjs`).
- E2E de escritorio: el dueño ve alertas de los cuatro tipos en dos negocios, abre ventas y desglosa por negocio y
  sucursal, cambia a un rango libre, compara con el periodo anterior, exporta a Excel y marca un corte como revisado;
  el administrador solo ve alertas y ventas de sus sucursales.
- Barrido de calidad (claro, oscuro, axe y 360 px) en verde con el tablero.
- `docs/reglas-de-negocio.md` actualizado.

## Dudas abiertas
- Ninguna. Resuelta (15 de noviembre de 2026): la semana de nómina cuenta completa en el periodo donde cae su
  domingo (RF-32); en el periodo Hoy la nómina solo aparece el domingo.
