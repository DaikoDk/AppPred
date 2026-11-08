// @ts-check
import { Outlet } from 'react-router-dom';
import Pestanas from '../../components/ui/Pestanas.jsx';
import { PESTANAS_HOJA } from '../../components/layout/navegacion.js';
import { useSesion } from '../../hooks/useSesion.jsx';

/**
 * Contenedor de Hoja de Predicación: barra de pestañas y, debajo, la sección activa (Outlet).
 * Las pestañas de super admin solo aparecen para ellos (RN-AUTH-04). La ruta de cada una la protege App.jsx.
 */
export default function HojaPredicacion() {
    const { esSuperAdmin } = useSesion();
    const items = PESTANAS_HOJA.filter((p) => !p.soloSuperAdmin || esSuperAdmin);
    return (
        <>
            <div className="tw sticky top-[76px] z-20 mx-auto -mt-8 mb-6 w-full max-w-[1244px] bg-[#f5f7fa] pt-8">
                <Pestanas items={items} etiqueta="Secciones de Hoja de Predicación" />
            </div>
            <Outlet />
        </>
    );
}
