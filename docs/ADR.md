# Registro de decisiones de arquitectura (ADR)

> Estas decisiones están **deducidas del código y del historial de git**, no documentadas originalmente. Donde el motivo es una inferencia, se marca como *(inferido)*. Si una decisión cambia, no se borra: se agrega un ADR nuevo que la reemplace y se marca el anterior como **Reemplazado**.

Formato: Contexto, Decisión, Consecuencias. Estados: Vigente, Reemplazado, Propuesto.

---

## ADR-001: Front en vanilla HTML/JS/CSS, sin framework ni build

**Estado:** Vigente (ver ADR-013 para la migración propuesta)

**Contexto:** App interna de uso reducido (máximo 4 usuarios, ADR-005) que se despliega como un solo servicio.

**Decisión:** El front es `public/dashboard.html`, `public/index.html`, `public/js/app.js` y `public/css/styles.css`. Se manipula el DOM directo y se arma HTML con template strings. No hay bundler, transpilación ni componentes.

**Consecuencias:**
- Despliegue trivial: `node server.js` sirve todo.
- `app.js` es un solo archivo con scope global; las funciones se llaman desde atributos `onclick="..."` del HTML, así que **renombrar una función global rompe el HTML**.
- Los archivos estáticos se cachean sin hash en el nombre: tras un cambio hay que forzar recarga (Ctrl+F5).
- Lo más parecido a componentes son funciones reutilizables (`confirmarModal`, `mostrarCargando`, `mostrarModalSheet`, `diaBadgeHTML`, `prepararSelects`) y clases CSS compartidas.

## ADR-002: Un solo servicio Express que sirve API y archivos estáticos

**Estado:** Vigente

**Contexto:** Se despliega en Render.

**Decisión:** `server.js` monta `express.static('public')` y las rutas `/api/*`. Front y back comparten origen, por lo que no hay CORS real entre ellos (aun así `cors({ origin: true })` está activo).

**Consecuencias:**
- Un solo servicio, un solo comando de arranque (`pnpm start`).
- La CSP de `helmet` se define en `server.js` con lista explícita de orígenes (cdnjs, Google Fonts, Supabase). **Agregar un CDN o API externa nuevo exige actualizar la CSP.**
- `scriptSrcAttr: 'unsafe-inline'` está habilitado porque el HTML usa `onclick` en línea (consecuencia de ADR-001).
- Rate limit de 200 solicitudes por minuto sobre `/api/`.

## ADR-003: Supabase (Postgres) como base de datos, accedida desde el backend con la clave anon

**Estado:** Vigente

**Decisión:** Todo acceso a datos pasa por `supabase/client.js` con `SUPABASE_ANON_KEY`. El front **nunca** habla con Supabase para datos; solo se usa Supabase Auth para el login con Google (ADR-004).

**Consecuencias:**
- Con la clave anon no se puede ejecutar DDL. Los cambios de esquema (por ejemplo la columna `formato`) los ejecuta una persona a mano en el SQL Editor de Supabase. Los archivos `supabase/*.sql` están en `.gitignore`, así que **el esquema no está versionado en el repositorio** *(inferido: se trató como material local)*.
- Cualquier columna nueva que el código lea o escriba debe existir antes del deploy.
- No hay transacciones entre varias llamadas: operaciones como "borrar y reinsertar" (ADR-008) no son atómicas.

## ADR-004: Autenticación con Google OAuth vía Supabase, sesión propia con JWT

**Estado:** Vigente

**Decisión:**
1. El navegador va a `/api/auth/google`, que redirige al OAuth de Supabase.
2. Supabase vuelve a `SUPABASE_AUTH_REDIRECT_URL` con `access_token` en el fragmento.
3. `POST /api/auth/google/callback` valida ese token contra Supabase, comprueba el correo en la tabla `allowed_emails` y emite un **JWT propio** (`JWT_SECRET`, expira en `JWT_EXPIRE`, 24 h por defecto).
4. El front guarda `token` y `usuario` en `localStorage` y manda `Authorization: Bearer` en cada llamada (`apiFetch`).
5. `authenticateToken` protege todas las rutas salvo `/api/auth`.

