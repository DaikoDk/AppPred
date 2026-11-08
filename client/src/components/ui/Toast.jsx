import { createContext, useCallback, useContext, useRef, useState } from 'react';

/** @typedef {'success' | 'error' | 'warning' | 'info'} TipoToast */

const ToastContext = createContext(
    /** @type {((mensaje: string, tipo?: TipoToast, duracion?: number) => void) | null} */ (null)
);

// Mismo marcado y clases que showToast del front actual (#toast-container, .toast, .toast-<tipo>)
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState(/** @type {{ id: number, mensaje: string, tipo: TipoToast }[]} */ ([]));
    const siguienteId = useRef(0);

    const quitar = useCallback((/** @type {number} */ id) => {
        setToasts((lista) => lista.filter((t) => t.id !== id));
    }, []);

    const mostrar = useCallback(
        (/** @type {string} */ mensaje, /** @type {TipoToast} */ tipo = 'info', duracion = 4000) => {
            const id = siguienteId.current++;
            setToasts((lista) => [...lista, { id, mensaje, tipo }]);
            setTimeout(() => quitar(id), duracion);
        },
        [quitar]
    );

    return (
        <ToastContext.Provider value={mostrar}>
            {children}
            <div id="toast-container">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast-${t.tipo}`}>
                        <span>{t.mensaje}</span>
                        <button type="button" onClick={() => quitar(t.id)}>
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
    return ctx;
}
