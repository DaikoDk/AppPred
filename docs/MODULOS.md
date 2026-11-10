# Cómo agregar un módulo o un área

El sistema está pensado para crecer: hoy tiene el área **Hoja de Predicación** y se prevén más áreas de asignación (otros departamentos, privilegios). Esta guía resume los pasos y las reglas para que un módulo nuevo encaje sin romper lo que existe. Las decisiones de fondo están en `docs/ADR.md` (ADR-019 y ADR-022).

## Área o pestaña

| Qué agregas | Cuándo | Dónde se registra |
|---|---|---|
| **Pestaña** de un área existente | Es parte del trabajo de esa área (por ejemplo, un registro nuevo para la hoja de predicación) | `PESTANAS_HOJA` en `client/src/components/layout/navegacion.js` y una ruta hija de `/hoja` en `client/src/App.jsx` |
| **Área** nueva | Es otro tipo de asignación, con sus propias pantallas | `ITEMS_NAV` en `navegacion.js`, una ruta propia en `App.jsx` y, si tiene secciones, su propia barra de pestañas (como `modules/hoja/HojaPredicacion.jsx`) |

El menú lateral solo lleva áreas. Las secciones de un área van como pestañas dentro de ella, para que el menú no crezca con cada módulo (ADR-022).

## Pasos en el front

1. **Carpeta del módulo:** `client/src/modules/<modulo>/` con:
   - `index.jsx`: la página.
   - Componentes propios del módulo.
   - `api.js`: todas las llamadas a la API del módulo, con `apiFetch` de `client/src/api/client.js` y tipos en JSDoc.
   - Lógica pura en archivos `.js` aparte, con su `*.test.js` al lado.
2. **Los módulos no se importan entre sí.** Si dos módulos necesitan lo mismo, va a `components/ui`, `utils` o `hooks`. Si solo comparten aspecto, se copian las clases y se deja un comentario que diga de dónde salen (ver `modules/asignacion/TablaResultados.jsx`).
3. **Carga bajo demanda:** se importa con `lazy(() => import(...))` en `App.jsx`.
4. **Tipos:** las formas de datos nuevas van a `client/src/types/models.d.ts` y se usan con `@typedef`. Escribe siguiendo `client/MIGRACION-TS.md`.
5. **Estilos:** Tailwind con el sistema de la skill de diseño (ADR-021): estilos de texto con nombre, íconos Phosphor, clase `tw` en los componentes nuevos y nada de `styles.css`. Reutiliza `Boton`, `Modal`, `Desplegable`, `MenuAcciones`, `Pestanas` y los demás de `components/ui`.
6. **Confirmaciones y avisos:** `useConfirmar`, `useCargando` y `useToast`; nunca `alert` ni `confirm` (ADR-016).
7. **Móvil:** cada pantalla se revisa en ancho de celular. Si en móvil la pestaña debe ir en la barra inferior, márcala con `enBarra: true` y dale un texto `corto`.

## Pasos en el servidor

1. **Ruta:** un archivo en `routes/<recurso>.js`, montado en `server.js` con `authenticateToken`, igual que los demás (`app.use('/api/<recurso>', authenticateToken, require('./routes/<recurso>'))`).
2. **Validación en el servidor:** las reglas que no deben poder saltarse se validan aquí, no solo en el front. Las reglas que viven solo en el front se marcan como "(Front)" en las reglas de negocio.
3. **Datos:** todo pasa por `supabase/client.js`. El front nunca consulta la base directamente (ADR-003).
4. **Servicios externos:** si el módulo usa una API o un CDN nuevo, actualiza la CSP de `server.js` (ADR-002) y `docs/INFRAESTRUCTURA.md`.

## Base de datos

- El esquema se cambia a mano en el SQL Editor de Supabase (ADR-003). Escribe el SQL, ejecútalo primero en calidad (cuando exista; ver `docs/INFRAESTRUCTURA.md`) y luego en producción, **antes** de desplegar el código que lo usa.
- Recomendado para tablas nuevas: nombre en español, `id` UUID generado por la base (RN-DATA-03) y borrado lógico con `activo` si los registros se "eliminan" (ADR-017). Las tablas actuales no siguen un único estilo (`programa_semanal`, `conductores`, `allowed_emails`); no las renombres sin acordarlo.
- Si una tabla es propia de un área, usa el nombre del área como prefijo cuando haya riesgo de confusión.

## Permisos

Hoy solo hay dos niveles: usuario autorizado y super admin (RN-AUTH-\*). Para una pantalla solo de super admin se usa `soloSuperAdmin: true` en la navegación y `RutaSuperAdmin` en `App.jsx`, y se valida también en el servidor.

Los **permisos por área** (por ejemplo, que alguien solo vea un departamento) todavía no existen. Si un módulo nuevo los necesita, es una decisión nueva: se acuerda antes y se registra en un ADR (ADR-019 la deja pendiente). Lo mismo para los límites de usuarios (RN-AUTH-02 y RN-AUTH-03).

## Documentación del módulo

En el mismo PR que agrega el módulo:

1. **Reglas de negocio:** una sección nueva en `docs/REGLAS-NEGOCIO.md` con un **prefijo propio** registrado en la tabla de prefijos de ese archivo. Cada regla lleva su identificador (`RN-<PREFIJO>-01`), dice si se aplica en el servidor (Back) o solo en el front (Front) y dónde vive.
2. **Términos nuevos:** si el módulo trae vocabulario propio, agrégalo a la sección Dominio de las reglas de negocio.
3. **Decisiones:** si el módulo elige una forma de hacer algo que otros deben respetar (una tabla compartida, un servicio externo, una excepción a las convenciones), agrega un ADR con el número siguiente.
4. **Pruebas:** cada regla de lógica pura tiene una prueba en `client/src/**/*.test.js`.
5. **README:** si cambia la estructura o los comandos, actualízalo.

## Lista de verificación

- [ ] Carpeta propia en `client/src/modules/<modulo>/` y sin importar otros módulos.
- [ ] Registrado en la navegación (área o pestaña) y en `App.jsx` con `lazy`.
- [ ] Ruta del servidor protegida con `authenticateToken` y validaciones en el servidor.
- [ ] SQL ejecutado en calidad antes de probar y en producción antes de desplegar.
- [ ] Reglas con prefijo nuevo en `docs/REGLAS-NEGOCIO.md` y pruebas de la lógica pura.
- [ ] ADR si hubo una decisión nueva.
- [ ] `pnpm lint`, `pnpm typecheck` y `pnpm test` pasan desde `client/`.
- [ ] Revisado en escritorio y en móvil.
