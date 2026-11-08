import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarBlank, CaretLeft, CaretRight } from '@phosphor-icons/react';
import PanelFlotante from './PanelFlotante.jsx';
import { aISO } from '../../utils/fechas.js';
import {
    diasDeCuadricula,
    etiquetaLarga,
    fechaDeISO,
    formatoCorto,
    hoyISO,
    inicioDeMes,
    lunesDe,
    mismoDia,
    sumarDias,
    sumarMeses,
    textoSemana,
    tituloMes
} from '../../utils/calendario.js';

const SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];

/** Primera letra en mayúscula; el resto igual (a diferencia de capitalize, no pone "De" en mayúscula). */
const mayuscula = (/** @type {string} */ t) => t.charAt(0).toUpperCase() + t.slice(1);

/**
 * Campo de fecha con calendario propio (reemplaza al input de fecha nativo). El valor es "YYYY-MM-DD".
 * Modo "dia": se elige un día. Modo "semana": se elige una semana completa de lunes a domingo; el valor es su lunes
 * y la fila entera se resalta al pasar el mouse.
 * Teclado: flechas para mover un día (izquierda y derecha) o una semana (arriba y abajo), AvPág y RePág para cambiar
 * de mes, Enter o Espacio para elegir y Escape para cerrar devolviendo el foco.
 * @param {{
 *   id?: string,
 *   valor: string,
 *   onCambiar: (iso: string) => void,
 *   rotulo: string,
 *   modo?: 'dia' | 'semana'
 * }} props
 */
export default function CampoFecha({ id, valor, onCambiar, rotulo, modo = 'dia' }) {
    const boton = useRef(/** @type {HTMLButtonElement | null} */ (null));
    const [abierto, setAbierto] = useState(false);
    const semana = modo === 'semana';
    const texto = semana ? textoSemana(valor) : formatoCorto(valor);

    /** @param {string} iso */
    const elegir = (iso) => {
        onCambiar(iso);
        setAbierto(false);
        boton.current?.focus();
    };

    return (
        <>
            <button
                ref={boton}
                id={id}
                type="button"
                aria-label={rotulo}
                aria-haspopup="dialog"
                aria-expanded={abierto}
                data-valor={valor}
                onClick={() => setAbierto((a) => !a)}
                className={`body-6 tw-fecha flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-left text-ink tabular-nums transition-[border-color] duration-300 ease-skill outline-none hover:border-ink/30 focus-visible:border-primary aria-expanded:border-primary ${semana ? 'w-72' : 'w-full'}`}
            >
                <span className={texto ? '' : 'text-ink/50'}>
                    {texto || (semana ? 'Elige una semana' : 'dd/mm/aaaa')}
                </span>
                <CalendarBlank size={16} aria-hidden="true" className="shrink-0 text-ink/55" />
            </button>
            {abierto && (
                <PanelFlotante
                    origen={boton.current}
                    onCerrar={() => setAbierto(false)}
                    anchoMin={296}
                    anchoMax={296}
                    altoMax={420}
                    rol="dialog"
                    etiqueta={rotulo}
                >
                    <Calendario
                        valor={valor}
                        modo={modo}
                        onElegir={elegir}
                        onBorrar={() => elegir('')}
                        onCerrar={(devolverFoco) => {
                            setAbierto(false);
                            if (devolverFoco) boton.current?.focus();
                        }}
                    />
                </PanelFlotante>
            )}
        </>
    );
}

/**
 * @param {{
 *   valor: string,
 *   modo: 'dia' | 'semana',
 *   onElegir: (iso: string) => void,
 *   onBorrar: () => void,
 *   onCerrar: (devolverFoco: boolean) => void
 * }} props
 */
