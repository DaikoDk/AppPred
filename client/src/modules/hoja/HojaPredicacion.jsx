// @ts-check
import { Outlet } from 'react-router-dom';
import BarraInferior from '../../components/ui/BarraInferior.jsx';
import Pestanas from '../../components/ui/Pestanas.jsx';
import { PESTANAS_HOJA } from '../../components/layout/navegacion.js';
import { useSesion } from '../../hooks/useSesion.jsx';

/**
 * Contenedor de Hoja de Predicación. En escritorio: barra de pestañas arriba (fija al hacer scroll).
 * En móvil (menos de 640px): barra inferior con las secciones principales y "Más" para el resto.
 * Las pestañas de super admin solo aparecen para ellos (RN-AUTH-04). La ruta de cada una la protege App.jsx.
 */
export default function HojaPredicacion() {
    const { esSuperAdmin } = useSesion();
    const items = PESTANAS_HOJA.filter((p) => !p.soloSuperAdmin || esSuperAdmin);
    const barra = items.filter((p) => p.enBarra);
    const mas = items.filter((p) => !p.enBarra);
    return (
        <>
            <div className="tw sticky top-[76px] z-20 mx-auto -mt-8 mb-6 hidden w-full max-w-[1244px] bg-[#f5f7fa] pt-8 sm:block">
                <Pestanas items={items} etiqueta="Secciones de Hoja de Predicación" />
            </div>
            {/* Espacio para que la barra inferior no tape el final del contenido */}
            <div className="pb-20 sm:pb-0">
                <Outlet />
            </div>
            <BarraInferior barra={barra} mas={mas} />
        </>
    );
}
