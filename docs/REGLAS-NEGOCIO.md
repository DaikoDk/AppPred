# Reglas de negocio (RN)

> Deducidas del código (`routes/`, `utils/`, `client/src/`) y del historial de git. Se dedujeron del front anterior (`public/js/app.js`, commit `ab14d53`) y el front React las conserva. Cada regla indica **dónde vive** para poder verificarla. Si el código y este documento difieren, el código es la verdad vigente: actualizar el documento en el mismo cambio.
> Antes de modificar cualquier comportamiento descrito aquí, confirmar con la persona responsable.

Convenciones: **Back** = se aplica en el servidor. **Front** = solo en `client/src/` (el servidor confía en lo que recibe). Las del editor y la asignación están en funciones puras con pruebas (`filas.js`, `logica.js`, `reglasDia.js`).

## Prefijos

Cada grupo de reglas tiene un prefijo. Un módulo nuevo registra aquí el suyo antes de escribir reglas (ver `docs/MODULOS.md`). Un identificador no se reutiliza: si una regla se retira, se marca como Retirada y su número queda ocupado.

| Prefijo | Área | Tema |
|---|---|---|
| `RN-AUTH` | General | Autenticación y acceso |
| `RN-DATA` | General | Datos y límites técnicos |
| `RN-UI` | General y Hoja de Predicación | Interfaz |
| `RN-PLAN` | Hoja de Predicación | Plantilla y estructura del programa |
| `RN-PROG` | Hoja de Predicación | Crear y editar programas |
| `RN-ACT` | Hoja de Predicación | Actualizar un programa con la plantilla |
| `RN-COND` | Hoja de Predicación | Conductores y su disponibilidad |
| `RN-PUNT` | Hoja de Predicación | Puntos de reunión |
| `RN-ASIG` | Hoja de Predicación | Algoritmo de asignación |
| `RN-CONF` | Hoja de Predicación | Confirmar y guardar la asignación |
| `RN-SHEET` | Hoja de Predicación | Exportación a Google Sheets |
| `RN-IMG` | Hoja de Predicación | Imagen PNG e impresión del programa |
| `RN-FMT` | Hoja de Predicación | Formato por celda |

---

## Dominio (Hoja de Predicación)

- **Programa semanal:** una semana (`semana_inicio`, `semana_fin`) con sus turnos y filas extra.
- **Turno:** combinación día + franja horaria + grupo, con territorio, punto de reunión, modalidad y, tras asignar, un conductor.
- **Fila extra:** línea de texto libre del programa que no se asigna (reunión de fin de semana, etc.).
- **Conductor:** persona que dirige la predicación; tiene grupo, disponibilidad y atributos.
- **Plantilla:** programa modelo del que se parte al crear semanas nuevas.
- **Días:** `LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, SABADO, DOMINGO` (sin acentos como valor; con acento solo al mostrar).
- **Franjas (`hora`):** `Madrugada (6:30 AM)`, `Mañana (8:20 AM)`, `Mañana (8:50 AM)`, `Tarde (6:20 PM)`, `Domingo (10:20 AM)`.
- **Grupos de turno:** `TODA LA CONGREGACION`, `GRUPO A`, `GRUPO B`.
- **Grupos de conductor:** `A`, `B`, `C` (C = puede con cualquier grupo).
- **Modalidades:** `FISICO` (por defecto), `ZOOM`, `CARTAS`.

---

## Autenticación y acceso

- **RN-AUTH-01 (Back):** Solo entran correos presentes en `allowed_emails`; el correo se compara en minúsculas. Otro correo recibe 403 `Email no autorizado`.
- **RN-AUTH-02 (Back):** Máximo 4 correos autorizados en total. Al llegar al límite no se puede añadir otro.
- **RN-AUTH-03 (Back):** Máximo 2 super admins. No se puede nombrar un tercero.
- **RN-AUTH-04 (Back):** Solo un super admin puede ver/añadir/eliminar correos, cambiar roles o ver/editar la configuración.
- **RN-AUTH-05 (Back):** Un super admin no puede eliminarse a sí mismo ni cambiarse el rol con el interruptor; para quitarse el rol usa "Renunciar".
- **RN-AUTH-06 (Back):** No se puede renunciar si es el único super admin.
- **RN-AUTH-07 (Back):** El formato del correo se valida al añadir; un duplicado responde 409.
- **RN-AUTH-08 (Front):** Admin (menú lateral) y la pestaña Configuración de Hoja de Predicación solo se muestran a super admins.
- **RN-AUTH-09 (Back):** La sesión (JWT) dura 24 h por defecto. Sin token: 401; token inválido o vencido: 403.

