import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { CaretDown, Check, MagnifyingGlass } from '@phosphor-icons/react';
import PanelFlotante from './PanelFlotante.jsx';

/**
 * @typedef {{ valor: string, etiqueta: string }} OpcionDD
 */

const BASE_BOTON =
    'body-6 flex min-w-0 w-full cursor-pointer items-center justify-between gap-2 rounded-lg border text-left text-ink transition-[border-color,transform] duration-300 ease-skill active:scale-[0.98]';

/** Aspecto de cada variante del disparador. */
const ESTILO_BOTON = {
    chip: 'min-h-9 border-transparent bg-(--dia) px-3 py-2 hover:border-ink/20 aria-expanded:border-ink',
    campo: 'min-h-9 border-line bg-surface px-3 py-2 hover:border-ink/30 focus-visible:border-primary aria-expanded:border-primary',
    celda: 'min-h-9 border-line bg-surface px-2 py-1 hover:border-ink/30 focus-visible:border-primary aria-expanded:border-primary'
};

/**
 * Lista desplegable propia (reemplaza al <select> nativo). Con más de 8 opciones agrega un buscador.
 * Teclado: flechas, Inicio, Fin, Enter para elegir y Escape para cerrar devolviendo el foco.
 * El color del chip lo da `--dia`, definida en el contenedor del día.
 * Variantes:  (el editor, color del día en ),  (formularios, como el campo de fecha) y
 *  (filas de tabla, más compacta). Las dos últimas resaltan la opción con el color de tinta.
 * @param {{
 *   valor: string,
 *   variante?: 'chip' | 'campo' | 'celda',
 *   opciones: OpcionDD[],
 *   onCambiar: (valor: string) => void,
 *   rotulo: string,
 *   etiquetaVacio?: string,
 *   textoVacioChip?: string,
 *   anchoMin?: number,
 *   claseTexto?: string
 * }} props
 * `etiquetaVacio`: texto de la opción con valor '' dentro de la lista; `textoVacioChip`: lo que muestra el chip cuando está vacío.
 */
export default function Desplegable({
    valor,
    opciones,
    onCambiar,
    rotulo,
    etiquetaVacio = 'Sin valor',
    textoVacioChip = '—',
    anchoMin = 240,
    claseTexto = '',
    variante = 'chip'
}) {
    const id = useId();
    const boton = useRef(/** @type {HTMLButtonElement | null} */ (null));
    const [abierto, setAbierto] = useState(false);

    // Si el valor guardado ya no existe en la lista (por ejemplo, un punto desactivado), se conserva visible
    const todas = useMemo(() => {
        const lista = opciones.map((o) => (o.valor === '' ? { ...o, etiqueta: etiquetaVacio } : o));
        return valor !== '' && !lista.some((o) => o.valor === valor) ? [{ valor, etiqueta: valor }, ...lista] : lista;
    }, [opciones, valor, etiquetaVacio]);
    const actual = todas.find((o) => o.valor === valor);
    const textoChip = valor === '' ? textoVacioChip : (actual?.etiqueta ?? valor);

    const cerrar = (/** @type {boolean} */ devolverFoco) => {
        setAbierto(false);
        if (devolverFoco) boton.current?.focus();
    };

    return (
        <>
            <button
                ref={boton}
                type="button"
                aria-label={rotulo}
                aria-haspopup="listbox"
                aria-expanded={abierto}
                aria-controls={abierto ? id : undefined}
                onClick={() => setAbierto((a) => !a)}
                onKeyDown={(e) => {
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        setAbierto(true);
                    }
                }}
                className={`${BASE_BOTON} ${ESTILO_BOTON[variante]}`}
            >
                <span className={`truncate ${claseTexto}`}>{textoChip}</span>
                <CaretDown
                    size={16}
                    aria-hidden="true"
                    className={`shrink-0 text-ink/55 transition-transform duration-300 ease-skill ${abierto ? 'rotate-180' : ''}`}
                />
            </button>
            {abierto && (
                <ListaOpciones
                    id={id}
                    origen={boton.current}
                    opciones={todas}
                    valor={valor}
                    rotulo={rotulo}
                    anchoMin={anchoMin}
                    colorActivo={variante === 'chip' ? undefined : 'var(--color-tinta)'}
                    onElegir={(v) => {
                        onCambiar(v);
                        cerrar(true);
                    }}
                    onCerrar={cerrar}
                />
            )}
        </>
    );
}

/**
 * @param {{
 *   id: string, origen: HTMLElement | null, opciones: OpcionDD[], valor: string, rotulo: string, anchoMin: number,
 *   colorActivo?: string,
 *   onElegir: (valor: string) => void, onCerrar: (devolverFoco: boolean) => void
 * }} props
 */
