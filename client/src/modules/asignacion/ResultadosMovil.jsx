// @ts-check
import { useRef, useState } from 'react';
import { CalendarBlank, CalendarDots, CaretLeft, CaretRight } from '@phosphor-icons/react';
import Desplegable from '../../components/ui/Desplegable.jsx';
import { useMantenerPosicion } from '../../hooks/useMantenerPosicion.js';
import { DIAS, nombreDia } from '../../utils/dias.js';
import { fechaDelDia } from '../../utils/fechas.js';
import MenuFormatoFila from './MenuFormatoFila.jsx';
import TablaResultados, { CAMPO, CAMPO_LIBRE, COLOR_DIA } from './TablaResultados.jsx';
import { opcionesDeConductor } from './logica.js';

/**
 * @typedef {import('./logica.js').FilaResultado} FilaResultado
 * @typedef {import('../../types/models').Conductor} Conductor
 * @typedef {import('../../types/models').Dia} Dia
 * @typedef {import('../../types/models').Formato} Formato
 * @typedef {'dia' | 'semana'} Vista
 */

const CLAVE_VISTA = 'vistaAsignacion';

/** @returns {Vista} */
function leerVista() {
    try {
        return localStorage.getItem(CLAVE_VISTA) === 'semana' ? 'semana' : 'dia';
    } catch {
        return 'dia';
    }
}

// DiaNav y Campo se copian de modules/programa/EditorMovil.jsx: los módulos no se importan entre sí.
/** @param {{ idx: number, onMover: (delta: number) => void }} props */
function DiaNav({ idx, onMover }) {
    const n = DIAS.length;
    const lado =
        'button-sm flex min-w-0 items-center justify-center gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-ink transition-[transform,background-color] duration-300 ease-skill hover:bg-fill active:scale-[0.98]';
    return (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <button type="button" className={lado} onClick={() => onMover(-1)}>
                <CaretLeft size={16} aria-hidden="true" />
                <span className="truncate">{nombreDia(DIAS[(idx + n - 1) % n])}</span>
            </button>
            <span className="button-sm rounded-lg bg-primary px-4 py-2 text-white" aria-current="true">
                {nombreDia(DIAS[idx])}
            </span>
            <button type="button" className={lado} onClick={() => onMover(1)}>
                <span className="truncate">{nombreDia(DIAS[(idx + 1) % n])}</span>
                <CaretRight size={16} aria-hidden="true" />
            </button>
        </div>
    );
}

/** @param {{ etiqueta: string, ancho?: boolean, children: import('react').ReactNode }} props */
function Campo({ etiqueta, ancho = false, children }) {
    return (
        <div className={`min-w-0 ${ancho ? 'col-span-2' : ''}`}>
            <span className="caption-4 mb-1 block text-muted">{etiqueta}</span>
            {children}
        </div>
    );
}

/**
 * Resultados de Asignación en móvil: por día (una tarjeta por fila) o por semana (la misma tabla, con cada celda
 * completa y desplazamiento horizontal). La vista elegida se recuerda en el navegador.
 * @param {{
 *   filas: FilaResultado[],
 *   semanaInicio: string | undefined,
 *   conductores: Conductor[],
 *   cuenta: Record<string, number>,
 *   disponibles: Set<string>,
 *   elecciones: Record<string, string>,
 *   inicialmenteSinAsignar: Set<string>,
 *   formatos: Record<string, Formato>,
 *   onElegir: (turnoId: string, valor: string) => void,
 *   onFormato: (fila: FilaResultado) => void
 * }} props
 */
