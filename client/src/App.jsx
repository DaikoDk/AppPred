import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import { RUTA_INICIO, RUTAS_ANTIGUAS } from './components/layout/navegacion.js';
import HojaPredicacion from './modules/hoja/HojaPredicacion.jsx';
import { SesionProvider, useSesion } from './hooks/useSesion.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import { ConfirmarProvider } from './components/ui/Confirmar.jsx';
import { CargandoProvider } from './components/ui/Cargando.jsx';
import Login from './pages/Login.jsx';

// Cada módulo se carga bajo demanda (ADR-019)
const Programa = lazy(() => import('./modules/programa/index.jsx'));
const Asignacion = lazy(() => import('./modules/asignacion/index.jsx'));
const Plantilla = lazy(() => import('./modules/programa/Plantilla.jsx'));
const Conductores = lazy(() => import('./modules/conductores/index.jsx'));
const Puntos = lazy(() => import('./modules/puntos/index.jsx'));
const Historial = lazy(() => import('./modules/historial/index.jsx'));
const Configuracion = lazy(() => import('./modules/configuracion/index.jsx'));
const Admin = lazy(() => import('./modules/admin/index.jsx'));
// Vitrina de componentes: solo en desarrollo, no entra al build
const DevComponentes = import.meta.env.DEV ? lazy(() => import('./pages/DevComponentes.jsx')) : null;

// Raíz: Supabase vuelve aquí tras el login con Google (#access_token=...) o con ?error=...;
// en ese caso se muestra el login para completar el ingreso. Si no, se va a la primera pestaña de la hoja.
function Inicio() {
    const { hash, search } = useLocation();
    if (hash.includes('access_token') || new URLSearchParams(search).has('error')) return <Login />;
    return <Navigate to={RUTA_INICIO} replace />;
}

// Solo con sesión válida; si no, al login (RN-AUTH-09)
function RutaPrivada({ children }) {
    const { usuario } = useSesion();
    return usuario ? children : <Navigate to="/login" replace />;
}

// Admin y la pestaña Configuración son solo para super admins (RN-AUTH-04, RN-AUTH-08)
function RutaSuperAdmin({ children }) {
    const { esSuperAdmin } = useSesion();
    return esSuperAdmin ? children : <Navigate to={RUTA_INICIO} replace />;
}

function Rutas() {
    const { cargando } = useSesion();
    if (cargando) return null;
    return (
        <Suspense fallback={null}>
            <Routes>
                <Route path="/" element={<Inicio />} />
                <Route path="/login" element={<Login />} />
                {DevComponentes && <Route path="/dev/componentes" element={<DevComponentes />} />}
                {/* Rutas de antes de Hoja de Predicación: se redirigen a su pestaña (RN-UI-08) */}
                {Object.entries(RUTAS_ANTIGUAS).map(([antigua, nueva]) => (
                    <Route key={antigua} path={antigua} element={<Navigate to={nueva} replace />} />
                ))}
                <Route
                    element={
                        <RutaPrivada>
                            <Layout />
                        </RutaPrivada>
                    }
                >
                    <Route path="/hoja" element={<HojaPredicacion />}>
                        <Route index element={<Navigate to="programa" replace />} />
                        <Route path="programa" element={<Programa />} />
                        <Route path="asignacion" element={<Asignacion />} />
                        <Route path="plantilla" element={<Plantilla />} />
                        <Route path="conductores" element={<Conductores />} />
                        <Route path="puntos" element={<Puntos />} />
                        <Route path="historial" element={<Historial />} />
                        <Route
                            path="configuracion"
                            element={
                                <RutaSuperAdmin>
                                    <Configuracion />
                                </RutaSuperAdmin>
                            }
                        />
                    </Route>
                    <Route
                        path="/admin"
                        element={
                            <RutaSuperAdmin>
                                <Admin />
                            </RutaSuperAdmin>
                        }
                    />
                </Route>
                <Route path="*" element={<Navigate to={RUTA_INICIO} replace />} />
            </Routes>
        </Suspense>
    );
}

export default function App() {
    return (
        <ToastProvider>
            <ConfirmarProvider>
                <CargandoProvider>
                    <SesionProvider>
                        <Rutas />
                    </SesionProvider>
                </CargandoProvider>
            </ConfirmarProvider>
        </ToastProvider>
    );
}
