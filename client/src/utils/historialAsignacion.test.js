import { describe, expect, it } from 'vitest';
// El historial del algoritmo vive en el backend (CommonJS); se prueba aquí porque el front es el único que corre pruebas (ADR-020)
import { SEMANAS_HISTORIAL, resumenHistorial } from '../../../utils/historialAsignacion.js';

/** Una fila de historial por (semana, conductor). */
const fila = (semana_id, conductor_id, cantidad_turnos) => ({ semana_id, conductor_id, cantidad_turnos });

const INICIOS = {
    s1: '2026-09-28',
    s2: '2026-10-05',
    s3: '2026-10-12',
    s4: '2026-10-19',
    s5: '2026-10-26',
    s6: '2026-11-02',
    s7: '2026-11-09'
};

describe('resumenHistorial (RN-ASIG-06)', () => {
    it('toma solo las últimas 4 semanas con asignación anteriores a la semana objetivo', () => {
        const filas = ['s1', 's2', 's3', 's4', 's5', 's6'].map((s) => fila(s, 'a', 1));
        const { histTotales } = resumenHistorial(filas, INICIOS, INICIOS.s7);
        expect(SEMANAS_HISTORIAL).toBe(4);
        expect(histTotales.a).toBe(4); // s3, s4, s5 y s6
    });

    it('suma los turnos de cada conductor dentro de la ventana', () => {
        const filas = [fila('s5', 'a', 3), fila('s6', 'a', 2), fila('s6', 'b', 4)];
        const { histTotales } = resumenHistorial(filas, INICIOS, INICIOS.s7);
        expect(histTotales).toEqual({ a: 5, b: 4 });
    });

    it('ignora la semana objetivo y las posteriores', () => {
        const filas = [fila('s6', 'a', 1), fila('s7', 'a', 5)];
        const { histTotales } = resumenHistorial(filas, INICIOS, INICIOS.s7);
        expect(histTotales.a).toBe(1);
    });

    it('cuenta semanas con asignación, no semanas del calendario: un hueco no deja salir a una semana vieja', () => {
        // Solo s1 y s2 tienen historial: las dos entran aunque estén lejos de la semana objetivo
        const filas = [fila('s1', 'a', 2), fila('s2', 'a', 3)];
        const { histTotales } = resumenHistorial(filas, INICIOS, INICIOS.s7);
        expect(histTotales.a).toBe(5);
    });

    it('la última asignación es el inicio de la semana más reciente del conductor, no la fecha de confirmación', () => {
        const filas = [fila('s4', 'a', 1), fila('s6', 'a', 1), fila('s5', 'b', 1)];
        const { ultimaAsignacion } = resumenHistorial(filas, INICIOS, INICIOS.s7);
        expect(ultimaAsignacion).toEqual({ a: '2026-11-02', b: '2026-10-26' });
    });

    it('ignora filas cuyo programa ya no existe', () => {
        const filas = [fila('borrado', 'a', 9), fila('s6', 'a', 1)];
        const { histTotales } = resumenHistorial(filas, INICIOS, INICIOS.s7);
        expect(histTotales.a).toBe(1);
    });

    it('sin historial devuelve resultados vacíos', () => {
        expect(resumenHistorial([], INICIOS, INICIOS.s7)).toEqual({ histTotales: {}, ultimaAsignacion: {} });
        expect(resumenHistorial(null, INICIOS, INICIOS.s7)).toEqual({ histTotales: {}, ultimaAsignacion: {} });
    });
});
