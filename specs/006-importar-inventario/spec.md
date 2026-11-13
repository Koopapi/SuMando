# Spec 006 — Importar inventario por áreas

**Aprobada por el dueño el 13 de noviembre de 2026.**

## Contexto y objetivo
Cada negocio ya tiene su inventario en una hoja de cálculo «Inventario por áreas»: por área, cada artículo con su
presentación, la cantidad contada, la unidad, la conversión a la presentación final, el proveedor y el mínimo. Pirrus
tiene unos 100 artículos y Pastatti Sendero unos 200. Capturarlos a mano en SuMando (productos, presentaciones,
proveedores, áreas, mínimos y existencias) retrasa el arranque. Esta spec permite subir esa hoja, revisar qué se va a
crear y, al confirmar, dejar el catálogo, las áreas con su lista, los mínimos y la existencia inicial de un almacén,
como si se hubiera capturado y contado en la app.

## Usuarios / actores
- **Dueño**: importa en cualquier negocio.
- **Administrador**: importa en los negocios donde tiene sucursal; las áreas y la existencia, en su sucursal activa.

## Historias de usuario
- H1: Como dueño quiero subir mi hoja de inventario por áreas para no capturar cientos de productos a mano.
- H2: Como dueño quiero ver antes de guardar qué productos, proveedores y áreas se van a crear y qué filas tienen
  problemas, para corregir la hoja si hace falta.
- H3: Como administrador quiero que la cantidad de la hoja quede como existencia inicial del almacén, para empezar a
  contar desde ahí.
- H4: Como dueño quiero volver a subir una hoja sin que se dupliquen los productos que ya existen.

## Requisitos funcionales (criterios de aceptación en EARS)

### Pertenencia y permisos
- RF-1: EL SISTEMA importará los productos y proveedores en el negocio de la sucursal activa, y las áreas en la sucursal activa.
- RF-2: EL SISTEMA permitirá importar solo a quien pueda administrar el catálogo del negocio (spec 003, RF-6) y crear áreas en la sucursal activa (spec 003, RF-7).
- RF-3: EL SISTEMA pedirá elegir, antes de confirmar, un almacén activo visible desde la sucursal activa donde quien importa pueda registrar movimientos (spec 005, RF-3, RF-4).
- RF-4: EL SISTEMA no creará ni cambiará nada de otro negocio ni de otra sucursal.

### Archivo y lectura
- RF-5: EL SISTEMA aceptará un archivo de Excel (.xlsx) de hasta 40 MB e ignorará las imágenes que traiga.
- RF-6: EL SISTEMA leerá las hojas que tengan una fila de encabezado con al menos las columnas ÁREA, ARTÍCULO y UNIDAD, comparando los encabezados sin mayúsculas, acentos ni espacios sobrantes.
- RF-7: EL SISTEMA ignorará las hojas sin ese encabezado, las filas de título de grupo y las filas sin artículo.
- RF-8: SI el archivo no es un .xlsx válido, pasa del tamaño o no tiene ninguna hoja con el encabezado, ENTONCES EL SISTEMA lo rechazará e indicará el formato esperado.
- RF-9: EL SISTEMA tomará como opcionales las columnas CANT, CONVERSIÓN, PRESENTACIÓN FINAL, PROVEEDOR y MÍNIMO, y una hoja sin ellas se importará sin esos datos.

