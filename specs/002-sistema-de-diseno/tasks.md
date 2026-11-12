# Tareas — Spec 002

Tareas de 20 a 30 minutos, en orden de dependencia. Tests antes que el código.

## Entrega 1 — Identidad en Pencil y en código

- [x] **T0 — Tres direcciones de logo y paleta**
  - RF: criterios de finalización (entregable de diseño 1)
  - Depende de: —
  - Hecho cuando: el dueño elige una. **Hecho el 11 de noviembre de 2026: dirección B, «Al mando».**
- [x] **T1 — Mover el archivo de diseño a `recursos/sumando.pen`**
  - RF: criterios de finalización
  - Depende de: T0
  - Hecho cuando: el dueño guardó el tablero en Pencil, el archivo está en `recursos/sumando.pen` (con `git mv`),
    `Diseño/` ya no existe y `docs/DESIGN.md` apunta a la nueva ruta.
- [x] **T2 — Tokens y 8 colores de negocio en Pencil, con contraste medido**
  - RF: 8, 13, 14, RNF contraste
  - Depende de: T1
  - Hecho cuando: las variables de Pencil tienen los tokens en tema claro y oscuro (texto secundario, líneas,
    éxito, advertencia, peligro y foco incluidos) y una lámina muestra los 8 colores de negocio en los dos modos;
    cada par texto/fondo anotado con su contraste ≥ 4.5:1 (controles ≥ 3:1). **Hecho: lámina «Tokens y colores de
    negocio»; naranja, ámbar y verde se oscurecieron en modo claro para llegar a 4.5:1.**
- [x] **T3 — Test de contraste y tokens en código**
  - RF: 4, 5, RNF contraste
  - Depende de: T2
  - Hecho cuando: `test_s002_nf_contraste_*` lee `tokens.css` y pasa en claro y oscuro para tokens y los 8 colores;
    `tokens.css` tiene `:root` claro, bloque oscuro por `prefers-color-scheme`, `color-scheme: light dark` y
    `@theme inline`; las pantallas de la 001 siguen en verde.
- [x] **T4 — Logo e iconos**
  - RF: 2
  - Depende de: T3
  - Hecho cuando: `src/ui/brand` dibuja la perilla y «SuMando»; `node scripts/make-icons.mjs` regenera 192, 512,
    maskable con zona segura, 180 de Apple y 64 de pestaña; un test comprueba que el manifiesto apunta a archivos
    que existen con esos tamaños.
- [x] **T5 — Nombre SuMando en todas partes**
  - RF: 1, 2, 3
  - Depende de: T4
  - Hecho cuando: `test_s002_rf3_*` barre diccionarios, manifiesto y metadatos sin «Mando», «Sumando» ni
    «SUMANDO» como nombre; título «%s · SuMando», `appleWebApp`, manifiesto, `/offline` y 404 dicen SuMando.
- [x] **T6 — Modo claro y oscuro de punta a punta**
  - RF: 4, 5, 6, 7
  - Depende de: T3
  - Hecho cuando: `e2e/identidad.spec.ts` cambia el esquema con `emulateMedia` y comprueba fondo y texto de cada
    modo, que un campo conserva lo escrito al cambiar y que hay dos `theme-color` con su `media`.
- [x] **T7 — Fuentes**
  - RF: 1
  - Depende de: T3
  - Hecho cuando: Space Grotesk e Inter cargan con `next/font` desde la propia app; la compilación de E2E y la
    imagen Docker construyen.

## Entrega 2 — Maquetas aprobadas (puerta antes de construir)

- [x] **T8 — Componentes en Pencil**
  - RF: 21–39 (diseño)
  - Depende de: T2
  - Hecho cuando: componentes reutilizables en claro y oscuro: botones (variantes, ocupado, deshabilitado),
    campos (texto, número con menos y más, dinero, selector, casilla, búsqueda, error), avisos, diálogo, menú en
    teléfono, menú lateral, insignia de negocio, estados de cargando, vacío y error, tarjeta de renglón.
- [x] **T9 — Pantallas actuales en Pencil**
  - RF: 43 (diseño)
  - Depende de: T8
  - Hecho cuando: entrada, primer arranque, cambio de contraseña, inicio, negocios, personas y elegir sucursal en
    teléfono 360 px y escritorio 1280 px en claro, y en teléfono en oscuro.
- [x] **T10 — Pantallas tipo en Pencil**
  - RF: 41 (diseño)
  - Depende de: T8
  - Hecho cuando: tabla larga con búsqueda y filtros, captura por renglones y asistente por pasos, en los mismos
    tamaños y modos que T9.
