# AppPred: Sistema de Asignación de Predicación

App interna (Express + Supabase + front vanilla HTML/JS/CSS) que arma el programa semanal de predicación, asigna conductores y exporta a Google Sheets.

## Regla principal: leer los ADR y las reglas de negocio antes de tocar código

**Antes de cualquier cambio, lee siempre:**

1. [`docs/ADR.md`](docs/ADR.md): decisiones de arquitectura y sus consecuencias.
2. [`docs/REGLAS-NEGOCIO.md`](docs/REGLAS-NEGOCIO.md): reglas de negocio (RN) que **no se pueden romper**.

Ambos documentos están deducidos del código. Por eso:

- Si el cambio toca un área descrita en ellos, cita el ADR o la RN afectada (por ejemplo `RN-ASIG-03`) y confirma que sigue cumpliéndose.
- Si el cambio **modifica** una regla o decisión, avisa al usuario **antes** de implementarlo y actualiza el documento en el mismo commit. Las decisiones no se borran: se agrega un ADR nuevo y se marca el anterior como Reemplazado.
- Si encuentras una regla en el código que no está documentada, o el documento no coincide con el código, díselo al usuario y propón la corrección; no la asumas.
- Si el cambio añade comportamiento nuevo con reglas propias, agrégalas a `docs/REGLAS-NEGOCIO.md` con un identificador nuevo.

## Zonas de mayor riesgo

- Algoritmo de asignación (`routes/asignacion.js`): RN-ASIG-\*. Cambiar candidatos, orden o pesos cambia quién queda asignado.
- Guardar un programa borra sus asignaciones (ADR-008, RN-PROG-04).
- La plantilla es un programa con id fijo y debe excluirse de los listados (ADR-006).
- Reglas solo-front (`diaDeTurno`, `diaDeExtra`, `combinarConPlantilla`, advertencias de Territorio vacío): el backend no las valida.
- Exportación a Sheets (`utils/googleSheets.js`): nunca sobrescribir pestañas; colores y formato son parte del contrato (RN-SHEET-\*).
- Esquema de base de datos: no está versionado y no se puede cambiar desde el código (ADR-003). Si hace falta una columna nueva, pide al usuario el SQL a ejecutar y avísale **antes** de usar la columna.

## Comandos

- `npm run dev`: servidor con recarga (puerto 3005 por defecto).
- `npm start`: producción (Render ejecuta `node server.js`).
- No hay pruebas automáticas. Verifica en navegador; nunca escribas en el Google Sheet de producción para probar.

## Convenciones

- Idioma: interfaz, mensajes, comentarios y commits en español.
- Commits: tipo convencional (`feat:`, `fix:`, `docs:`...), una idea por commit, **sin línea `Co-Authored-By`**.
- Ramas: una por tema, partiendo de `main`.
- Front: mantener el estilo existente (funciones globales, template strings, clases de `styles.css`). Reutilizar `confirmarModal`, `mostrarCargando`, `showToast`; no usar `alert`/`confirm` (ADR-016).
- No renombrar funciones globales de `app.js` sin revisar los `onclick` del HTML (RN-UI-05).
- Si se añade un servicio externo o CDN, actualizar la CSP de `server.js` (ADR-002).
- Secretos: `.env` y `secrets/` están ignorados; nunca los subas ni los imprimas.

## Migración a React (en curso, rama `feat/migracion-react`)

Ver ADR-013 y ADR-019. El cliente nuevo está en `client/` y se sirve en `/nuevo`; la app actual (`public/`) sigue siendo la principal hasta el corte.

- No cambiar los estilos: `client/src/styles/styles.css` es copia de `public/css/styles.css`. Un cambio de estilos se hace en ambas copias hasta el corte.
- Usar `docs/REGLAS-NEGOCIO.md` como lista de paridad: al migrar un módulo, verificar cada RN que lo toca.
- Escribir JSX listo para TypeScript siguiendo `client/MIGRACION-TS.md`: tipos del dominio desde `client/src/types/models.d.ts`, JSDoc en props y funciones, `// @ts-check` en `.js`.
- Estructura por módulos en `client/src/modules/<modulo>/`; los módulos no se importan entre sí.
- Antes de cada commit del cliente: `npm --prefix client run lint` y `npm --prefix client run typecheck`.
- Con más usuarios y módulos previstos, no asumir límites ni roles actuales (RN-AUTH-02/03): consultar antes de cambiarlos.
