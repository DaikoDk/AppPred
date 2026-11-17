import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import { tituloDeRuta } from './navegacion.js';
import { abreTeclado } from './teclado.js';

const ANCHO_MOVIL = 1024; // mismo corte que toggleSidebar() de la app anterior
// Espacio libre entre el campo enfocado y el borde de arriba del teclado
const MARGEN_TECLADO = 24;
// Espacio extra al final del contenido mientras hay un campo enfocado, para que también los últimos campos puedan subir
const ESPACIO_CAMPO = 'max-sm:pb-[100dvh]';
// Espera para mostrar la barra inferior al cerrar el teclado: Brave informa el alto completo cuando el teclado empieza a
// bajar, no cuando terminó, y la barra se veía un cuadro encima de él
const ESPERA_BARRA = 300;

export default function Layout() {
    const { pathname } = useLocation();
    const [colapsado, setColapsado] = useState(true);
    const [abierto, setAbierto] = useState(false);
    // Espacio al fondo de la pantalla donde una pestaña monta su barra inferior (móvil); lo recibe por Outlet context
    const [slotBarra, setSlotBarra] = useState(/** @type {HTMLDivElement | null} */ (null));

    // Alto de la pantalla en móvil (--alto-app) y teclado en pantalla (RN-UI-12).
    // - El alto es el visible (visualViewport): 100dvh no es fiable en Android y la barra del navegador tapaba la barra
    //   inferior (commit 728e60f). visualViewport sí cambia cuando el navegador esconde o muestra su barra.
    // - El teclado no achica la app: queda encima del contenido.
    // - Con el teclado abierto la barra inferior se oculta, para que no quede flotando sobre él. Está abierto si la pantalla
    //   perdió mucho alto: solo el foco no basta, porque Atrás o el gesto cierran el teclado sin quitar el foco y tocar el
    //   mismo campo lo reabre sin un focusin nuevo.
    // - visualViewport.height × scale no cambia con el zoom de pellizco; altoMax se reinicia al girar la pantalla.
    // - Brave no debe desplazar la vista para mostrar el campo: con el teclado abierto descuenta de visualViewport el alto
    //   de su barra inferior aunque esté escondida, y al desplazar la vista al máximo esos ~50 px quedaban debajo del final
    //   de la página, con el fondo de html (la franja azul; medido en un Poco X7 Pro). Por eso, al enfocar un campo la app
    //   lo deja justo encima del teclado moviendo su propio contenedor con scroll, antes de que el teclado salga: el campo
    //   ya está a la vista y Brave no desplaza nada. Se usa el alto del teclado de la vez anterior (la primera vez, media
    //   pantalla) y se corrige cuando el teclado termina de abrirse.
    const [escribiendo, setEscribiendo] = useState(false);
    const contenido = useRef(/** @type {HTMLDivElement | null} */ (null));
    useEffect(() => {
        const raiz = document.documentElement;
        const vv = window.visualViewport;
        let altoApp = 0;
        let altoMax = 0;
        let altoConTeclado = 0;
        let ancho = window.innerWidth;
        let esperaBarra = 0;

        /** Deja el campo justo encima del teclado si quedaría tapado; si ya se ve, no lo mueve. @param {Element | null} el */
        const acomodar = (el) => {
            const campo = /** @type {HTMLElement | null} */ (el);
            const caja = contenido.current;
            // Solo en móvil y para campos del contenido (no los de modales o paneles flotantes, que van fuera)
            if (window.innerWidth >= 640 || !caja || !campo || !abreTeclado(campo) || !caja.contains(campo)) return;
            const visible = altoConTeclado || Math.round(altoMax / 2);
            const sobra = campo.getBoundingClientRect().bottom - (visible - MARGEN_TECLADO);
            if (sobra > 0) caja.scrollBy({ top: sobra });
        };

        const actualizar = () => {
            const alto = Math.round(vv ? vv.height * vv.scale : window.innerHeight);
            if (window.innerWidth !== ancho) {
                ancho = window.innerWidth;
                altoMax = 0;
                altoApp = 0;
                altoConTeclado = 0;
            }
            altoMax = Math.max(altoMax, alto);
            const enCampo = abreTeclado(/** @type {HTMLElement | null} */ (document.activeElement));
            contenido.current?.classList.toggle(ESPACIO_CAMPO, enCampo);
            // El teclado está a la vista si la pantalla perdió mucho alto, haya o no un campo enfocado: al tocar fuera del
            // campo el foco se va antes de que el teclado termine de bajar
            const teclado = alto < altoMax - 150;
            clearTimeout(esperaBarra);
            if (teclado) {
                setEscribiendo(true);
                altoConTeclado = alto;
                if (enCampo) acomodar(document.activeElement);
            } else {
                esperaBarra = window.setTimeout(() => setEscribiendo(false), ESPERA_BARRA);
            }
            // Con un campo enfocado o el teclado a la vista, la app conserva el alto completo (altoMax) y el teclado queda
            // encima. Si siguiera a visualViewport, al subir o bajar el teclado tomaba alturas intermedias y la barra
            // inferior aparecía un instante sobre él. Si el teclado se cierra con Atrás, altoMax ya es lo visible.
            const nuevo = enCampo || teclado ? altoMax : alto;
            if (nuevo !== altoApp) {
                altoApp = nuevo;
                raiz.style.setProperty('--alto-app', altoApp + 'px');
            }
        };
        // En focusout document.activeElement todavía es el campo que se deja: se mira cuando el foco ya cambió
        const despues = () => setTimeout(actualizar, 0);
        /** @param {FocusEvent} e */
        const alEnfocar = (e) => {
            actualizar();
            acomodar(/** @type {Element | null} */ (e.target));
        };
        actualizar();
        raiz.classList.add('shell-movil');
        window.addEventListener('resize', actualizar);
        window.addEventListener('orientationchange', actualizar);
        vv?.addEventListener('resize', actualizar);
        document.addEventListener('focusin', alEnfocar);
        document.addEventListener('focusout', despues);
        return () => {
            window.removeEventListener('resize', actualizar);
            window.removeEventListener('orientationchange', actualizar);
            vv?.removeEventListener('resize', actualizar);
            document.removeEventListener('focusin', alEnfocar);
            document.removeEventListener('focusout', despues);
            clearTimeout(esperaBarra);
            raiz.classList.remove('shell-movil');
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

    // En móvil (menos de 640px) la pantalla mide lo que se ve (--alto-app) y solo el contenido hace scroll:
    // así el navegador no esconde ni mueve su barra y el espacio de la barra inferior queda siempre sobre ella.
    // La barra va debajo del contenedor que hace scroll, no dentro con sticky: dentro, el desplazamiento en fracciones de
    // píxel de las pantallas de alta densidad dejaba asomar una línea del contenido en su borde. En escritorio el
    // contenedor no existe (display: contents).
    return (
        <div className="dashboard-layout max-sm:h-[var(--alto-app,100dvh)] max-sm:min-h-0 max-sm:overflow-hidden">
            <Sidebar colapsado={colapsado} abierto={abierto} onNavegar={cerrarPanelMovil} />
            <div className={`sidebar-overlay${abierto ? ' active' : ''}`} onClick={cerrarPanelMovil}></div>
            <main className="main-content max-sm:h-[var(--alto-app,100dvh)] max-sm:min-h-0 max-sm:overflow-hidden">
                <div
                    ref={contenido}
                    className="sm:contents max-sm:min-h-0 max-sm:flex-1 max-sm:overflow-x-hidden max-sm:overflow-y-auto max-sm:overscroll-contain max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden"
                >
                    <TopBar titulo={tituloDeRuta(pathname)} onAlternarSidebar={alternar} />
                    <div className="page-content">
                        <Outlet context={{ slotBarra }} />
                    </div>
                </div>
                <div ref={setSlotBarra} className={`z-30 shrink-0 sm:hidden ${escribiendo ? 'max-sm:hidden' : ''}`} />
            </main>
        </div>
    );
}
