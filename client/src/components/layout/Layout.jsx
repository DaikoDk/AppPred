import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import { tituloDeRuta } from './navegacion.js';

const ANCHO_MOVIL = 1024; // mismo corte que toggleSidebar() de la app anterior

export default function Layout() {
    const { pathname } = useLocation();
    const [colapsado, setColapsado] = useState(true);
    const [abierto, setAbierto] = useState(false);

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

    return (
        <div className="dashboard-layout">
            <Sidebar colapsado={colapsado} abierto={abierto} onNavegar={cerrarPanelMovil} />
            <div className={`sidebar-overlay${abierto ? ' active' : ''}`} onClick={cerrarPanelMovil}></div>
            <main className="main-content">
                <TopBar titulo={tituloDeRuta(pathname)} onAlternarSidebar={alternar} />
                <div className="page-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
