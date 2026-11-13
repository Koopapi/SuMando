# Spec 004 — Recetario e insumos

**Aprobada por el dueño el 12 de noviembre de 2026.**

## Contexto y objetivo
Pirrus tiene su recetario en una hoja de cálculo: una hoja por platillo con cada ingrediente, su cantidad bruta y
su unidad. Para saber cuánto pedir, alguien multiplica a mano las piezas que espera vender por cada ingrediente y
suma los que se repiten entre platillos. Esta spec pasa el recetario a SuMando: cada negocio guarda la receta de
sus platillos con ingredientes de su catálogo (spec 003), el administrador captura las piezas de cada platillo,
completas y medias, y obtiene la lista de insumos sumada por ingrediente, con su equivalente en presentaciones de
compra. Cada cálculo queda en un historial y se puede guardar como plantilla para repetirlo. Las recetas que ya
existen en hojas de cálculo se importan sin capturarlas otra vez. El resultado es solo cuánto pedir: no mueve
inventario ni crea requisiciones.

## Usuarios / actores
- **Dueño**: administra las recetas y la importación de todos los negocios, y calcula en cualquier sucursal.
- **Administrador**: administra las recetas y la importación de los negocios donde tiene al menos una sucursal
  asignada, y calcula en sus sucursales.

## Historias de usuario
- H1: Como administrador quiero guardar la receta de cada platillo con sus ingredientes del catálogo para no
  depender de la hoja de cálculo.
- H2: Como administrador quiero capturar cuántas piezas y cuántas medias de cada platillo espero vender y obtener
  cuánto pedir de cada ingrediente, ya sumado, para no hacer la cuenta a mano.
- H3: Como administrador quiero ver cuánto pedir en las presentaciones en que se compra, para pedir bolsas o
  cajas completas.
- H4: Como administrador quiero repetir un cálculo de otra semana sin capturarlo de nuevo.
- H5: Como dueño quiero ver qué se calculó cada vez, quién y cuándo, para revisar si se pidió de más.
- H6: Como dueño quiero importar las recetas que ya tengo en hojas de cálculo para no capturarlas a mano.

## Requisitos funcionales (criterios de aceptación en EARS)

### Pertenencia y permisos
- RF-1: EL SISTEMA guardará cada receta como parte de un solo negocio, y nunca la compartirá entre negocios.
- RF-2: EL SISTEMA guardará cada cálculo y cada plantilla como parte de una sola sucursal.
- RF-3: MIENTRAS hay una sucursal activa, EL SISTEMA mostrará solo las recetas del negocio de esa sucursal, y solo los cálculos y plantillas de esa sucursal.
- RF-4: EL SISTEMA permitirá al dueño y a los administradores con alguna sucursal asignada en un negocio dar de alta, modificar, archivar, reactivar e importar las recetas de ese negocio.
- RF-5: EL SISTEMA permitirá calcular insumos, consultar el historial y usar plantillas solo a quien tenga acceso a la sucursal activa.
- RF-6: SI alguien pide o modifica una receta, un cálculo o una plantilla de un negocio o una sucursal a la que no tiene acceso, aunque sea por dirección directa, ENTONCES EL SISTEMA lo rechazará sin revelar si existe.

### Recetas
- RF-7: EL SISTEMA permitirá dar de alta una receta con el nombre del platillo y, opcionalmente, su modo de preparación en texto libre.
- RF-8: EL SISTEMA permitirá añadir a una receta ingredientes, cada uno con un producto activo del catálogo del mismo negocio, su cantidad bruta y, opcionalmente, una nota (por ejemplo, «1 puño de lunas»).
- RF-9: CUANDO se captura la cantidad de un ingrediente, EL SISTEMA permitirá elegirla en cualquier presentación del producto y la guardará convertida a su unidad base.
- RF-10: SI la cantidad de un ingrediente es cero, negativa o tiene más de 3 decimales, ENTONCES EL SISTEMA la rechazará e indicará el formato válido.
- RF-11: SI se añade a una receta un producto que ya está en ella, ENTONCES EL SISTEMA no lo duplicará e indicará que se modifique la cantidad del que ya está.
- RF-12: EL SISTEMA permitirá cambiar la cantidad y la nota de un ingrediente, y quitarlo de la receta.
- RF-13: SI se intenta guardar una receta sin ingredientes, ENTONCES EL SISTEMA no la guardará e indicará que necesita al menos uno.
- RF-14: MIENTRAS un ingrediente de una receta esté archivado en el catálogo, EL SISTEMA lo mostrará marcado como archivado en la receta.
- RF-15: EL SISTEMA mostrará la cantidad de cada ingrediente en su unidad base y en la presentación de conteo del producto.