### Unidades y presentaciones
- RF-10: EL SISTEMA tomará como unidad base gramo cuando la UNIDAD sea kilogramo o gramo, mililitro cuando sea litro o mililitro, y pieza en cualquier otro caso, reconociendo sus variantes de escritura (KG, KILOGRAMOS, GRAMOS, L, LITROS, ML, PIEZAS).
- RF-11: CUANDO la UNIDAD no es de peso, volumen ni «pieza» (por ejemplo bote, bolsa o caja), EL SISTEMA dará al producto una presentación con ese nombre equivalente a 1 pieza y la marcará como presentación de conteo.
- RF-12: CUANDO la UNIDAD es kilogramo o litro, EL SISTEMA dará al producto una presentación «Kilogramo» o «Litro» equivalente a 1,000 de la unidad base y la marcará como presentación de conteo.
- RF-13: CUANDO la PRESENTACIÓN FINAL es distinta de la UNIDAD y la CONVERSIÓN es un número mayor que cero, EL SISTEMA dará al producto una presentación con el nombre de la presentación final, equivalente a CONVERSIÓN unidades, y la marcará como presentación de compra.
- RF-14: CUANDO la PRESENTACIÓN FINAL es kilogramo, gramo, litro o mililitro, EL SISTEMA usará su equivalencia estándar en la unidad base en vez de la CONVERSIÓN.
- RF-15: SI la PRESENTACIÓN FINAL está vacía o su CONVERSIÓN no es válida, ENTONCES EL SISTEMA no creará presentación de compra y lo señalará como aviso en la revisión, sin impedir importar la fila; si es igual a la UNIDAD o a la unidad base, tampoco la creará, sin aviso (se compra en la misma unidad). *Aclarado al construir, 13 de noviembre de 2026.*

### Revisión antes de guardar
- RF-16: CUANDO se sube el archivo, EL SISTEMA mostrará, sin guardar nada, cada producto con su área, su unidad base, sus presentaciones, su mínimo, su cantidad y su estado: nuevo, ya existe (se completa) o con problema.
- RF-17: EL SISTEMA mostrará en la revisión cuántos productos, proveedores y áreas se van a crear, y cuántas áreas se contarán.
- RF-18: SI el nombre del artículo pasa de 80 caracteres, ENTONCES EL SISTEMA marcará la fila con problema.
- RF-19: SI el mismo artículo aparece dos veces en el archivo (comparando como la spec 003, RF-31), ENTONCES EL SISTEMA marcará con problema la segunda aparición.
- RF-20: SI un producto ya existe en el negocio con otra unidad base, ENTONCES EL SISTEMA marcará la fila con problema y no la importará.
- RF-21: SI la cantidad o el mínimo no son números válidos (vacíos y «/» no cuentan como inválidos), ENTONCES EL SISTEMA lo señalará como aviso e importará la fila sin ese dato.
- RF-22: EL SISTEMA mostrará los avisos y problemas de cada fila en español, con la hoja y la fila del archivo.

### Al confirmar
- RF-23: CUANDO se confirma, EL SISTEMA volverá a leer el archivo, lo validará de nuevo y guardará todas las filas sin problema en una sola operación.
- RF-24: SI al confirmar ninguna fila se puede importar, ENTONCES EL SISTEMA no guardará nada e informará por qué.
- RF-25: CUANDO se importa un producto nuevo, EL SISTEMA lo dará de alta con su nombre, unidad base, presentaciones, presentación de conteo y de compra, y proveedor habitual.
- RF-26: CUANDO se importa un producto que ya existe con la misma unidad base, EL SISTEMA conservará su nombre, unidad, notas y presentaciones marcadas, y solo añadirá las presentaciones que le falten (por nombre), el proveedor si no tiene, y el mínimo en el almacén elegido si no tiene.
- RF-27: EL SISTEMA usará el proveedor activo del negocio con el mismo nombre (spec 003, RF-31) y, si no existe, lo dará de alta.
- RF-28: EL SISTEMA usará el área activa de la sucursal con el mismo nombre y, si no existe, la dará de alta con quien importa como responsable.
- RF-29: SI un área existente ya se cuenta en otro almacén, ENTONCES EL SISTEMA marcará con problema sus filas en la revisión y no las importará.
- RF-30: CUANDO se importa un producto, EL SISTEMA lo añadirá al final de la lista de su área en el almacén elegido, en el orden del archivo, salvo que ya esté en otra área activa de ese almacén, en cuyo caso lo dejará donde está y lo señalará como aviso.
- RF-31: EL SISTEMA guardará el MÍNIMO como mínimo del producto en el almacén elegido, entendido en la presentación final si se creó, y si no, en la UNIDAD.
- RF-32: CUANDO se confirma, EL SISTEMA aplicará por cada área un conteo en el almacén elegido con los productos que traen cantidad, dejando su existencia en la cantidad de la hoja convertida a unidad base y registrando la diferencia como conteo (spec 005, RF-49 a RF-53).
- RF-33: EL SISTEMA no cambiará la existencia de los productos sin cantidad o con cantidad inválida.
- RF-34: EL SISTEMA redondeará a 3 decimales de la unidad base, a la mitad hacia arriba, las cantidades y mínimos que traigan más decimales al convertirse.
- RF-35: EL SISTEMA registrará cada producto, presentación, proveedor y área creada, cada mínimo fijado y la importación misma con quién la hizo, cuándo y el archivo.
- RF-36: CUANDO termina, EL SISTEMA mostrará cuántos productos se crearon, cuántos se completaron, cuántas filas se omitieron y cuántas áreas se contaron.

