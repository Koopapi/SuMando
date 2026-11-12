# Spec 002 — Sistema de diseño

## Contexto y objetivo
La spec 001 dejó funcionando cuentas, negocios y sucursales con un puñado de componentes mínimos y una paleta
provisional. Las specs que siguen (catálogo, recetario, inventarios, nómina, checklists, corte de caja) traen
pantallas mucho más pesadas: tablas largas, captura renglón por renglón y asistentes por pasos. Si cada una
resuelve su propia interfaz, la app termina con cinco formas distintas de hacer lo mismo. Esta spec fija una sola:
la identidad de la app, que pasa a llamarse **SuMando**; un juego de componentes en modo claro y oscuro que sirve
en teléfono y en escritorio; un catálogo donde se ven todos; y las maquetas aprobadas de las pantallas actuales y
de los tres patrones que vienen. Además, cada negocio tiene un color para que nadie capture en el negocio
equivocado.

## Usuarios / actores
- **Dueño**: elige la dirección de logo y paleta, aprueba las maquetas y asigna el color de cada negocio.
- **Administrador**: usa la app en el teléfono para capturar y en la computadora para revisar.
- **Quien construye las specs siguientes**: arma sus pantallas solo con los componentes del catálogo.

## Historias de usuario
- H1: Como dueño quiero que la app se llame SuMando y tenga un logo propio, para que el equipo la reconozca en su
  teléfono.
- H2: Como administrador quiero ver siempre en qué negocio estoy, por su nombre y su color, para no capturar en
  el equivocado.
- H3: Como administrador quiero que la app respete el modo oscuro de mi teléfono, para usarla de noche al cerrar.
- H4: Como administrador quiero capturar en el teléfono con botones y campos fáciles de tocar, para hacerlo de
  pie y con prisa.
- H5: Como dueño quiero revisar en la computadora tablas con todas sus columnas y un menú lateral, para revisar
  nómina e inventario sin ir y venir.
- H6: Como dueño quiero aprobar las maquetas antes de que se construyan, para no pagar dos veces la misma pantalla.

## Requisitos funcionales (criterios de aceptación en EARS)

### Nombre e identidad
- RF-1: EL SISTEMA mostrará el nombre «SuMando» en la pantalla de entrada, en el primer arranque, en la barra superior, en el título de cada pestaña del navegador, en la página sin conexión y en la página de no encontrado.
- RF-2: CUANDO alguien instala la app en el teléfono, EL SISTEMA la presentará con el nombre «SuMando» y con el icono hecho a partir del logo elegido por el dueño.
- RF-3: EL SISTEMA escribirá el nombre de la app siempre como «SuMando», con la S y la M mayúsculas, y nunca como «Mando», «Sumando» ni «SUMANDO» en ningún texto visible para el usuario.

### Modo claro y oscuro
- RF-4: MIENTRAS el teléfono o la computadora estén en modo oscuro, EL SISTEMA mostrará todas las pantallas en modo oscuro.
- RF-5: MIENTRAS el teléfono o la computadora estén en modo claro o no indiquen preferencia, EL SISTEMA mostrará todas las pantallas en modo claro.
- RF-6: CUANDO el usuario cambia el modo de su equipo con la app abierta, EL SISTEMA cambiará al nuevo modo sin recargar la pantalla ni perder lo capturado.
- RF-7: EL SISTEMA ajustará el color de la barra del navegador y de la barra de estado del teléfono al modo activo.

### Color de cada negocio
- RF-8: CUANDO el dueño crea un negocio, EL SISTEMA le pedirá elegir su color de una paleta cerrada de 8 colores.
- RF-9: CUANDO el dueño cambia el color de un negocio, EL SISTEMA aplicará el nuevo color en la siguiente pantalla que abra cualquier persona.
- RF-10: SI un negocio existente no tiene color asignado, ENTONCES EL SISTEMA le asignará el primer color de la paleta que no use otro negocio, o el primero de la paleta si todos están en uso.
- RF-11: SI un administrador intenta cambiar el color de un negocio, ENTONCES EL SISTEMA rechazará el cambio.
- RF-12: MIENTRAS hay una sucursal activa, EL SISTEMA mostrará en la barra superior de cada pantalla el nombre del negocio y de la sucursal junto con el color del negocio.
- RF-13: EL SISTEMA mostrará el color de cada negocio en la lista de negocios y en la pantalla para elegir sucursal.
- RF-14: EL SISTEMA identificará siempre al negocio por su nombre además de su color, nunca solo por el color.
- RF-15: CUANDO el dueño cambia el color de un negocio, EL SISTEMA guardará en el registro de cambios quién lo cambió, cuándo y el color anterior.

