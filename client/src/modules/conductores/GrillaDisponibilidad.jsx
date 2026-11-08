// @ts-check
import { Fragment, useState } from 'react';
import { Check, Plus } from '@phosphor-icons/react';
import { DIAS, nombreDia } from '../../utils/dias.js';
import { FRANJAS } from '../../utils/constantes.js';
import { useConfirmar } from '../../components/ui/Confirmar.jsx';
import { useMediaQuery } from '../../hooks/useMediaQuery.js';

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
 * Grilla de disponibilidad. En escritorio: franjas en filas y días en columnas (maqueta). En móvil: un día
 * a la vez, con cada franja como botón de ancho completo, porque siete columnas no entran en un teléfono.
 * Marcar o quitar pide confirmación (modal, ADR-016) y luego llama a `onMarcar`.
 * Una casilla marcada es azul; una vacía, punteada; gris si ese espacio no aplica.
 * @param {{
 *   slots: Disponibilidad[],
 *   editable: boolean,
 *   onMarcar?: (dia: Dia, hora: string, disponible: boolean) => void
 * }} props
 */
export default function GrillaDisponibilidad({ slots, editable, onMarcar }) {
    const confirmar = useConfirmar();
    const escritorio = useMediaQuery('(min-width: 640px)');
    const [diaMovil, setDiaMovil] = useState(/** @type {Dia} */ ('LUNES'));
    const activos = new Set(slots.filter((s) => s.disponible).map((s) => `${s.dia}|${s.hora}`));
    const base =
        'grid h-12 w-full place-items-center rounded-lg transition-[background-color,border-color,transform] duration-300 ease-skill';

    /** @param {Dia} dia @param {string} hora */
    const alternar = async (dia, hora) => {
        const on = activos.has(`${dia}|${hora}`);
        const ok = await confirmar(
            on
                ? {
                      titulo: '¿Quitar este horario?',
                      mensaje: `${nombreDia(dia)} — ${hora}`,
                      textoConfirmar: 'Quitar',
                      peligro: true,
                      icono: 'fa-trash'
                  }
                : {
                      titulo: '¿Agregar este horario?',
                      mensaje: `${nombreDia(dia)} — ${hora}`,
                      textoConfirmar: 'Agregar',
                      icono: 'fa-plus'
                  }
        );
        if (ok === true) onMarcar?.(dia, hora, !on);
    };

    if (!escritorio) {
        return (
            <div className="flex flex-col gap-3">
                <div role="tablist" aria-label="Día de la semana" className="grid grid-cols-7 gap-1.5">
                    {DIAS.map((d) => {
                        const elegido = d === diaMovil;
                        return (
                            <button
                                key={d}
                                type="button"
                                role="tab"
                                aria-selected={elegido}
                                aria-label={nombreDia(d)}
                                onClick={() => setDiaMovil(d)}
                                className={`caption-1 min-h-9 min-w-0 cursor-pointer rounded-lg px-0 text-ink transition-[box-shadow,opacity] duration-300 ease-skill ${COLOR_DIA[d]} ${elegido ? 'ring-2 ring-ink' : 'opacity-70'}`}
                            >
                                {SIGLA[d]}
                            </button>
                        );
                    })}
                </div>
                <ul className="flex list-none flex-col gap-2">
                    {FRANJAS.map((hora) => {
                        const clave = `${diaMovil}|${hora}`;
                        const on = activos.has(clave);
                        if (!on && !aplica(diaMovil, hora)) {
                            return (
                                <li
                                    key={clave}
                                    className="flex min-h-12 items-center justify-between gap-3 rounded-lg bg-fill px-3 text-soft"
                                >
                                    <span className="body-6">{hora}</span>
                                    <span className="caption-1">No aplica</span>
                                </li>
                            );
                        }
                        const contenido = (
                            <>
                                <span className="body-6 text-left">{hora}</span>
                                <span className="caption-1 inline-flex shrink-0 items-center gap-1.5">
                                    {on ? (
                                        <>
                                            <Check size={16} weight="bold" aria-hidden="true" /> Disponible
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={16} aria-hidden="true" /> No disponible
                                        </>
                                    )}
                                </span>
                            </>
                        );
                        const clase = `flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-3 ${
                            on ? 'bg-primary text-white' : 'border border-dashed border-line bg-surface text-muted'
                        }`;
                        return (
                            <li key={clave}>
                                {editable ? (
                                    <button
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => alternar(diaMovil, hora)}
                                        className={`${clase} cursor-pointer outline-none transition-[background-color,transform] duration-300 ease-skill focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]`}
                                    >
                                        {contenido}
                                    </button>
                                ) : (
                                    <div className={clase}>{contenido}</div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </div>
        );
    }

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
                                    onClick={() => alternar(dia, hora)}
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
