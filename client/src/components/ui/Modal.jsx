// @ts-check
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from '@phosphor-icons/react';

/**
 * Ventana modal propia (ADR-016). En móvil ocupa toda la pantalla; desde 640px es una ventana centrada.
 * Escape y × cierran. Al abrir, el foco entra a la ventana y el Tab no sale de ella; al cerrar vuelve al
 * elemento que la abrió. No se cierra al hacer clic fuera: un formulario a medio llenar no se pierde por error.
 * Va debajo de las confirmaciones (z 10000 en styles.css) y sobre el resto de la pantalla.
 * @param {{
 *   titulo: string,
 *   onCerrar: () => void,
 *   children: import('react').ReactNode,
 *   pie?: import('react').ReactNode
 * }} props
 */
export default function Modal({ titulo, onCerrar, children, pie }) {
    const id = useId();
    const panel = useRef(/** @type {HTMLDivElement | null} */ (null));
    // Se guarda en una referencia para que el efecto no se reinicie (y mueva el foco) en cada render
    const cerrarRef = useRef(onCerrar);
    cerrarRef.current = onCerrar;

    useEffect(() => {
        const previo = /** @type {HTMLElement | null} */ (document.activeElement);
        const overflowPrevio = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const cuadro = requestAnimationFrame(() => panel.current?.focus({ preventScroll: true }));

        /** @param {KeyboardEvent} e */
        const teclado = (e) => {
            const dentro = panel.current;
            // Las teclas de una confirmación o de un desplegable abiertos sobre la ventana no son de la ventana
            if (!dentro || e.defaultPrevented || !(e.target instanceof Node) || !dentro.contains(e.target)) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                cerrarRef.current();
                return;
            }
            if (e.key !== 'Tab') return;
            const foco = /** @type {HTMLElement[]} */ (
                Array.from(
                    dentro.querySelectorAll(
                        'button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]'
                    )
                )
            );
            if (foco.length === 0) return;
            const primero = foco[0];
            const ultimo = foco[foco.length - 1];
            const activo = document.activeElement;
            if (e.shiftKey && (activo === primero || activo === dentro)) {
                e.preventDefault();
                ultimo.focus();
            } else if (!e.shiftKey && activo === ultimo) {
                e.preventDefault();
                primero.focus();
            }
        };

        document.addEventListener('keydown', teclado);
        return () => {
            cancelAnimationFrame(cuadro);
            document.removeEventListener('keydown', teclado);
            document.body.style.overflow = overflowPrevio;
            previo?.focus?.();
        };
    }, []);

    return createPortal(
        <div className="tw fixed inset-0 z-[9000] flex items-end justify-center bg-ink/40 sm:items-center sm:p-4">
            <div
                ref={panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={id}
                tabIndex={-1}
                className="flex h-dvh w-full flex-col bg-surface outline-none sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-3xl sm:border sm:border-line"
            >
                <header className="flex items-center justify-between gap-3 border-b border-line p-4">
                    <h2 id={id} className="heading-6 text-ink">
                        {titulo}
                    </h2>
                    <button
                        type="button"
                        aria-label="Cerrar"
                        onClick={() => cerrarRef.current()}
                        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-muted transition-[background-color,color] duration-300 ease-skill hover:bg-fill hover:text-ink active:scale-[0.96]"
                    >
                        <X size={20} aria-hidden="true" />
                    </button>
                </header>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
                {pie && <footer className="border-t border-line p-4">{pie}</footer>}
            </div>
        </div>,
        document.body
    );
}
