import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/** @typedef {{ mostrar: (texto?: string) => void, ocultar: () => void }} ControlCargando */

const CargandoContext = createContext(/** @type {ControlCargando | null} */ (null));

// Pantalla que cubre todo y no deja tocar nada hasta que termina (RN-UI-06).
// Mismo marcado que mostrarCargando() del front actual.
export function CargandoProvider({ children }) {
    const [texto, setTexto] = useState(/** @type {string | null} */ (null));

    const mostrar = useCallback((/** @type {string | undefined} */ t) => {
        if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
        setTexto(t || 'Cargando…');
    }, []);
    const ocultar = useCallback(() => setTexto(null), []);
    const control = useMemo(() => ({ mostrar, ocultar }), [mostrar, ocultar]);

    return (
        <CargandoContext.Provider value={control}>
            {children}
            {texto !== null && (
                <div id="cargando-overlay" className="cargando-overlay" role="alert" aria-busy="true">
                    <div className="cargando-spinner"></div>
                    <div className="cargando-texto">{texto}</div>
                </div>
            )}
        </CargandoContext.Provider>
    );
}

export function useCargando() {
    const ctx = useContext(CargandoContext);
    if (!ctx) throw new Error('useCargando debe usarse dentro de <CargandoProvider>');
    return ctx;
}
