// @ts-check
import { useEffect, useState } from 'react';
import { Printer } from '@phosphor-icons/react';
import Boton from '../../components/ui/Boton.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { mensajeError } from '../../utils/errores.js';
import { formatDate } from '../../utils/fechas.js';
import { normalizarExtras } from '../../utils/reglasDia.js';
import * as api from './api.js';
import { dibujarTabla, imprimirImagen } from './imagenPng.js';
import { construirTabla } from './tablaImagen.js';

/**
 * Modal para imprimir el programa asignado en una hoja A4 horizontal (RN-IMG-05). Muestra la vista previa de la
 * tabla y abre el cuadro de impresión del navegador, donde también se puede elegir "Guardar como PDF".
 * @param {{ programa: import('./api.js').ProgramaEstado, onCerrar: () => void }} props
 */
export default function ModalImprimir({ programa, onCerrar }) {
    const toast = useToast();
    const [imagen, setImagen] = useState(/** @type {string | null} */ (null));
    const [error, setError] = useState(false);
    const titulo = `Programa ${formatDate(programa.semana_inicio)} - ${formatDate(programa.semana_fin)}`;

    useEffect(() => {
        let activo = true;
        (async () => {
            try {
                const { turnos, extras } = await api.datosParaImagen(programa.id);
                const tabla = construirTabla({
                    turnos,
                    extras: normalizarExtras(extras),
                    semanaInicio: programa.semana_inicio,
                    semanaFin: programa.semana_fin
                });
                if (activo) setImagen(dibujarTabla(tabla).toDataURL('image/png'));
            } catch (err) {
                if (!activo) return;
                setError(true);
                toast(mensajeError(err, 'Error al preparar la impresión'), 'error');
            }
        })();
        return () => {
            activo = false;
        };
    }, [programa.id, programa.semana_inicio, programa.semana_fin, toast]);

    return (
        <Modal
            titulo="Imprimir programa"
            onCerrar={onCerrar}
            pie={
                <div className="flex flex-wrap justify-end gap-2">
                    <Boton variante="secundario" onClick={onCerrar}>
                        Cerrar
                    </Boton>
                    <Boton
                        variante="primario"
                        icono={Printer}
                        disabled={!imagen}
                        onClick={() => imagen && imprimirImagen(imagen, titulo)}
                    >
                        Imprimir
                    </Boton>
                </div>
            }
        >
            <p className="body-6 mb-3 text-muted">
                Se imprime en una hoja A4 horizontal. En el cuadro de impresión también puedes elegir «Guardar como
                PDF».
            </p>
            {error ? (
                <p className="body-6 text-danger">No se pudo preparar la vista previa.</p>
            ) : imagen ? (
                <img src={imagen} alt={titulo} className="w-full rounded-lg border border-line" />
            ) : (
                <div
                    role="status"
                    aria-label="Preparando la vista previa"
                    className="aspect-[1.9/1] w-full animate-pulse rounded-lg bg-fill motion-reduce:animate-none"
                />
            )}
        </Modal>
    );
}
