import { describe, expect, it } from 'vitest';
import {
    agregarLibreJunto,
    agregarTurnoAlDia,
    agregarTurnoDebajo,
    cambiarFila,
    clasesFormato,
    combinarConPlantilla,
    cuerpoParaGuardar,
    filasDeProgramaGuardado,
    filasDesdeDatos,
    filasPorDefecto,
    leerFilas,
    limpiarFormato,
    quitarFila
} from './filas.js';

// Resumen legible de las filas: "DIA tipo hora"
const resumen = (filas) =>
    filas.map((f) => `${f.dia} ${f.tipo}${f.tipo === 'extra' ? (f.antes ? '↑' : '↓') : ''} ${f.hora}`);

describe('filasDesdeDatos (orden de la tabla)', () => {
    it('por día: libres "antes", turnos en su orden y libres "después"', () => {
        const filas = filasDesdeDatos(
            [
                { dia: 'MARTES', hora: 'Tarde (6:20 PM)', grupo: 'GRUPO A' },
                { dia: 'LUNES', hora: 'Mañana (8:20 AM)', grupo: 'TODA LA CONGREGACION' },
                { dia: 'MARTES', hora: 'Madrugada (6:30 AM)', grupo: 'GRUPO B' }
            ],
            [
                { dia: 'MARTES', hora: 'D', orden: 0 },
                { dia: 'MARTES', hora: 'A', orden: -1 }
            ]
        );
        expect(resumen(filas)).toEqual([
            'LUNES turno Mañana (8:20 AM)',
            'MARTES extra↑ A',
            'MARTES turno Tarde (6:20 PM)',
            'MARTES turno Madrugada (6:30 AM)',
            'MARTES extra↓ D'
        ]);
    });

    it('el turno "Domingo (10:20 AM)" va al domingo aunque esté guardado en otro día (RN-PLAN-04)', () => {
        const [f] = filasDesdeDatos([{ dia: 'LUNES', hora: 'Domingo (10:20 AM)', grupo: 'TODA LA CONGREGACION' }], []);
        expect(f.dia).toBe('DOMINGO');
    });

    it('la reunión de fin de semana va al domingo y antes de los turnos (RN-PLAN-05)', () => {
        const filas = filasDesdeDatos(
            [{ dia: 'DOMINGO', hora: 'Domingo (10:20 AM)', grupo: 'TODA LA CONGREGACION' }],
            [{ dia: 'SABADO', hora: '8:30AM', punto_reunion: 'FIN DE SEMANA', orden: 0 }]
        );
        expect(resumen(filas)).toEqual(['DOMINGO extra↑ 8:30AM', 'DOMINGO turno Domingo (10:20 AM)']);
    });

    it('rellena los vacíos con los valores por defecto', () => {
        const [t] = filasDesdeDatos([{ dia: 'LUNES' }], []);
        expect(t).toMatchObject({
            hora: 'Madrugada (6:30 AM)',
            grupo: 'TODA LA CONGREGACION',
            territorio: '',
            modalidad: 'FISICO',
            formato: {}
        });
    });
});

