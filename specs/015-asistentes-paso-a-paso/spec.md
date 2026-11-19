# Spec 015 — Asistentes paso a paso

**Aprobada por el dueño el 19 de noviembre de 2026**, con los umbrales de RF-13 y 7 días para RF-51. Va antes de «Operación» en el roadmap por decisión
del dueño.

## Contexto y objetivo
Con los datos reales cargados, una persona que usa SuMando por primera vez se enfrenta a pantallas con todo a la
vez: la requisición nueva muestra almacén, fuentes, 46 renglones, nota y botones en una sola página; el detalle de una
requisición junta compradores, tablas y acciones; las altas piden muchos campos de golpe. Es fácil equivocarse y no
se sabe qué sigue. En la prueba con datos reales, además, la barra con «Enviar aprobada» quedó escondida en el
teléfono.

Esta spec convierte las tareas de requisiciones, inventario, nómina, corte de caja, altas y el teléfono de piso en
**asistentes**: una tarea dividida en pasos cortos, con una indicación y un ejemplo en cada paso, avisos cuando un dato
se ve raro y un resumen final antes de registrar nada. Lo capturado se guarda y se retoma si alguien sale a la mitad.
Quien ya conoce el sistema puede seguir usando la pantalla completa.

## Usuarios / actores
- **Persona primeriza** (administrador, encargado o empleado nuevo): hace cada tarea con el asistente.
- **Administrador** y **dueño** con experiencia: pueden cambiar a la vista completa.
- **Empleado en el teléfono de piso**: llena su checklist y hace el corte ciego en pasos.
- **Comprador**: marca lo comprado de su lista en pasos.

## Historias de usuario
- H1: Como persona nueva quiero que cada tarea me diga qué hacer en cada paso, con un ejemplo, para no equivocarme.
- H2: Como persona nueva quiero ver un resumen de todo antes de registrar, para corregir lo que esté mal.
- H3: Como encargado quiero que el sistema me avise si un dato se ve raro, para no pedir o contar de más por error.
- H4: Como encargado quiero salir a la mitad y retomar donde me quedé, aunque sea desde otro teléfono.
- H5: Como dueño con experiencia quiero seguir usando la pantalla completa cuando la prefiera.
- H6: Como empleado de piso quiero llenar mi checklist y el corte ciego paso a paso.

## Requisitos funcionales (criterios de aceptación en EARS)

### Comportamiento común de los asistentes
- RF-1: EL SISTEMA mostrará cada asistente como una serie de pasos, uno por pantalla, con su título y «Paso N de M».
- RF-2: EL SISTEMA mostrará en cada paso una indicación de una frase sobre qué hacer.
- RF-3: EL SISTEMA mostrará en cada paso que pide datos un ejemplo armado con datos del negocio activo (por ejemplo «Ej.: 4 Paquete de VASO DE 16 ONZAS»).
- RF-4: EL SISTEMA ofrecerá en cada paso «Atrás» (salvo en el primero) y «Siguiente».
- RF-5: SI un dato obligatorio del paso falta o no es válido, ENTONCES EL SISTEMA no avanzará y señalará el campo con su mensaje.
- RF-6: CUANDO se vuelve a un paso anterior, EL SISTEMA conservará lo capturado en ese paso y en los siguientes.
- RF-7: EL SISTEMA terminará cada asistente con un paso «Resumen» que muestra todo lo capturado, agrupado por paso, con «Cambiar» para ir a cada uno.
- RF-8: EL SISTEMA registrará la tarea solo al confirmar en el paso «Resumen»; ningún paso anterior registra movimientos, folios ni cambios.
- RF-9: CUANDO se confirma el resumen, EL SISTEMA mostrará qué se registró (por ejemplo el folio) y qué sigue, con un enlace a esa siguiente tarea cuando exista.
- RF-10: SI al confirmar el servidor rechaza algún dato, ENTONCES EL SISTEMA volverá al paso del dato con el mensaje y conservará lo demás.
- RF-11: EL SISTEMA aplicará en el asistente los mismos permisos que en la pantalla completa; el asistente no mostrará datos que el rol no puede ver (por ejemplo, montos de nómina a un administrador).

