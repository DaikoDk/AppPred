import { describe, expect, it } from 'vitest';
import { anchoTexto, calcularAnchosColumnas, esFilaReunionEspecial, filasDeDatos } from './medidasSheets.js';

describe('medidas de la hoja de Sheets (RN-IMG-04)', () => {
    it('anchoTexto: angostos, mayúsculas y dígitos; la negrita ensancha 1,3 veces', () => {
        expect(anchoTexto('', false)).toBe(0);
        expect(anchoTexto('I', false)).toBe(5);
        expect(anchoTexto('A B', false)).toBe(9.5 + 4 + 9.5);
        expect(anchoTexto('M', false)).toBe(12.5);
        expect(anchoTexto('12', false)).toBe(5 + 7.5); // el 1 cuenta como angosto
        expect(anchoTexto('AB', true)).toBeCloseTo(19 * 1.3);
    });

    it('reconoce la fila de reunión especial: dice REUNION y tiene celdas vacías', () => {
        expect(esFilaReunionEspecial(['', '8:30AM', '', 'REUNION DE', 'FIN DE SEMANA', ''])).toBe(true);
        expect(esFilaReunionEspecial(['', '8:30AM', 'G', 'REUNIÓN', 'P', 'ANA'])).toBe(false);
        expect(esFilaReunionEspecial(['', '6:30 AM', 'G', 'T', 'P', ''])).toBe(false);
    });

    it('sin contenido, cada columna mide su mínimo', () => {
        const titulo = ['Semana', '', '', '', '', ''];
        const encabezado = ['A', 'B', 'C', 'D', 'E', 'F'];
        expect(calcularAnchosColumnas([titulo, encabezado])).toEqual([95, 75, 120, 120, 120, 140]);
    });

    it('el título no cuenta; el texto largo ensancha la columna y la reunión especial cuenta en negrita', () => {
        const titulo = ['T'.repeat(200), '', '', '', '', ''];
        const encabezado = ['A', 'B', 'C', 'D', 'E', 'F'];
        const reunion = ['', '8:30AM', '', 'REUNION DE', 'FIN DE SEMANA', ''];
        // "REUNION DE" = 85 px; en negrita 110,5 + 24 de relleno = 134,5, que sube a 135
        expect(calcularAnchosColumnas([titulo, encabezado, reunion])[3]).toBe(135);
        const largo = ['', '', '', 'X'.repeat(80), '', ''];
        expect(calcularAnchosColumnas([titulo, encabezado, largo])[3]).toBe(520); // tope
    });

    it('filasDeDatos arma título, encabezado y el día en la primera fila de cada bloque', () => {
        const filas = filasDeDatos({
            titulo: 'Semana del 9 al 15',
            encabezados: ['DÍA', 'HORA', 'GRUPO', 'TERRITORIO', 'PUNTO DE REUNIÓN', 'CONDUCTOR'],
            filas: [
                {
                    dia: 'LUNES',
                    tipo: 'regular',
                    fondo: '#fff',
                    celdas: ['6:30 AM', 'G', 'T', 'P', 'ANA'].map((texto) => ({ texto, formato: null }))
                },
                {
                    dia: 'LUNES',
                    tipo: 'regular',
                    fondo: '#fff',
                    celdas: ['6:20 PM', 'G', 'T', 'P', 'LUIS'].map((texto) => ({ texto, formato: null }))
                }
            ],
            bloques: [{ dia: 'LUNES', nombre: 'LUNES', numero: 9, desde: 0, hasta: 2, fondo: '#fff' }]
        });
        expect(filas[0][0]).toBe('Semana del 9 al 15');
        expect(filas[2]).toEqual(['LUNES\n9', '6:30 AM', 'G', 'T', 'P', 'ANA']);
        expect(filas[3][0]).toBe('');
    });
});
