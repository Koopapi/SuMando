# Plan 015 — Asistentes paso a paso

Plan técnico de `spec.md` (51 RF). Respeta `docs/constitution.md` y `docs/architecture.md`. Los asistentes son otra
forma de capturar lo mismo: **llaman a las mismas rutas de la API** que las pantallas completas, así que las reglas,
los permisos y el registro no cambian (RF-11). Lo nuevo en el servidor es solo guardar lo capturado a medias y la
preferencia de vista.

## 1. Módulos

| Módulo | Responsabilidad | RF |
|---|---|---|
| `domain/wizards/unusual.ts` | Reglas de dato raro (doble del máximo, 30 % en conteo, mitad de la existencia, triple del máximo, sueldo de la semana) y «sin con qué comparar» | 12, 13, 15, 16 |
| `domain/wizards/drafts.ts` | Tipos de asistente (`WizardKind`), cuáles son del teléfono de piso, vigencia de 7 días, tamaño máximo de lo guardado | 17, 22, 51 |
| `domain/wizards/next.ts` | Qué sigue tras confirmar cada asistente (por ejemplo, tras pedir: «Ver la requisición») | 9 |
| `server/services/wizards/drafts.ts` | Leer, guardar y descartar lo capturado por persona, tarea y sucursal (o por teléfono de piso y empleado) | 17–22, 51 |
| `server/services/wizards/preferences.ts` | Vista elegida por persona y tarea | 23, 26 |
| `server/services/wizards/examples.ts` | Datos del negocio activo para los ejemplos (un producto con presentación, un proveedor, un puesto, un área) | 3 |
| `app/api/wizards/[kind]/draft`, `app/api/wizards/[kind]/view` | Rutas finas de lo anterior | 17–27 |
| `ui/wizard.tsx` (ampliado) | Paso controlado, indicación, ejemplo, «Vista completa», resumen con «Cambiar», anuncio del paso, botones siempre a la vista | 1–7, 24 |
| `ui/unusual-notice.tsx` | Aviso de dato raro con lo esperado y «Sí, es correcto» | 12, 14 |
| `ui/resume-prompt.tsx` | «Continuar donde te quedaste» / «Empezar de nuevo» | 18, 20 |
| `features/wizards/use-wizard-draft.ts` | Carga, guarda al cambiar de paso, descarta al confirmar o empezar de nuevo, y marca lo que ya no vale | 6, 8, 10, 17–21, 27 |
| `features/wizards/view-switch.tsx` | Enlaces «Vista completa» y «Paso a paso» que guardan la preferencia y conservan lo capturado | 24–27 |
| `features/requisitions/wizards/*` | Nueva, Aprobar, Comprar, Recibir | 28–32 |
| `features/inventory/wizards/*` | Contar un área, Entrada, Salida, Traspaso, Recibir traspaso | 33–37 |
| `features/payroll/wizards/*`, `features/cash/wizards/*` | Asistencia, Cerrar la semana, Abrir caja, Corte, Reporte del punto de venta | 38–42 |
| `features/catalog/wizards/*`, `features/personnel/wizards/*`, `features/checklists/wizards/*` | Nuevo producto (con parecidos), Nuevo proveedor, Nuevo empleado, Nueva plantilla | 43–47 |
| `features/checklists/floor-wizard.tsx`, `features/cash/floor-cash-wizard.tsx` | Checklist y Corte ciego del teléfono de piso | 48–50 |
| Páginas de cada tarea | Server Component que lee la preferencia y abre asistente o vista completa (`?vista=` la fuerza) | 23–25 |

## 2. Modelo de datos (migración `0013_asistentes`)

Solo añade tablas; no toca datos existentes.

- **`wizard_drafts`**: `id`, `business_id`, `branch_id`, `kind` (texto), `user_id` (nula), `floor_device_id` (nula),
  `employee_id` (nula), `target_id` (nula: la requisición, el traspaso, la semana o el corte sobre el que se trabaja),
  `step` (texto), `data` (jsonb, hasta 256 KB), `created_at`, `updated_at`. Índices únicos parciales:
  `(user_id, branch_id, kind, coalesce(target_id,''))` cuando hay persona y
  `(floor_device_id, employee_id, kind, coalesce(target_id,''))` cuando es el teléfono de piso.
