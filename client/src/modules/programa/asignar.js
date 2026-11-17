// @ts-check
// Botón "Asignar conductores" de Programas Guardados (RN-UI-16). Lógica pura, probada en asignar.test.js.

/**
 * @typedef {{ total_turnos: number, asignados: number }} EstadoPrograma
 * Estado del botón:
 * - 'sinTurnos': no cumple el requisito mínimo (al menos un turno); se ve gris y abre un aviso.
 * - 'asignar': lleva a Asignación y ejecuta el algoritmo.
 * - 'ver': ya tiene conductores; lleva a Asignación y muestra lo guardado.
 * - 'desconocido': no se pudo leer el estado; lleva a Asignación sin ejecutar nada.
 * @typedef {'sinTurnos' | 'asignar' | 'ver' | 'desconocido'} EstadoBotonAsignar
 */

/** @param {EstadoPrograma | undefined} estado @returns {EstadoBotonAsignar} */
export function estadoBotonAsignar(estado) {
    if (!estado) return 'desconocido';
    if (estado.total_turnos === 0) return 'sinTurnos';
    return estado.asignados > 0 ? 'ver' : 'asignar';
}

/**
 * Ruta de Asignación con la semana elegida; con `ejecutar=1` corre el algoritmo al llegar (solo previsualiza, RN-ASIG-01).
 * @param {string} id @param {EstadoBotonAsignar} estado
 */
export function rutaAsignacion(id, estado) {
    const params = new URLSearchParams({ semana: id });
    if (estado === 'asignar') params.set('ejecutar', '1');
    return `/hoja/asignacion?${params}`;
}