## Plantilla y estructura del programa

- **RN-PLAN-01 (Back):** Existe una única plantilla con id fijo `00000000-0000-0000-0000-000000000001`; no se puede eliminar y no aparece en los listados de programas.
- **RN-PLAN-02 (Back):** Si la plantilla no tiene turnos/filas, se rellena con los valores por defecto (Lunes a Viernes con sus franjas; en Martes, Sábado y Domingo las filas extra de la lista `DEFAULT_EXTRA_FILAS`).
- **RN-PLAN-03 (Back):** "Restablecer plantilla" borra la plantilla y la recrea con los valores por defecto.
- **RN-PLAN-04 (Front):** El turno cuya franja empieza con `Domingo` pertenece siempre al DOMINGO, aunque esté guardado con otro día (`diaDeTurno`).
- **RN-PLAN-05 (Front):** La fila extra cuyo punto de reunión contiene "fin de semana" pertenece siempre al DOMINGO y va **antes** de los turnos (`orden = -1`) (`diaDeExtra`).
- **RN-PLAN-06 (Back/Front):** `orden < 0` en una fila extra la ubica antes de los turnos de su día; `orden >= 0`, después.
- **RN-PLAN-07 (Front):** Al elegir la fecha de inicio, la fecha de fin se calcula sola: inicio + 6 días.
- **RN-PLAN-08 (Back):** Una combinación de fechas ya existente en otro programa se rechaza con "Ya existe un programa con esas fechas".

## Crear y editar programas

- **RN-PROG-01 (Back):** Para crear hacen falta `semana_inicio`, `semana_fin` y la lista `turnos`.
- **RN-PROG-02 (Back):** Si falla la inserción de turnos al crear, el programa recién creado se borra.
- **RN-PROG-03 (Back):** Se conservan solo los **10 programas más recientes** (por `semana_inicio`); los más antiguos se borran al crear uno nuevo. La plantilla no cuenta.
- **RN-PROG-04 (Back):** Guardar una edición reemplaza todos los turnos y filas extra. **Consecuencia: se pierden las asignaciones del programa editado** (ver ADR-008).
- **RN-PROG-05 (Back):** `territorio` y `punto_reunion` vacíos de un turno se guardan como `null`; `modalidad` vacía como `FISICO`.
- **RN-PROG-06 (Front):** Eliminar un programa pide confirmación con modal de peligro y una espera de 10 s antes de poder confirmar; ofrece la alternativa de editarlo.
- **RN-PROG-07 (Front):** La plantilla no se puede eliminar desde la interfaz.
- **RN-PROG-08 (Front):** En móvil el editor se ve por tarjetas de día o por semana; la preferencia se recuerda en el navegador.

## Actualizar un programa con la plantilla

- **RN-ACT-01 (Front):** La **estructura de filas** (cuántos turnos y filas extra, su día, hora y grupo) pasa a ser la de la plantilla.
- **RN-ACT-02 (Front):** En cada celda, **gana la plantilla si tiene información**; si está vacía, se conserva lo que tenía el programa en esa misma fila.
- **RN-ACT-03 (Front):** La modalidad `FISICO` cuenta como "vacía": solo gana la plantilla si indica otra modalidad.
- **RN-ACT-04 (Front):** El formato de celda se combina: el del programa como base y el de la plantilla encima.
- **RN-ACT-05 (Front):** Las filas se emparejan por clave (día + hora + grupo para turnos; día + lado antes/después para extras) en orden de aparición.
- **RN-ACT-06 (Front):** Si la plantilla no tiene filas, no se cambia nada y se avisa.
- **RN-ACT-07 (Front):** La acción pide confirmación y solo modifica el editor; se guarda al guardar el programa.

## Disponibilidad y atributos del conductor

- **RN-COND-01 (Back):** Un conductor requiere `nombre` y `grupo`; el grupo debe ser `A`, `B` o `C`.
- **RN-COND-02 (Back):** "Eliminar" un conductor lo desactiva (`activo = false`); no se borra.
- **RN-COND-03 (Back):** Solo los conductores activos entran en el algoritmo y en los listados.
- **RN-COND-04 (Back):** La disponibilidad se guarda por conductor, día y franja exacta (`disponible` verdadero/falso) con upsert por `(conductor_id, dia, hora)`.
- **RN-COND-05:** Atributos con efecto en el algoritmo: `tiene_pc` (puede conducir por Zoom), `poca_movilidad`, `solo_parque` (solo Parque Las Vegas) y `ubicacion_casa` (coordenadas "lat,lng" para la distancia).

## Puntos de reunión

