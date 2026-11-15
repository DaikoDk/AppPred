# Infraestructura de Asignaciones Las Vegas

Mapa de los servicios externos donde corre el sistema y de dónde sale cada dato, para que otra persona pueda continuar el proyecto. **Este documento no contiene contraseñas, claves ni tokens**, y no debe contenerlos nunca. Los secretos viven en las variables de entorno de cada servicio, en `.env` y en `secrets/`, que están ignorados por git.

Las filas marcadas **Pendiente** se completan cuando se crea o migra el servicio. Si algo de aquí no coincide con la realidad, corrígelo en el mismo cambio.

## Cuenta dueña

Todos los servicios pertenecen a una sola cuenta de Google creada para el proyecto:

| Dato | Valor |
|---|---|
| Correo | `a*******************@gmail.com` (nombre del sistema, sin espacios; el correo completo se pide al responsable) |
| Uso | Solo cuenta dueña de los servicios. Nadie la usa a diario |
| Seguridad | Verificación en dos pasos activada; teléfono y correo de recuperación en manos del responsable |
| Responsable | **Pendiente** (persona de contacto) |
| Segunda persona con acceso de recuperación | **Pendiente** |

Los usuarios del sistema **no** entran con esta cuenta: entran con su propio correo de Google, que debe estar en la tabla `allowed_emails` (ver `docs/REGLAS-NEGOCIO.md`, sección Autenticación y acceso).

## Servicios

| Servicio | Para qué se usa | Cuenta | Estado |
|---|---|---|---|
| GitHub | Código fuente, ramas y PR | Cuenta dueña | Pendiente de migrar |
| Supabase | Base de datos PostgreSQL y Auth con Google | Cuenta dueña | Pendiente de migrar |
| Render | Hospeda el servidor Express y el front compilado | Cuenta dueña | Pendiente de migrar |
| Google Cloud | Cliente OAuth del login y cuenta de servicio para Sheets | Cuenta dueña | Pendiente de migrar |
| Google Sheets | Destino de la exportación del programa | Cuenta dueña | Pendiente de migrar |

### Nombres

El nombre oficial del sistema es **Asignaciones Las Vegas**. Debe usarse igual en cada servicio (nombre del repo, del servicio de Render, del proyecto de Supabase, del proyecto de Google Cloud y de la pantalla de consentimiento de OAuth). Hay nombres antiguos (`AppPred`, `DisponibilidApp`, `sistema-disponibilidad-predicacion`) que se están retirando.

## Entornos

| Entorno | Rama | Servicio de Render | Proyecto de Supabase | Hoja de Sheets |
|---|---|---|---|---|
| Producción | `main` | **Pendiente** | **Pendiente** | **Pendiente** |
| Calidad | `develop` | **Pendiente** | **Pendiente** (proyecto aparte) | **Pendiente** (hoja aparte) |

- Las ramas de trabajo hacen PR a `develop`; cuando está probado, `develop` hace PR a `main`.
- Calidad no usa datos reales. Producción y calidad no comparten proyecto de Supabase ni hoja.
- Los planes gratuitos tienen límites (Render duerme el servicio tras un rato sin tráfico; Supabase pausa los proyectos inactivos). Revisa los límites vigentes de cada plan.

## Variables de entorno

Se configuran en Render (una por servicio) y en `.env` para trabajar en local. Aquí solo van los nombres.

| Variable | Qué es |
|---|---|
| `SUPABASE_URL` | Dirección del proyecto de Supabase |
| `SUPABASE_ANON_KEY` | Clave pública (anon) del proyecto |
| `SUPABASE_AUTH_REDIRECT_URL` | URL a la que vuelve el login con Google; debe coincidir **exactamente** con las URLs permitidas en Supabase |
| `JWT_SECRET` | Firma del token propio de la aplicación |
| `JWT_EXPIRE` | Duración del token (24 h por defecto) |
| `SHEETS_SPREADSHEET_ID` | Hoja de exportación; el valor de la tabla `config` tiene prioridad |
| `GOOGLE_SA_KEY_PATH` | Ruta al JSON de la cuenta de servicio (`secrets/service-account.json`) |
| `NODE_ENV` | `production` en Render |
| `PORT` | Puerto del servidor (3005 en local) |

## Cómo se conectan

1. **Login.** El navegador va a Google, vuelve a Supabase y luego a `SUPABASE_AUTH_REDIRECT_URL`. El servidor comprueba el correo en `allowed_emails` y emite su propio token. Si el correo no está, no entra.
2. **Datos.** El servidor habla con Supabase con la clave anon. El front nunca consulta la base directamente.
3. **Exportación.** El servidor usa la cuenta de servicio de Google para escribir en la hoja. La hoja debe estar compartida con el correo de esa cuenta de servicio, con permiso de edición.
4. **Seguridad de red.** `server.js` define la política CSP con una lista explícita de orígenes, incluido el de Supabase. Un servicio externo nuevo exige actualizarla (ADR-002).

## Esquema de la base de datos

El esquema **no está versionado** (ADR-003): los cambios se ejecutan a mano en el SQL Editor de Supabase. Cualquier columna nueva debe existir antes del despliegue. Los archivos `supabase/*.sql` están ignorados por git. **Pendiente:** versionar el esquema en el repo cuando se cree el proyecto de calidad.

## Qué hacer en cada caso

| Caso | Dónde |
|---|---|
| Agregar o quitar un usuario del sistema | Tabla `allowed_emails` (pantalla Admin) |
| Cambiar la hoja de exportación | Tabla `config` o `SHEETS_SPREADSHEET_ID` |
| Cambiar la URL pública | Render, Supabase (Site URL y Redirect URLs), cliente OAuth de Google y `SUPABASE_AUTH_REDIRECT_URL` |
| Rotar claves | Supabase (claves), Google Cloud (cuenta de servicio) y `JWT_SECRET`; luego actualizar Render y `.env` |
| Recuperar acceso a un servicio | Pedir al responsable de la cuenta dueña |

## Mantenimiento de este documento

- Si se agrega o cambia un servicio, una variable o una URL, actualiza este archivo en el mismo commit.
- Nunca incluyas aquí el correo completo, contraseñas, claves, IDs de proyecto ni correos de cuentas de servicio.