describe('filasDeProgramaGuardado', () => {
    it('ordena los turnos por día, franja y grupo', () => {
        const filas = filasDeProgramaGuardado(
            [
                { dia: 'MARTES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO B' },
                { dia: 'MARTES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO A' },
                { dia: 'MARTES', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
                { dia: 'LUNES', hora: 'Tarde (6:20 PM)', grupo: 'TODA LA CONGREGACION' }
            ],
            []
        );
        expect(filas.map((f) => `${f.dia} ${f.hora} ${f.grupo}`)).toEqual([
            'LUNES Tarde (6:20 PM) TODA LA CONGREGACION',
            'MARTES Madrugada (6:30 AM) TODA LA CONGREGACION',
            'MARTES Mañana (8:20 AM) GRUPO A',
            'MARTES Mañana (8:20 AM) GRUPO B'
        ]);
    });
});

describe('filasPorDefecto', () => {
    it('19 turnos y 4 filas libres (Martes, 2 en Sábado y Domingo antes)', () => {
        const filas = filasPorDefecto();
        expect(filas.filter((f) => f.tipo === 'turno')).toHaveLength(19);
        expect(filas.filter((f) => f.tipo === 'extra').map((f) => `${f.dia}${f.antes ? '↑' : '↓'}`)).toEqual([
            'MARTES↓',
            'SABADO↓',
            'SABADO↓',
            'DOMINGO↑'
        ]);
    });
});

describe('edición de filas', () => {
    const base = () =>
        filasDesdeDatos(
            [
                { dia: 'LUNES', hora: 'Tarde (6:20 PM)' },
                { dia: 'MIERCOLES', hora: 'Tarde (6:20 PM)' }
            ],
            []
        );

    it('agrega un turno del mismo día debajo', () => {
        const filas = base();
        const nuevas = agregarTurnoDebajo(filas, filas[0].clave);
        expect(resumen(nuevas)).toEqual([
            'LUNES turno Tarde (6:20 PM)',
            'LUNES turno Madrugada (6:30 AM)',
            'MIERCOLES turno Tarde (6:20 PM)'
        ]);
    });

    it('agrega una fila libre arriba ("antes") o abajo ("después")', () => {
        const filas = base();
        expect(resumen(agregarLibreJunto(filas, filas[1].clave, true))[1]).toBe('MIERCOLES extra↑ ');
        expect(resumen(agregarLibreJunto(filas, filas[0].clave, false))[1]).toBe('LUNES extra↓ ');
    });

    it('agrega un turno a un día sin filas antes del siguiente día con filas', () => {
        const filas = agregarTurnoAlDia(base(), 'MARTES');
        expect(filas.map((f) => f.dia)).toEqual(['LUNES', 'MARTES', 'MIERCOLES']);
        expect(agregarTurnoAlDia(base(), 'DOMINGO').map((f) => f.dia)).toEqual(['LUNES', 'MIERCOLES', 'DOMINGO']);
    });

    it('quita y cambia filas sin tocar las demás', () => {
        const filas = base();
        expect(quitarFila(filas, filas[0].clave)).toHaveLength(1);
        const cambiadas = cambiarFila(filas, filas[1].clave, { territorio: 'ZONA 9' });
        expect(cambiadas[1].territorio).toBe('ZONA 9');
        expect(cambiadas[0]).toBe(filas[0]);
    });

    it('las claves son únicas', () => {
        const claves = filasPorDefecto().map((f) => f.clave);
        expect(new Set(claves).size).toBe(claves.length);
    });
});

describe('cuerpoParaGuardar (RN-PROG-05)', () => {
    it('vacíos a null en turnos, "" en filas libres y orden -1/0 según el lado', () => {
        const filas = filasDesdeDatos(
            [{ dia: 'LUNES', hora: 'Tarde (6:20 PM)', grupo: 'GRUPO A', territorio: '' }],
            [{ dia: 'LUNES', orden: -1, conductor: 'ANA' }]
        );
        const cuerpo = cuerpoParaGuardar(filas);
        expect(cuerpo.turnos).toEqual([
            {
                dia: 'LUNES',
                hora: 'Tarde (6:20 PM)',
                grupo: 'GRUPO A',
                territorio: null,
                punto_reunion: null,
                modalidad: 'FISICO',
                formato: {}
            }
        ]);
        expect(cuerpo.filasExtra).toEqual([
            {
                dia: 'LUNES',
                hora: '',
                grupo: '',
                territorio: '',
                punto_reunion: '',
                conductor: 'ANA',
                orden: -1,
                formato: {}
            }
        ]);
    });

    it('sin filas libres no envía filasExtra', () => {
        expect(cuerpoParaGuardar(filasDesdeDatos([{ dia: 'LUNES', grupo: 'GRUPO A' }], [])).filasExtra).toBeUndefined();
    });
});

describe('combinarConPlantilla (RN-ACT-01..05)', () => {
    const actual = {
        turnos: [
            {
                dia: 'LUNES',
                hora: 'Mañana (8:20 AM)',
                grupo: 'TODA LA CONGREGACION',
                territorio: 'T1',
                punto_reunion: 'P1',
                modalidad: 'ZOOM',
                formato: { territorio: { b: true } }
            },
            {
                dia: 'LUNES',
                hora: 'Mañana (8:20 AM)',
                grupo: 'TODA LA CONGREGACION',
                territorio: 'T2',
                punto_reunion: '',
                modalidad: 'FISICO',
                formato: {}
            },
            {
                dia: 'VIERNES',
                hora: 'Tarde (6:20 PM)',
                grupo: 'GRUPO A',
                territorio: 'SOBRA',
                punto_reunion: '',
                modalidad: 'FISICO',
                formato: {}
            }
        ],
        extras: [
            {
                dia: 'SABADO',
                hora: '9',
                grupo: 'G',
                territorio: '',
                punto_reunion: '',
                conductor: 'Juan',
                orden: 0,
                formato: {}
            }
        ]
    };
    const plantilla = [
        {
            dia: 'LUNES',
            hora: 'Mañana (8:20 AM)',
            grupo: 'TODA LA CONGREGACION',
            territorio: '',
            punto_reunion: 'PX',
            modalidad: 'FISICO',
            formato: { hora: { i: true } }
        },
        {
            dia: 'LUNES',
            hora: 'Mañana (8:20 AM)',
            grupo: 'TODA LA CONGREGACION',
            territorio: 'NUEVO',
            modalidad: 'CARTAS'
        }
    ];
    const plantillaExtras = [{ dia: 'SABADO', hora: '', grupo: 'X', conductor: '', orden: 0 }];
    const { turnos, extras } = combinarConPlantilla(actual, plantilla, plantillaExtras);

    it('la estructura es la de la plantilla: lo que no tiene se quita', () => {
        expect(turnos).toHaveLength(2);
        expect(turnos.some((t) => t.territorio === 'SOBRA')).toBe(false);
    });

    it('gana la plantilla si tiene información; si está vacía se conserva el programa', () => {
        expect(turnos[0]).toMatchObject({ territorio: 'T1', punto_reunion: 'PX' });
        expect(turnos[1]).toMatchObject({ territorio: 'NUEVO', punto_reunion: '' });
    });

    it('FISICO en la plantilla cuenta como vacío (RN-ACT-03)', () => {
        expect(turnos[0].modalidad).toBe('ZOOM');
        expect(turnos[1].modalidad).toBe('CARTAS');
    });

    it('el formato combina el del programa con el de la plantilla encima', () => {
        expect(turnos[0].formato).toEqual({ territorio: { b: true }, hora: { i: true } });
    });

    it('las filas libres se emparejan por día y lado', () => {
        expect(extras).toEqual([
            {
                dia: 'SABADO',
                hora: '9',
                grupo: 'X',
                territorio: '',
                punto_reunion: '',
                conductor: 'Juan',
                orden: 0,
                formato: {}
            }
        ]);
    });

    it('leerFilas + combinar con la misma plantilla deja el programa igual', () => {
        const filas = filasDesdeDatos(plantilla, plantillaExtras);
        const r = combinarConPlantilla(leerFilas(filas), plantilla, plantillaExtras);
        expect(r.turnos.map((t) => t.territorio)).toEqual(['', 'NUEVO']);
    });
});

describe('formato por celda', () => {
    it('limpiarFormato quita lo que coincide con el defecto (centro y medio) y lo falso', () => {
        expect(limpiarFormato({ hora: { h: 'center', v: 'middle', b: false }, grupo: { h: 'left', s: true } })).toEqual(
            {
                grupo: { h: 'left', s: true }
            }
        );
    });

    it('clasesFormato genera las clases de la vista previa', () => {
        expect(clasesFormato({ territorio: { h: 'right', b: true, i: true } }, 'territorio')).toBe(
            'fmt-h-right fmt-b fmt-i'
        );
        expect(clasesFormato({}, 'hora')).toBe('');
    });
});
