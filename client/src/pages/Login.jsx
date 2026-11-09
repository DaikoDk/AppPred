import { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CalendarCheck, GoogleLogo } from '@phosphor-icons/react';
import { iniciarSesionConGoogle } from '../api/auth.js';
import { useSesion } from '../hooks/useSesion.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { RUTA_INICIO } from '../components/layout/navegacion.js';

/**
 * Marco de la pantalla: fondo plano, tarjeta centrada y marca. Se comparte entre el login y el aviso de ingreso para que
 * la tarjeta no cambie de forma al pasar de uno a otro (ADR-021).
 * @param {{ children: import('react').ReactNode }} props
 */
function Marco({ children }) {
    return (
        <main className="tw flex min-h-dvh items-center justify-center bg-canvas px-4 py-8 text-ink">
            <div className="animate-sube w-full max-w-[400px] rounded-3xl border border-line bg-surface p-8">
                <div className="flex flex-col items-center gap-6 text-center">
                    <span
                        className="flex size-12 items-center justify-center rounded-2xl bg-primary text-white"
                        aria-hidden="true"
                    >
                        <CalendarCheck size={24} weight="bold" />
                    </span>
                    <div className="flex flex-col gap-2">
                        <h1 className="heading-4 bg-linear-to-r from-black to-[#666666] bg-clip-text text-transparent">
                            Asignaciones Las Vegas
                        </h1>
                        <p className="body-6 text-muted">Gestiona conductores y turnos de predicación.</p>
                    </div>
                    {children}
                </div>
            </div>
        </main>
    );
}

// Pantalla de login. Mismo diseño que public/index.html.
export default function Login() {
    const { usuario, iniciar } = useSesion();
    const toast = useToast();
    // Arranca en true si se vuelve de Google con el token, para no parpadear el login
    const [procesando, setProcesando] = useState(() => window.location.hash.includes('access_token'));
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

    // Mientras se canjea el token no se muestra el botón: solo el aviso de ingreso
    if (procesando) {
        return (
            <Marco>
                <div className="flex w-full flex-col gap-3" role="status">
                    <p className="body-5 text-ink">Ingresando…</p>
                    <div className="h-1 w-full overflow-hidden rounded-full bg-fill">
                        <div className="h-full w-1/3 animate-barra rounded-full bg-primary" />
                    </div>
                </div>
            </Marco>
        );
    }

    return (
        <Marco>
            <div className="flex w-full flex-col gap-3">
                <button
                    type="button"
                    className="button-md inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-primary px-3 py-2 text-white transition-[transform,background-color] duration-300 ease-skill hover:bg-primary-dark active:scale-[0.98]"
                    onClick={() => {
                        window.location.href = '/api/auth/google';
                    }}
                >
                    <GoogleLogo size={20} weight="bold" aria-hidden="true" />
                    Continuar con Google
                </button>
                <p className="caption-5 text-soft">Solo pueden entrar los correos autorizados por un administrador.</p>
            </div>
        </Marco>
    );
}
