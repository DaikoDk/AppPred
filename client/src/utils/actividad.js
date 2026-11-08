// @ts-check
// Cuenta el trabajo en curso (peticiones a la API y pantallas que cargan) para mostrar un indicador de carga que no
// bloquea la pantalla. A diferencia de useCargando (ADR-016), que tapa la interfaz mientras se guarda o exporta.

let pendientes = 0;
/** @type {Set<() => void>} */
const oyentes = new Set();

const avisar = () => oyentes.forEach((f) => f());

/** Empieza un trabajo. Cada llamada debe tener su terminarActividad. */
export function iniciarActividad() {
    pendientes += 1;
    avisar();
}

/** Termina un trabajo; nunca baja de cero. */
export function terminarActividad() {
    pendientes = Math.max(0, pendientes - 1);
    avisar();
}

/** @returns {number} */
export function actividadPendiente() {
    return pendientes;
}

/**
 * @param {() => void} oyente se llama cada vez que cambia la cantidad de trabajos en curso
 * @returns {() => void} función para dejar de escuchar
 */
export function suscribirActividad(oyente) {
    oyentes.add(oyente);
    return () => {
        oyentes.delete(oyente);
    };
}

/** Solo para pruebas. */
export function reiniciarActividad() {
    pendientes = 0;
    avisar();
}
