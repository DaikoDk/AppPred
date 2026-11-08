// @ts-check
/** @typedef {import('../../types/models').GrupoConductor} GrupoConductor */

/** @type {{ valor: GrupoConductor, texto: string }[]} */
export const OPCIONES_GRUPO = [
    { valor: 'A', texto: 'Grupo A' },
    { valor: 'B', texto: 'Grupo B' },
    { valor: 'C', texto: 'Grupo C (Comodín)' }
];

/** Colores de la insignia del grupo (tokens del sistema, ADR-021). @param {GrupoConductor} grupo */
export function claseBadgeGrupo(grupo) {
    if (grupo === 'A') return 'bg-info-bg text-info';
    if (grupo === 'C') return 'bg-fill text-ink';
    return 'bg-warn-bg text-warn';
}
