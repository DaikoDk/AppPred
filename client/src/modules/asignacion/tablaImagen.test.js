import { describe, expect, it } from 'vitest';
import { COLORES, construirTabla, horaSimple, tituloSemana } from './tablaImagen.js';

const turno = (extra) => ({
    id: Math.random().toString(36).slice(2),
    dia: 'LUNES',
    hora: 'Madrugada (6:30 AM)',
    grupo: 'TODA LA CONGREGACION',
    territorio: 'PARADEROS',
    punto_reunion: 'ZOOM',
    conductor_id: 'c1',
    conductores: { nombre: 'Ángel López' },
    ...extra
});

const tabla = (turnos, extras = []) =>
    construirTabla({ turnos, extras, semanaInicio: '2026-11-09', semanaFin: '2026-11-15' });

describe('título y horas', () => {
    it('arma el título como el de la hoja', () => {
        expect(tituloSemana('2026-11-09', '2026-11-15')).toBe('Semana del 9 de noviembre al 15 de noviembre del 2026');
    });

    it('deja solo la hora de la franja', () => {
        expect(horaSimple('Madrugada (6:30 AM)')).toBe('6:30 AM');
        expect(horaSimple('Domingo (10:20 AM)')).toBe('10:20 AM');
        expect(horaSimple('')).toBe('');
    });
});

describe('textos de las filas (RN-SHEET-03)', () => {
    it('muestra el conductor en mayúsculas y SIN ASIGNAR si no tiene', () => {
        const t = tabla([turno({}), turno({ hora: 'Mañana (8:20 AM)', conductor_id: null, conductores: null })]);
        expect(t.filas[0].celdas[4].texto).toBe('ÁNGEL LÓPEZ');
        expect(t.filas[1].celdas[4].texto).toBe('SIN ASIGNAR');
    });

    it('territorio y punto vacíos se muestran como —', () => {
        const t = tabla([turno({ territorio: null, punto_reunion: '' })]);
        expect(t.filas[0].celdas[2].texto).toBe('—');
        expect(t.filas[0].celdas[3].texto).toBe('—');
    });
});

describe('orden y bloques por día (RN-SHEET-04)', () => {
    it('pone las filas libres antes (orden < 0) y después de los turnos, y ordena los turnos por franja', () => {
        const t = tabla(
            [turno({ hora: 'Tarde (6:20 PM)' }), turno({ hora: 'Madrugada (6:30 AM)' })],
            [
                {
                    dia: 'LUNES',
                    hora: '7:30PM',
                    grupo: '',
                    territorio: 'REUNION DE',
                    punto_reunion: 'ENTRE SEMANA',
                    conductor: '',
                    orden: 0
                },
                {
                    dia: 'LUNES',
                    hora: '',
                    grupo: '',
                    territorio: 'ANTES',
                    punto_reunion: 'X',
                    conductor: 'Y',
                    orden: -1
                }
            ]
        );
        expect(t.filas.map((f) => f.celdas[0].texto)).toEqual(['', '6:30 AM', '6:20 PM', '7:30PM']);
        expect(t.bloques).toHaveLength(1);
        expect(t.bloques[0]).toMatchObject({ dia: 'LUNES', nombre: 'LUNES', numero: 9, desde: 0, hasta: 4 });
    });

    it('numera cada día a partir del inicio de la semana y salta los días sin filas', () => {
        const t = tabla([turno({ dia: 'LUNES' }), turno({ dia: 'MIERCOLES' })]);
        expect(t.bloques.map((b) => [b.nombre, b.numero])).toEqual([
            ['LUNES', 9],
            ['MIÉRCOLES', 11]
        ]);
    });
});

describe('colores (RN-SHEET-05, 06 y 07)', () => {
    it('alterna el color solo entre filas regulares', () => {
        const t = tabla(
            [
                turno({ hora: 'Madrugada (6:30 AM)' }),
                turno({ hora: 'Mañana (8:20 AM)' }),
                turno({ hora: 'Tarde (6:20 PM)' })
            ],
            [{ dia: 'LUNES', hora: '', grupo: '', territorio: 'X', punto_reunion: '', conductor: '', orden: 0 }]
        );
        const { base, alterno } = COLORES.dias.LUNES;
        expect(t.filas.map((f) => f.fondo)).toEqual([base, alterno, base, base]);
        expect(t.filas[3].tipo).toBe('extra');
    });

    it('los días sin color alterno usan siempre el base', () => {
        const t = tabla([turno({ dia: 'SABADO' }), turno({ dia: 'SABADO', hora: 'Mañana (8:20 AM)' })]);
        expect(t.filas.map((f) => f.fondo)).toEqual([COLORES.dias.SABADO.base, COLORES.dias.SABADO.base]);
    });

    it('una fila con REUNION y celdas vacías es reunión especial en azul oscuro y no avanza la alternancia', () => {
        const t = tabla(
            [turno({ hora: 'Madrugada (6:30 AM)' }), turno({ hora: 'Mañana (8:20 AM)' })],
            [
                {
                    dia: 'LUNES',
                    hora: '7:30PM',
                    grupo: '',
                    territorio: 'REUNIÓN DE',
                    punto_reunion: 'ENTRE SEMANA',
                    conductor: '',
                    orden: -1
                }
            ]
        );
        expect(t.filas[0]).toMatchObject({ tipo: 'reunion', fondo: COLORES.reunion });
        // la primera regular sigue siendo la 0 de la alternancia (color base) aunque haya una reunión antes
        expect(t.filas[1].fondo).toBe(COLORES.dias.LUNES.base);
        expect(t.filas[2].fondo).toBe(COLORES.dias.LUNES.alterno);
    });
});

describe('formato por celda (RN-SHEET-09)', () => {
    it('pasa el formato de cada campo a su celda', () => {
        const t = tabla([turno({ formato: { conductor: { b: true, h: 'left' } } })]);
        expect(t.filas[0].celdas[4].formato).toEqual({ b: true, h: 'left' });
        expect(t.filas[0].celdas[0].formato).toBeNull();
    });
});
