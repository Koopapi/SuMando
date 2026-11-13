# Spec 007 — Requisiciones

**Borrador para aprobación del dueño (13 de noviembre de 2026).**

## Contexto y objetivo
Hoy cada negocio arma su lista de compra en una hoja: artículo, cantidad en la presentación en que se compra,
proveedor y quién va a comprarlo. Nadie aprueba formalmente, no queda claro qué ya se compró ni qué llegó, y lo
recibido se carga al inventario a mano. Esta spec da a SuMando requisiciones por sucursal: se arman desde lo que
está bajo el mínimo, desde un cálculo de insumos, desde una plantilla de compra o a mano; el dueño las aprueba;
cada proveedor se marca comprado (con su monto, si se quiere) y lo que llega se recibe en el almacén como entrada de
inventario (spec 005), aunque llegue en partes.

## Usuarios / actores
- **Dueño**: crea, aprueba o rechaza requisiciones de cualquier sucursal; lo que él solicita queda aprobado.
- **Administrador**: crea requisiciones en sus sucursales, marca compras y recibe; no aprueba.
- **Comprador**: quien va a comprar; no usa SuMando, se anota su nombre por proveedor.

## Historias de usuario
- H1: Como administrador quiero armar la requisición con lo que está bajo el mínimo, para no revisar producto por
  producto.
- H2: Como administrador quiero armarla desde el cálculo de insumos de la semana o desde mi lista de compra habitual.
- H3: Como dueño quiero aprobar, ajustar o rechazar lo que se va a comprar antes de que se gaste.
- H4: Como dueño quiero ver por proveedor qué ya se compró, quién lo compró y cuánto se pagó.
- H5: Como administrador quiero recibir lo que llegó, aunque falte algo, y que entre solo al inventario.
- H6: Como dueño quiero el historial de requisiciones con quién hizo cada paso y cuándo.

## Requisitos funcionales (criterios de aceptación en EARS)

### Pertenencia y permisos
- RF-1: EL SISTEMA guardará cada requisición como parte de una sola sucursal, con un almacén de destino visible desde esa sucursal (spec 005, RF-2).
- RF-2: EL SISTEMA dará a cada requisición un folio consecutivo por negocio.
- RF-3: MIENTRAS hay una sucursal activa, EL SISTEMA mostrará solo las requisiciones de esa sucursal.
- RF-4: EL SISTEMA permitirá crear, editar mientras está solicitada, marcar compras y recibir a quien pueda registrar movimientos en el almacén de destino (spec 005, RF-3, RF-4).
- RF-5: EL SISTEMA permitirá aprobar y rechazar solo al dueño.
- RF-6: SI alguien pide o cambia una requisición de una sucursal a la que no tiene acceso, aunque sea por dirección directa, ENTONCES EL SISTEMA lo rechazará sin revelar si existe.

### Renglones
- RF-7: EL SISTEMA guardará cada renglón con un producto activo del negocio, una cantidad mayor que cero con hasta 3 decimales en cualquier presentación del producto (convertida a unidad base) y un proveedor.
- RF-8: CUANDO se añade un producto, EL SISTEMA propondrá su presentación de compra y su proveedor habitual (spec 003).
- RF-9: EL SISTEMA permitirá cambiar el proveedor de cualquier renglón por otro proveedor activo del negocio, o dejarlo sin proveedor.
- RF-10: SI un producto se añade dos veces a la misma requisición, ENTONCES EL SISTEMA sumará las cantidades en un solo renglón.
- RF-11: SI una requisición queda sin renglones, ENTONCES EL SISTEMA no la enviará e indicará que agregue al menos uno.
- RF-12: EL SISTEMA agrupará los renglones por proveedor, con un grupo «Sin proveedor» para los que no tienen.