### Media porción
- RF-16: EL SISTEMA calculará cada media porción como un porcentaje de la cantidad de la receta completa, configurado en cada receta.
- RF-17: CUANDO se da de alta o se importa una receta, EL SISTEMA le pondrá 50 % como porcentaje de media porción.
- RF-18: SI el porcentaje de media porción de una receta no es un entero de 1 a 100, ENTONCES EL SISTEMA lo rechazará e indicará el rango válido.
- RF-19: CUANDO se cambia el porcentaje de media porción de una receta, EL SISTEMA lo aplicará solo a los cálculos siguientes y conservará sin cambios los ya guardados.

### Cálculo de insumos
- RF-20: CUANDO se inicia un cálculo, EL SISTEMA mostrará todas las recetas activas del negocio con dos cantidades por platillo, piezas completas y medias porciones, ambas en cero.
- RF-21: SI una cantidad de piezas o de medias porciones no es un entero de 0 a 9,999, ENTONCES EL SISTEMA la rechazará e indicará el formato válido.
- RF-22: MIENTRAS se capturan piezas, EL SISTEMA mostrará la lista de insumos actualizada sin necesidad de guardar.
- RF-23: EL SISTEMA calculará cada ingrediente como la suma, en todos los platillos, de la cantidad de la receta por las piezas completas más la cantidad de la receta por el porcentaje de media porción de esa receta por las medias porciones.
- RF-24: EL SISTEMA mostrará en la lista cada ingrediente una sola vez, con su cantidad exacta en la unidad base.
- RF-25: DONDE la presentación de compra del producto no sea su unidad base, EL SISTEMA mostrará junto a la cantidad exacta cuántas presentaciones de compra hacen falta, redondeando hacia arriba al entero (por ejemplo, «7,350 g → 4 bolsas de 2 kg»).
- RF-26: EL SISTEMA mostrará los ingredientes de la lista en orden alfabético.
- RF-27: SI un ingrediente de la lista está archivado en el catálogo, ENTONCES EL SISTEMA lo incluirá en la lista marcado como archivado.
- RF-28: SI se intenta guardar un cálculo con todas las cantidades en cero, ENTONCES EL SISTEMA no lo guardará e indicará que capture al menos un platillo.

### Historial
- RF-29: CUANDO se guarda un cálculo, EL SISTEMA lo añadirá al historial de la sucursal con su fecha y hora, quién lo hizo, las piezas capturadas, el porcentaje de media porción usado en cada platillo y la lista de insumos resultante.
- RF-30: EL SISTEMA mostrará el historial de la sucursal del más reciente al más antiguo.
- RF-31: EL SISTEMA no permitirá modificar ni borrar un cálculo guardado.
- RF-32: CUANDO se abre un cálculo del historial, EL SISTEMA mostrará las piezas y la lista de insumos tal como se guardaron, aunque después hayan cambiado las recetas, sus porcentajes de media porción o el catálogo.
- RF-33: CUANDO se elige «Usar como base» en un cálculo del historial, EL SISTEMA iniciará un cálculo nuevo con esas piezas y lo calculará con las recetas vigentes.
- RF-34: SI un cálculo que se usa como base tiene platillos cuya receta hoy está archivada, ENTONCES EL SISTEMA los dejará fuera del cálculo nuevo y avisará cuáles quedaron fuera.

