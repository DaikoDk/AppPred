// @ts-check
// Formato por celda (RN-FMT-*): campos, valores por defecto y limpieza. Lo usan Programa y Asignación.

/**
 * @typedef {import('../types/models').Formato} Formato
 * @typedef {import('../types/models').FormatoCelda} FormatoCelda
 * @typedef {import('../types/models').CampoFormato} CampoFormato
 */

/** @type {{ campo: CampoFormato, etiqueta: string, icono: string }[]} */
export const CAMPOS_FORMATO = [
    { campo: 'hora', etiqueta: 'Hora', icono: 'fa-regular fa-clock' },
    { campo: 'grupo', etiqueta: 'Grupo', icono: 'fa-solid fa-users' },
    { campo: 'territorio', etiqueta: 'Territorio', icono: 'fa-solid fa-map-location-dot' },
    { campo: 'punto_reunion', etiqueta: 'P. Reunión', icono: 'fa-solid fa-location-dot' },
    { campo: 'conductor', etiqueta: 'Conductor', icono: 'fa-solid fa-user-check' }
];

/** Igual que la exportación a Sheets (RN-FMT-03). */
export const FORMATO_DEFECTO = /** @type {const} */ ({ h: 'center', v: 'middle' });

/** Quita lo que coincide con el defecto para no guardar ruido (limpiarFormato del front). @param {Formato} formato */
export function limpiarFormato(formato) {
    /** @type {Formato} */
    const limpio = {};
    for (const [campo, f] of Object.entries(formato || {})) {
        if (!f) continue;
        /** @type {FormatoCelda} */
        const c = {};
        if (f.h && f.h !== FORMATO_DEFECTO.h) c.h = f.h;
        if (f.v && f.v !== FORMATO_DEFECTO.v) c.v = f.v;
        if (f.b) c.b = true;
        if (f.i) c.i = true;
        if (f.s) c.s = true;
        if (Object.keys(c).length) limpio[/** @type {CampoFormato} */ (campo)] = c;
    }
    return limpio;
}
