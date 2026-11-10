# Asignaciones Las Vegas

Sistema interno de la congregación Las Vegas para preparar asignaciones. Hoy tiene un área, **Hoja de Predicación**: arma el programa semanal de predicación, asigna conductores con un algoritmo y exporta el resultado a Google Sheets o como imagen. Está pensado para crecer con más áreas de asignación (por ejemplo, otros departamentos y privilegios).

## Tecnología

- **Servidor:** Node.js + Express (`server.js`, `routes/`, `utils/`, `middleware/`).
- **Base de datos y login:** Supabase (PostgreSQL y Auth con Google).
- **Front:** React 19 + Vite + Tailwind CSS v4 en `client/`. Express sirve el front compilado (`client/dist`).
- **Exportación:** Google Sheets con una cuenta de servicio.
- **Hospedaje:** Render, un solo servicio para API y front.
- **Gestor de paquetes:** pnpm. No uses npm ni subas `package-lock.json`.

## Puesta en marcha local

Necesitas Node.js, pnpm y acceso a un proyecto de Supabase (pide las credenciales al responsable; ver `docs/INFRAESTRUCTURA.md`).

1. Instala las dependencias desde la raíz:
   ```bash
   pnpm install
   pnpm --dir client install
   ```
2. Crea `.env` en la raíz con las variables de `docs/INFRAESTRUCTURA.md` (sección Variables de entorno). Para exportar a Sheets, pon el JSON de la cuenta de servicio en `secrets/service-account.json`. Los dos están ignorados por git.
3. Compila el front y levanta el servidor:
   ```bash
   pnpm build
   pnpm dev
   ```
   Abre http://localhost:3005. Para que el login vuelva a tu equipo, `http://localhost:3005/` debe estar entre las URLs de redirección permitidas en Supabase.
4. Para trabajar en el front con recarga en caliente, deja `pnpm dev` corriendo y en otra terminal ejecuta `pnpm dev:client` (http://localhost:5173).

`pnpm dev` sirve el último build: si cambias el front y no ves el cambio en :3005, vuelve a ejecutar `pnpm build`.

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor con recarga en http://localhost:3005 |
| `pnpm dev:client` | Front con recarga en caliente en http://localhost:5173 |
| `pnpm build` | Compila el front en `client/dist` |
| `pnpm test` | Pruebas unitarias del front (Vitest) |
| `pnpm start` | Producción |

Antes de cada commit del front, desde `client/`: `pnpm lint`, `pnpm typecheck` y `pnpm test`. Para formatear, `pnpm format` desde `client/`.

## Estructura

```
server.js            Express: seguridad, rutas /api y front compilado
routes/              Una ruta por recurso (auth, programa, asignacion, conductores, puntos-reunion)
utils/               Lógica de servidor (Google Sheets, historial del algoritmo, distancias)
middleware/          Autenticación con JWT
supabase/            Cliente de Supabase
client/src/
  modules/<modulo>/  Una carpeta por pestaña o área: página, componentes, api.js y lógica pura
  components/ui/     Componentes compartidos (botones, modales, desplegables, pestañas)
  components/layout/ Menú lateral, navegación y estructura de la página
  hooks/ utils/      Código compartido entre módulos
  types/models.d.ts  Tipos del dominio
docs/                Documentación del proyecto
```

## Documentación

Lee en este orden antes de cambiar algo:

| Documento | Para qué sirve |
|---|---|
| [`docs/REGLAS-NEGOCIO.md`](docs/REGLAS-NEGOCIO.md) | Reglas de negocio con identificador (`RN-ASIG-05`...). No se pueden romper sin acuerdo |
| [`docs/ADR.md`](docs/ADR.md) | Decisiones de arquitectura, con su motivo y consecuencias |
| [`docs/MODULOS.md`](docs/MODULOS.md) | Cómo agregar un módulo o un área nueva |
| [`docs/INFRAESTRUCTURA.md`](docs/INFRAESTRUCTURA.md) | Servicios externos, entornos, variables y a quién pedir acceso |
| [`client/MIGRACION-TS.md`](client/MIGRACION-TS.md) | Cómo escribir el front listo para TypeScript |
| [`CLAUDE.md`](CLAUDE.md) | Instrucciones para asistentes de IA; resume las convenciones de este archivo |

## Cómo trabajar

- **Ramas:** `main` es producción y `develop` es calidad. Cada cambio sale en una rama propia desde `develop` y vuelve a ella con un PR; cuando está probado, `develop` pasa a `main` con otro PR.
- **Commits:** en español, con tipo convencional (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`), una idea por commit.
- **Reglas y decisiones:** si cambias una regla de negocio o una decisión, actualiza `docs/REGLAS-NEGOCIO.md` o `docs/ADR.md` en el mismo commit. Las decisiones no se borran: se agrega un ADR nuevo y el anterior se marca como Reemplazado.
- **Base de datos:** el esquema no está versionado y se cambia a mano en el SQL Editor de Supabase (ADR-003). Una columna nueva debe existir antes de desplegar el código que la usa. No pruebes contra datos reales sin permiso.
- **Secretos:** `.env` y `secrets/` nunca se suben.

## Zonas de mayor riesgo

- Algoritmo de asignación (`routes/asignacion.js`, reglas `RN-ASIG-*`).
- Guardar un programa borra sus asignaciones (ADR-008).
- La plantilla es un programa con id fijo que no debe aparecer en los listados (ADR-006).
- Exportación a Google Sheets (`utils/googleSheets.js`, reglas `RN-SHEET-*`): nunca sobrescribe pestañas.
- Reglas que solo aplica el front (`client/src/utils/reglasDia.js`, `client/src/modules/programa/filas.js`, `client/src/modules/asignacion/logica.js`): tienen pruebas y el servidor no las valida.