- [ ] **T11 — Aprobación de maquetas**
  - RF: criterios de finalización (entregables 2 y 3)
  - Depende de: T9, T10
  - Hecho cuando: el dueño aprueba las maquetas o los ajustes quedan hechos y aprobados.
  - Nota: además de las siete pantallas, se maquetó la hoja «Nuevo negocio» con los 8 colores (RF-8).
  - **11 de noviembre de 2026**: el dueño pidió algo menos genérico; se compararon las direcciones «Tablero» y
    «Libreta» y eligió Tablero. T8, T9 y T10 se rehicieron en esa dirección (tableros «Componentes · Tablero» y
    «Pantallas · Tablero»); la primera versión queda en el archivo, atenuada, como descartada. Pendiente: T11.

## Entrega 3 — Componentes base y catálogo

- [ ] **T12 — Formato de pesos y fechas**
  - RF: 23, 24
  - Depende de: —
  - Hecho cuando: `test_s002_rf23_*` y `test_s002_rf24_*` dan «$1,234.50» y «11 nov 2026» (zona de la Ciudad de
    México, también cerca de medianoche UTC).
- [ ] **T13 — Revisión automática de estilos sueltos**
  - RF: RNF sin estilos sueltos
  - Depende de: T3
  - Hecho cuando: `test_s002_nf_sin_estilos_sueltos` falla con `style=`, valores arbitrarios, hexadecimales o
    colores por defecto de Tailwind en `app/` y `features/`, y pasa con el código actual corregido.
- [ ] **T14 — Botones, campos y errores**
  - RF: 21, 22, 25, 26
  - Depende de: T11
  - Hecho cuando: `Button`, `IconButton`, `TextField`, `NumberField`, `MoneyField`, `SelectField`, `Checkbox` en
    `src/ui` y en `/sistema`; E2E mide ≥ 44 × 44 px, `inputmode` numérico, error debajo con `aria-describedby` y
    `aria-invalid`, y un solo envío con doble toque.
- [ ] **T15 — Avisos**
  - RF: 27, 28
  - Depende de: T14
  - Hecho cuando: `ToastProvider` en el diseño raíz; E2E con el reloj de Playwright: el de guardado desaparece a
    los 4 s, el de error sigue hasta cerrarlo y el formulario conserva lo capturado.
- [ ] **T16 — Diálogo, menú lateral móvil, foco y movimiento**
  - RF: 37, 38, 39
  - Depende de: T14
  - Hecho cuando: `Dialog` y `Sheet` con `<dialog>`; E2E: Tab no sale del diálogo, Escape lo cierra, el foco se
    ve (contorno no nulo) y con movimiento reducido la duración de transición es 0.
- [ ] **T17 — Estados de lista**
  - RF: 29
  - Depende de: T14
  - Hecho cuando: `LoadingState`, `EmptyState`, `ErrorState` con texto; E2E los ve en el catálogo.
- [ ] **T18 — Catálogo completo y cerrado en producción**
  - RF: 40, 42
  - Depende de: T14–T17
  - Hecho cuando: `/sistema` muestra cada componente en sus estados; sin `DEV_ENDPOINTS=1` responde 404 (test de
    integración del guardián y E2E en la compilación de pruebas).

## Entrega 4 — Tabla, captura por renglones y asistente

- [ ] **T19 — Búsqueda sin acentos**
  - RF: 30
  - Depende de: —
  - Hecho cuando: `test_s002_rf30_*` encuentra «Jamón» con «jamon» y «JAMÓN».
- [ ] **T20 — Tabla de datos**
  - RF: 19, 20, 29, 30, 31
  - Depende de: T17, T19
  - Hecho cuando: `DataTable` en `/sistema/tabla` con 60 renglones de ejemplo; E2E en 1280 px ve todas las
    columnas, en 360 px tarjetas que se abren, búsqueda y filtros que filtran y vacío con «Limpiar».
- [ ] **T21 — Cantidad capturada**
  - RF: 33
  - Depende de: —
  - Hecho cuando: `test_s002_rf33_*` acepta «3», «2.5», «2,5» y rechaza «-1», «abc», «1.2345» y vacío.
- [ ] **T22 — Captura por renglones**
  - RF: 22, 32, 33
  - Depende de: T14, T21
  - Hecho cuando: `RowEntry` en `/sistema/captura`; E2E sube y baja con menos y más, no baja de 0, marca el
    renglón con error y una cantidad de 9 dígitos cabe en 360 px.
- [ ] **T23 — Asistente por pasos**
  - RF: 34, 35, 36
  - Depende de: T16
  - Hecho cuando: `Wizard` en `/sistema/asistente` (corte de ejemplo de 4 pasos); E2E ve «Paso 2 de 4», vuelve
    atrás con todo capturado y al salir con datos pide confirmar (botón cerrar, enlace de la app y recarga).
- [ ] **T24 — Pantallas tipo terminadas**
  - RF: 41
  - Depende de: T20, T22, T23
  - Hecho cuando: las tres pantallas tipo coinciden con sus maquetas aprobadas y no guardan nada (sin peticiones
    de escritura en la red durante su E2E).

## Entrega 5 — Color de negocio y estructura

- [ ] **T25 — Paleta y color sugerido**
  - RF: 8, 10
  - Depende de: —
  - Hecho cuando: `test_s002_rf10_*` cubre primer libre, todos usados y archivados contando como usados.
