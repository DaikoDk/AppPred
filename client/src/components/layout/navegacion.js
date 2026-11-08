// @ts-check
// Navegación de la app. El menú lateral tiene las áreas grandes; las pestañas de Hoja de Predicación son sus secciones.
import {
    CalendarCheck,
    ChartBar,
    ClipboardText,
    GearSix,
    MapPin,
    NotePencil,
    ShieldCheck,
    Users
} from '@phosphor-icons/react';

/** @typedef {{ ruta: string, titulo: string, tooltip: string, icono: import('@phosphor-icons/react').Icon, soloSuperAdmin?: boolean }} ItemMenu */
/**
 * @typedef {{
 *   ruta: string,
 *   titulo: string,
 *   corto: string,
 *   icono: import('@phosphor-icons/react').Icon,
 *   soloSuperAdmin?: boolean,
 *   enBarra: boolean
 * }} ItemPestana
 */

/** Menú lateral (iconos Phosphor, ADR-021). Admin queda aparte: es para pocos usuarios (ADR-022). */
/** @type {ItemMenu[]} */
export const ITEMS_NAV = [
    { ruta: '/hoja', titulo: 'Hoja de Predicación', tooltip: 'Hoja Predicación', icono: ClipboardText },
    { ruta: '/admin', titulo: 'Admin', tooltip: 'Admin', icono: ShieldCheck, soloSuperAdmin: true }
];

/**
 * Pestañas dentro de Hoja de Predicación, en el orden de la barra (iconos Phosphor, ADR-021).
 * `corto` es el texto de la barra inferior del móvil; `enBarra` dice cuáles van en la barra y cuáles en "Más".
 * @type {ItemPestana[]}
 */
export const PESTANAS_HOJA = [
    { ruta: '/hoja/programa', titulo: 'Programa', corto: 'Programa', icono: NotePencil, enBarra: true },
    { ruta: '/hoja/asignacion', titulo: 'Asignación', corto: 'Asignación', icono: CalendarCheck, enBarra: true },
    { ruta: '/hoja/plantilla', titulo: 'Plantilla', corto: 'Plantilla', icono: ClipboardText, enBarra: false },
    { ruta: '/hoja/conductores', titulo: 'Conductores', corto: 'Conductores', icono: Users, enBarra: true },
    { ruta: '/hoja/puntos', titulo: 'Puntos de Reunión', corto: 'Puntos', icono: MapPin, enBarra: true },
    { ruta: '/hoja/historial', titulo: 'Historial', corto: 'Historial', icono: ChartBar, enBarra: false },
    {
        ruta: '/hoja/configuracion',
        titulo: 'Configuración',
        corto: 'Config.',
        icono: GearSix,
        soloSuperAdmin: true,
        enBarra: false
    }
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