### Teléfono y escritorio
- RF-16: MIENTRAS la pantalla mida menos de 1024 px de ancho, EL SISTEMA ofrecerá la navegación principal con un botón visible en la barra superior, a un toque de cualquier pantalla.
- RF-17: MIENTRAS la pantalla mida 1024 px de ancho o más, EL SISTEMA mostrará la navegación principal como un menú lateral fijo.
- RF-18: EL SISTEMA mostrará cada pantalla sin desplazamiento horizontal desde 360 px de ancho.
- RF-19: MIENTRAS la pantalla mida 1024 px de ancho o más, EL SISTEMA mostrará las tablas con todas sus columnas.
- RF-20: MIENTRAS la pantalla mida menos de 1024 px de ancho, EL SISTEMA mostrará cada renglón de una tabla como una tarjeta con sus datos principales y el resto al abrirla.

### Componentes
- RF-21: EL SISTEMA dará a cada botón, campo y control que se toca un área de al menos 44 × 44 px.
- RF-22: EL SISTEMA abrirá el teclado numérico del teléfono en los campos de cantidad, dinero y piezas.
- RF-23: EL SISTEMA mostrará las cantidades de dinero en pesos con el formato de México (por ejemplo, $1,234.50).
- RF-24: EL SISTEMA mostrará las fechas en español de México con día, mes abreviado y año (por ejemplo, 11 nov 2026).
- RF-25: CUANDO un campo tiene un error, EL SISTEMA mostrará el mensaje debajo del campo y lo anunciará a los lectores de pantalla.
- RF-26: MIENTRAS una acción se está guardando, EL SISTEMA mostrará su botón como ocupado y no aceptará un segundo toque.
- RF-27: CUANDO una acción termina de guardarse, EL SISTEMA mostrará un aviso de confirmación que desaparece solo a los 4 segundos.
- RF-28: SI una acción falla, ENTONCES EL SISTEMA mostrará el aviso de error hasta que el usuario lo cierre y conservará lo capturado.
- RF-29: EL SISTEMA ofrecerá para toda lista o tabla los estados de cargando, vacío y error, cada uno con su texto.
- RF-30: CUANDO el usuario escribe en la búsqueda de una tabla, EL SISTEMA mostrará solo los renglones que contengan el texto, sin distinguir mayúsculas ni acentos.
- RF-31: SI la búsqueda o los filtros no dejan ningún renglón, ENTONCES EL SISTEMA mostrará el estado vacío con una acción para limpiar la búsqueda y los filtros.
- RF-32: EL SISTEMA permitirá en la captura por renglones subir y bajar cada cantidad con botones de menos y más, además de escribirla.
- RF-33: SI en la captura por renglones se escribe algo que no es un número válido, ENTONCES EL SISTEMA marcará el renglón con su error y no lo dará por capturado.
- RF-34: EL SISTEMA mostrará en el asistente por pasos el paso actual y el total de pasos.
- RF-35: CUANDO el usuario vuelve a un paso anterior del asistente, EL SISTEMA conservará lo capturado en todos los pasos.
- RF-36: SI el usuario intenta salir del asistente con datos capturados sin terminar, ENTONCES EL SISTEMA le pedirá confirmar antes de descartarlos.
- RF-37: CUANDO un diálogo está abierto, EL SISTEMA mantendrá el foco del teclado dentro del diálogo y lo cerrará con la tecla Escape.
- RF-38: EL SISTEMA mostrará un indicador de foco visible en cada control al navegar con el teclado.
- RF-39: MIENTRAS el equipo pida reducir el movimiento, EL SISTEMA mostrará las transiciones sin animación.

### Catálogo de componentes
- RF-40: EL SISTEMA ofrecerá un catálogo con cada componente del sistema en todos sus estados (normal, deshabilitado, ocupado, error y vacío, según aplique).
- RF-41: EL SISTEMA mostrará en el catálogo las tres pantallas tipo (tabla larga con búsqueda y filtros, captura por renglones y asistente por pasos) con datos de ejemplo que no se guardan.
- RF-42: SI la app corre en producción, ENTONCES EL SISTEMA no mostrará el catálogo y responderá como página no encontrada.

### Pantallas actuales
- RF-43: EL SISTEMA construirá las pantallas de entrada, primer arranque, cambio de contraseña, inicio, negocios, personas y elegir sucursal solo con componentes del catálogo.
- RF-44: EL SISTEMA conservará en esas pantallas todo el comportamiento acordado en la spec 001.

## Requisitos no funcionales
- **Contraste**: todo texto cumple una relación de contraste de al menos 4.5:1 con su fondo, y los iconos y bordes
  de controles al menos 3:1, en modo claro y en modo oscuro. Los 8 colores de negocio se eligen de modo que
  cumplan esos umbrales en los dos modos.
- **Sin estilos sueltos**: ninguna pantalla define colores, tamaños ni espacios propios; todo sale de los
  componentes y de los valores del sistema de diseño. Una revisión automática lo comprueba.
