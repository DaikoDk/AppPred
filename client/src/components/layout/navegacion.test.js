import { describe, expect, it } from 'vitest';
import { ITEMS_NAV, PESTANAS_HOJA, RUTAS_ANTIGUAS, RUTA_INICIO, tituloDeRuta } from './navegacion.js';

describe('rutas antiguas', () => {
    it('cada ruta vieja lleva a una pestaña que existe en Hoja de Predicación', () => {
        const rutasPestanas = PESTANAS_HOJA.map((p) => p.ruta);
        for (const destino of Object.values(RUTAS_ANTIGUAS)) {
            expect(rutasPestanas).toContain(destino);
        }
    });

    it('las seis pestañas que vienen de las rutas viejas se conservan con su mismo nombre de sección', () => {
        const viejas = Object.keys(RUTAS_ANTIGUAS).map((r) => r.slice(1));
        expect(viejas.sort()).toEqual(['asignacion', 'conductores', 'historial', 'plantilla', 'programa', 'puntos']);
    });

    it('la ruta de inicio es una pestaña existente', () => {
        expect(PESTANAS_HOJA.map((p) => p.ruta)).toContain(RUTA_INICIO);
    });
});

describe('menú lateral', () => {
    it('tiene Hoja de Predicación y Admin, y Admin es solo de super admins (RN-AUTH-08)', () => {
        expect(ITEMS_NAV.map((i) => i.titulo)).toEqual(['Hoja de Predicación', 'Admin']);
        expect(ITEMS_NAV.find((i) => i.titulo === 'Admin')?.soloSuperAdmin).toBe(true);
    });

    it('Configuración es una pestaña solo de super admins (RN-AUTH-04)', () => {
        const configuracion = PESTANAS_HOJA.find((p) => p.titulo === 'Configuración');
        expect(configuracion?.soloSuperAdmin).toBe(true);
    });

    it('el título de cualquier pestaña de Hoja es Hoja de Predicación', () => {
        expect(tituloDeRuta('/hoja/asignacion')).toBe('Hoja de Predicación');
        expect(tituloDeRuta('/admin')).toBe('Admin');
    });
});