function Calendario({ valor, modo, onElegir, onBorrar, onCerrar }) {
    const semana = modo === 'semana';
    const hoy = useMemo(() => new Date(), []);
    const seleccion = fechaDeISO(valor);
    const lunesSeleccion = seleccion ? lunesDe(seleccion) : null;
    // Mes que se muestra y día que tiene el foco (el que se elige con Enter)
    const [vista, setVista] = useState(() => inicioDeMes(seleccion ?? hoy));
    const [foco, setFoco] = useState(() => seleccion ?? hoy);
    // Fila de la cuadrícula bajo el mouse (solo en modo semana)
    const [filaBajoMouse, setFilaBajoMouse] = useState(/** @type {number | null} */ (null));
    const filas = useMemo(() => {
        const dias = diasDeCuadricula(vista);
        return Array.from({ length: 6 }, (_, i) => dias.slice(i * 7, i * 7 + 7));
    }, [vista]);
    const grilla = useRef(/** @type {HTMLDivElement | null} */ (null));
    // Solo se mueve el foco del navegador cuando el cambio viene del teclado o al abrir
    const enfocarDia = useRef(true);

    // El panel nace oculto hasta calcular su posición: el foco se pone en el siguiente cuadro
    useEffect(() => {
        if (!enfocarDia.current) return undefined;
        enfocarDia.current = false;
        const cuadro = requestAnimationFrame(() => {
            const dia = /** @type {HTMLButtonElement | null | undefined} */ (
                grilla.current?.querySelector(`[data-iso="${aISO(foco)}"]`)
            );
            dia?.focus({ preventScroll: true });
        });
        return () => cancelAnimationFrame(cuadro);
    }, [foco, vista]);

    /** @param {number} meses */
    const cambiarMes = (meses) => {
        setVista((v) => sumarMeses(v, meses));
        setFoco((f) => sumarMeses(f, meses));
    };

    /** @param {Date} d */
    const enSemanaElegida = (d) => lunesSeleccion !== null && mismoDia(lunesDe(d), lunesSeleccion);

    /** @param {Date} d */
    const isoAElegir = (d) => (semana ? aISO(lunesDe(d)) : aISO(d));

    /** @param {import('react').KeyboardEvent} e */
    const teclaRaiz = (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onCerrar(true);
        }
    };

    /** @param {import('react').KeyboardEvent} e */
    const teclaDia = (e) => {
        const mover = (/** @type {Date} */ nuevo) => {
            e.preventDefault();
            enfocarDia.current = true;
            setFoco(nuevo);
            setVista(inicioDeMes(nuevo));
        };
        if (e.key === 'ArrowLeft') mover(sumarDias(foco, -1));
        else if (e.key === 'ArrowRight') mover(sumarDias(foco, 1));
        else if (e.key === 'ArrowUp') mover(sumarDias(foco, -7));
        else if (e.key === 'ArrowDown') mover(sumarDias(foco, 7));
        else if (e.key === 'PageUp') mover(sumarMeses(foco, -1));
        else if (e.key === 'PageDown') mover(sumarMeses(foco, 1));
    };

    const estiloNav =
        'grid size-8 place-items-center rounded-lg text-muted transition-[background-color,color,transform] duration-300 ease-skill hover:bg-fill hover:text-ink active:scale-[0.96]';
    const estiloPie =
        'button-sm rounded-lg px-3 py-1.5 transition-[background-color,transform] duration-300 ease-skill hover:bg-fill active:scale-[0.98]';

    return (
        <div role="none" onKeyDown={teclaRaiz} className="tw flex flex-col gap-2 p-2">
            <div className="flex items-center justify-between px-1">
                <span className="title-4 text-ink" aria-live="polite">
                    {mayuscula(tituloMes(vista))}
                </span>
                <div className="flex gap-1">
                    <button
                        type="button"
                        aria-label="Mes anterior"
                        onClick={() => cambiarMes(-1)}
                        className={estiloNav}
                    >
                        <CaretLeft size={16} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        aria-label="Mes siguiente"
                        onClick={() => cambiarMes(1)}
                        className={estiloNav}
                    >
                        <CaretRight size={16} aria-hidden="true" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 px-1" aria-hidden="true">
                {SEMANA.map((s) => (
                    <span key={s} className="caption-3 grid h-8 place-items-center text-muted uppercase">
                        {s}
                    </span>
                ))}
            </div>

            <div
                ref={grilla}
                role="group"
                aria-label={tituloMes(vista)}
                onKeyDown={teclaDia}
                onMouseLeave={() => setFilaBajoMouse(null)}
                className="flex flex-col gap-0.5 px-1"
            >
                {filas.map((fila, indiceFila) => {
                    const selecciona = semana && fila.some(enSemanaElegida);
                    const bajoMouse = semana && filaBajoMouse === indiceFila;
                    const fondoFila = !semana
                        ? ''
                        : selecciona
                          ? bajoMouse
                              ? 'bg-primary/25'
                              : 'bg-primary/15'
                          : bajoMouse
                            ? 'bg-fill'
                            : '';
                    return (
                        <div
                            key={indiceFila}
                            role="presentation"
                            onMouseEnter={() => semana && setFilaBajoMouse(indiceFila)}
                            className={`grid grid-cols-7 rounded-lg transition-colors duration-300 ease-skill ${fondoFila}`}
                        >
                            {fila.map((d) => {
                                const iso = aISO(d);
                                const esSeleccion = semana
                                    ? enSemanaElegida(d)
                                    : seleccion !== null && mismoDia(d, seleccion);
                                const esHoy = mismoDia(d, hoy);
                                const fueraDelMes = d.getMonth() !== vista.getMonth();
                                let estado;
                                if (semana) {
                                    estado = esHoy
                                        ? 'font-semibold text-primary ring-1 ring-primary'
                                        : fueraDelMes
                                          ? 'text-soft'
                                          : 'text-ink';
                                } else if (esSeleccion) {
                                    estado = 'bg-primary font-semibold text-white hover:bg-primary-dark';
                                } else if (esHoy) {
                                    estado = 'font-semibold text-primary ring-1 ring-primary hover:bg-fill';
                                } else {
                                    estado = fueraDelMes ? 'text-soft hover:bg-fill' : 'text-ink hover:bg-fill';
                                }
                                return (
                                    <button
                                        key={iso}
                                        type="button"
                                        data-iso={iso}
                                        aria-label={
                                            semana ? `Semana del ${etiquetaLarga(lunesDe(d))}` : etiquetaLarga(d)
                                        }
                                        aria-pressed={esSeleccion}
                                        aria-current={esHoy ? 'date' : undefined}
                                        title={semana ? 'Elegir esta semana' : undefined}
                                        tabIndex={mismoDia(d, foco) ? 0 : -1}
                                        onClick={() => onElegir(isoAElegir(d))}
                                        className={`body-6 mx-auto grid size-9 place-items-center rounded-lg transition-[background-color,color,transform] duration-300 ease-skill active:scale-[0.96] ${estado}`}
                                    >
                                        {d.getDate()}
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </div>

            <div className="flex items-center justify-between border-t border-line px-1 pt-2">
                <button type="button" onClick={onBorrar} className={`${estiloPie} text-primary`}>
                    Borrar
                </button>
                <button
                    type="button"
                    onClick={() => onElegir(semana ? aISO(lunesDe(hoy)) : hoyISO())}
                    className={`${estiloPie} text-primary`}
                >
                    Hoy
                </button>
            </div>
        </div>
    );
}