- **RN-PUNT-01 (Back):** Un punto requiere `nombre`; `ubicacion` es opcional (coordenadas "lat,lng").
- **RN-PUNT-02 (Back):** Los puntos marcados `fijo` **no se pueden modificar ni eliminar**.
- **RN-PUNT-03 (Back):** "Eliminar" un punto lo desactiva.
- **RN-PUNT-04 (Back):** Los nombres especiales `ZOOM` y `PARQUE LAS VEGAS` tienen efecto en el algoritmo (ver RN-ASIG-03 y RN-ASIG-05). **El nombre debe coincidir exactamente.**

## Algoritmo de asignación (previsualización)

Archivo: `routes/asignacion.js`, `POST /asignacion/asignar`.

- **RN-ASIG-01 (Back):** No escribe en la base; solo propone.
- **RN-ASIG-02 (Back):** Orden de proceso de los turnos: primero GRUPO A, luego GRUPO B, luego TODA LA CONGREGACION; dentro de cada grupo por día (Lunes a Domingo) y por franja (Madrugada, 8:20, 8:50, Tarde, Domingo 10:20).
- **RN-ASIG-03 (Back):** Un conductor es **candidato** de un turno solo si cumple todo:
  1. Grupo compatible: los conductores de grupo `C` sirven para cualquier turno; los de `A` solo para GRUPO A y TODA; los de `B` solo para GRUPO B y TODA.
  2. Está activo.
  3. Tiene marcada la disponibilidad **exacta** de ese día y esa franja.
  4. Si es `solo_parque`, el turno debe ser en `PARQUE LAS VEGAS`.
  5. Si la modalidad del turno es `ZOOM` o el punto es `ZOOM`, debe tener `tiene_pc`.
- **RN-ASIG-04 (Back):** Si no hay candidatos, el turno queda sin asignar con la razón "No hay conductores disponibles". **No se relaja ninguna condición** (por ejemplo, un conductor del grupo equivocado nunca se usa como respaldo).
- **RN-ASIG-05 (Back):** Entre candidatos gana el de mayor **puntaje**:
  - −5000 si ya fue asignado en esa misma semana (casi siempre evita repetir).
  - −2 por cada turno acumulado en las últimas 4 semanas asignadas (RN-ASIG-06).
  - Última asignación: se mide desde el **inicio de la semana** de su última asignación hasta el inicio de la semana que se asigna: −200 si fue 7 días o menos (la semana anterior); +50 si fue hace más o nunca.
  - +200 si el turno es CARTAS o en Parque Las Vegas y el conductor tiene poca movilidad.
  - −200 si el turno es FISICO fuera de Parque Las Vegas y el conductor tiene poca movilidad.
  - +200 si el turno es en Parque Las Vegas y el conductor es `solo_parque`.
  - Cercanía: hasta +10 según la distancia (Haversine) entre su casa y el punto (10 − 0,5 por km, mínimo 0).
  - Escasez: hasta +100 a quien tiene pocos espacios de disponibilidad (100 − 3 por espacio, mínimo 0).
- **RN-ASIG-06 (Back):** El historial considerado para el puntaje son las **últimas 4 semanas con asignación anteriores a la semana que se asigna**, medidas por el `semana_inicio` de cada programa y no por la fecha en que se confirmó. Una semana sin asignaciones no cuenta como semana de historial. La semana que se asigna y las posteriores no cuentan. Las filas de historial de programas ya borrados se ignoran. (Reemplaza la ventana de 28 días desde hoy; ver ADR-024.)
- **RN-ASIG-07 (Back):** El puntaje es una heurística voraz: asigna turno por turno en el orden anterior, sin buscar el óptimo global. Cambiar el orden o los pesos cambia los resultados.

## Confirmar y guardar la asignación

- **RN-CONF-01 (Front):** Solo se guardan los turnos con conductor elegido; los que quedan en SIN ASIGNAR no se envían ni se modifican.
- **RN-CONF-02 (Front):** El usuario puede elegir a mano cualquier conductor para un turno SIN ASIGNAR; la lista no se filtra por disponibilidad.
- **RN-CONF-03 (Front):** Antes de guardar se avisa (sin bloquear) de los turnos con **Territorio vacío**. Solo cuentan los turnos con celda de texto libre vacía; las listas desplegables (como Punto de reunión) y las **filas extra** no cuentan.
- **RN-CONF-04 (Back):** Confirmar guarda `conductor_id` y `score` en el turno y hace upsert en `asignaciones_historial` por `(semana_id, conductor_id)` con `cantidad_turnos` = veces que el conductor aparece esa semana y `ultima_asignacion` = hoy. El algoritmo ya no usa `ultima_asignacion`: ubica cada semana por su `semana_inicio` (RN-ASIG-06).
- **RN-CONF-05 (Back):** Los `conductor_id` que no existan o no estén activos se ignoran sin error.
- **RN-CONF-06 (Front):** Guardar la asignación **siempre** exporta después a Google Sheets. Si la exportación falla, la asignación **sigue guardada** y se informa el error aparte.
- **RN-CONF-07 (Back):** "Limpiar" una semana deja `conductor_id` y `score` en null en todos sus turnos y borra su historial de asignaciones.
- **RN-CONF-08 (Front):** Los contadores "N turnos · ✓ M asignados" cuentan solo turnos (no filas extra).

