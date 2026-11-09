import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { iniciarSesionConGoogle } from '../api/auth.js';
import { useSesion } from '../hooks/useSesion.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { RUTA_INICIO } from '../components/layout/navegacion.js';

// Pantalla de login. Mismo diseño que public/index.html.
export default function Login() {
    const { usuario, iniciar } = useSesion();
    const toast = useToast();
    const [procesando, setProcesando] = useState(false);
    const hashProcesado = useRef(false);

    // Si Supabase vuelve a esta pantalla con el access_token en el fragmento (#...), se canjea por el JWT propio
    useEffect(() => {
        if (hashProcesado.current) return;
        const params = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = params.get('access_token');
        const error = new URLSearchParams(window.location.search).get('error');
        if (error) toast(decodeURIComponent(error), 'error', 8000);
        if (!accessToken) return;
        hashProcesado.current = true;
        setProcesando(true);
        iniciarSesionConGoogle(accessToken)
            .then((data) => iniciar(data.token, data.usuario))
            .catch((err) => toast(err.message || 'Error autenticando', 'error', 8000))
            .finally(() => {
                window.history.replaceState(null, '', window.location.pathname);
                setProcesando(false);
            });
    }, [iniciar, toast]);

    if (usuario) return <Navigate to={RUTA_INICIO} replace />;

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h1>📋 Asignaciones Las Vegas</h1>
                    <p>Inicia sesión con Google para gestionar conductores y turnos</p>
                </div>
                <button
                    type="button"
                    className="btn btn-google btn-block"
                    disabled={procesando}
                    onClick={() => {
                        window.location.href = '/api/auth/google';
                    }}
                >
                    <i className="fab fa-google"></i>
                    <span>{procesando ? 'Entrando…' : 'Iniciar sesión con Google'}</span>
                </button>
            </div>
        </div>
    );
}
