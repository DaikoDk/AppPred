// Tipos del dominio. Se usan desde JS con JSDoc:  /** @type {import('../types/models').Turno} */
// Al migrar a TypeScript, este archivo ya sirve tal cual: se importa con `import type`.
// Deben reflejar lo que devuelve la API (ver docs/REGLAS-NEGOCIO.md, sección Dominio).

export type Dia = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO';
export type GrupoTurno = 'TODA LA CONGREGACION' | 'GRUPO A' | 'GRUPO B';
export type GrupoConductor = 'A' | 'B' | 'C';
export type Modalidad = 'FISICO' | 'ZOOM' | 'CARTAS';

export type CampoFormato = 'hora' | 'grupo' | 'territorio' | 'punto_reunion' | 'conductor';

/** Formato de una celda (RN-FMT-01). Solo se guarda lo que difiere del defecto. */
export interface FormatoCelda {
    h?: 'left' | 'center' | 'right';
    v?: 'top' | 'middle' | 'bottom';
    b?: true;
    i?: true;
    s?: true;
}
export type Formato = Partial<Record<CampoFormato, FormatoCelda>>;

export interface Turno {
    id: string;
    dia: Dia;
    hora: string;
    grupo: GrupoTurno;
    territorio: string | null;
    punto_reunion: string | null;
    modalidad: Modalidad;
    conductor_id: string | null;
    formato: Formato;
}

/** Fila de texto libre; nunca se asigna (ADR-007). orden < 0 va antes de los turnos del día. */
export interface FilaExtra {
    id: string;
    dia: Dia;
    hora: string;
    grupo: string;
    territorio: string;
    punto_reunion: string;
    conductor: string;
    orden: number;
    formato: Formato;
}

export interface Programa {
    id: string;
    semana_inicio: string; // YYYY-MM-DD
    semana_fin: string;
    programa_semanal_turnos: Turno[];
    filas_extra: FilaExtra[];
}

export interface Conductor {
    id: string;
    nombre: string;
    grupo: GrupoConductor;
    activo: boolean;
    tiene_pc: boolean;
    poca_movilidad: boolean;
    solo_parque: boolean;
    ubicacion_casa: string | null; // "lat,lng"
}

export interface PuntoReunion {
    id: string;
    nombre: string;
    ubicacion: string | null;
    fijo: boolean;
    activo: boolean;
}

export interface Usuario {
    id: string;
    nombre: string;
    email: string;
}