## Exportación a Google Sheets

- **RN-SHEET-01 (Back):** El spreadsheet se toma de `config.spreadsheet_id`; si no existe, de la variable `SHEETS_SPREADSHEET_ID`. Si no hay ninguno, la exportación falla.
- **RN-SHEET-02 (Back):** Cada exportación crea una pestaña nueva `"<d mmm> - <d mmm> (n)"`, con `n` = siguiente número libre entre las pestañas con el mismo nombre base. **Nunca se sobrescribe ni se borra una pestaña existente.**
- **RN-SHEET-03 (Back):** Para exportar, los turnos con conductor muestran su nombre en mayúsculas; sin conductor, `SIN ASIGNAR`. Territorio y punto de reunión vacíos se muestran como `—`.
- **RN-SHEET-04 (Back):** Las filas extra se exportan con su texto tal cual (sin `—` ni `SIN ASIGNAR`) y se mezclan por día: las de `orden < 0` antes, las demás después.
- **RN-SHEET-05 (Back):** Cada día tiene su color base y, en algunos días, uno alterno para alternar filas regulares: Lunes naranja claro, Martes verde, Miércoles azul, Jueves amarillo, Viernes rosa, Sábado durazno (sin alterno), Domingo `#ffe599` (sin alterno).
- **RN-SHEET-06 (Back):** Las filas extra y las filas especiales **no avanzan el contador de alternancia** de colores.
- **RN-SHEET-07 (Back):** Una fila cuyas celdas contienen "REUNION" y tiene celdas vacías es "reunión especial": fondo azul oscuro (`#000080`), texto blanco Arial Black, centrado.
- **RN-SHEET-08 (Back):** El ancho de las columnas se calcula a partir del contenido (considera negrita y símbolos) en cada exportación. La fila de reunión especial **no** cuenta para el ancho.
- **RN-SHEET-09 (Back):** El formato por celda (alineación, negrita, cursiva, tachado) del editor se aplica al final y **gana** sobre el formato general.
- **RN-SHEET-10 (Back):** La respuesta incluye el enlace al Sheet y el enlace directo a la pestaña nueva (`#gid=`).

### Imagen PNG del programa (Front)

- **RN-IMG-01 (Front):** En Asignación, cada programa con asignaciones tiene un botón **PNG** que descarga la tabla del programa como imagen. No escribe nada en la base ni en Google Sheets, y es independiente de la exportación (RN-SHEET-*).
- **RN-IMG-02 (Front):** La imagen tiene el mismo contenido y orden que la hoja exportada: título `Semana del <d de mes> al <d de mes> del <año>`, encabezado `DÍA | HORA | GRUPO | TERRITORIO | PUNTO DE REUNIÓN | CONDUCTOR`, textos en mayúsculas, `—` para territorio o punto vacíos y `SIN ASIGNAR` sin conductor (RN-SHEET-03); por día, filas libres con `orden < 0`, turnos por franja y el resto de las libres (RN-SHEET-04).
- **RN-IMG-03 (Front):** Los colores son los de la hoja: base y alterno por día, alternancia solo entre filas regulares y filas de reunión especial en azul oscuro con texto blanco (RN-SHEET-05, 06 y 07). El formato por celda (alineación, negrita, cursiva, tachado) se aplica y gana (RN-SHEET-09).
- **RN-IMG-04 (Front):** El ancho de cada columna sale del texto más largo, sin contar las reuniones especiales (RN-SHEET-08). La imagen se genera al doble de resolución.
- **RN-IMG-05 (Front):** Las acciones de un programa asignado se ven así: `Ver | PNG | Limpiar | ⋯`, y el menú `⋯` ofrece **Exportar a Sheets** (que sigue mostrando su modal con los enlaces, RN-SHEET-10) e **Imprimir o guardar en PDF**. Esta última abre un modal con la vista previa y un botón Imprimir que abre el cuadro de impresión del navegador en una hoja **A4 horizontal** (desde ahí también se puede elegir "Guardar como PDF"). No genera ni guarda un archivo propio.
- **RN-IMG-06 (Front):** El botón **PNG** abre un modal con la vista previa de la imagen y dos acciones: **Descargar PNG** y **Compartir por WhatsApp**. Si el navegador puede compartir archivos (celular y algunos navegadores de PC), se abre su hoja para compartir con el PNG adjunto. Si no puede, se descarga el PNG y se abre WhatsApp Web con el título como texto, y el usuario adjunta la imagen ahí. Cerrar la hoja de compartir no muestra error. Nada se guarda en la base.

