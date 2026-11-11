# Diseño — Mando

Se completa en la spec 002 (sistema de diseño). Hasta entonces, estas reglas:

- Toda la interfaz se construye con componentes reutilizables del sistema de diseño; nada de estilos sueltos por
  pantalla.
- Las maquetas viven en Pencil (`recursos/mando.pen`) y se aprueban antes de construir la pantalla.
- Móvil primero: cada pantalla se diseña primero para teléfono y luego se amplía a escritorio.
- Tablas largas (inventario, empleados) con búsqueda y filtros, y legibles en teléfono.
- Estados siempre visibles: cargando, vacío, error y guardado.
