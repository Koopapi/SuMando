# Diseño — SuMando

Sistema de diseño de la spec 002. Archivo de diseño: `recursos/sumando.pen` (identidad, tokens, componentes y
maquetas aprobadas). Catálogo vivo: `/sistema` en desarrollo.

## Identidad
- La app se llama **SuMando** (S y M mayúsculas). Logo: perilla casi al tope en azul marino `#22306B` con ámbar;
  nombre en Space Grotesk con la M en ámbar (`#B57900` sobre fondo claro). Iconos generados desde
  `src/ui/brand/logo-svg.ts`.
- Cuerpo en IBM Plex Sans; marca, títulos, botones y números en Space Grotesk.

## Dirección visual «Tablero» (elegida por el dueño)
- **La banda azul manda**: en teléfono, la cabecera de cada pantalla es la banda azul con el logo, el negocio activo,
  el título y el número importante en ámbar, y la navegación va en la barra inferior (cuatro destinos y «Más»);
  desde 1024 px la banda es el menú lateral fijo.
- **Listas en vez de cajas**: renglones con líneas finas; tarjetas solo para unidades reales.
- **Rótulos de instrumento** en versalitas pequeñas; números grandes en Space Grotesk.
- **La perilla como motivo**: marca, avance de una captura o asistente, y carga.
- **Color del negocio**: franja a la izquierda del nombre o punto en la banda; siempre junto al nombre.

## Tokens
En `src/ui/tokens.css`, en hexadecimal, con modo claro y oscuro (según el equipo, sin selector propio). Tabla
completa y los 8 colores de negocio en `specs/002-sistema-de-diseno/plan.md`. Todo texto cumple 4.5:1 y bordes y foco
3:1 en los dos modos (`src/ui/theme/tokens.test.ts`). Esquinas de 8 px en controles y 10 px en contenedores.

## Componentes (`src/ui`)
Botón (con estado ocupado), botón de icono, campo de texto, número, dinero, selector, casilla, selector de color,
avisos en línea y flotantes (4 s el de guardado; el de error hasta cerrarlo), diálogo y panel lateral con foco
atrapado, estados de cargando, vacío y error, insignias de estado y de negocio, rótulo, perilla, cabecera de página,
fila de lista, bloque de negocio, barra inferior del teléfono (`BottomNav`, reserva `--nav-space`), tabla de datos (tarjetas bajo 1024 px), captura por renglones y asistente por pasos.

## Reglas
- Ninguna pantalla define colores, tamaños ni espacios propios: solo componentes y tokens (`styles.test.ts`).
- Móvil primero: todo funciona desde 360 px sin desplazamiento lateral; desde 1024 px, menú lateral y tablas completas.
- Bajo 1024 px nada fijo abajo se pega a `bottom: 0`: usa `var(--nav-space)` para quedar sobre la barra inferior.
- Todo lo que se toca mide al menos 44 × 44 px; campos con texto de 16 px; cantidades y dinero con teclado numérico.
- Pesos como «$1,234.50» y fechas como «11 nov 2026» (`src/ui/format.ts`).
- Estados siempre visibles: cargando, vacío, error y guardado. Foco visible y sin animaciones con movimiento reducido.
- Las maquetas se aprueban en Pencil antes de construir; cada módulo maqueta sus pantallas con estos componentes.
