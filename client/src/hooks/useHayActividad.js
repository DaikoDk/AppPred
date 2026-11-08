// @ts-check
import { useEffect, useState, useSyncExternalStore } from 'react';
import { actividadPendiente, suscribirActividad } from '../utils/actividad.js';

// Una carga que termina antes del retraso no se muestra (evita parpadeos); una vez visible, se queda un mínimo
const RETRASO_MS = 250;
const MINIMO_MS = 500;

/**
 * Dice si hay que mostrar el indicador de carga: hay trabajo en curso desde hace más de RETRASO_MS.
 * @returns {boolean}
 */
export function useHayActividad() {
    const hay = useSyncExternalStore(suscribirActividad, () => actividadPendiente() > 0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const espera = setTimeout(() => setVisible(hay), hay ? RETRASO_MS : MINIMO_MS);
        return () => clearTimeout(espera);
    }, [hay]);

    return visible;
}