### Plantillas
- RF-35: EL SISTEMA permitirá guardar las piezas de un cálculo como una plantilla con nombre en la sucursal activa.
- RF-36: CUANDO se elige una plantilla, EL SISTEMA iniciará un cálculo nuevo con sus piezas.
- RF-37: CUANDO se guarda una plantilla con el nombre de otra plantilla activa de la sucursal, EL SISTEMA pedirá confirmar que se reemplacen sus piezas, y solo las reemplazará si se confirma.
- RF-38: EL SISTEMA permitirá cambiar el nombre de una plantilla, archivarla y reactivarla.
- RF-39: SI una plantilla tiene platillos cuya receta hoy está archivada, ENTONCES EL SISTEMA los dejará fuera del cálculo que se inicia con ella y avisará cuáles quedaron fuera.

### Importar desde hoja de cálculo
- RF-40: EL SISTEMA permitirá importar recetas desde un archivo de Excel (.xlsx) de hasta 2 MB con este formato: una hoja por platillo; el nombre del platillo en la primera celda; una fila de encabezado con «Ingredientes», «Cantidad bruta», «Unidad» y «Nota»; un ingrediente por fila debajo; y, después de los ingredientes, las filas de texto como modo de preparación.
- RF-41: EL SISTEMA aceptará como unidad de la hoja «Gramos», «Mililitros» y «Piezas», sin distinguir mayúsculas, acentos ni espacios exteriores.
- RF-42: CUANDO se sube un archivo, EL SISTEMA mostrará, antes de guardar nada, cada platillo del archivo como listo para importar o con la lista de sus problemas.
- RF-43: EL SISTEMA buscará cada ingrediente de la hoja entre los productos activos del catálogo del negocio por nombre, sin distinguir mayúsculas, acentos ni espacios exteriores.
- RF-44: SI un ingrediente de la hoja no existe en el catálogo, ENTONCES EL SISTEMA marcará ese platillo con el problema e indicará el nombre del ingrediente que falta.
- RF-45: SI la unidad de un ingrediente de la hoja no coincide con la unidad base del producto del catálogo, ENTONCES EL SISTEMA marcará ese platillo con el problema e indicará ambas unidades.
- RF-46: SI ya existe una receta activa con el nombre de un platillo del archivo, ENTONCES EL SISTEMA marcará ese platillo como existente y no la reemplazará.
- RF-47: CUANDO se confirma la importación, EL SISTEMA guardará solo los platillos listos e informará cuántos se importaron y cuántos quedaron fuera.
- RF-48: SI el archivo no es un .xlsx válido o pasa de 2 MB, ENTONCES EL SISTEMA lo rechazará sin guardar nada e indicará el motivo.

### Nombres, archivo y registro
- RF-49: SI el nombre de una receta o de una plantilla ya existe entre las activas de su negocio o sucursal (sin distinguir mayúsculas, acentos ni espacios exteriores), ENTONCES EL SISTEMA no creará el duplicado e informará del conflicto, salvo lo previsto en RF-37.
- RF-50: SI un nombre de receta o de plantilla está vacío o pasa de 80 caracteres, ENTONCES EL SISTEMA lo rechazará e indicará el límite.
- RF-51: CUANDO se archiva una receta, EL SISTEMA dejará de ofrecerla en los cálculos nuevos y conservará los cálculos guardados que la usan.
- RF-52: SI se intenta reactivar una receta o una plantilla cuyo nombre ya usa otra activa, ENTONCES EL SISTEMA lo rechazará e indicará el conflicto.
- RF-53: EL SISTEMA guardará en el registro de cambios quién y cuándo crea, modifica, archiva, reactiva o importa una receta (incluido su porcentaje de media porción) o crea, modifica, archiva o reactiva una plantilla, con el valor anterior cuando lo hay.

### Consulta
- RF-54: EL SISTEMA mostrará las recetas del negocio en una tabla con búsqueda por nombre que no distingue mayúsculas ni acentos, y con filtro de activas y archivadas.
- RF-55: EL SISTEMA mostrará en el detalle de cada producto del catálogo las recetas activas que lo usan.

## Requisitos no funcionales
- **Sistema de diseño**: las pantallas usan solo componentes de la spec 002, funcionan desde 360 px con la barra
  inferior y siguen la dirección Tablero. La captura de piezas usa teclado numérico en el teléfono.
