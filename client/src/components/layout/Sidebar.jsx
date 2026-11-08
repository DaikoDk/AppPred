import { NavLink } from 'react-router-dom';
import { ITEMS_NAV } from './navegacion.js';
import { useSesion } from '../../hooks/useSesion.jsx';

/**
 * Mismo marcado y clases que el <aside> de public/dashboard.html.
 * @param {{ colapsado: boolean, abierto: boolean, onNavegar: () => void }} props
 */
export default function Sidebar({ colapsado, abierto, onNavegar }) {
    const { esSuperAdmin, cerrar } = useSesion();
    const clases = ['sidebar', colapsado ? 'collapsed' : '', abierto ? 'open' : ''].filter(Boolean).join(' ');

    return (
        <aside className={clases} id="sidebar">
            <div className="sidebar-header">
                <h1>
                    <i className="fas fa-map-marker-alt"></i> <span>Predicación</span>
                </h1>
            </div>
            {/* Contraído, los tooltips salen hacia la derecha: sin recorte no aparece la barra de desplazamiento */}
            <nav className={`sidebar-nav ${colapsado ? 'overflow-visible!' : ''}`}>
                {ITEMS_NAV.filter((i) => !i.soloSuperAdmin || esSuperAdmin).map((item) => (
                    <NavLink
                        key={item.ruta}
                        to={item.ruta}
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                        data-tooltip={item.tooltip}
                        onClick={onNavegar}
                    >
                        <i className={`fas ${item.icono}`}></i> <span>{item.titulo}</span>
                    </NavLink>
                ))}
                <a
                    href="#"
                    className="nav-item logout"
                    data-tooltip="Cerrar Sesión"
                    onClick={(e) => {
                        e.preventDefault();
                        cerrar();
                    }}
                >
                    <i className="fas fa-sign-out-alt"></i> <span>Cerrar Sesión</span>
                </a>
            </nav>
        </aside>
    );
}