**Consecuencias:**
- La URL de redirección debe coincidir **exactamente** con las permitidas en Supabase (con barra final, por ejemplo `http://localhost:3005/`); si no, Supabase redirige a producción.
- `JWT_SECRET` tiene un valor por defecto inseguro (`default-secret-change-in-production`). En producción **debe** estar definido.
- Un token vencido responde 403 `Token inválido`; el front debe tratarlo como sesión caducada.

## ADR-005: Lista blanca de correos con dos niveles de rol

**Estado:** Vigente

**Decisión:** Acceso solo para correos en `allowed_emails`. Hay un rol `is_super_admin` que habilita la pestaña Admin (gestión de correos y configuración). Límites fijos en `routes/auth.js`: `MAX_USERS = 4` y `MAX_SUPER_ADMINS = 2`.

**Consecuencias:** ver reglas RN-AUTH-\* en `REGLAS-NEGOCIO.md`. Los límites son constantes de código, no configuración.

## ADR-006: Plantilla como un programa especial dentro de la misma tabla

**Estado:** Vigente

**Contexto:** Cada semana se repite una estructura base de turnos que hay que poder editar.

**Decisión:** La plantilla es un registro de `programa_semanal` con id fijo `00000000-0000-0000-0000-000000000001` y fechas ficticias `2000-01-03` a `2000-01-09`. Se crea sola (`asegurarPlantilla`) con `DEFAULT_TURNOS` y `DEFAULT_EXTRA_FILAS` la primera vez que se consulta.

**Consecuencias:**
- **Toda consulta que liste programas debe excluir el id de la plantilla** (`GET /`, `/con-estado` ya lo hacen). Olvidarlo hace aparecer una semana del año 2000 en las listas.
- La plantilla no se puede eliminar (`DELETE` responde 403).
- `DEFAULT_TURNOS` está **duplicado** en `routes/programa.js` y `public/js/app.js` (el del front además incluye Sábado y Domingo). Si se cambia uno, revisar el otro.

## ADR-007: Programa = turnos + filas extra (dos tablas distintas)

**Estado:** Vigente

**Decisión:**
- `programa_semanal_turnos`: filas que el algoritmo puede asignar (tienen `conductor_id` y `score`).
- `programa_semanal_extra_filas`: filas de texto libre (reunión de fin de semana, "predicación por cada grupo presencial", etc.) con su propio campo `conductor` en texto y un `orden`.

**Consecuencias:**
- Las filas extra **nunca** se asignan automáticamente ni cuentan en los contadores de asignados.
- `orden < 0` coloca la fila **antes** de los turnos del día; `orden >= 0` después.
- Al exportar a Sheets se mezclan ambas listas por día (ADR-011).

## ADR-008: Guardar un programa reemplaza todos sus turnos (borrar e insertar)

**Estado:** Vigente (con riesgo conocido)

**Decisión:** `PUT /programa-semanal/:id` borra todos los turnos y filas extra del programa y los vuelve a insertar con los datos del editor.

**Consecuencias:**
- **Editar un programa ya asignado borra sus asignaciones** (`conductor_id` y `score`), porque los turnos nuevos tienen ids nuevos. Hay que volver a asignar.
- No es atómico: si falla la inserción tras el borrado, el programa queda sin turnos.
- Alternativa descartada por ahora: actualizar fila por fila conservando ids (más compleja, requiere identificar filas en el editor).

## ADR-009: Retención de los últimos 10 programas

**Estado:** Vigente

**Decisión:** Al crear un programa (`POST /programa-semanal`) se borran los más antiguos (por `semana_inicio`) cuando hay más de 10 reales, sin contar la plantilla.

**Consecuencias:** Es borrado permanente y silencioso, sin aviso en la interfaz. El historial de asignaciones (`asignaciones_historial`) se conserva por separado y se usa para el algoritmo.

## ADR-010: Asignación en dos pasos: previsualizar y confirmar

**Estado:** Vigente

**Decisión:**
- `POST /asignacion/asignar` **no escribe nada**: calcula y devuelve la propuesta (algoritmo voraz con puntaje, ver RN-ASIG-\*).
- La persona puede cambiar conductores a mano en el front (incluidos los turnos que el algoritmo dejó SIN ASIGNAR).
- `POST /asignacion/confirmar` persiste `conductor_id` y `score` por turno y hace `upsert` en `asignaciones_historial`.

