import { describe, expect, it } from 'vitest';
import {
    contadores,
    contarAsignaciones,
    cuerpoConfirmar,
    eleccionInicial,
    filasDeResultados,
    opcionConductor,
    resultadosGuardados,
    turnosSinTerritorio
} from './logica.js';

const turno = (id, dia, hora, extra = {}) => ({
    turno_id: id,
    dia,
    hora,
    grupo: 'GRUPO A',
    territorio: 'T',
    punto_reunion: 'P',
    asignado: false,
    conductor_asignado: null,
    ...extra
});

describe('resultadosGuardados', () => {
    it('arma el resumen y los resultados desde lo guardado', () => {
        const d = resultadosGuardados([
            {
                id: 't1',
                dia: 'LUNES',
                hora: 'h',
                grupo: 'g',
                territorio: null,
                punto_reunion: null,
                conductor_id: 'c1',
                conductores: { id: 'c1', nombre: 'Ana', grupo: 'A' }
            },
            {
                id: 't2',
                dia: 'LUNES',
                hora: 'h',
                grupo: 'g',
                territorio: null,
                punto_reunion: null,
                conductor_id: 'c1',
                conductores: { id: 'c1', nombre: 'Ana', grupo: 'A' }
            },
            { id: 't3', dia: 'LUNES', hora: 'h', grupo: 'g', territorio: null, punto_reunion: null, conductor_id: null }
        ]);
        expect(d.resumen).toEqual({ total_turnos: 3, asignados: 2, sin_asignar: 1, conductores_utilizados: 1 });
        expect(d.resultados[2]).toMatchObject({ turno_id: 't3', asignado: false, conductor_asignado: null });
    });
});

describe('filasDeResultados', () => {
    it('ordena por día y franja y ubica las filas libres antes o después', () => {
        const filas = filasDeResultados(
            [
                turno('a', 'MARTES', 'Tarde (6:20 PM)'),
                turno('b', 'MARTES', 'Madrugada (6:30 AM)'),
                turno('c', 'LUNES', 'Mañana (8:20 AM)')
            ],
            [
                { dia: 'MARTES', hora: 'X', orden: 0 },
                { dia: 'MARTES', hora: 'Y', orden: -1 }
            ]
        );
        expect(filas.map((f) => (f.tipo === 'turno' ? f.resultado.turno_id : `libre ${f.extra.hora}`))).toEqual([
            'c',
            'libre Y',
            'b',
            'a',
            'libre X'
        ]);
    });
});

describe('lista de conductores', () => {
    const r = turno('t', 'LUNES', 'Mañana (8:20 AM)');
    const disp = new Set(['c2|LUNES|Mañana (8:20 AM)']);
    const cuenta = contarAsignaciones([turno('x', 'LUNES', 'h', { conductor_asignado: { id: 'c1', nombre: 'Ana' } })]);

    it('muestra (n) si ya tiene turnos, (-99) si no está disponible', () => {
        expect(opcionConductor({ id: 'c1', nombre: 'Ana' }, r, cuenta, disp)).toEqual({
            valor: 'c1|Ana',
            texto: 'Ana (1)',
            noDisponible: false
        });
        expect(opcionConductor({ id: 'c2', nombre: 'Beto' }, r, cuenta, disp)).toEqual({
            valor: 'c2|Beto',
            texto: 'Beto',
            noDisponible: false
        });
        expect(opcionConductor({ id: 'c3', nombre: 'Caro' }, r, cuenta, disp)).toEqual({
            valor: 'c3|Caro',
            texto: 'Caro (-99)',
            noDisponible: true
        });
    });

    it('la elección inicial usa el nombre de la lista y "" si no hay conductor', () => {
        expect(
            eleccionInicial(turno('t', 'LUNES', 'h', { conductor_asignado: { id: 'c1', nombre: 'viejo' } }), [
                { id: 'c1', nombre: 'Ana' }
            ])
        ).toBe('c1|Ana');
        expect(eleccionInicial(r, [])).toBe('');
    });
});

describe('contadores y cuerpo de confirmación (RN-CONF-01, RN-CONF-04)', () => {
    it('cuenta asignados, sin asignar y conductores distintos', () => {
        expect(contadores(['c1|Ana', '', 'c1|Ana', 'c2|Beto'])).toEqual({
            asignados: 3,
            sin_asignar: 1,
            conductores: 2
        });
    });

    it('omite los SIN ASIGNAR y suma los turnos de cada conductor en la semana', () => {
        expect(
            cuerpoConfirmar([
                { turnoId: 't1', valor: 'c1|Ana' },
                { turnoId: 't2', valor: '' },
                { turnoId: 't3', valor: 'c1|Ana' },
                { turnoId: 't4', valor: 'c2|Beto' }
            ])
        ).toEqual([
            { turno_id: 't1', conductor_id: 'c1', conductor_nombre: 'Ana', cantidad_semanal: 2 },
            { turno_id: 't3', conductor_id: 'c1', conductor_nombre: 'Ana', cantidad_semanal: 2 },
            { turno_id: 't4', conductor_id: 'c2', conductor_nombre: 'Beto', cantidad_semanal: 1 }
        ]);
    });
});

describe('turnosSinTerritorio (RN-CONF-03)', () => {
    it('lista los turnos con Territorio vacío con día, fecha, hora y grupo', () => {
        const lista = turnosSinTerritorio(
            [
                turno('a', 'MARTES', 'Mañana (8:20 AM)', { territorio: '' }),
                turno('b', 'MIERCOLES', 'Tarde (6:20 PM)', { territorio: 'ZONA' }),
                turno('c', 'SABADO', 'Madrugada (6:30 AM)', { territorio: '  ', grupo: 'TODA LA CONGREGACION' })
            ],
            '2026-11-09'
        );
        expect(lista).toEqual([
            'Martes 10 nov · Mañana (8:20 AM) · Grupo A',
            'Sábado 14 nov · Madrugada (6:30 AM) · Toda la Congre.'
        ]);
    });
});
