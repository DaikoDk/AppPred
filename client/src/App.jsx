import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout.jsx';
import { SesionProvider, useSesion } from './hooks/useSesion.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import Login from './pages/Login.jsx';

// Cada módulo se carga bajo demanda (ADR-019)
const Programa = lazy(() => import('./modules/programa/index.jsx'));
const Asignacion = lazy(() => import('./modules/asignacion/index.jsx'));
const Plantilla = lazy(() => import('./modules/plantilla/index.jsx'));
const Conductores = lazy(() => import('./modules/conductores/index.jsx'));
const Puntos = lazy(() => import('./modules/puntos/index.jsx'));
const Historial = lazy(() => import('./modules/historial/index.jsx'));
const Admin = lazy(() => import('./modules/admin/index.jsx'));

// Solo con sesión válida; si no, al login (RN-AUTH-09)
function RutaPrivada({ children }) {
    const { usuario } = useSesion();
    return usuario ? children : <Navigate to="/login" replace />;
}

// La pestaña Admin es solo para super admins (RN-AUTH-04, RN-AUTH-08)
function RutaSuperAdmin({ children }) {
    const { esSuperAdmin } = useSesion();
    return esSuperAdmin ? children : <Navigate to="/programa" replace />;
}

function Rutas() {
    const { cargando } = useSesion();
    if (cargando) return null;
    return (
        <Suspense fallback={null}>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    element={
                        <RutaPrivada>
                            <Layout />
                        </RutaPrivada>
                    }
                >
                    <Route path="/programa" element={<Programa />} />
                    <Route path="/asignacion" element={<Asignacion />} />
                    <Route path="/plantilla" element={<Plantilla />} />
                    <Route path="/conductores" element={<Conductores />} />
                    <Route path="/puntos" element={<Puntos />} />
                    <Route path="/historial" element={<Historial />} />
                    <Route
                        path="/admin"
                        element={
                            <RutaSuperAdmin>
                                <Admin />
                            </RutaSuperAdmin>
                        }
                    />
                </Route>
                <Route path="*" element={<Navigate to="/programa" replace />} />
            </Routes>
        </Suspense>
    );
}

export default function App() {
    return (
        <ToastProvider>
            <SesionProvider>
                <Rutas />
            </SesionProvider>
        </ToastProvider>
    );
}