- **Textos**: ningún texto del catálogo ni de los componentes va escrito suelto (constitución, principio 11).
- **Barrido de pantallas**: el recorrido automático de la 001 se amplía a modo claro y oscuro, en escritorio,
  tableta y móvil, sin errores de consola, desbordes, imágenes rotas, controles sin nombre ni fallas de
  contraste.
- **Texto legible**: el texto de los campos mide al menos 16 px, para que el teléfono no acerque la pantalla al
  tocarlos.

## Casos límite
- Negocios creados en la spec 001 sin color: reciben uno automáticamente (RF-10) y el dueño puede cambiarlo.
- Dos negocios con el mismo color: se permite, porque el nombre siempre se muestra junto al color (RF-14).
- Más de 8 negocios: los colores se repiten (RF-10).
- Negocio archivado: conserva su color en la lista de negocios.
- Nombre de negocio y sucursal largos (60 caracteres cada uno) en la barra superior de un teléfono de 360 px: se
  recortan con puntos suspensivos y el nombre completo se ve al tocarlo, sin romper la barra.
- El usuario cambia el modo de su equipo a la mitad de un asistente: cambia de modo sin perder lo capturado (RF-6).
- Una tabla con un solo renglón o con cientos: misma presentación, con búsqueda siempre disponible.
- Cantidad con muchos dígitos en la captura por renglones de un teléfono de 360 px: cabe sin desbordar el renglón.
- Navegador que no informa preferencia de modo: modo claro (RF-5).
- Toque doble rápido en «Guardar»: se registra una sola vez (RF-26).

## Fuera de alcance
- Cambiar el nombre interno del proyecto, del repositorio, de la base de datos o de los identificadores del código:
  solo cambia el nombre visible.
- Un selector de modo claro u oscuro dentro de la app: se sigue el ajuste del equipo.
- Marca, logos o manuales de identidad de cada franquicia: los negocios solo llevan nombre y color.
- Color libre para cada negocio: solo la paleta de 8.
- El comportamiento real de inventario, nómina, recetario o corte de caja: las pantallas tipo del catálogo usan
  datos de ejemplo y no guardan nada.
- Diseño específico para tablet fija en la sucursal: la tableta usa la presentación de teléfono o de escritorio
  según su ancho.
- Impresión de tickets u hojas, y exportar a PDF o Excel.
- Idioma inglés.
- Maquetas de las pantallas de cada módulo futuro: cada spec maqueta las suyas con estos componentes.

## Criterios de finalización
- **Entregables de diseño en Pencil, aprobados por el dueño antes de construir**:
  1. Tres direcciones de logo y paleta para SuMando, de las que el dueño elige una.
  2. Los componentes en modo claro y oscuro.
  3. Las siete pantallas actuales y las tres pantallas tipo, en teléfono (360 px) y en escritorio (1280 px), en
     modo claro, y en teléfono en modo oscuro.
- Todos los RF con al menos un test en verde y `validation.md` con veredicto «spec cumplida».
- Las E2E de la spec 001 siguen en verde sobre las pantallas reconstruidas.
- E2E principal: abrir la app en teléfono en modo claro → ver SuMando y su logo en la entrada → entrar como dueño →
  crear un negocio eligiendo su color → ver el nombre y el color en la barra superior → cambiar el equipo a modo
  oscuro sin perder la pantalla → abrir el menú con un toque → pasar a escritorio y ver el menú lateral y la tabla
  de personas con todas sus columnas.
- Barrido de pantallas en verde en modo claro y oscuro, en escritorio, tableta y móvil.
- La app instalada en el teléfono del dueño muestra el nombre SuMando y el icono nuevo.

## Dudas abiertas
- Ninguna que bloquee. Decisiones de la entrevista (11 de noviembre de 2026): la app se llama SuMando, con la M
  mayúscula para que se lea el juego «su mando / sumando», como el dominio sumando.com.mx; una sola identidad de
  SuMando y cada negocio con un color que elige el dueño; se proponen tres direcciones de logo y paleta en Pencil y
  el dueño elige una; modo claro y oscuro según el equipo; se maquetan los componentes, las siete pantallas actuales
  y tres pantallas tipo (tabla larga con filtros, captura por renglones y asistente por pasos); el teléfono es para
  capturar y la computadora también para revisar, con menú lateral y tablas completas.
- **Valores propuestos y confirmados por el dueño al aprobar**: paleta cerrada de 8 colores de negocio (RF-8); cambio de
  teléfono a escritorio en 1024 px (RF-16, RF-17, RF-19, RF-20); aviso de guardado de 4 segundos (RF-27); color
  automático para los negocios que ya existen (RF-10).
- **Spec aprobada por el dueño el 11 de noviembre de 2026**, con el ajuste del nombre a «SuMando». Cualquier
  cambio posterior entra como cambio a esta spec antes de tocar código.
