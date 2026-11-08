// @ts-check
import { useEffect, useState } from 'react';

/**
 * Se actualiza solo cuando cambia el tamaño de la ventana.
 * @param {string} consulta por ejemplo '(min-width: 769px)'
 */
export function useMediaQuery(consulta) {
    const [coincide, setCoincide] = useState(() => window.matchMedia(consulta).matches);
    useEffect(() => {
        const mq = window.matchMedia(consulta);
        const alCambiar = () => setCoincide(mq.matches);
        alCambiar();
        mq.addEventListener('change', alCambiar);
        return () => mq.removeEventListener('change', alCambiar);
    }, [consulta]);
    return coincide;
}
