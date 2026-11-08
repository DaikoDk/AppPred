import { describe, expect, it } from 'vitest';
import {
    diasDeCuadricula,
    etiquetaLarga,
    fechaDeISO,
    formatoCorto,
    inicioDeMes,
    mismoDia,
    sumarDias,
    sumarMeses,
    tituloMes
} from './calendario.js';

const ISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('diasDeCuadricula', () => {
    it('siempre son 42 días que empiezan en lunes', () => {
        const dias = diasDeCuadricula(new Date(2026, 10, 15));
        expect(dias).toHaveLength(42);
        expect(dias.every((d, i) => i === 0 || d.getTime() - dias[i - 1].getTime() === 86400000)).toBe(true);
        expect(dias[0].getDay()).toBe(1);
    });

    it('noviembre de 2026 arranca el 26 de octubre (1 de noviembre es domingo) y termina el 6 de diciembre', () => {
        const dias = diasDeCuadricula(new Date(2026, 10, 1));
        expect(ISO(dias[0])).toBe('2026-10-26');
        expect(ISO(dias[41])).toBe('2026-12-06');
    });

    it('un mes que empieza en lunes no agrega una semana de relleno al principio', () => {
        // 1 de junio de 2026 es lunes
        const dias = diasDeCuadricula(new Date(2026, 5, 1));
        expect(ISO(dias[0])).toBe('2026-06-01');
    });
});

describe('sumarMeses', () => {
    it('no se pasa del último día del mes destino', () => {
        expect(ISO(sumarMeses(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
        expect(ISO(sumarMeses(new Date(2028, 0, 31), 1))).toBe('2028-02-29');
    });

    it('retrocede y avanza años', () => {
        expect(ISO(sumarMeses(new Date(2026, 0, 15), -1))).toBe('2025-12-15');
        expect(ISO(sumarMeses(new Date(2026, 11, 15), 1))).toBe('2027-01-15');
    });
});

describe('sumarDias e inicioDeMes', () => {
    it('suma días cruzando meses', () => {
        expect(ISO(sumarDias(new Date(2026, 10, 30), 3))).toBe('2026-12-03');
        expect(ISO(sumarDias(new Date(2026, 10, 9), -7))).toBe('2026-11-02');
    });

    it('inicio de mes es el día 1', () => {
        expect(ISO(inicioDeMes(new Date(2026, 10, 19)))).toBe('2026-11-01');
    });
});

describe('fechaDeISO y formatoCorto', () => {
    it('lee la fecha en hora local', () => {
        const d = fechaDeISO('2026-11-09');
        expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 10, 9]);
    });

    it('vacío o inválido no da fecha', () => {
        expect(fechaDeISO('')).toBeNull();
        expect(fechaDeISO(undefined)).toBeNull();
        expect(fechaDeISO('no es fecha')).toBeNull();
    });

    it('muestra dd/mm/aaaa y vacío sin fecha', () => {
        expect(formatoCorto('2026-11-09')).toBe('09/11/2026');
        expect(formatoCorto('')).toBe('');
    });
});

describe('mismoDia', () => {
    it('compara día, mes y año, ignorando la hora', () => {
        expect(mismoDia(new Date(2026, 10, 9, 0, 0), new Date(2026, 10, 9, 23, 59))).toBe(true);
        expect(mismoDia(new Date(2026, 10, 9), new Date(2025, 10, 9))).toBe(false);
    });
});

describe('textos', () => {
    it('título del mes y etiqueta larga en español', () => {
        expect(tituloMes(new Date(2026, 10, 1))).toBe('noviembre de 2026');
        expect(etiquetaLarga(new Date(2026, 10, 9))).toBe('9 de noviembre de 2026');
    });
});
