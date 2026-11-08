import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import { tituloDeRuta } from './navegacion.js';

const ANCHO_MOVIL = 1024; // mismo corte que toggleSidebar() de la app anterior

export default function Layout() {
    const { pathname } = useLocation();
    const [colapsado, setColapsado] = useState(true);
    const [abierto, setAbierto] = useState(false);
    // Espacio al fondo de la pantalla donde una pestaña monta su barra inferior (móvil); lo recibe por Outlet context
    const [slotBarra, setSlotBarra] = useState(/** @type {HTMLDivElement | null} */ (null));

    // Alto visible de la ventana en px (--alto-app). 100dvh no es fiable en Android (Brave da un valor menor al que se ve) y
    // el evento resize de la ventana no se dispara cuando el navegador esconde o muestra su barra: sí lo hace el de visualViewport.
    useEffect(() => {
        const vv = window.visualViewport;
        const medir = () =>
            document.documentElement.style.setProperty(
                '--alto-app',
                Math.round(vv?.height ?? window.innerHeight) + 'px'
            );
        medir();
        document.documentElement.classList.add('shell-movil');
        window.addEventListener('resize', medir);
        window.addEventListener('orientationchange', medir);
        vv?.addEventListener('resize', medir);
        return () => {
            window.removeEventListener('resize', medir);
            window.removeEventListener('orientationchange', medir);
            vv?.removeEventListener('resize', medir);
            document.documentElement.classList.remove('shell-movil');
        };
    }, []);

    // En pantallas chicas el sidebar es un panel con fondo; en grandes se colapsa o expande
    const alternar = () => {
        if (window.innerWidth <= ANCHO_MOVIL) {
            setColapsado(false);
            setAbierto((a) => !a);
        } else {
            setColapsado((c) => !c);
        }
    };
    const cerrarPanelMovil = () => setAbierto(false);

    // En móvil (menos de 640px) la pantalla mide lo que se ve (--alto-app) y solo el contenido hace scroll: así el
    // navegador no esconde ni mueve su barra y el espacio de la barra inferior queda siempre sobre ella.
    return (
        <div className="dashboard-layout max-sm:h-[var(--alto-app,100dvh)] max-sm:min-h-0 max-sm:overflow-hidden">
            <Sidebar colapsado={colapsado} abierto={abierto} onNavegar={cerrarPanelMovil} />
            <div className={`sidebar-overlay${abierto ? ' active' : ''}`} onClick={cerrarPanelMovil}></div>
            <main className="main-content max-sm:h-[var(--alto-app,100dvh)] max-sm:min-h-0 max-sm:overflow-x-hidden max-sm:overflow-y-auto max-sm:overscroll-contain max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden">
                <TopBar titulo={tituloDeRuta(pathname)} onAlternarSidebar={alternar} />
                <div className="page-content">
                    <Outlet context={{ slotBarra }} />
                </div>
                <div ref={setSlotBarra} className="sticky bottom-0 z-30 shrink-0 sm:hidden" />
            </main>
        </div>
    );
}
