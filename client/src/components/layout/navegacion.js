// @ts-check
// Pestañas de la app. El orden y los iconos son los del sidebar actual (public/dashboard.html).

/** @typedef {{ ruta: string, titulo: string, tooltip: string, icono: string, soloSuperAdmin?: boolean }} ItemNav */

/** @type {ItemNav[]} */
export const ITEMS_NAV = [
    { ruta: '/programa', titulo: 'Programa', tooltip: 'Programa', icono: 'fa-calendar-alt' },
    { ruta: '/asignacion', titulo: 'Asignación', tooltip: 'Asignación', icono: 'fa-calendar-check' },
    { ruta: '/plantilla', titulo: 'Plantilla', tooltip: 'Plantilla', icono: 'fa-pencil-alt' },
    { ruta: '/conductores', titulo: 'Conductores', tooltip: 'Conductores', icono: 'fa-users' },
    { ruta: '/puntos', titulo: 'Puntos de Reunión', tooltip: 'Puntos Reunión', icono: 'fa-map-pin' },
    { ruta: '/historial', titulo: 'Historial', tooltip: 'Historial', icono: 'fa-chart-bar' },
    { ruta: '/admin', titulo: 'Admin', tooltip: 'Admin', icono: 'fa-shield-alt', soloSuperAdmin: true }
];

/** @param {string} ruta */
export function tituloDeRuta(ruta) {
    return ITEMS_NAV.find((i) => ruta.startsWith(i.ruta))?.titulo ?? '';
}