**Consecuencias:**
- La lectura del DOM define qué se guarda: los turnos que se dejan en SIN ASIGNAR **no se envían** y no se tocan en la base.
- `confirmar` recalcula el `score` con un contexto reducido (sin los ya asignados de la semana ni los conteos de disponibilidad), así que el `score` guardado **no es idéntico** al mostrado en la previsualización.
- El historial se acumula por `(semana_id, conductor_id)` con `cantidad_turnos`.

## ADR-011: Exportación a Google Sheets con cuenta de servicio y una pestaña nueva por exportación

**Estado:** Vigente

**Decisión:**
- `utils/googleSheets.js` usa una cuenta de servicio (`secrets/service-account.json` o `GOOGLE_SA_KEY_PATH`). El Sheet debe estar compartido con el correo de esa cuenta.
- El `spreadsheet_id` se lee de la tabla `config` (editable por un super admin) y, si no existe, de `SHEETS_SPREADSHEET_ID`.
- Cada exportación **crea una pestaña nueva** nombrada `"9 nov - 15 nov (n)"`, con `n` el siguiente número libre. Nunca se pisa una pestaña existente.
- Estilos y anchos se calculan en el backend con `batchUpdate`.

**Consecuencias:**
- El guardado de la asignación **siempre** exporta; si la exportación falla, la asignación queda guardada y se avisa del error aparte.
- Los colores por día (`DAY_THEMES`) y el aspecto de la tabla son parte del contrato visual con quien lee el Sheet.
- `secrets/` está en `.gitignore`; en Render el archivo debe subirse como Secret File.

## ADR-012: Formato por celda guardado como JSON en `formato` y aplicado al exportar

**Estado:** Vigente

**Decisión:** Cada turno y cada fila extra tiene una columna `formato` (jsonb) con la forma `{ campo: { h, v, b, i, s } }`, donde `campo` es `hora`, `grupo`, `territorio`, `punto_reunion` o `conductor`. El backend lo **sanea** (`limpiarFormato`: descarta cualquier clave o valor desconocido). La exportación lo traduce a `repeatCell` por celda y **gana sobre el formato general** del Sheet.

**Consecuencias:**
- Defaults implícitos: alineación horizontal centrada y vertical al medio; solo se guarda lo que difiere.
- El formato viaja con el turno al crear desde plantilla y al actualizar con la plantilla.
- Requiere la columna `formato` en ambas tablas (ya creada en la base compartida).

## ADR-013: Migración propuesta a React + Vite sin cambiar estilos

**Estado:** Propuesto (no iniciado)

**Decisión propuesta:** Migrar por pestañas a React + Vite, reutilizando `styles.css` sin cambios, con Express sirviendo `client/dist` y un solo servicio en Render. Detalle en `.archify/explainer-migracion-react-*/plan-migracion-react.html`.

**Consecuencias si se aprueba:** este documento y `REGLAS-NEGOCIO.md` pasan a ser la **lista de paridad**: ninguna regla puede perderse en la migración. Las reglas marcadas "solo front" (RN-FRONT-\*) son las que más riesgo corren.

## ADR-014: Lógica de negocio del editor vive en el front y el estado en el DOM

**Estado:** Vigente

**Decisión:** El estado del editor de programa es la tabla del DOM (`.programa-row`, `.extra-fila-row` con `data-dia`, `data-antes`, `data-formato`). `leerFilasEditor()` lo serializa al guardar. Un `MutationObserver` mantiene los colores y marcas de día.

**Consecuencias:**
- Reglas como "el turno Domingo siempre es domingo" o "la reunión de fin de semana va antes del turno del domingo" viven **solo en el front** (`diaDeTurno`, `diaDeExtra`, `normalizarExtras`); el backend las confía tal cual.
- El diseño visual (colores por día, marco de fila, vista por día/semana) está acoplado a esa estructura de DOM.

## ADR-015: Estilos en un solo CSS con variables por día

**Estado:** Vigente

**Decisión:** Un único `styles.css`. Cada día define `--dia-acento`, `--dia-fondo` y `--dia-borde` en `tr[data-dia=...]`; el marco de la fila enfocada se dibuja con `box-shadow inset` en cada celda. En móvil el editor se muestra como tarjetas por día. Los `select` de conductor usan `appearance: base-select` con un respaldo para navegadores sin soporte.

