// @ts-check
import { Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, useOutletContext } from 'react-router-dom';
import ActividadMientras from '../../components/ui/ActividadMientras.jsx';
import BarraInferior from '../../components/ui/BarraInferior.jsx';
import Pestanas from '../../components/ui/Pestanas.jsx';
import { PESTANAS_HOJA } from '../../components/layout/navegacion.js';
import { useSesion } from '../../hooks/useSesion.jsx';

/**
 * Contenedor de Hoja de Predicación. En escritorio: barra de pestañas arriba (fija al hacer scroll).
 * En móvil (menos de 640px): barra inferior con las secciones principales y "Más" para el resto; se monta en el
 * espacio que Layout deja pegado al fondo de la pantalla (`slotBarra`), no con position: fixed.
 * Las pestañas de super admin solo aparecen para ellos (RN-AUTH-04). La ruta de cada una la protege App.jsx.
 */
export default function HojaPredicacion() {
    const { esSuperAdmin } = useSesion();
    const { slotBarra } = /** @type {{ slotBarra: HTMLElement | null }} */ (useOutletContext());
    const items = PESTANAS_HOJA.filter((p) => !p.soloSuperAdmin || esSuperAdmin);
    const barra = items.filter((p) => p.enBarra);
    const mas = items.filter((p) => !p.enBarra);
    return (
        <>
            <div className="tw sticky top-[76px] z-20 mx-auto -mt-8 mb-6 hidden w-full max-w-[1244px] bg-[#f5f7fa] pt-8 sm:block">
                <Pestanas items={items} etiqueta="Secciones de Hoja de Predicación" />
            </div>
            {/* Mientras carga el código de una pestaña solo cambia el contenido; el indicador de carga avisa */}
            <Suspense fallback={<ActividadMientras />}>
                <Outlet />
            </Suspense>
            {slotBarra && createPortal(<BarraInferior barra={barra} mas={mas} />, slotBarra)}
        </>
    );
}