### Armar la requisición
- RF-13: EL SISTEMA permitirá agregar y quitar productos a mano y cambiar sus cantidades.
- RF-14: CUANDO se pide agregar lo que está bajo el mínimo, EL SISTEMA añadirá cada producto activo cuya existencia en el almacén de destino sea menor que su mínimo, con la cantidad que falta para llegar a su máximo, o a su mínimo si no tiene máximo.
- RF-15: CUANDO se agregan cantidades bajo el mínimo, EL SISTEMA las redondeará hacia arriba a presentaciones de compra completas si el producto tiene presentación de compra.
- RF-16: CUANDO se pide agregar un cálculo de insumos guardado de la sucursal (spec 004), EL SISTEMA añadirá cada producto del cálculo con sus presentaciones de compra redondeadas hacia arriba, o con su total en unidad base si no tiene presentación de compra.
- RF-17: SI un producto del cálculo o de una plantilla está archivado, ENTONCES EL SISTEMA no lo añadirá y avisará cuáles se omitieron.
- RF-18: EL SISTEMA permitirá guardar los renglones de una requisición como plantilla de compra con nombre, propia de la sucursal.
- RF-19: CUANDO se pide agregar una plantilla de compra, EL SISTEMA añadirá sus productos con sus cantidades y proveedores.
- RF-20: EL SISTEMA permitirá renombrar, archivar y reactivar plantillas de compra, sin nombres repetidos entre las activas de la sucursal.
- RF-21: EL SISTEMA permitirá anotar una nota de hasta 200 caracteres en la requisición.

### Solicitud y aprobación
- RF-22: CUANDO un administrador envía una requisición, EL SISTEMA la dejará en estado «solicitada».
- RF-23: CUANDO el dueño envía una requisición, EL SISTEMA la dejará en estado «aprobada», a su nombre.
- RF-24: MIENTRAS una requisición está solicitada, EL SISTEMA permitirá a quien la creó y al dueño editar sus renglones y su nota.
- RF-25: EL SISTEMA permitirá al dueño aprobar una requisición solicitada, con los cambios de cantidades o renglones que haga antes de aprobar.
- RF-26: EL SISTEMA permitirá al dueño rechazar una requisición solicitada con un motivo escrito de 3 a 200 caracteres.
- RF-27: EL SISTEMA permitirá anotar, en cada grupo de proveedor de una requisición aprobada, el nombre de quien comprará, de hasta 60 caracteres.
- RF-28: EL SISTEMA permitirá cancelar con motivo una requisición solicitada o aprobada mientras no se haya recibido nada.

### Compra
- RF-29: EL SISTEMA permitirá marcar como comprado cada grupo de proveedor de una requisición aprobada.
- RF-30: CUANDO se marca un grupo como comprado, EL SISTEMA permitirá anotar, de forma opcional, el total pagado al proveedor o el importe de cada renglón, en pesos con hasta 2 decimales y no negativos.
- RF-31: SI se anotan importes por renglón, ENTONCES EL SISTEMA mostrará como total del grupo la suma de esos importes y no pedirá el total aparte.
- RF-32: EL SISTEMA permitirá corregir los importes y el comprador de un grupo comprado mientras no se haya recibido nada de él.
- RF-33: EL SISTEMA mostrará en la requisición, por grupo, si está por comprar, comprado, recibido en parte o recibido.

### Recepción
- RF-34: EL SISTEMA permitirá recibir lo que llegó de un grupo comprado, renglón por renglón, proponiendo lo que falta por recibir de cada uno.
- RF-35: CUANDO se recibe, EL SISTEMA registrará una entrada de inventario (spec 005, RF-11 a RF-13) en el almacén de destino, con el proveedor del grupo y el folio de la requisición como referencia.
- RF-36: EL SISTEMA permitirá recibir en cualquier presentación del producto, incluido el cero, y lo convertirá a unidad base.
- RF-37: SI lo recibido de un renglón supera lo que faltaba, ENTONCES EL SISTEMA lo aceptará y mostrará la diferencia como excedente.
- RF-38: MIENTRAS a un renglón le falta por recibir, EL SISTEMA lo mostrará pendiente y permitirá recibirlo otra vez.
- RF-39: EL SISTEMA permitirá cerrar lo que falta de un renglón o de un grupo con un motivo escrito, sin recibirlo.
- RF-40: CUANDO todos los renglones están recibidos o cerrados, EL SISTEMA dejará la requisición en estado «cerrada».
- RF-41: SI se intenta recibir en un almacén de destino archivado o con un producto archivado, ENTONCES EL SISTEMA lo rechazará (spec 005, RF-6).

