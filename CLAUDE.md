# Asignaciones Las Vegas

Sistema interno de asignaciones de la congregación Las Vegas. Hoy tiene el área Hoja de Predicación (arma el programa semanal de predicación, asigna conductores y exporta a Google Sheets) y crecerá con más áreas. Los nombres antiguos `AppPred` y `DisponibilidApp` se están retirando.
Backend Express + Supabase (`server.js`, `routes/`, `utils/`); front React + Vite en `client/` (ADR-019).

Para agregar un módulo o un área, sigue [`docs/MODULOS.md`](docs/MODULOS.md). Los servicios externos y las variables de entorno están en [`docs/INFRAESTRUCTURA.md`](docs/INFRAESTRUCTURA.md).

## Regla principal: leer los ADR y las reglas de negocio antes de tocar código

**Antes de cualquier cambio, lee siempre:**

1. [`docs/ADR.md`](docs/ADR.md): decisiones de arquitectura y sus consecuencias.
2. [`docs/REGLAS-NEGOCIO.md`](docs/REGLAS-NEGOCIO.md): reglas de negocio (RN) que **no se pueden romper**.

Ambos documentos están deducidos del código. Por eso:

- Si el cambio toca un área descrita en ellos, cita el ADR o la RN afectada (por ejemplo `RN-ASIG-03`) y confirma que sigue cumpliéndose.
- Si el cambio **modifica** una regla o decisión, avisa al usuario **antes** de implementarlo y actualiza el documento en el mismo commit. Las decisiones no se borran: se agrega un ADR nuevo y se marca el anterior como Reemplazado.
- Si encuentras una regla en el código que no está documentada, o el documento no coincide con el código, díselo al usuario y propón la corrección; no la asumas.
- Si el cambio añade comportamiento nuevo con reglas propias, agrégalas a `docs/REGLAS-NEGOCIO.md` con un identificador nuevo y una prueba en `client/src/**/*.test.js` cuando sea lógica pura.

## Zonas de mayor riesgo

- Algoritmo de asignación (`routes/asignacion.js`): RN-ASIG-\*. Cambiar candidatos, orden o pesos cambia quién queda asignado.
- Guardar un programa borra sus asignaciones (ADR-008, RN-PROG-04).
- La plantilla es un programa con id fijo y debe excluirse de los listados (ADR-006).
- Reglas que solo aplica el front (`client/src/utils/reglasDia.js`, `client/src/modules/programa/filas.js`, `client/src/modules/asignacion/logica.js`): el backend no las valida. Tienen pruebas unitarias; si cambian, actualiza las pruebas.
- Exportación a Sheets (`utils/googleSheets.js`): nunca sobrescribir pestañas; colores y formato son parte del contrato (RN-SHEET-\*).
- Esquema de base de datos: no está versionado y no se puede cambiar desde el código (ADR-003). Si hace falta una columna nueva, pide al usuario el SQL a ejecutar y avísale **antes** de usar la columna.
- La base de desarrollo es la misma que la de producción: al probar, no crees, edites ni borres datos reales sin permiso. Para verificar guardados, intercepta las llamadas en el navegador.

## Comandos

Gestor de paquetes: **pnpm** (no usar npm ni crear `package-lock.json`). Desde la raíz:

- `pnpm install` y `pnpm --dir client install`: dependencias del servidor y del front.
- `pnpm build`: compila el front en `client/dist` (Express lo sirve; sin build responde 503).
- `pnpm dev`: servidor con recarga en http://localhost:3005 (sirve el último build).
- `pnpm dev:client`: front con recarga en caliente en http://localhost:5173 (redirige `/api` a :3005; necesita `pnpm dev` corriendo).
- `pnpm test`: pruebas unitarias del front (Vitest).
- `pnpm start`: producción. **Render** debe usar como build command `pnpm install && pnpm build`.
- Antes de cada commit del front, desde `client/`: `pnpm lint`, `pnpm typecheck` y `pnpm test`.

## Convenciones

- Idioma: interfaz, mensajes, comentarios y commits en español.
- Commits: tipo convencional (`feat:`, `fix:`, `docs:`...), una idea por commit, **sin línea `Co-Authored-By`**.
- Ramas: `main` es producción y `develop` es calidad. Cada cambio sale en una rama desde `develop` y vuelve con un PR a `develop`; `develop` pasa a `main` con otro PR.
- Front:
  - Un módulo por pestaña de Hoja de Predicación (o por área del menú lateral, ADR-022) en `client/src/modules/<modulo>/` (página, componentes, `api.js` y lógica pura); los módulos no se importan entre sí. Lo compartido va a `components/ui`, `utils` o `hooks`.
  - Estilos: Tailwind v4 con el sistema de la skill `landing-page-design` (ADR-021). Todo texto usa un estilo con nombre (`heading-3`, `body-6`, `button-sm`...); espaciados solo de la tabla de la skill; íconos Phosphor; sin cursivas, degradados de fondo ni bordes de un solo lado. Un componente nuevo no usa clases de `styles.css`. Los componentes nuevos llevan la clase `tw` (reseteo acotado, no hay preflight) y los paneles flotantes usan `PanelFlotante`. El editor de Programa tiene dos presentaciones (RN-UI-09). Ese archivo es CSS anterior en la capa `legacy`: no se le agregan reglas y no lo toca Prettier (córrelo siempre desde `client/`, con `pnpm format`).
  - Escribir JSX listo para TypeScript siguiendo `client/MIGRACION-TS.md`: tipos del dominio desde `client/src/types/models.d.ts`, JSDoc en props y funciones, `// @ts-check` en `.js`.
  - Confirmaciones con `useConfirmar`, carga con `useCargando`, avisos con `useToast`; nunca `alert`/`confirm` (ADR-016).
- Si se añade un servicio externo o CDN, actualizar la CSP de `server.js` (ADR-002).
- Con más usuarios y módulos previstos, no asumir límites ni roles actuales (RN-AUTH-02/03): consultar antes de cambiarlos.
- Secretos: `.env` y `secrets/` están ignorados; nunca los subas ni los imprimas.

## Front anterior

El front vanilla (`public/`) se eliminó al terminar la migración. Los comentarios que mencionan `public/js/app.js`, `public/dashboard.html` o "la app anterior" se refieren a esa versión, disponible en el commit `ab14d53`.
