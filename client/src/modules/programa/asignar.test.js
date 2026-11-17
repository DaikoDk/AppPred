import { describe, expect, it } from 'vitest';
import { estadoBotonAsignar, rutaAsignacion } from './asignar.js';

describe('estadoBotonAsignar (RN-UI-16)', () => {
    it('sin turnos no cumple el requisito mínimo', () => {
        expect(estadoBotonAsignar({ total_turnos: 0, asignados: 0 })).toBe('sinTurnos');
    });

    it('con turnos y sin conductores, asigna', () => {
        expect(estadoBotonAsignar({ total_turnos: 12, asignados: 0 })).toBe('asignar');
    });

    it('con algún conductor guardado, muestra la asignación', () => {
        expect(estadoBotonAsignar({ total_turnos: 12, asignados: 1 })).toBe('ver');
        expect(estadoBotonAsignar({ total_turnos: 12, asignados: 12 })).toBe('ver');
    });

    it('sin estado, no se decide nada', () => {
        expect(estadoBotonAsignar(undefined)).toBe('desconocido');
    });
});

describe('rutaAsignacion', () => {
    it('solo ejecuta el algoritmo al asignar', () => {
        expect(rutaAsignacion('abc', 'asignar')).toBe('/hoja/asignacion?semana=abc&ejecutar=1');
        expect(rutaAsignacion('abc', 'ver')).toBe('/hoja/asignacion?semana=abc');
        expect(rutaAsignacion('abc', 'desconocido')).toBe('/hoja/asignacion?semana=abc');
    });

    it('escapa el id', () => {
        expect(rutaAsignacion('a b&c', 'ver')).toBe('/hoja/asignacion?semana=a+b%26c');
    });
});
