import { describe, expect, it } from 'vitest';
import { aISO, fechaDelDia, finDeSemana, formatDate, parseLocalDate } from './fechas.js';
import { mensajeError } from './errores.js';
import { nombreDia } from './dias.js';
import { diaDeExtra, diaDeTurno, normalizarExtras } from './reglasDia.js';
import { extraerSpreadsheetId } from '../modules/configuracion/api.js';

describe('fechas (RN-DATA-04, RN-PLAN-07)', () => {
    it('lee "YYYY-MM-DD" como fecha local, sin desfase de zona horaria', () => {
        const d = parseLocalDate('2026-11-09');
        expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 9]);
        expect(parseLocalDate('')).toBeNull();
    });

    it('fin de semana = inicio + 6 días, también al cambiar de mes', () => {
        expect(finDeSemana('2026-11-09')).toBe('2026-11-15');
        expect(finDeSemana('2026-11-30')).toBe('2026-12-06');
        expect(aISO(new Date(2026, 0, 5))).toBe('2026-01-05');
    });

    it('formatea como la app anterior', () => {
        expect(formatDate('2026-11-09')).toBe('9 nov.');
        expect(fechaDelDia('2026-11-09', 'DOMINGO')).toBe('15 nov.');
        expect(fechaDelDia('', 'LUNES')).toBe('');
    });
});

describe('días (RN-DATA-05)', () => {
    it('se muestran con acento', () => {
        expect(nombreDia('MIERCOLES')).toBe('Miércoles');
        expect(nombreDia('SABADO')).toBe('Sábado');
    });
});

describe('reglas de día (RN-PLAN-04/05)', () => {
    it('diaDeTurno y diaDeExtra', () => {
        expect(diaDeTurno({ dia: 'LUNES', hora: 'Domingo (10:20 AM)' })).toBe('DOMINGO');
        expect(diaDeTurno({ dia: 'LUNES', hora: 'Tarde (6:20 PM)' })).toBe('LUNES');
        expect(diaDeExtra({ dia: 'SABADO', punto_reunion: 'Reunión de FIN DE SEMANA' })).toBe('DOMINGO');
    });

    it('normalizarExtras mueve la reunión al domingo con orden -1 y no toca el resto', () => {
        const otra = { dia: 'MARTES', orden: 0 };
        expect(normalizarExtras([{ dia: 'SABADO', punto_reunion: 'FIN DE SEMANA', orden: 0 }, otra])).toEqual([
            { dia: 'DOMINGO', punto_reunion: 'FIN DE SEMANA', orden: -1 },
            otra
        ]);
        expect(normalizarExtras(null)).toEqual([]);
    });
});

describe('otros', () => {
    it('mensajeError con error desconocido', () => {
        expect(mensajeError(new Error('falló'), 'x')).toBe('falló');
        expect(mensajeError('texto', 'por defecto')).toBe('por defecto');
    });

    it('acepta la URL completa del Sheet o solo el ID', () => {
        expect(extraerSpreadsheetId('https://docs.google.com/spreadsheets/d/abc_DEF-123/edit#gid=0')).toBe(
            'abc_DEF-123'
        );
        expect(extraerSpreadsheetId('abc123')).toBe('abc123');
    });
});