- [ ] **T26 — Migración del color**
  - RF: 10
  - Depende de: T25
  - Hecho cuando: `pnpm db:generate --name color_negocio` más el relleno; el test de integración aplica `0000`,
    siembra 10 negocios, aplica `0001` y encuentra las claves 1 a 8 y luego la primera dos veces.
- [ ] **T27 — Servicio y API del color**
  - RF: 8, 9, 11, 15
  - Depende de: T26
  - Hecho cuando: integración: alta sin color o con uno fuera de la paleta da `invalid_color`; el dueño cambia el
    color y queda en `audit_log` con el anterior; un administrador recibe 403; el `PATCH` de nombre de la 001 sigue
    igual.
- [ ] **T28 — Estructura de la app**
  - RF: 12, 16, 17, 18
  - Depende de: T16, T27
  - Hecho cuando: `AppShell` reemplaza la barra de la 001; E2E en 1023 px ve el botón de menú y abre la
    navegación con un toque; en 1024 px ve el menú lateral; la barra muestra negocio, sucursal y su color, y los
    nombres de 60 caracteres se recortan sin desbordar en 360 px.
- [ ] **T29 — Elegir y cambiar color en Negocios**
  - RF: 8, 9, 13, 14
  - Depende de: T27, T28
  - Hecho cuando: el alta llega con el color sugerido elegido y se puede cambiar; editar un negocio cambia su color;
    la lista de negocios y elegir sucursal muestran el color junto al nombre; E2E `negocio-color.spec.ts` en verde.

## Entrega 6 — Pantallas actuales, barrido y validación

- [ ] **T30 — Reconstruir entrada, primer arranque y contraseña**
  - RF: 43, 44
  - Depende de: T14, T15
  - Hecho cuando: las tres pantallas usan solo componentes del catálogo, coinciden con sus maquetas y
    `acceso.spec.ts` sigue en verde.
- [ ] **T31 — Reconstruir inicio, negocios, personas y elegir sucursal**
  - RF: 43, 44, 19, 20
  - Depende de: T20, T28, T29
  - Hecho cuando: personas y negocios usan `DataTable`; `negocios`, `personas` y `sucursal` de la 001 siguen en
    verde.
- [ ] **T32 — Barrido en claro y oscuro con axe**
  - RF: 18, RNF
  - Depende de: T30, T31
  - Hecho cuando: `qa-sweep.spec.ts` recorre cada pantalla y el catálogo en claro y oscuro, en escritorio, tableta
    y móvil, sin problemas ni fallas de contraste de axe.
- [ ] **T33 — Recorrido de la 002**
  - RF: 1, 4, 6, 8, 12, 16, 17, 19
  - Depende de: T32
  - Hecho cuando: `recorrido-002.spec.ts` hace el E2E principal de los criterios de finalización en verde.
- [ ] **T34 — Validación, documentos y entrega**
  - RF: todos
  - Depende de: T33
  - Hecho cuando: `validation.md` con 44 de 44 RF; `docs/DESIGN.md` completo (tokens, componentes, reglas);
    `docs/reglas-de-negocio.md` en «Vigente»; `AGENTS.md` al día; E2E de escritorio y las afectadas en Pixel 7 e
    iPhone 14 en verde; el dueño instala la app y ve SuMando con el icono nuevo.

## Cobertura

| RF | Tareas |
|---|---|
| RF-1 | T5, T7, T33 |
| RF-2 | T4, T5 |
| RF-3 | T5 |
| RF-4 | T3, T6, T33 |
| RF-5 | T3, T6 |
| RF-6 | T6, T33 |
| RF-7 | T6 |
| RF-8 | T2, T25, T27, T29, T33 |
| RF-9 | T27, T29 |
| RF-10 | T25, T26 |
| RF-11 | T27 |
| RF-12 | T28, T33 |
| RF-13 | T2, T29 |
| RF-14 | T2, T29 |
| RF-15 | T27 |
| RF-16 | T28, T33 |
| RF-17 | T28, T33 |
| RF-18 | T28, T32 |
| RF-19 | T20, T31, T33 |
| RF-20 | T20, T31 |
| RF-21 | T14 |
| RF-22 | T14, T22 |
| RF-23 | T12 |
| RF-24 | T12 |
| RF-25 | T14 |
| RF-26 | T14 |
| RF-27 | T15 |
| RF-28 | T15 |
| RF-29 | T17, T20 |
| RF-30 | T19, T20 |
| RF-31 | T20 |
| RF-32 | T22 |
| RF-33 | T21, T22 |
| RF-34 | T23 |
| RF-35 | T23 |
| RF-36 | T23 |
| RF-37 | T16 |
| RF-38 | T16 |
| RF-39 | T16 |
| RF-40 | T18 |
| RF-41 | T24 |
| RF-42 | T18 |
| RF-43 | T30, T31 |
| RF-44 | T30, T31 |
| RNF | T3, T13, T32 |