export default function ResultadosMovil(props) {
    const { filas, semanaInicio, conductores, cuenta, disponibles, elecciones, inicialmenteSinAsignar, formatos } =
        props;
    const contenedor = useRef(/** @type {HTMLDivElement | null} */ (null));
    const [vista, setVista] = useState(leerVista);
    // Empieza en el primer día que tiene filas
    const [diaIdx, setDiaIdx] = useState(() =>
        Math.max(
            0,
            DIAS.findIndex((d) => filas.some((f) => f.dia === d))
        )
    );
    const diaActivo = DIAS[diaIdx];
    const filasDia = filas.filter((f) => f.dia === diaActivo);

    // Al cambiar de vista el selector se queda en el mismo lugar de la pantalla, sin saltar ni quedar bajo el encabezado fijo
    const marcarPosicion = useMantenerPosicion(contenedor, vista);

    /** @param {Vista} v */
    const cambiarVista = (v) => {
        marcarPosicion();
        setVista(v);
        try {
            localStorage.setItem(CLAVE_VISTA, v);
        } catch {
            // sin almacenamiento: la vista no se recuerda
        }
    };

    /** @param {number} delta */
    const moverDia = (delta) => {
        const n = DIAS.length;
        setDiaIdx((i) => (((i + delta) % n) + n) % n);
        contenedor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    /** @param {FilaResultado} f */
    const menu = (f) => {
        const id = f.tipo === 'turno' ? f.resultado.turno_id : f.extra.id;
        return (
            <div className="mt-3 flex justify-end">
                <MenuFormatoFila
                    className="border border-line"
                    conFormato={!!id && Object.keys(formatos[id] || {}).length > 0}
                    onFormato={() => props.onFormato(f)}
                />
            </div>
        );
    };
    const tarjeta = 'rounded-lg border border-line bg-surface p-2';

    return (
        // scroll-mt-20: al llevar el bloque al inicio (moverDia) queda bajo el encabezado fijo de 64 px, no tapado por él
        <div ref={contenedor} className="tw scroll-mt-20">
            <div className="mb-4 flex justify-center">
                <div
                    className="inline-flex gap-1 rounded-xl bg-fill p-1"
                    role="group"
                    aria-label="Vista de la asignación"
                >
                    {
                        /** @type {const} */ ([
                            ['dia', CalendarBlank, 'Ver por día'],
                            ['semana', CalendarDots, 'Ver por semana']
                        ]).map(([v, Icono, texto]) => (
                            <button
                                key={v}
                                type="button"
                                aria-pressed={vista === v}
                                onClick={() => cambiarVista(v)}
                                className={`button-sm flex items-center gap-2 rounded-lg px-3 py-2 transition-[background-color,color,transform] duration-300 ease-skill active:scale-[0.98] ${
                                    vista === v ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
                                }`}
                            >
                                <Icono size={16} aria-hidden="true" />
                                {texto}
                            </button>
                        ))
                    }
                </div>
            </div>

            {vista === 'semana' ? (
                <TablaResultados {...props} completo />
            ) : (
                <>
                    <DiaNav idx={diaIdx} onMover={moverDia} />
                    <div className="mt-4 mb-3 flex items-baseline gap-2">
                        <h4 className="heading-6 text-ink">{nombreDia(diaActivo)}</h4>
                        <span className="body-6 text-muted">{fechaDelDia(semanaInicio, diaActivo)}</span>
                    </div>

                    <div className="grid gap-3">
                        {filasDia.map((f, i) => {
                            const estilo = /** @type {import('react').CSSProperties} */ ({ '--dia': COLOR_DIA[f.dia] });

                            if (f.tipo === 'extra') {
                                // Fila libre del programa: se muestra, no se asigna; solo los campos con texto
                                const e = f.extra;
                                const campos = /** @type {const} */ ([
                                    ['Hora', e.hora],
                                    ['Grupo', e.grupo],
                                    ['Territorio', e.territorio],
                                    ['P. Reunión', e.punto_reunion],
                                    ['Conductor', e.conductor]
                                ]).filter(([, texto]) => (texto || '').trim() !== '');
                                return (
                                    <div key={`e${i}`} style={estilo} className={tarjeta}>
                                        <div className="grid grid-cols-2 gap-2">
                                            {campos.map(([nombre, texto]) => (
                                                <Campo key={nombre} etiqueta={nombre} ancho>
                                                    <div className={CAMPO_LIBRE}>{(texto || '').trim()}</div>
                                                </Campo>
                                            ))}
                                        </div>
                                        {menu(f)}
                                    </div>
                                );
                            }

                            const r = f.resultado;
                            const valor = elecciones[r.turno_id] ?? '';
                            return (
                                <div key={r.turno_id} data-turno-id={r.turno_id} style={estilo} className={tarjeta}>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Campo etiqueta="Hora">
                                            <div className={`${CAMPO} font-medium`}>{r.hora || ''}</div>
                                        </Campo>
                                        <Campo etiqueta="Grupo">
                                            <div className={CAMPO}>{r.grupo || ''}</div>
                                        </Campo>
                                        <Campo etiqueta="Territorio" ancho>
                                            <div className={CAMPO}>{r.territorio || '—'}</div>
                                        </Campo>
                                        <Campo etiqueta="P. Reunión" ancho>
                                            <div className={CAMPO}>{r.punto_reunion || '—'}</div>
                                        </Campo>
                                        <Campo etiqueta="Conductor" ancho>
                                            <Desplegable
                                                rotulo={`Conductor del turno ${r.hora || ''} ${r.territorio || ''}`.trim()}
                                                valor={valor}
                                                onCambiar={(v) => props.onElegir(r.turno_id, v)}
                                                etiquetaVacio="SIN ASIGNAR"
                                                textoVacioChip="SIN ASIGNAR"
                                                anchoMin={260}
                                                sinRecorte
                                                claseTexto={valor ? '' : 'text-danger'}
                                                opciones={opcionesDeConductor(
                                                    r,
                                                    conductores,
                                                    cuenta,
                                                    disponibles,
                                                    inicialmenteSinAsignar.has(r.turno_id)
                                                )}
                                            />
                                        </Campo>
                                    </div>
                                    {menu(f)}
                                </div>
                            );
                        })}
                    </div>

                    {filasDia.length === 0 && (
                        <div className="rounded-lg bg-canvas p-6 text-center">
                            <p className="body-6 text-muted">Sin filas este día.</p>
                        </div>
                    )}

                    <div className="mt-4">
                        <DiaNav idx={diaIdx} onMover={moverDia} />
                    </div>
                </>
            )}
        </div>
    );
}
