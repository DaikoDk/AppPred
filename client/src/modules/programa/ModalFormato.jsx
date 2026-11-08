import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CAMPOS_FORMATO, FORMATO_DEFECTO, limpiarFormato } from './filas.js';

/**
 * @typedef {import('../../types/models').Formato} Formato
 * @typedef {import('../../types/models').FormatoCelda} FormatoCelda
 * @typedef {import('../../types/models').CampoFormato} CampoFormato
 */

const PATH_V = {
    top: 'M4 3h12M10 17V7M6.5 10.5 10 7l3.5 3.5',
    middle: 'M4 10h12M10 2v5M7.5 4.5 10 7l2.5-2.5M10 18v-5M7.5 15.5 10 13l2.5 2.5',
    bottom: 'M4 17h12M10 3v10M6.5 9.5 10 13l3.5-3.5'
};

/** @param {{ v: keyof typeof PATH_V }} props */
function IconoVertical({ v }) {
    return (
        <svg
            viewBox="0 0 20 20"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
        >
            <path d={PATH_V[v]} />
        </svg>
    );
}

/**
 * Formato por celda de una fila (abrirFormatoFila). El cambio se guarda al guardar el programa (RN-FMT-04).
 * @param {{
 *   formato: Formato,
 *   esLibre: boolean,
 *   descripcion: string,
 *   onAplicar: (formato: Formato) => void,
 *   onCerrar: () => void
 * }} props
 */
export default function ModalFormato({ formato, esLibre, descripcion, onAplicar, onCerrar }) {
    const [borrador, setBorrador] = useState(/** @type {Formato} */ (JSON.parse(JSON.stringify(formato || {}))));
    const [celda, setCelda] = useState(/** @type {CampoFormato} */ ('territorio'));

    useEffect(() => {
        const onKey = (/** @type {KeyboardEvent} */ e) => {
            if (e.key === 'Escape') onCerrar();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCerrar]);

    const actual = { ...FORMATO_DEFECTO, ...(borrador[celda] || {}) };
    /** @param {Partial<FormatoCelda>} cambio */
    const editar = (cambio) => setBorrador((b) => ({ ...b, [celda]: { ...(b[celda] || {}), ...cambio } }));
    /** @param {'b' | 'i' | 's'} k */
    const alternar = (k) => editar({ [k]: !(borrador[celda] || {})[k] });
    const restablecer = () =>
        setBorrador((b) => {
            const copia = { ...b };
            delete copia[celda];
            return copia;
        });

    /** @param {boolean} activo */
    const cls = (activo) => (activo ? 'activo' : undefined);

    // Se dibuja en el body: fuera de cualquier contenedor `tw`, para conservar sus estilos
    return createPortal(
        <div
            className="modal-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onCerrar();
            }}
        >
            <div className="modal-content modal-confirm modal-formato" role="dialog" aria-modal="true">
                <button type="button" className="modal-cerrar" aria-label="Cerrar" onClick={onCerrar}>
                    &times;
                </button>
                <div className="modal-confirm-body">
                    <div className="modal-confirm-icon">
                        <i className="fas fa-paintbrush"></i>
                    </div>
                    <h3>Formato de celdas</h3>
                    <p className="fmt-fila">{descripcion}</p>
                    <div className="fmt-celdas">
                        {CAMPOS_FORMATO.map((c) => {
                            const conFormato =
                                Object.keys(limpiarFormato({ [c.campo]: borrador[c.campo] || {} })).length > 0;
                            const clases = [c.campo === celda ? 'activo' : '', conFormato ? 'con-formato' : '']
                                .filter(Boolean)
                                .join(' ');
                            return (
                                <button
                                    key={c.campo}
                                    type="button"
                                    data-celda={c.campo}
                                    className={clases || undefined}
                                    onClick={() => setCelda(c.campo)}
                                >
                                    <i className={c.icono}></i>
                                    <span>{c.etiqueta}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="fmt-controles">
                        <div className="fmt-grupo" title="Alineación horizontal">
                            {[
                                ['left', 'Izquierda', 'fa-align-left'],
                                ['center', 'Centro', 'fa-align-center'],
                                ['right', 'Derecha', 'fa-align-right']
                            ].map(([h, titulo, icono]) => (
                                <button
                                    key={h}
                                    type="button"
                                    data-h={h}
                                    title={titulo}
                                    className={cls(actual.h === h)}
                                    onClick={() => editar({ h: /** @type {FormatoCelda['h']} */ (h) })}
                                >
                                    <i className={`fas ${icono}`}></i>
                                </button>
                            ))}
                        </div>
                        <div className="fmt-grupo" title="Estilo">
                            {[
                                ['b', 'Negrita', 'fa-bold'],
                                ['i', 'Cursiva', 'fa-italic'],
                                ['s', 'Tachado', 'fa-strikethrough']
                            ].map(([t, titulo, icono]) => (
                                <button
                                    key={t}
                                    type="button"
                                    data-t={t}
                                    title={titulo}
                                    className={cls(!!actual[/** @type {'b' | 'i' | 's'} */ (t)])}
                                    onClick={() => alternar(/** @type {'b' | 'i' | 's'} */ (t))}
                                >
                                    <i className={`fas ${icono}`}></i>
                                </button>
                            ))}
                        </div>
                        <div className="fmt-grupo" title="Alineación vertical">
                            {
                                /** @type {const} */ ([
                                    ['top', 'Arriba'],
                                    ['middle', 'Centro'],
                                    ['bottom', 'Abajo']
                                ]).map(([v, titulo]) => (
                                    <button
                                        key={v}
                                        type="button"
                                        data-v={v}
                                        title={titulo}
                                        className={cls(actual.v === v)}
                                        onClick={() => editar({ v })}
                                    >
                                        <IconoVertical v={v} />
                                    </button>
                                ))
                            }
                        </div>
                    </div>
                    <button type="button" className="fmt-reset" onClick={restablecer}>
                        <i className="fas fa-rotate-left"></i> Formato por defecto en esta celda
                    </button>
                    <p className="fmt-nota" hidden={!(celda === 'conductor' && !esLibre)}>
                        En este turno la celda Conductor es el nombre asignado; el formato se aplica al exportar.
                    </p>
                </div>
                <div className="modal-confirm-actions">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onAplicar(limpiarFormato(borrador))}
                    >
                        Aplicar
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={onCerrar}>
                        Cancelar
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