### Navegación
- RF-37: EL SISTEMA ofrecerá «Importar inventario» en Productos y en Conteo por área.

## Requisitos no funcionales
- **Exactitud**: cantidades, equivalencias y mínimos en enteros (como las specs 003 a 005); los números de Excel
  (0.40000000000000002) se normalizan antes de validar.
- **Seguridad del archivo**: se lee solo lo necesario del .xlsx (libro, textos y hojas), con límites de hojas,
  filas y bytes descomprimidos; un archivo malicioso o corrupto se rechaza sin colgar el servidor.
- **El servidor decide**: la revisión y la importación las calcula el servidor; la confirmación ocurre en una
  transacción (constitución, principio 3).
- **Volumen**: un archivo de 300 productos se revisa en menos de 5 segundos y se importa en menos de 10, en
  escritorio.
- **Sistema de diseño**: la pantalla usa solo componentes de la spec 002 y funciona desde 360 px.

## Casos límite
- La hoja de Pastatti Sendero trae una segunda hoja de precios con fotos: no tiene el encabezado, se ignora (RF-7).
- RESPONSABLE «PENDIENTE» o con un nombre: se ignora; las áreas nuevas quedan con quien importa como responsable y
  se cambia después (spec 003).
- UNIDAD «PIEZA», PRESENTACIÓN FINAL «CARTÓN», CONVERSIÓN 24: unidad base pieza y presentación de compra
  «Cartón = 24 pz».
- UNIDAD «KILOGRAMO», CANT 7.6879999999999997: 7,688 g de existencia, con presentación de conteo «Kilogramo».
- UNIDAD «DE DOS BOTES» o «MANOJO»: piezas, con una presentación con ese nombre (RF-11).
- CANT «/»: el producto se importa, pero su existencia no cambia (RF-33).
- Se sube dos veces el mismo archivo: la segunda vez todo sale «ya existe», no se duplica nada y el conteo vuelve a
  dejar las existencias en lo de la hoja.
- Un producto archivado con el mismo nombre: no cuenta como existente (spec 003, RF-34); se crea uno nuevo.
- Una hoja de 50 áreas: 50 conteos, uno por área.

## Fuera de alcance
- Precios, costos y fotos de producto (la segunda hoja de la base de Sendero).
- Máximos (las hojas no los traen).
- Asignar responsables reales a las áreas desde la hoja.
- Importar a varios almacenes desde un mismo archivo.
- Sincronizar o borrar lo que ya no viene en la hoja.
- Importar compras, nóminas o cortes de caja (specs posteriores).
- Formatos distintos de «Inventario por áreas», .xls antiguo o .csv.

## Criterios de finalización
- Todos los RF con al menos un test en verde (`validation.md` 37 de 37).
- E2E de escritorio de la spec en verde, con la pantalla en el barrido en claro y oscuro con axe.
- Prueba manual con las hojas reales de Pirrus y de Pastatti Sendero (fuera del repositorio).
- `docs/reglas-de-negocio.md` actualizado.

## Dudas abiertas
Ninguna. Resueltas en la entrevista (13 de noviembre de 2026): un producto existente se completa sin cambiar lo que
ya tiene; la cantidad de la hoja entra como conteo en el almacén que se elija; las unidades que no son de peso,
volumen ni pieza se cuentan como piezas con su nombre.
