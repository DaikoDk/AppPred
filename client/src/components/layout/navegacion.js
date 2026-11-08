// @ts-check
// Navegación de la app. El menú lateral tiene las áreas grandes; las pestañas de Hoja de Predicación son sus secciones.
import { CalendarCheck, ChartBar, ClipboardText, GearSix, MapPin, NotePencil, Users } from '@phosphor-icons/react';

/** @typedef {{ ruta: string, titulo: string, tooltip: string, icono: string, soloSuperAdmin?: boolean }} ItemMenu */
/** @typedef {{ ruta: string, titulo: string, icono: import('@phosphor-icons/react').Icon, soloSuperAdmin?: boolean }} ItemPestana */

/** Menú lateral (iconos de Font Awesome, como hasta ahora). Admin queda aparte: es para pocos usuarios (ADR-022). */
/** @type {ItemMenu[]} */
export const ITEMS_NAV = [
    { ruta: '/hoja', titulo: 'Hoja de Predicación', tooltip: 'Hoja Predicación', icono: 'fa-clipboard-list' },
    { ruta: '/admin', titulo: 'Admin', tooltip: 'Admin', icono: 'fa-shield-alt', soloSuperAdmin: true }
];

/** Pestañas dentro de Hoja de Predicación, en el orden de la barra (iconos Phosphor, ADR-021). */
/** @type {ItemPestana[]} */
export const PESTANAS_HOJA = [
    { ruta: '/hoja/programa', titulo: 'Programa', icono: NotePencil },
    { ruta: '/hoja/asignacion', titulo: 'Asignación', icono: CalendarCheck },
    { ruta: '/hoja/plantilla', titulo: 'Plantilla', icono: ClipboardText },
    { ruta: '/hoja/conductores', titulo: 'Conductores', icono: Users },
    { ruta: '/hoja/puntos', titulo: 'Puntos de Reunión', icono: MapPin },
    { ruta: '/hoja/historial', titulo: 'Historial', icono: ChartBar },
    { ruta: '/hoja/configuracion', titulo: 'Configuración', icono: GearSix, soloSuperAdmin: true }
];

/** Rutas de antes de Hoja de Predicación. Se redirigen para no romper favoritos ni enlaces guardados. */
/** @type {Record<string, string>} */
export const RUTAS_ANTIGUAS = {
    '/programa': '/hoja/programa',
    '/asignacion': '/hoja/asignacion',
    '/plantilla': '/hoja/plantilla',
    '/conductores': '/hoja/conductores',
    '/puntos': '/hoja/puntos',
    '/historial': '/hoja/historial'
};

/** Pestaña de entrada: raíz, /hoja y rutas desconocidas van aquí. */
export const RUTA_INICIO = '/hoja/programa';

/** @param {string} ruta */
export function tituloDeRuta(ruta) {
    return ITEMS_NAV.find((i) => ruta.startsWith(i.ruta))?.titulo ?? '';
}