- **Exactitud**: las cuentas no pierden precisión; un ingrediente de 0.1 g por 9,999 piezas da exactamente
  999.9 g.
- **Aislamiento**: un test de integración demuestra que nada del recetario de un negocio, ni los cálculos y
  plantillas de una sucursal, aparece ni se modifica desde otro negocio u otra sucursal (constitución, principio 6).
- **Permisos en el servidor**: cada operación comprueba el permiso en el servidor (constitución, principio 7).
- **Nada se borra**: recetas y plantillas se archivan; los cálculos no se modifican (constitución, principio 8).
- **Volumen**: con 100 recetas de 15 ingredientes, la lista de insumos se actualiza en menos de 300 ms al cambiar
  una cantidad en escritorio, y la importación de un archivo de 50 hojas muestra su revisión en menos de 5 s.

## Casos límite
- El recetario de Pirrus tal como está (21 hojas, cantidades como 0.1 g y 1.2 g): se importa sin cambiar el
  formato, siempre que sus ingredientes existan en el catálogo con unidad base gramo o mililitro.
- «limones» en la hoja y «Limón» en el catálogo: son nombres distintos; el platillo queda con el problema y se
  corrige el nombre en la hoja o en el catálogo antes de importar (RF-43, RF-44).
- Una preparación de la casa, como «salsa negra Especial»: es un producto del catálogo y se pide tal cual; no se
  desglosa en sus ingredientes.
- Porcentaje de media porción en 100 %: una media cuenta como una pieza completa; válido.
- Un platillo con media al 60 % y otro al 50 % en el mismo cálculo: cada uno usa el suyo.
- Recetas importadas: entran con 50 % y se ajustan después en cada receta (RF-17).
- Siete medias de un platillo al 50 %: equivalen a 3.5 platillos completos, sin redondear.
- Un producto cuya presentación de compra es la unidad base: la lista muestra solo la cantidad exacta (RF-25).
- Una cantidad exacta que coincide con presentaciones completas, como 4,000 g con bolsa de 2 kg: 2 bolsas, sin
  sumar una de más.
- Se cambia la equivalencia de la presentación de compra después de guardar un cálculo: el cálculo guardado sigue
  mostrando lo que se calculó (RF-32).
- Una plantilla con un platillo que después se archiva: el cálculo nuevo lo deja fuera y avisa (RF-39).
- Dos personas calculan a la vez en la misma sucursal: cada una guarda su propio cálculo en el historial.
- Un platillo que no se vende en media porción, como una bebida: se deja la media en cero.
- Un archivo con dos hojas del mismo platillo: la segunda se marca como duplicada y no se importa.

## Fuera de alcance
- Desglosar preparaciones de la casa en sus ingredientes (sub-recetas).
- Merma aparte: la cantidad de la receta es bruta y ya la incluye.
- Media porción con cantidades propias por ingrediente (el porcentaje es uno por platillo).
- Importar ventas del punto de venta o sugerir piezas a partir de ventas pasadas.
- Comparar la lista con las existencias o descontar inventario: spec 005.
- Crear una requisición desde un cálculo: spec 006.
- Costos y precios de las recetas.
- Exportar recetas o cálculos a hoja de cálculo o PDF.
- Recetas compartidas entre negocios y copia de recetas de un negocio a otro.
- Crear productos del catálogo desde la importación.
- Fotos de los platillos y categorías o grupos del menú.
- Borrar recetas, cálculos o plantillas.

## Criterios de finalización
- Todos los RF con al menos un test en verde (`validation.md` 55 de 55).
- E2E de escritorio de la spec en verde, con el barrido en claro y oscuro con axe. Los teléfonos los prueba el
  dueño.
- Recorrido manual del flujo principal: importar el recetario de Pirrus, corregir lo que falte, calcular con
  piezas completas y medias, guardar el cálculo, guardarlo como plantilla y usarla para un cálculo nuevo.
- `docs/reglas-de-negocio.md` actualizado.

## Dudas abiertas
Ninguna. Resuelta en la aprobación (12 de noviembre de 2026): el porcentaje de media porción se configura en cada
platillo, con 50 % al darlo de alta o importarlo.