### Consulta e historial
- RF-42: EL SISTEMA mostrará las requisiciones de la sucursal con su folio, fecha, quién la solicitó, estado, renglones y total anotado, de la más reciente a la más antigua.
- RF-43: EL SISTEMA permitirá filtrar las requisiciones por estado: solicitada, aprobada, rechazada, cancelada y cerrada.
- RF-44: EL SISTEMA mostrará en cada requisición quién y cuándo la solicitó, aprobó o rechazó, marcó cada compra, recibió cada vez, cerró o canceló, con sus motivos.
- RF-45: EL SISTEMA mostrará en la entrada de inventario creada al recibir el folio de su requisición, con un enlace a ella.
- RF-46: EL SISTEMA no ofrecerá borrar ninguna requisición ni ningún renglón ya enviado; se quitan solo mientras está solicitada.
- RF-47: EL SISTEMA mostrará en el inicio cuántas requisiciones esperan aprobación (al dueño) y cuántas tienen algo por recibir.
- RF-48: EL SISTEMA mostrará Requisiciones en el menú lateral y en «Más» del teléfono.

## Requisitos no funcionales
- **El servidor decide**: estados, cantidades pendientes, redondeos y totales los calcula el servidor; cada paso
  ocurre en una transacción y dos recepciones simultáneas del mismo renglón no reciben dos veces lo mismo
  (constitución, principio 3).
- **Exactitud**: cantidades en enteros como en la spec 005; montos en centavos.
- **Aislamiento y permisos**: tests de integración demuestran que una sucursal no ve ni cambia requisiciones de
  otra y que solo el dueño aprueba (principios 6 y 7).
- **Nada se borra**: rechazos, cancelaciones y cierres guardan quién, cuándo y su motivo (principio 8).
- **Volumen**: una requisición de 300 renglones se arma desde los mínimos y se recibe en menos de 2 segundos, en
  escritorio.
- **Sistema de diseño**: las pantallas usan solo componentes de la spec 002 y funcionan desde 360 px; recibir se
  hace con teclado numérico en el teléfono.

## Casos límite
- Producto bajo el mínimo sin máximo: se pide lo que falta para el mínimo.
- Existencia negativa (spec 005): lo que falta incluye cubrir el negativo.
- Mínimo de 3 cartones, hay 30 piezas (1.25 cartones), máximo 6: faltan 4.75 cartones, se piden 5.
- El dueño baja una cantidad al aprobar: se guarda lo aprobado; lo que pidió el administrador queda en el
  historial.
- Llegan 10 de 12 cajas: se reciben 10; quedan 2 pendientes hasta otra recepción o cerrarlas con motivo.
- Se recibe más de lo pedido: entra todo y se marca el excedente.
- Se cambia la equivalencia de una presentación después de solicitar: las cantidades guardadas en unidad base no
  cambian.
- Se archiva el proveedor de un grupo: el grupo lo conserva y lo marca archivado; la entrada lo registra igual.
- Una requisición sin proveedor en algunos renglones: se compran y reciben como grupo «Sin proveedor».
- Un administrador pierde la sucursal con una requisición solicitada: el dueño la puede aprobar, rechazar o
  cancelar.

## Fuera de alcance
- Formas de pago, facturas, CFDI y cuentas por pagar.
- Costo promedio, valor del inventario y precios en el catálogo (los importes son solo de la compra).
- Enviar el pedido al proveedor (correo, WhatsApp) y avisos o notificaciones.
- Reglas de aprobación por monto o por administrador.
- Varias sucursales o almacenes de destino en una misma requisición; requisiciones entre negocios.
- Que el comprador use SuMando o tenga cuenta; elegirlo de Personal llega con la spec 008.
- Compras sin requisición: siguen siendo entradas de inventario (spec 005).

## Criterios de finalización
- Todos los RF con al menos un test en verde (`validation.md` 48 de 48).
- E2E de escritorio de la spec en verde, con el barrido en claro y oscuro con axe. Los teléfonos los prueba el
  dueño.
- Recorrido manual: requisición desde mínimos, aprobada con un cambio, un proveedor comprado con total, recepción
  parcial y cierre de lo pendiente.
- `docs/reglas-de-negocio.md` actualizado.

## Dudas abiertas
Ninguna. Resueltas en la entrevista (13 de noviembre de 2026): aprueba solo el dueño; el comprador es un nombre por
proveedor; la recepción puede ser parcial; los importes son opcionales, por proveedor o por renglón; se arma desde
mínimos, cálculo de insumos, plantilla de compra o a mano; la compra se marca por proveedor.