- **`wizard_preferences`**: `user_id`, `kind`, `view` (`wizard` | `full`), `updated_at`; llave `(user_id, kind)`.

No llevan registro de auditoría: no son documentos, y lo que se registra al confirmar ya se audita en su módulo.

## 3. Algoritmos

- **Dato raro (RF-13, RF-15).** `unusual(rule, value, reference)` devuelve `{ unusual, expected }`:
  pedido > 2 × máximo; |conteo − esperado| > 30 % del esperado (con esperado 0, cualquier conteo > 0 es raro);
  salida > 50 % de la existencia; entrada > 3 × máximo; bono o extra > sueldo de la semana (días de la semana × sueldo
  por día). Sin referencia (`null`), nunca es raro. Las cantidades se comparan como enteros de `domain/catalog/units`
  en la misma presentación.
- **Vigencia (RF-51).** Al leer, un borrador con `updated_at` de hace más de 7 días (reloj del puerto) se descarta en
  la misma operación y se responde como si no hubiera.
- **Retomar (RF-21).** Cada asistente guarda en `data.basis` lo que tomó del servidor al empezar (la versión de la
  requisición, el estado del traspaso). Al retomar, el asistente pide la vista actual: lo que ya no está (producto
  archivado, renglón quitado) o cambió de estado se marca en su paso y el resumen no deja confirmar. El servidor
  además rechaza al confirmar con los errores de siempre (`invalid_state`, `not_found`), que llevan a RF-10.
- **Paso del error (RF-10).** Cada asistente declara qué campos tiene cada paso; un error de la API con `params.field`
  o `params.productId` lleva al paso que lo contiene; sin pista, al resumen con el mensaje.
- **Ejemplos (RF-3).** `examples(scope)` toma el primer producto activo con presentación de compra, su proveedor, el
  primer puesto y el primer área del almacén; cada texto de ejemplo del diccionario recibe esos datos y tiene su
  versión genérica si faltan.

## 4. Contrato de la API

| Ruta | Entrada | Salida |
|---|---|---|
| `GET /api/wizards/[kind]/draft?target=` | — | `{ draft: { step, data, updatedAt } \| null }` |
| `PUT /api/wizards/[kind]/draft?target=` | `{ step, data }` (≤ 256 KB) | `{ draft }` |
| `DELETE /api/wizards/[kind]/draft?target=` | — | 204 |
| `PUT /api/wizards/[kind]/view` | `{ view: "wizard" \| "full" }` | `{ view }` |

Las rutas del borrador aceptan la persona (sucursal activa) y, solo para `floor-checklist` y `floor-cash`, el
teléfono de piso con `?employee=` (por `requireChecklistActor`). Errores nuevos: `wizard_unknown` (404): «Ese
asistente no existe.»; `draft_too_large` (413): «Lo capturado es demasiado grande para guardarlo.». Se reutilizan
`forbidden` y `validation`.

## 5. Decisiones técnicas

- **Mismas rutas de la API para confirmar.** Descartado: rutas nuevas «por asistente». Duplicarían reglas y permisos
  (constitución 3 y 7) y la vista completa y el asistente podrían divergir.
- **Borrador en el servidor, en jsonb opaco.** RF-19 pide retomarlo desde otro dispositivo, así que no basta el
  `localStorage`. El servidor no interpreta `data`: nada de lo que hay ahí se registra hasta confirmar (RF-8), y al
  confirmar se valida como siempre. Descartado: tablas por tipo de borrador (21 esquemas para algo provisional).
- **Un borrador por persona, sucursal, tarea y objetivo.** Así «Aprobar REQ-3» y «Aprobar REQ-4» no se pisan, y
  RF-17 queda por sucursal.
- **Asistente y vista completa comparten el estado.** Cada tarea define un tipo de borrador que usan las dos
  pantallas; al cambiar de vista se guarda y la otra lo carga (RF-27). Descartado: pasar el estado en la dirección
  (límite de largo y datos visibles en el historial).
