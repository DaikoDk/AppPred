import { useSesion } from '../../hooks/useSesion.jsx';

/**
 * @param {{ titulo: string, onAlternarSidebar: () => void }} props
 */
export default function TopBar({ titulo, onAlternarSidebar }) {
    const { usuario } = useSesion();
    const nombre = usuario?.nombre || usuario?.email || 'Usuario';
    return (
        <header className="top-bar">
            <div className="top-bar-left">
                <button type="button" className="btn-toggle-sidebar" onClick={onAlternarSidebar}>
                    <i className="fas fa-bars"></i>
                </button>
                <h2 id="page-title">{titulo}</h2>
            </div>
            <div className="user-menu">
                <div className="user-info">
                    <div className="user-avatar">{(usuario?.nombre || 'U')[0]}</div>
                    <div className="user-details">
                        <span className="user-name">{nombre}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
