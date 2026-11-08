// @ts-check
/** @typedef {import('../types/models').Dia} Dia */

/** @type {Dia[]} */
export const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];

// RN-DATA-05: el valor guardado va sin acento; solo se muestra con acento.
/** @type {Record<Dia, string>} */
const NOMBRES = {
    LUNES: 'Lunes',
    MARTES: 'Martes',
    MIERCOLES: 'Miércoles',
    JUEVES: 'Jueves',
    VIERNES: 'Viernes',
    SABADO: 'Sábado',
    DOMINGO: 'Domingo'
};

/** @param {Dia} dia */
export function nombreDia(dia) {
    return NOMBRES[dia] ?? dia;
}