- **Preferencia en el servidor por persona y tarea** (RF-26 la pide para la persona, no para el dispositivo).
- **El corte ciego no recibe lo esperado**: el aviso de dato raro del teléfono de piso solo puede usar reglas sin
  referencia del servidor, y RF-16 deja ese asistente sin avisos.
- **Ampliar `ui/wizard.tsx`** (spec 002) en lugar de un componente nuevo: el corte de caja ya lo usa y gana lo mismo.

## 6. Dependencias

Ninguna nueva.

## 7. Estrategia de tests

- **Unitarios**: reglas de dato raro con y sin referencia (RF-12 a RF-16), vigencia y tamaño (RF-17, RF-51), qué
  sigue (RF-9), paso de cada error (RF-10), parecidos de nombre (RF-44).
- **Integración**: guardar, leer, retomar desde otra sesión, descartar y vencer borradores; aislamiento por persona,
  sucursal y negocio; teléfono de piso por empleado; preferencia de vista (RF-17 a RF-23, RF-26, RF-51).
- **E2E de escritorio** (`e2e/asistentes-*.spec.ts`, uno por área): cada asistente se termina con su indicación,
  «Siguiente» y el resumen; datos raros; salir y retomar en otra sesión; cambiar a vista completa y volver sin perder
  nada; un error del servidor que regresa al paso; medidas a 390 × 844 (botones a la vista, sin ensanchar). Se ajustan
  los E2E existentes que entran a una tarea (ahora abren el asistente, o pasan `?vista=completa`). `qa-sweep` en claro
  y oscuro.

## 8. Entregas

1. **Base y Nueva requisición**: reglas, borradores, preferencia, asistente ampliado, retomar, vista completa y el
   primer asistente de punta a punta.
2. **Resto de requisiciones**: Aprobar, Comprar y Recibir.
3. **Inventario**: Contar un área, Entrada, Salida, Traspaso y Recibir traspaso.
4. **Nómina y caja**: Asistencia, Cerrar la semana, Abrir caja, Corte y Reporte del punto de venta.
5. **Altas**: producto, proveedor, empleado y plantilla de checklist.
6. **Teléfono de piso**: Checklist y Corte ciego.
7. **Cierre**: E2E, barrido, validación y documentos.

## Ajustes al construir

- «Vista completa» es un botón, no un enlace: primero guarda lo capturado y la preferencia, y luego cambia de pantalla.
- La pantalla completa de «Nueva requisición» carga el borrador siempre que exista (salvo al editar o al empezar con
  una plantilla), así «Paso a paso» nunca lo pisa con una pantalla vacía.
- La validación de un paso puede esperar al servidor: «De dónde agregar» trae las sugerencias al tocar «Siguiente» y
  no las repite si se va y se vuelve con la misma fuente.
- Lo capturado se guarda al cambiar de paso y además 0.8 s después de cada cambio, para no perder lo del paso actual.
- Los renglones de la requisición viven en `features/requisitions/requisition-lines.tsx`, compartidos por las dos vistas.
- Aprobar, Comprar y Recibir viven en `/requisiciones/[id]/aprobar`, `/comprar` y `/recibir`. El detalle de la
  requisición abre el asistente o el diálogo de siempre según la vista que eligió la persona para cada tarea, y en la
  vista completa ofrece «Aprobar paso a paso», «Comprar paso a paso» y «Recibir paso a paso» (RF-25). Los diálogos de
  la vista completa no leen el borrador: lo capturado en el asistente se conserva y se retoma al volver a él (RF-27).
- «Comprar» no pide un comprador con cuenta: quien opera elige de qué comprador es la lista (los compradores son de
  Personal, spec 013) y recorre sus proveedores pendientes.
- «Contar un área» recorre los productos con «Siguiente» (uno por pantalla, «Producto N de M») y pasa al resumen
  después del último; el aviso del 30 % solo se calcula en la presentación de conteo, la misma de lo esperado. Lo
  esperado que se vio al empezar se guarda en el borrador, para que el servidor avise si la existencia cambió.