**Consecuencias:** Los colores del front y los de `DAY_THEMES` en `googleSheets.js` son **dos fuentes** que deben mantenerse parecidas a mano. Cambiar el HTML de una tabla puede romper selectores de día/filas.

## ADR-016: Modales y avisos propios en lugar de `alert`/`confirm`

**Estado:** Vigente

**Decisión:** Toda confirmación pasa por `confirmarModal({...})` (con opciones `peligro`, `espera`, `alternativa`, `advertencia`, `exito`), la carga bloqueante por `mostrarCargando`/`ocultarCargando` y los avisos por `showToast`. No usar `confirm()` ni `alert()` del navegador.

**Consecuencias:** Acciones destructivas usan `peligro` y, cuando corresponde, `espera` (cuenta regresiva antes de poder confirmar; hoy 10 s al eliminar un programa).

## ADR-017: Borrado lógico en entidades, físico en programas

**Estado:** Vigente

**Decisión:** Conductores y puntos de reunión se "eliminan" poniendo `activo = false`. Los programas y las filas extra se borran de verdad.

**Consecuencias:** Los listados de conductores y puntos filtran `activo = true`. Un conductor desactivado deja de ser candidato, pero sus asignaciones históricas se conservan.

## ADR-018: Código heredado sin uso

**Estado:** Vigente (deuda técnica)

**Observación:** `utils/animation.js` (clase de toasts para el navegador, en carpeta de servidor) no se importa en ningún lado. Las dependencias `axios`, `bcryptjs`, `joi`, `node-cron` y `xlsx` (npm) no se usan en `routes/`, `server.js` ni `utils/`. `public/dashboard.html` carga `xlsx` desde CDN pero la exportación a Excel se quitó de la interfaz. `generarPuntuacion` en `utils/geolib.js` tampoco se usa; solo `generarDistanciaHaversine`.

**Acción recomendada:** no borrar sin verificar; confirmar con la persona responsable antes de limpiar.

## ADR-019: Cliente en JSX con JSDoc y tipos, preparado para TypeScript; estructura por módulos

**Estado:** Propuesto (Fase 0 hecha en `feat/migracion-react`)

**Contexto:** El sistema va a tener más módulos y entre 10 y 15 usuarios más (de 4 a unos 14-19). La migración a React ya exige replicar las reglas de negocio sin perder ninguna; sumar TypeScript a la vez agrega fricción.

**Decisión:**
- El cliente nuevo vive en `client/` (Vite + React, JavaScript con JSX) y se sirve en `/nuevo` hasta el corte.
- Se deja preparado para TypeScript: `tsconfig` con `checkJs`, tipos del dominio en `client/src/types/models.d.ts`, JSDoc con `// @ts-check` y reglas de escritura en `client/MIGRACION-TS.md`. La migración a TS se hace archivo por archivo cuando todos los módulos estén estables.
- Estructura por módulos: `client/src/modules/<modulo>/` con páginas, componentes y llamadas a la API propias; solo lo compartido va a `components/ui`; los módulos no se importan entre sí; cada módulo se carga con `React.lazy`.
- Estilos: `styles.css` se copia **sin cambios** y los componentes usan las mismas clases (no CSS Modules ni Tailwind por ahora).
- Render: el build pasa a ser `pnpm install && pnpm build` (el gestor de paquetes del proyecto es pnpm); el start sigue siendo `node server.js`.

**Consecuencias:**
- `client/src/types/models.d.ts` es fuente de verdad de formas de datos del cliente y debe mantenerse alineado con la API y con `REGLAS-NEGOCIO.md`.
- Hay dos copias del CSS mientras dure la migración (`public/css/styles.css` y `client/src/styles/styles.css`); un cambio de estilos hay que hacerlo en ambas hasta el corte.
- Con más usuarios hay decisiones pendientes que **no se toman sin aprobación**: subir o mover a `config` los límites de usuarios y de super admins (RN-AUTH-02, RN-AUTH-03), definir permisos por módulo (hoy solo existe super admin), el límite de 200 peticiones por minuto por IP y la edición concurrente de un mismo programa (ADR-008).