### Datos raros
- RF-12: SI un dato cumple una regla de «dato raro» de las de RF-13, ENTONCES EL SISTEMA lo resaltará con lo esperado al lado y pedirá confirmarlo antes de avanzar.
- RF-13: EL SISTEMA considerará dato raro: una cantidad pedida mayor que el doble del máximo del producto en ese almacén; un conteo que difiere más del 30 % de lo esperado; una salida mayor que la mitad de la existencia; una entrada mayor que el triple del máximo; un bono o extra mayor que el sueldo de la semana de esa persona.
- RF-14: EL SISTEMA marcará en el «Resumen» cada dato raro confirmado.
- RF-15: SI no hay con qué comparar (producto sin máximo, sin existencia esperada o sin sueldo), ENTONCES EL SISTEMA no marcará el dato como raro.
- RF-16: MIENTRAS el asistente es del corte ciego, EL SISTEMA no usará lo que espera el sistema para avisar de datos raros, para no revelarlo.

### Guardar y retomar
- RF-17: EL SISTEMA guardará lo capturado en un asistente al pasar de un paso a otro, por persona, tarea y sucursal.
- RF-18: CUANDO una persona abre una tarea con un asistente a medias, EL SISTEMA le ofrecerá «Continuar donde te quedaste» (con la fecha y el paso) o «Empezar de nuevo».
- RF-19: EL SISTEMA permitirá retomar un asistente a medias desde otro dispositivo con la misma cuenta.
- RF-20: CUANDO se elige «Empezar de nuevo» o se confirma el resumen, EL SISTEMA descartará lo guardado de ese asistente.
- RF-21: SI al retomar algo capturado ya no es válido (producto archivado, requisición ya aprobada por otra persona), ENTONCES EL SISTEMA lo señalará en el paso afectado y no permitirá confirmar hasta resolverlo.
- RF-22: MIENTRAS el asistente es del teléfono de piso, EL SISTEMA guardará lo capturado por empleado en ese teléfono.
- RF-51: SI un asistente a medias lleva más de 7 días sin cambios, ENTONCES EL SISTEMA lo descartará y ya no lo ofrecerá para continuar.

### Vista completa
- RF-23: EL SISTEMA abrirá por defecto el asistente al iniciar cada tarea de esta spec.
- RF-24: EL SISTEMA ofrecerá en cada asistente un enlace «Vista completa» que abre la pantalla actual de esa tarea.
- RF-25: EL SISTEMA ofrecerá en cada pantalla completa un enlace «Paso a paso» que abre su asistente.
- RF-26: CUANDO una persona elige la vista completa o el asistente de una tarea, EL SISTEMA recordará esa elección para esa persona y esa tarea.
- RF-27: CUANDO se cambia entre asistente y vista completa a la mitad, EL SISTEMA conservará lo capturado.

### Requisiciones
- RF-28: EL SISTEMA ofrecerá el asistente «Nueva requisición» con los pasos Almacén, De dónde agregar (bajo el mínimo, plantilla, cálculo de insumos o a mano), Productos y cantidades, Nota y Resumen.
- RF-29: EL SISTEMA mostrará en el paso Productos y cantidades los renglones agrupados por proveedor, con lo que hay, el mínimo y el máximo de cada uno.
- RF-30: EL SISTEMA ofrecerá el asistente «Aprobar requisición» con los pasos Revisar por proveedor (ajustar o quitar renglones), Decisión (aprobar o rechazar con motivo) y Resumen.
- RF-31: EL SISTEMA ofrecerá al comprador el asistente «Comprar» con un paso por proveedor de su lista (qué se compró y cuánto se pagó) y Resumen.
- RF-32: EL SISTEMA ofrecerá el asistente «Recibir» con los pasos Proveedor, Cantidades recibidas (propone lo pendiente) y Resumen.

### Inventario
- RF-33: EL SISTEMA ofrecerá el asistente «Contar un área» con los pasos Almacén y área, Conteo producto por producto y Resumen con las diferencias.
- RF-34: EL SISTEMA ofrecerá el asistente «Entrada» con los pasos Almacén, Proveedor, Productos y cantidades, y Resumen.
- RF-35: EL SISTEMA ofrecerá el asistente «Salida» con los pasos Almacén, Motivo, Productos y cantidades, y Resumen.
- RF-36: EL SISTEMA ofrecerá el asistente «Traspaso» con los pasos Origen, Destino, Productos y cantidades, y Resumen.
- RF-37: EL SISTEMA ofrecerá el asistente «Recibir traspaso» con los pasos Cantidades recibidas (propone lo enviado) y Resumen.

