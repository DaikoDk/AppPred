// @ts-check
import { Fragment } from 'react';
import { Check, Plus } from '@phosphor-icons/react';
import { DIAS, nombreDia } from '../../utils/dias.js';
import { FRANJAS } from '../../utils/constantes.js';

/**
 * @typedef {import('../../types/models').Dia} Dia
 * @typedef {import('./api.js').Disponibilidad} Disponibilidad
 */

/** Abreviatura de cada día para el encabezado de la grilla (maqueta). @type {Record<Dia, string>} */
const SIGLA = {
    LUNES: 'Lun',
    MARTES: 'Mar',
    MIERCOLES: 'Mié',
    JUEVES: 'Jue',
    VIERNES: 'Vie',
    SABADO: 'Sáb',
    DOMINGO: 'Dom'
};

/** Color de cada día (tokens de index.css, mismos que el editor de Programa). @type {Record<Dia, string>} */
const COLOR_DIA = {
    LUNES: 'bg-lunes',
    MARTES: 'bg-martes',
    MIERCOLES: 'bg-miercoles',
    JUEVES: 'bg-jueves',
    VIERNES: 'bg-viernes',
    SABADO: 'bg-sabado',
    DOMINGO: 'bg-domingo'
};

// La franja de domingo solo se ofrece los domingos; las demás, de lunes a sábado (maqueta)
const FRANJA_DOMINGO = FRANJAS[FRANJAS.length - 1];

/** @param {Dia} dia @param {string} hora */
const aplica = (dia, hora) => (hora === FRANJA_DOMINGO) === (dia === 'DOMINGO');

/**
 * Grilla de disponibilidad: franjas en filas y días en columnas. Cada casilla es un espacio de la semana:
 * marcada (azul) si el conductor puede ese horario, con borde punteado si no; gris si ese espacio no aplica.
 * En modo edición cada casilla se marca o se quita con un clic.
 * @param {{
 *   slots: Disponibilidad[],
 *   editable: boolean,
 *   onAlternar?: (dia: Dia, hora: string) => void
 * }} props
 */
export default function GrillaDisponibilidad({ slots, editable, onAlternar }) {
    const activos = new Set(slots.filter((s) => s.disponible).map((s) => `${s.dia}|${s.hora}`));
    const base =
        'grid h-12 w-full place-items-center rounded-lg transition-[background-color,border-color,transform] duration-300 ease-skill';

    return (
        <div className="overflow-x-auto">
            <div className="grid min-w-[460px] grid-cols-[9rem_repeat(7,minmax(0,1fr))] gap-2">
                <span aria-hidden="true" />
                {DIAS.map((d) => (
                    <span key={d} className={`caption-1 rounded-lg py-1 text-center text-ink ${COLOR_DIA[d]}`}>
                        {SIGLA[d]}
                    </span>
                ))}
                {FRANJAS.map((hora) => (
                    <Fragment key={hora}>
                        <span className="body-6 flex items-center text-muted">{hora}</span>
                        {DIAS.map((dia) => {
                            const clave = `${dia}|${hora}`;
                            const on = activos.has(clave);
                            if (!on && !aplica(dia, hora)) {
                                return <span key={clave} className="h-12 rounded-lg bg-fill" aria-hidden="true" />;
                            }
                            const contenido = on ? (
                                <Check size={16} weight="bold" aria-hidden="true" />
                            ) : (
                                <Plus size={16} aria-hidden="true" />
                            );
                            const clase = on
                                ? `${base} bg-primary text-white`
                                : `${base} border border-dashed border-line bg-surface text-soft`;
                            if (!editable) {
                                return (
                                    <span
                                        key={clave}
                                        className={clase}
                                        aria-label={`${nombreDia(dia)} ${hora}: ${on ? 'disponible' : 'no disponible'}`}
                                    >
                                        {contenido}
                                    </span>
                                );
                            }
                            return (
                                <button
                                    key={clave}
                                    type="button"
                                    aria-pressed={on}
                                    aria-label={`${nombreDia(dia)} ${hora}`}
                                    onClick={() => onAlternar?.(dia, hora)}
                                    className={`${clase} cursor-pointer outline-none hover:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.96]`}
                                >
                                    {contenido}
                                </button>
                            );
                        })}
                    </Fragment>
                ))}
            </div>
        </div>
    );
}
