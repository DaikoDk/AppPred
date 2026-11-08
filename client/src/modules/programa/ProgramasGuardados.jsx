import { CalendarBlank, PencilSimple, Stack, Trash } from '@phosphor-icons/react';
import Boton from '../../components/ui/Boton.jsx';
import EncabezadoTarjeta from '../../components/ui/EncabezadoTarjeta.jsx';
import { formatDate } from '../../utils/fechas.js';

/** @typedef {import('../../types/models').Programa} Programa */

const COLUMNAS = 'md:grid-cols-[1fr_1.5fr_1fr]';

/**
 * Lista "Programas Guardados". En escritorio es una tabla de tres columnas con botones de ícono; en móvil
 * cada programa es una fila con su ícono y fechas a la izquierda y las acciones apiladas a la derecha.
 * @param {{
 *   programas: Programa[] | null,
 *   error: boolean,
 *   onEditar: (id: string) => void,
 *   onEliminar: (p: Programa) => void
 * }} props  `programas` en null = cargando.
 */
export default function ProgramasGuardados({ programas, error, onEditar, onEliminar }) {
    const estado = 'body-6 list-none p-6 text-center text-muted';
    let cuerpo;
    if (error) {
        cuerpo = <li className={estado}>Error</li>;
    } else if (programas === null) {
        cuerpo = <li className={estado}>Cargando programas…</li>;
    } else if (programas.length === 0) {
        cuerpo = <li className={estado}>No hay programas guardados</li>;
    } else {
        cuerpo = programas.map((p) => (
            <li
                key={p.id}
                className={`flex items-center justify-between gap-3 border-b border-line px-2 py-3 last:border-b-0 md:grid ${COLUMNAS} md:px-3`}
            >
                <b className="body-4 hidden text-ink md:block">Semana</b>
                <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-fill text-primary md:hidden">
                        <CalendarBlank size={20} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                        <span className="body-5 block text-ink">
                            {formatDate(p.semana_inicio)} — {formatDate(p.semana_fin)}
                        </span>
                        <small className="caption-5 block text-muted md:hidden">Programa semanal</small>
                    </span>
                </div>
                <div className="flex shrink-0 flex-col gap-2 md:flex-row">
                    <Boton variante="primario" icono={PencilSimple} onClick={() => onEditar(p.id)} compacto>
                        Editar
                    </Boton>
                    <Boton variante="peligro" icono={Trash} onClick={() => onEliminar(p)} compacto>
                        Eliminar
                    </Boton>
                </div>
            </li>
        ));
    }

    return (
        <section className="rounded-3xl border border-line bg-surface">
            <EncabezadoTarjeta
                icono={Stack}
                sinCaja
                titulo="Programas Guardados"
                subtitulo="Programas creados previamente"
            />
            <div className="p-4">
                <div
                    role="row"
                    className={`caption-3 hidden rounded-lg bg-canvas px-3 py-2 tracking-wide text-muted uppercase md:grid ${COLUMNAS}`}
                >
                    <span>Semana</span>
                    <span>Inicio - Fin</span>
                    <span>Acciones</span>
                </div>
                <ul id="tbody-programas" className="list-none">
                    {cuerpo}
                </ul>
            </div>
        </section>
    );
}
