import { describe, expect, it } from 'vitest';
import { abreTeclado } from './teclado.js';

describe('abreTeclado (RN-UI-12)', () => {
    it('los campos de texto abren el teclado', () => {
        expect(abreTeclado({ tagName: 'INPUT', type: 'text' })).toBe(true);
        expect(abreTeclado({ tagName: 'INPUT', type: 'search' })).toBe(true);
        expect(abreTeclado({ tagName: 'TEXTAREA' })).toBe(true);
        expect(abreTeclado({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    });

    it('un input sin tipo cuenta como texto', () => {
        expect(abreTeclado({ tagName: 'INPUT' })).toBe(true);
    });

    it('botones, casillas y campos de solo lectura o deshabilitados no lo abren', () => {
        expect(abreTeclado({ tagName: 'BUTTON' })).toBe(false);
        expect(abreTeclado({ tagName: 'INPUT', type: 'checkbox' })).toBe(false);
        expect(abreTeclado({ tagName: 'INPUT', type: 'text', readOnly: true })).toBe(false);
        expect(abreTeclado({ tagName: 'INPUT', type: 'text', disabled: true })).toBe(false);
        expect(abreTeclado(null)).toBe(false);
    });
});