### Nómina y corte de caja
- RF-38: EL SISTEMA ofrecerá el asistente «Asistencia de la semana» con un paso por día (quién trabajó y quién llegó tarde) y Resumen.
- RF-39: EL SISTEMA ofrecerá al dueño el asistente «Cerrar la semana» con los pasos Extras, bonos y comida; Préstamos; Revisión por persona; y Resumen con los billetes de cada sobre.
- RF-40: EL SISTEMA ofrecerá el asistente «Abrir caja» con los pasos Fondo y Resumen.
- RF-41: EL SISTEMA ofrecerá el asistente «Corte» con los pasos Efectivo por denominación, Terminales y formas de pago, Gastos pagados de la caja y Resumen.
- RF-42: EL SISTEMA ofrecerá el asistente «Reporte del punto de venta» con los pasos Ventas por forma de pago y Resumen con lo que no cuadra.

### Altas
- RF-43: EL SISTEMA ofrecerá el asistente «Nuevo producto» con los pasos Nombre y unidad, Presentaciones, Proveedor, Mínimo y máximo por almacén, y Resumen.
- RF-44: SI el nombre del producto se parece a uno existente (mismo nombre sin acentos, mayúsculas ni espacios), ENTONCES EL SISTEMA lo mostrará en el paso Nombre y unidad y pedirá confirmar que es otro.
- RF-45: EL SISTEMA ofrecerá el asistente «Nuevo proveedor» con los pasos Nombre y teléfono, Comprador por sucursal y Resumen.
- RF-46: EL SISTEMA ofrecerá el asistente «Nuevo empleado» con los pasos Datos, Puesto, Sueldo por día (solo el dueño), Documentos y Resumen.
- RF-47: EL SISTEMA ofrecerá el asistente «Nueva plantilla de checklist» con los pasos Nombre, días y sucursales; Secciones; Puntos de cada sección (tipo y si es clave); y Resumen.

### Teléfono de piso
- RF-48: EL SISTEMA ofrecerá en el teléfono de piso el asistente «Checklist» con los pasos Elige tu nombre, un paso por cada sección de esa persona y Resumen de su parte.
- RF-49: EL SISTEMA mostrará los puntos clave de la sección uno por uno dentro de su paso, con la foto cuando la piden.
- RF-50: EL SISTEMA ofrecerá en el teléfono de piso el asistente «Corte ciego» con los pasos Efectivo por denominación, Terminales y Resumen, sin mostrar lo que espera el sistema.

## Requisitos no funcionales
- **Teléfono**: a 390 × 844 px, «Atrás» y «Siguiente» quedan a la vista sin desplazar en todos los pasos, y ningún paso ensancha la pantalla.
- **Textos**: las indicaciones, ejemplos y avisos van en los archivos de textos en español, como el resto de la interfaz.
- **Accesibilidad**: cada paso se anuncia a lectores de pantalla al cambiar, y el barrido de accesibilidad en claro y oscuro pasa en todos los asistentes.
- **Ejemplos**: el ejemplo de cada paso sale de datos reales del negocio activo; si el negocio no tiene datos, usa un ejemplo genérico.

## Casos límite
- Dos personas con el mismo asistente a medias sobre la misma requisición: la segunda en confirmar ve RF-21 (ya cambió).
- Requisición sin productos tras quitar todos en Productos y cantidades: no deja avanzar (RF-5).
- Un asistente a medias de una sucursal y la persona cambia de sucursal: se retoma solo en la sucursal donde se empezó.
- Sesión vencida a la mitad: al volver a entrar, lo guardado se ofrece con RF-18.
- Paso sin nada que capturar (por ejemplo, sin préstamos esa semana): se muestra con «No hay préstamos esta semana» y «Siguiente».
- Producto sin máximo en una requisición: se pide, pero sin aviso de dato raro (RF-15).

## Fuera de alcance
- Videos, recorridos guiados o ayuda extensa: solo una frase y un ejemplo por paso.
- Asistentes para configuración (negocios, personas, sucursales, formas de pago, tipos de documento) y para recetas.
- Captura sin conexión: los asistentes necesitan internet como el resto del sistema.
- Cambiar las reglas de negocio de cada tarea: el asistente pide lo mismo que la pantalla completa, en otro orden.
- Quitar las pantallas completas actuales.

## Criterios de finalización
Todos los RF con test en verde (`rf-coverage` 51 de 51); un E2E por asistente que lo termina solo con su indicación,
«Siguiente» y el resumen; prueba en el teléfono del dueño con los datos reales de Pirrus; barrido en claro y oscuro.

## Dudas abiertas
Ninguna. El dueño aprobó los umbrales de dato raro de RF-13 y 7 días para descartar un asistente a medias (RF-51).
