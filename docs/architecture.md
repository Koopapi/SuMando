# Arquitectura base — Mando

Referencia común para los `plan.md` de cada spec. Lo que no está aquí se decide en el plan de la spec que lo
necesite y, si es general, se añade aquí en la misma tarea.

## Stack

- Next.js (App Router) + React + TypeScript estricto, Tailwind. PWA instalable (manifest e iconos, service worker).
- PostgreSQL 16 con Drizzle ORM; el esquema solo cambia por migración.
- Vitest (unit e integración con BD real) y Playwright (E2E).
- GitHub Actions para la CI; Docker y Coolify en el VPS propio, con una app de pruebas y otra de producción.
- Monorepo pnpm: `apps/web`, `packages/shared` cuando haga falta compartir tipos.

## Capas

```
apps/web/src/
  domain/      reglas puras: existencias, cálculos de nómina, estados de requisición, permisos   (sin Next ni BD)
  server/
    ports/     interfaces: Clock, Storage, Mailer…
    services/  casos de uso: recibir requisición, cerrar periodo, traspasar entre negocios…
    adapters/  repositorios Drizzle, almacenamiento de archivos, correo
  app/api/     handlers finos: validan, llaman a un servicio y responden
  features/    UI: solo muestra lo que devuelve el servidor; nunca calcula resultados ni permisos
  i18n/        textos de la interfaz
```

`domain/` no importa nada del resto; `services/` importa `domain/` y `ports/`. Los tests unitarios inyectan un
reloj falso, y en desarrollo un endpoint de pruebas permite adelantar la hora (periodos de nómina, vencimientos).

## Varios negocios

- Cada tabla de negocio lleva `business_id`. Los repositorios reciben el negocio activo y filtran siempre por él;
  un test de integración por spec comprueba que un negocio no ve datos de otro.
- Una persona tiene una membresía por negocio, con su rol. El permiso se comprueba en el servicio, no en la página.
- Lo que cruza negocios (traspasos, reportes consolidados) es un caso de uso explícito con su propio permiso.

## Auditoría

Los documentos (movimientos de inventario, requisiciones, periodos de nómina) no se borran: se cancelan o se
corrigen con otro movimiento. Cada cambio guarda autor, fecha, negocio y valores anteriores.

## Git y despliegue

- `main` es la versión estable y `pruebas` donde se junta lo nuevo. Cada spec o arreglo va en su rama
  (`spec/NNN-nombre`, `fix/...`, `docs/...`) creada desde `pruebas` y entra por pull request con la CI en verde.
  Cuando `pruebas` está probado, también en el teléfono, un pull request de `pruebas` a `main` lo publica.
- Nunca se sube directamente a `main` ni a `pruebas`. Solo el dueño aprueba specs y mergea.
- Los secretos viven en `.env` (fuera de git) y en Coolify; nunca en el repositorio.

## Lecciones que traemos de Waifu Baker

- **E2E contra la versión compilada** (`next build` + `next start`), no contra `next dev`: el modo desarrollo
  retiene memoria, recompila rutas en frío y remonta componentes, y eso produjo fallos intermitentes en la CI.
- Un paso de calentamiento antes de los E2E; cada test empieza con la BD vacía y siembra sus datos con los mismos
  servicios de la app (endpoint de desarrollo), no recorriendo pantallas.
- En la Mac la suite completa en todos los dispositivos la satura: en el día a día se corre escritorio y las E2E
  afectadas; la suite completa, al cerrar una spec o en la CI.
- Validación RF por RF con `scripts/rf-coverage.mjs`: tests `test_sNNN_rfN_*` y pasos de E2E «RF-N».
- Un barrido automático de todas las pantallas (errores de consola, desbordes, controles sin nombre) en escritorio,
  tableta y móvil.
