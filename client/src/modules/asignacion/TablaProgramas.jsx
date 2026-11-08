// @ts-check
import { CalendarBlank, DotsThree, Eraser, Eye, GoogleLogo, ImageSquare, Printer } from '@phosphor-icons/react';
import Boton from '../../components/ui/Boton.jsx';
import MenuAcciones from '../../components/ui/MenuAcciones.jsx';
import { formatDate } from '../../utils/fechas.js';

/** @typedef {import('./api.js').ProgramaEstado} ProgramaEstado */

// Igual que la lista de Programas Guardados (modules/programa): misma columna y mismo corte en md (768 px)
const COLUMNAS = 'md:grid-cols-[1fr_1.5fr_1fr]';

/**
 * Lista "Programas" de Asignación. En escritorio es una tabla de tres columnas; en móvil cada programa es una fila
 * con su ícono y fechas a la izquierda y las acciones en una grilla de dos columnas a la derecha.
 * @param {{
 *   programas: ProgramaEstado[] | null,
 *   error: boolean,
 *   onVer: (id: string) => void,
 *   onPng: (p: ProgramaEstado) => void,
 *   onLimpiar: (p: ProgramaEstado) => void,
 *   onSheets: (id: string) => void,
 *   onImprimir: (p: ProgramaEstado) => void
 * }} props  `programas` en null = cargando.
 */
export default function TablaProgramas({ programas, error, onVer, onPng, onLimpiar, onSheets, onImprimir }) {
    const estado = 'body-6 list-none p-6 text-center text-muted';
    let cuerpo;
    if (error) {
        cuerpo = <li className={estado}>Error</li>;
    } else if (programas === null) {
        cuerpo = <li className={estado}>Cargando programas…</li>;
    } else if (programas.length === 0) {
        cuerpo = <li className={estado}>No hay programas</li>;
    } else {
        cuerpo = programas.map((p) => {
            const asignados = p.asignados || 0;
            return (
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
                            <small className="caption-2 block text-muted">
                                {p.total_turnos || 0} turnos ·{' '}
                                {asignados > 0 ? (
                                    <span className="text-ok">✓ {asignados} asignados</span>
                                ) : (
                                    <span>sin asignar</span>
                                )}
                            </small>
                        </span>
                    </div>
                    <div className="grid shrink-0 grid-cols-2 gap-2 md:flex md:flex-row md:items-center">
                        {asignados > 0 && (
                            <>
                                <Boton variante="primario" icono={Eye} compacto onClick={() => onVer(p.id)} title="Ver">
                                    Ver
                                </Boton>
                                <Boton
                                    variante="acento"
                                    icono={ImageSquare}
                                    compacto
                                    onClick={() => onPng(p)}
                                    title="Descargar o compartir como imagen PNG"
                                >
                                    PNG
                                </Boton>
                            </>
                        )}
                        <Boton
                            variante="peligro"
                            icono={Eraser}
                            compacto
                            className={asignados > 0 ? '' : 'col-span-2'}
                            onClick={() => onLimpiar(p)}
                            title="Limpiar"
                        >
                            Limpiar
                        </Boton>
                        {asignados > 0 && (
                            <MenuAcciones
                                etiqueta="Más acciones del programa"
                                items={[
                                    { texto: 'Exportar a Sheets', icono: GoogleLogo, onClick: () => onSheets(p.id) },
                                    { texto: 'Imprimir o guardar en PDF', icono: Printer, onClick: () => onImprimir(p) }
                                ]}
                                boton={({ ref, abierto, alternar }) => (
                                    <Boton
                                        ref={ref}
                                        variante="secundario"
                                        icono={DotsThree}
                                        soloIcono
                                        compacto
                                        aria-haspopup="menu"
                                        aria-expanded={abierto}
                                        onClick={alternar}
                                        title="Más acciones"
                                    >
                                        Más acciones
                                    </Boton>
                                )}
                            />
                        )}
                    </div>
                </li>
            );
        });
    }

    return (
        <>
            <div
                role="row"
                className={`caption-3 hidden rounded-lg bg-canvas px-3 py-2 tracking-wide text-muted uppercase md:grid ${COLUMNAS}`}
            >
                <span>Semana</span>
                <span>Inicio - Fin</span>
                <span>Acciones</span>
            </div>
            <ul id="tabla-programas-asignacion" className="list-none">
                {cuerpo}
            </ul>
        </>
    );
}
