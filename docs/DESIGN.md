# Diseño — SuMando

Se completa en la spec 002 (sistema de diseño). Hasta entonces, estas reglas:

- **Identidad** (elegida por el dueño el 11 de noviembre de 2026, dirección B «Al mando»): la app se llama
  **SuMando**; el icono es una perilla casi al tope en azul marino `#22306B` con ámbar `#E39B0B`; el nombre va en
  Space Grotesk con la M en ámbar (`#B57900` sobre fondo claro para cumplir contraste). Paleta completa en
  `specs/002-sistema-de-diseno/plan.md`.
- **Dirección visual «Tablero»** (elegida por el dueño el 11 de noviembre de 2026): la banda azul marino es la
  cabecera en teléfono y el menú lateral en escritorio, con el título y el número importante en ámbar; listas con
  líneas finas en vez de tarjetas; rótulos en versalitas; la perilla como marca, progreso y carga; cuerpo en IBM
  Plex Sans. Detalle en el plan de la spec 002.

- Toda la interfaz se construye con componentes reutilizables del sistema de diseño; nada de estilos sueltos por
  pantalla.
- Las maquetas viven en Pencil (`recursos/sumando.pen`) y se aprueban antes de construir la pantalla.
- Móvil primero: cada pantalla se diseña primero para teléfono y luego se amplía a escritorio.
- Tablas largas (inventario, empleados) con búsqueda y filtros, y legibles en teléfono.
- Estados siempre visibles: cargando, vacío, error y guardado.
