import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EVENTO_SESION_VENCIDA, getToken } from '../api/client.js';
import { borrarSesion, consultarEsSuperAdmin, guardarSesion, leerUsuarioGuardado, validarSesion } from '../api/auth.js';

/**
 * @typedef {import('../types/models').Usuario} Usuario
 * @typedef {{
 *   usuario: Usuario | null,
 *   esSuperAdmin: boolean,
 *   cargando: boolean,
 *   iniciar: (token: string, usuario: Usuario) => void,
 *   cerrar: () => void,
 *   refrescarRol: () => Promise<void>
 * }} Sesion
 */

const SesionContext = createContext(/** @type {Sesion | null} */ (null));

export function SesionProvider({ children }) {
    const [usuario, setUsuario] = useState(/** @type {Usuario | null} */ (null));
    const [esSuperAdmin, setEsSuperAdmin] = useState(false);
    const [cargando, setCargando] = useState(true);

    const cerrar = useCallback(() => {
        borrarSesion();
        setUsuario(null);
        setEsSuperAdmin(false);
    }, []);

    const iniciar = useCallback((/** @type {string} */ token, /** @type {Usuario} */ u) => {
        guardarSesion(token, u);
        setUsuario(u);
        consultarEsSuperAdmin().then(setEsSuperAdmin);
    }, []);

    // Tras cambiar roles (por ejemplo, renunciar como super admin) se vuelve a consultar
    const refrescarRol = useCallback(async () => {
        setEsSuperAdmin(await consultarEsSuperAdmin());
    }, []);

    // Al abrir la app: si hay token, se valida contra el servidor (como checkAuth de la app anterior)
    useEffect(() => {
        let activo = true;
        if (!getToken()) {
            setCargando(false);
            return undefined;
        }
        validarSesion()
            .then(async () => {
                if (!activo) return;
                setUsuario(leerUsuarioGuardado());
                setEsSuperAdmin(await consultarEsSuperAdmin());
            })
            .catch(() => {
                if (activo) cerrar();
            })
            .finally(() => {
                if (activo) setCargando(false);
            });
        return () => {
            activo = false;
        };
    }, [cerrar]);

    // Cualquier llamada que detecte el token vencido cierra la sesión (RN-AUTH-09)
    useEffect(() => {
        window.addEventListener(EVENTO_SESION_VENCIDA, cerrar);
        return () => window.removeEventListener(EVENTO_SESION_VENCIDA, cerrar);
    }, [cerrar]);

    const valor = useMemo(
        () => ({ usuario, esSuperAdmin, cargando, iniciar, cerrar, refrescarRol }),
        [usuario, esSuperAdmin, cargando, iniciar, cerrar, refrescarRol]
    );
    return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>;
}

export function useSesion() {
    const ctx = useContext(SesionContext);
    if (!ctx) throw new Error('useSesion debe usarse dentro de <SesionProvider>');
    return ctx;
}
