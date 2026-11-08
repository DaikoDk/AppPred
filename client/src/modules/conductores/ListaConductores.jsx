import { useEffect, useState } from 'react';
import { Table, Trash, UserPlus, Users } from '@phosphor-icons/react';
import Boton from '../../components/ui/Boton.jsx';
import Desplegable from '../../components/ui/Desplegable.jsx';
import EncabezadoTarjeta from '../../components/ui/EncabezadoTarjeta.jsx';
import {
    CAMPO,
    CASILLA,
    CUERPO,
    INSIGNIA,
    TABLA,
    TABLA_CONTENEDOR,
    TARJETA,
    TD,
    TH
} from '../../components/ui/estilos.js';
import { OPCIONES_GRUPO, claseBadgeGrupo } from './grupos.js';

// En móvil cada fila es una tarjeta (la tabla de seis columnas no entra); desde 640px vuelve a ser tabla
const TD_FILA = 'body-5 text-ink sm:border-b sm:border-line sm:px-3 sm:py-3';

/** @typedef {import('../../types/models').Conductor} Conductor */

/**
 * Lista con filtros por nombre, grupo y atributos.
 * @param {{
 *   conductores: Conductor[],
 *   error: boolean,
 *   onDisponibilidad: (id: string) => void,
 *   onDesactivar: (c: Conductor) => void,
 *   onNuevo: () => void
 * }} props
 */
export default function ListaConductores({ conductores, error, onDisponibilidad, onDesactivar, onNuevo }) {
    // El texto se muestra al escribir; el filtro se aplica 1.5 s después de la última tecla (debounce)
    const [texto, setTexto] = useState('');
    const [filtroNombre, setFiltroNombre] = useState('');
    useEffect(() => {
        const espera = setTimeout(() => setFiltroNombre(texto), 1500);
        return () => clearTimeout(espera);
    }, [texto]);
    const [grupo, setGrupo] = useState('');
    const [soloPc, setSoloPc] = useState(false);
    const [soloPMov, setSoloPMov] = useState(false);
    const [soloParque, setSoloParque] = useState(false);

    const visibles = conductores.filter(
        (c) =>
            c.nombre.toLowerCase().includes(filtroNombre.toLowerCase()) &&
            (!grupo || c.grupo === grupo) &&
            (!soloPc || c.tiene_pc) &&
            (!soloPMov || c.poca_movilidad) &&
            (!soloParque || c.solo_parque)
    );

    return (
        <section className={TARJETA}>
            <EncabezadoTarjeta icono={Users} titulo="Lista de Conductores" />
            <div className={CUERPO}>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <span className="title-4 text-ink">Filtros</span>
                    <div className="min-w-0 flex-1 sm:w-56 sm:flex-none">
                        <input
                            type="text"
                            className={CAMPO}
                            placeholder="Filtrar por nombre..."
                            value={texto}
                            onChange={(e) => setTexto(e.target.value)}
                        />
                    </div>
                    <div className="w-full sm:w-44">
                        <Desplegable
                            variante="campo"
                            rotulo="Grupo"
                            valor={grupo}
                            onCambiar={setGrupo}
                            etiquetaVacio="Todos los grupos"
                            textoVacioChip="Todos los grupos"
                            opciones={OPCIONES_GRUPO.map((g) => ({ valor: g.valor, etiqueta: g.texto }))}
                        />
                    </div>
                    <label className={CASILLA}>
                        <input type="checkbox" checked={soloPc} onChange={(e) => setSoloPc(e.target.checked)} />
                        PC (Zoom)
                    </label>
                    <label className={CASILLA}>
                        <input type="checkbox" checked={soloPMov} onChange={(e) => setSoloPMov(e.target.checked)} />
                        P. Mov
                    </label>
                    <label className={CASILLA}>
                        <input type="checkbox" checked={soloParque} onChange={(e) => setSoloParque(e.target.checked)} />
                        Parque
                    </label>
                    <Boton
                        variante="primario"
                        icono={UserPlus}
                        onClick={onNuevo}
                        className="w-full sm:ml-auto sm:w-auto"
                    >
                        Nuevo conductor
                    </Boton>
                </div>
                <div className={TABLA_CONTENEDOR}>
                    <table className={`${TABLA} block sm:table`}>
                        <thead className="hidden sm:table-header-group">
                            <tr>
                                <th className={TH}>Nombre</th>
                                <th className={TH}>Grupo</th>
                                <th className={TH}>Ubicación</th>
                                <th className={TH}>Etiquetas</th>
                                <th className={TH}>Disponibilidad</th>
                                <th className={TH}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="block sm:table-row-group">
                            {error && (
                                <tr className="grid">
                                    <td colSpan={5} className={`${TD} text-danger`}>
                                        Error
                                    </td>
                                </tr>
                            )}
                            {visibles.map((c) => (
                                <tr
                                    key={c.id}
                                    data-id={c.id}
                                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 border-b border-line py-3 sm:table-row sm:border-b-0 sm:py-0"
                                >
                                    <td className={`${TD_FILA} col-start-1 row-start-1 min-w-0`}>
                                        <span className="title-4 text-ink">{c.nombre}</span>
                                    </td>
                                    <td className={`${TD_FILA} col-start-1 row-start-2`}>
                                        <span className={`${INSIGNIA} ${claseBadgeGrupo(c.grupo)}`}>
                                            Grupo {c.grupo}
                                        </span>
                                    </td>
                                    <td className={`${TD_FILA} hidden sm:table-cell`}>
                                        <code className="caption-2 rounded-lg bg-fill px-2 py-0.5 text-muted">
                                            {c.ubicacion_casa || '—'}
                                        </code>
                                    </td>
                                    <td className={`${TD_FILA} col-start-2 row-start-2`}>
                                        <div className="flex flex-wrap justify-end gap-1 sm:justify-start">
                                            {c.tiene_pc && (
                                                <span className={`${INSIGNIA} bg-info-bg text-info`}>PC</span>
                                            )}
                                            {c.poca_movilidad && (
                                                <span className={`${INSIGNIA} bg-warn-bg text-warn`}>P.Mov</span>
                                            )}
                                            {c.solo_parque && (
                                                <span className={`${INSIGNIA} bg-ok-bg text-ok`}>Parque</span>
                                            )}
                                            {!c.tiene_pc && !c.poca_movilidad && !c.solo_parque && (
                                                <span className="text-muted">—</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className={`${TD_FILA} col-span-2 row-start-3`}>
                                        <Boton
                                            variante="secundario"
                                            icono={Table}
                                            compacto
                                            className="w-full sm:w-auto"
                                            onClick={() => onDisponibilidad(c.id)}
                                        >
                                            Disponibilidad
                                        </Boton>
                                    </td>
                                    <td className={`${TD_FILA} col-start-2 row-start-1`}>
                                        <Boton
                                            variante="peligroSuave"
                                            icono={Trash}
                                            soloIcono
                                            compacto
                                            title="Desactivar"
                                            onClick={() => onDesactivar(c)}
                                        >
                                            Desactivar
                                        </Boton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}
