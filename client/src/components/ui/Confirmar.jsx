import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

/**
 * Opciones del modal; mismas que confirmarModal() del front actual (ADR-016).
 * @typedef {{
 *   titulo: string,
 *   mensaje: string,
 *   textoConfirmar?: string,
 *   peligro?: boolean,
 *   icono?: string,
 *   espera?: number,
 *   alternativa?: { texto: string, icono?: string, secundario?: boolean } | null,
 *   exito?: boolean,
 *   cerrable?: boolean,
 *   advertencia?: { titulo: string, items: string[] } | null
 * }} OpcionesConfirmar
 *
 * Resultado: true (confirmar), 'alternativa' o false (cancelar, Escape, clic fuera o ×).
 * @typedef {true | false | 'alternativa'} ResultadoConfirmar
 */

const ConfirmarContext = createContext(
    /** @type {((opciones: OpcionesConfirmar) => Promise<ResultadoConfirmar>) | null} */ (null)
);

/**
 * @param {{ opciones: OpcionesConfirmar, onCerrar: (r: ResultadoConfirmar) => void }} props
 */
function ModalConfirmar({ opciones, onCerrar }) {
    const {
        titulo,
        mensaje,
        textoConfirmar = 'Confirmar',
        peligro = false,
        icono = 'fa-question-circle',
        espera = 0,
        alternativa = null,
        exito = false,
        cerrable = false,
        advertencia = null
    } = opciones;
    const [restante, setRestante] = useState(espera);
    const btnOtro = useRef(/** @type {HTMLButtonElement | null} */ (null));

    // Cuenta regresiva antes de poder confirmar (por ejemplo, 10 s al eliminar un programa: RN-PROG-06)
    useEffect(() => {
        if (restante <= 0) return undefined;
        const t = setTimeout(() => setRestante((r) => r - 1), 1000);
        return () => clearTimeout(t);
    }, [restante]);

    useEffect(() => {
        btnOtro.current?.focus();
        const onKey = (/** @type {KeyboardEvent} */ e) => {
            if (e.key === 'Escape') onCerrar(false);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [onCerrar]);

    const bloqueado = restante > 0;
    const clasesIcono = ['modal-confirm-icon', peligro ? 'peligro' : '', exito ? 'exito' : ''].join(' ');
    const claseOtro = alternativa && !alternativa.secundario ? 'btn-primary' : 'btn-secondary';

    return (
        <div
            className="modal-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) onCerrar(false);
            }}
        >
            <div className="modal-content modal-confirm" role="dialog" aria-modal="true">
                {cerrable && (
                    <button type="button" className="modal-cerrar" aria-label="Cerrar" onClick={() => onCerrar(false)}>
                        &times;
                    </button>
                )}
                <div className="modal-confirm-body">
                    <div className={clasesIcono}>
                        <i className={`fas ${icono}`}></i>
                    </div>
                    <h3>{titulo}</h3>
                    <p>{mensaje}</p>
                    {advertencia && advertencia.items.length > 0 && (
                        <div className="modal-aviso">
                            <strong>{advertencia.titulo}</strong>
                            <ul>
                                {advertencia.items.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="modal-confirm-actions">
                    <button
                        type="button"
                        className={`btn ${peligro ? 'btn-danger' : 'btn-primary'}`}
                        disabled={bloqueado}
                        onClick={() => onCerrar(true)}
                    >
                        {bloqueado ? `${textoConfirmar} (${restante}s)` : textoConfirmar}
                    </button>
                    <button
                        type="button"
                        ref={btnOtro}
                        className={`btn ${claseOtro}`}
                        onClick={() => onCerrar(alternativa ? 'alternativa' : false)}
                    >
                        {alternativa && (
                            <>
                                <i className={`fas ${alternativa.icono || 'fa-edit'}`}></i>{' '}
                            </>
                        )}
                        {alternativa ? alternativa.texto : 'Cancelar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ConfirmarProvider({ children }) {
    const [actual, setActual] = useState(
        /** @type {{ opciones: OpcionesConfirmar, resolver: (r: ResultadoConfirmar) => void } | null} */ (null)
    );

    const confirmar = useCallback(
        (/** @type {OpcionesConfirmar} */ opciones) =>
            /** @type {Promise<ResultadoConfirmar>} */ (
                new Promise((resolver) => {
                    setActual({ opciones, resolver });
                })
            ),
        []
    );

    const cerrar = useCallback(
        (/** @type {ResultadoConfirmar} */ resultado) => {
            actual?.resolver(resultado);
            setActual(null);
        },
        [actual]
    );

    return (
        <ConfirmarContext.Provider value={confirmar}>
            {children}
            {actual && <ModalConfirmar opciones={actual.opciones} onCerrar={cerrar} />}
        </ConfirmarContext.Provider>
    );
}

/** Devuelve confirmar(opciones) → Promise<true | false | 'alternativa'>. */
export function useConfirmar() {
    const ctx = useContext(ConfirmarContext);
    if (!ctx) throw new Error('useConfirmar debe usarse dentro de <ConfirmarProvider>');
    return ctx;
}
