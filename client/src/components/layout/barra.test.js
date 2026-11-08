import { describe, expect, it } from 'vitest';
import { PESTANAS_HOJA } from './navegacion.js';

describe('barra inferior del móvil', () => {
    it('muestra cuatro secciones; el resto va en "Más"', () => {
        const barra = PESTANAS_HOJA.filter((p) => p.enBarra).map((p) => p.titulo);
        expect(barra).toEqual(['Programa', 'Asignación', 'Conductores', 'Puntos de Reunión']);
    });

    it('cada sección tiene un texto corto para la barra', () => {
        for (const p of PESTANAS_HOJA) expect(p.corto.length).toBeGreaterThan(0);
    });
});