## Formato por celda

- **RN-FMT-01 (Back):** Por celda solo se admiten: `h` (left/center/right), `v` (top/middle/bottom) y `b`, `i`, `s` en verdadero. Todo lo demás se descarta al guardar.
- **RN-FMT-02 (Back):** Los campos con formato posible son `hora`, `grupo`, `territorio`, `punto_reunion` y `conductor`.
- **RN-FMT-03 (Front):** Por defecto: centrado horizontal y vertical al medio; solo se almacena lo que se aparta del defecto.
- **RN-FMT-04 (Front):** El formato se guarda al guardar el programa, no al aplicarlo.

## Datos y límites técnicos

- **RN-DATA-01 (Back):** El cuerpo de las peticiones admite hasta 10 MB.
- **RN-DATA-02 (Back):** Límite de 200 peticiones por minuto en `/api/`.
- **RN-DATA-03 (Back):** Los `id` de programa y de turno son UUID generados por la base.
- **RN-DATA-04 (Front):** Las fechas se leen como locales (`parseLocalDate`) para evitar el desfase de zona horaria al convertir `YYYY-MM-DD`.
- **RN-DATA-05 (Front):** Los nombres de día se guardan sin acento (`MIERCOLES`, `SABADO`) y se muestran con acento (`nombreDia`). No guardar nunca la versión con acento.

## Interfaz (comportamiento que no debe romperse)

- **RN-UI-01 (Front):** Los estilos de tabla de Programa y Asignación comparten clases (`table-programas`, `card-title-rich`, `menu-flotante`); cambiar una pestaña no debe romper la otra.
- **RN-UI-02 (Front):** Cada día se pinta con su color (`tr[data-dia]` con variables `--dia-*`); la fila seleccionada se enmarca con el color de su día.
- **RN-UI-03 (Front):** El menú ⋯ de cada fila y el de acciones del programa son **flotantes** (no empujan el contenido).
- **RN-UI-04 (Front):** Las listas de conductores respetan el texto sin negrita; la negrita roja solo aplica al texto seleccionado de SIN ASIGNAR.
- **RN-UI-05:** Retirada. Aplicaba a los `onclick` del front anterior; React no los usa.
- **RN-UI-06 (Front):** Mientras se guarda o exporta, una pantalla de carga bloquea toda la interfaz.
- **RN-UI-07 (Front):** Tras guardar o limpiar una asignación, la lista "Semana" vuelve a "Seleccionar semana..." (como en el front anterior).
- **RN-UI-08 (Front):** Hoja de Predicación es `/hoja`, con una pestaña por URL: `/hoja/programa`, `/hoja/asignacion`, `/hoja/plantilla`, `/hoja/conductores`, `/hoja/puntos`, `/hoja/historial` y `/hoja/configuracion` (solo super admin). `/hoja` lleva a `/hoja/programa`. Las rutas de antes (`/programa`, `/asignacion`, `/plantilla`, `/conductores`, `/puntos`, `/historial`) redirigen a su pestaña. `/admin` queda fuera de la hoja (menú lateral, solo super admin). `/`, `/dashboard.html` y rutas desconocidas llevan a `/hoja/programa` (o al login si no hay sesión). `/` también completa el regreso del login con Google.
- **RN-UI-11 (Front):** La barra de pestañas de la hoja marca la activa según la URL, así que F5 y Atrás la mantienen. Con las flechas izquierda y derecha, Inicio y Fin se cambia de pestaña; solo la activa entra con Tab. Las pestañas de super admin no aparecen para los demás.
- **RN-UI-09 (Front):** El editor de turnos tiene dos presentaciones con el mismo comportamiento y datos: chips por día en pantallas de 1321 px o más, y la tabla con vista por día y por semana por debajo. Un cambio de comportamiento del editor se hace en las dos.
- **RN-UI-10 (Front):** Las listas del editor (hora, grupo, punto de reunión, modalidad) no tienen una opción "inválida": si el valor guardado ya no existe en la lista (por ejemplo un punto desactivado) se muestra y se conserva al guardar.