- `/inventario/conteo` abre el asistente (`?area=` lo empieza en un área) y `/inventario/conteo/[id]` lleva a él
  salvo con la vista completa. La hoja completa carga el borrador del asistente si es de la misma área.
- «Entrada», «Salida» y «Traspaso» son un mismo asistente con un paso propio (Proveedor, Motivo o Destino). Para los
  avisos reciben la existencia y el máximo por almacén y presentación (`movementWizardData`, que reutiliza los niveles
  de la requisición). La nota va en «Motivo» en la salida y al final de los productos en la entrada y el traspaso.
- «Recibir traspaso» vive en `/inventario/traspasos/[id]/recibir`; el detalle abre el asistente o la sección de
  siempre según la vista elegida, y la sección ofrece «Recibir paso a paso».
- Los campos que propone un asistente llevan la cantidad tal como la manda el servidor («2000»), nunca con separador
  de miles: «2,000» se leería como 2 con la coma decimal.
- «Asistencia de la semana» vive en `/nomina/[semana]` (con la semana abierta y la vista de asistente) y tiene un
  paso por cada día que se puede marcar; guarda los cambios al confirmar, uno por día y persona. La semana completa
  ofrece «Asistencia paso a paso» y, al terminar, «Ver la semana» lleva a la vista completa.
- «Cerrar la semana» vive en `/nomina/[semana]/cerrar`. La revisión y los billetes salen de una **vista previa del
  servidor** (`POST /api/payroll/weeks/[start]/preview`, `previewClose`), que recalcula la semana con lo capturado sin
  guardar y reporta lo que impediría cerrar con los mismos mensajes que el cierre. Es la única ruta nueva además de los
  borradores: sin ella, la revisión tendría que calcular netos en el navegador (constitución, principio 3).
- El sueldo de la semana para el aviso de bono o extra es el pago de días que ya calcula el servidor; sin sueldo por
  día no hay aviso (RF-15).
- «Abrir caja» abre en `/caja` cuando no hay corte; «Corte» y «Reporte del punto de venta» viven en
  `/caja/[id]/corte` y `/caja/[id]/reporte`. El tablero del corte abre el asistente o lo de siempre según la vista de
  cada tarea. Los gastos del paso «Gastos pagados de la caja» se registran al confirmar, antes de entregar el conteo.
- El resumen del reporte muestra lo que no cuadra con otra **vista previa del servidor** (acción `pos-preview`,
  `previewPos`), solo para personas; el teléfono de piso la recibe como prohibida (RF-16). El conteo a ciegas del
  teléfono sigue con su asistente de la spec 011 hasta la entrega 6.
- Parecidos (RF-44): el nombre igual según `catalogKey` (sin acentos, mayúsculas ni espacios sobrantes) ya existe y el
  servidor no lo deja repetir, así que el asistente lo dice y no avanza; «parecido» es el que solo cambia en los
  espacios entre palabras (`similarKey`), y ese pide confirmar que es otro. Se usa también en «Nuevo proveedor».
- «Nuevo producto» y «Nuevo proveedor» viven en `/productos/nuevo` y `/proveedores/nuevo`; su vista completa es el
  diálogo de siempre de la lista, que trae nombre, unidad y proveedor (o nombre, teléfono y notas) de lo capturado.
  Si algo falla después de crear el producto (una presentación o un nivel), el asistente lo avisa y manda a la ficha.
- El comprador del proveedor nuevo se elige en la sucursal activa: la ruta de la spec 013 trabaja sobre ella, y en
  otra sucursal se elige desde ella.
- «Nuevo empleado» abre en `/personal/nuevo`; el paso del sueldo solo existe para el dueño. Los archivos de los
  documentos no van en lo guardado a medias (es JSON en el servidor): se eligen en el paso y se suben al confirmar.
- «Nueva plantilla» abre en `/checklists/plantillas/nueva` y tiene un paso de puntos por cada sección con nombre;
  guarda de una vez con la ruta del editor.
- Renglones con varios campos a ancho de teléfono: el texto lleva un ancho base para pasar a su propia línea en lugar
  de quedarse en cero (también en el editor de plantillas de la spec 010).
