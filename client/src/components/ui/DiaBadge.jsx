import { nombreDia } from '../../utils/dias.js';

/**
 * Etiqueta del día con su fecha; mismo marcado que diaBadgeHTML() del front actual.
 * @param {{ dia: import('../../types/models').Dia, fecha?: string }} props
 */
export default function DiaBadge({ dia, fecha = '' }) {
    return (
        <div className="dia-badge">
            <strong>{nombreDia(dia)}</strong>
            <span className="dia-fecha">{fecha}</span>
        </div>
    );
}
