// @ts-check
/** @typedef {import('../../types/models').GrupoConductor} GrupoConductor */

/** @type {{ valor: GrupoConductor, texto: string }[]} */
export const OPCIONES_GRUPO = [
    { valor: 'A', texto: 'Grupo A' },
    { valor: 'B', texto: 'Grupo B' },
    { valor: 'C', texto: 'Grupo C (Comodín)' }
];

/** Color del badge del grupo, como en la lista actual. @param {GrupoConductor} grupo */
export function claseBadgeGrupo(grupo) {
    if (grupo === 'A') return 'badge-info';
    if (grupo === 'C') return 'badge-purple';
    return 'badge-warning';
}
