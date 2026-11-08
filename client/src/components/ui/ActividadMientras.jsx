// @ts-check
import { useEffect } from 'react';
import { iniciarActividad, terminarActividad } from '../../utils/actividad.js';

/**
 * Se usa como `fallback` de Suspense: mientras está en pantalla (se carga el código de una pestaña), cuenta como
 * actividad y el indicador de carga se muestra. No dibuja nada.
 */
export default function ActividadMientras() {
    useEffect(() => {
        iniciarActividad();
        return terminarActividad;
    }, []);
    return null;
}