function ListaOpciones({ id, origen, opciones, valor, rotulo, anchoMin, colorActivo, onElegir, onCerrar }) {
    const conBuscador = opciones.length > 8;
    const [consulta, setConsulta] = useState('');
    const [activa, setActiva] = useState(() =>
        Math.max(
            0,
            opciones.findIndex((o) => o.valor === valor)
        )
    );
    const lista = useRef(/** @type {HTMLUListElement | null} */ (null));

    // Sin buscador, la lista recibe el foco para poder usar el teclado
    // (el panel nace oculto hasta calcular su posición, por eso se espera al siguiente cuadro)
    useEffect(() => {
        if (conBuscador) return undefined;
        const cuadro = requestAnimationFrame(() => lista.current?.focus({ preventScroll: true }));
        return () => cancelAnimationFrame(cuadro);
    }, [conBuscador]);

    const filtradas = useMemo(() => {
        const q = consulta.trim().toLowerCase();
        return q ? opciones.filter((o) => o.etiqueta.toLowerCase().includes(q)) : opciones;
    }, [opciones, consulta]);
    const indiceActivo = Math.min(activa, Math.max(0, filtradas.length - 1));

    /** @param {number} i */
    const mover = (i) => {
        setActiva(i);
        lista.current?.children[i]?.scrollIntoView({ block: 'nearest' });
    };

    /** @param {import('react').KeyboardEvent} e */
    const alPulsar = (e) => {
        const n = filtradas.length;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (n) mover((indiceActivo + 1) % n);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (n) mover((indiceActivo - 1 + n) % n);
        } else if (e.key === 'Home') {
            e.preventDefault();
            mover(0);
        } else if (e.key === 'End') {
            e.preventDefault();
            mover(Math.max(0, n - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtradas[indiceActivo]) onElegir(filtradas[indiceActivo].valor);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onCerrar(true);
        } else if (e.key === 'Tab') {
            onCerrar(false);
        }
    };

    return (
        <PanelFlotante origen={origen} onCerrar={() => onCerrar(false)} anchoMin={anchoMin}>
            <div
                onKeyDown={alPulsar}
                className="flex min-h-0 flex-col"
                style={
                    colorActivo ? /** @type {import('react').CSSProperties} */ ({ '--dia': colorActivo }) : undefined
                }
            >
                {conBuscador && (
                    <div className="relative p-1 pb-2">
                        <MagnifyingGlass size={16} aria-hidden="true" className="absolute top-3.5 left-4 text-soft" />
                        <input
                            autoFocus
                            type="text"
                            autoComplete="off"
                            placeholder="Buscar"
                            aria-label="Buscar en la lista"
                            value={consulta}
                            onChange={(e) => {
                                setConsulta(e.target.value);
                                setActiva(0);
                            }}
                            className="body-6 w-full rounded-lg border border-line bg-canvas py-2 pr-3 pl-8 text-ink outline-none focus:border-ink"
                        />
                    </div>
                )}
                <ul
                    ref={lista}
                    id={id}
                    role="listbox"
                    aria-label={rotulo}
                    tabIndex={0}
                    className="grid min-h-0 grid-cols-[minmax(0,1fr)] gap-0.5 overflow-x-hidden overflow-y-auto overscroll-contain outline-none [scrollbar-color:#cfcfd4_transparent] [scrollbar-width:thin]"
                >
                    {filtradas.length === 0 && <li className="body-6 p-3 text-center text-muted">Sin resultados</li>}
                    {filtradas.map((o, i) => {
                        const elegida = o.valor === valor;
                        return (
                            <li
                                key={o.valor === '' ? '__vacio' : o.valor}
                                role="option"
                                aria-selected={elegida}
                                onMouseMove={() => i !== indiceActivo && setActiva(i)}
                                onClick={() => onElegir(o.valor)}
                                className={`body-5 flex min-w-0 cursor-pointer items-center justify-between gap-2 rounded-lg p-2 text-ink ${
                                    elegida
                                        ? `font-semibold ${i === indiceActivo ? 'bg-(--dia)' : 'bg-[color-mix(in_srgb,var(--dia)_70%,white)]'}`
                                        : i === indiceActivo
                                          ? 'bg-fill'
                                          : ''
                                } ${o.valor === '' ? 'text-muted' : ''}`}
                            >
                                <span className="truncate">{o.etiqueta}</span>
                                {elegida && <Check size={16} aria-hidden="true" className="shrink-0" />}
                            </li>
                        );
                    })}
                </ul>
            </div>
        </PanelFlotante>
    );
}
