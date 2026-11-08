// @ts-check
import { useEffect, useState } from 'react';
import { DownloadSimple, ShareNetwork, WhatsappLogo } from '@phosphor-icons/react';
import Boton from '../../components/ui/Boton.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { mensajeError } from '../../utils/errores.js';
import { formatDate } from '../../utils/fechas.js';
import { canvasDelPrograma, compartirPng, descargarPng } from './imagenPng.js';

/** Indica si el navegador puede compartir un archivo (celular: sí; PC: depende del navegador). */
function puedeCompartirArchivo() {
    const archivo = new File([''], 'programa.png', { type: 'image/png' });
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [archivo] });
}

/**
 * Modal de la imagen PNG del programa (RN-IMG-06): vista previa, descarga y compartir por WhatsApp.
 * @param {{ programa: import('./api.js').ProgramaEstado, onCerrar: () => void }} props
 */
export default function ModalPng({ programa, onCerrar }) {
    const toast = useToast();
    const [canvas, setCanvas] = useState(/** @type {HTMLCanvasElement | null} */ (null));
    const [imagen, setImagen] = useState(/** @type {string | null} */ (null));
    const [error, setError] = useState(false);
    const [puedeCompartir] = useState(puedeCompartirArchivo);
    const titulo = `Programa ${formatDate(programa.semana_inicio)} - ${formatDate(programa.semana_fin)}`;

    useEffect(() => {
        let activo = true;
        (async () => {
            try {
                const lienzo = await canvasDelPrograma(programa);
                if (!activo) return;
                setCanvas(lienzo);
                setImagen(lienzo.toDataURL('image/png'));
            } catch (err) {
                if (!activo) return;
                setError(true);
                toast(mensajeError(err, 'Error al generar la imagen'), 'error');
            }
        })();
        return () => {
            activo = false;
        };
    }, [programa, toast]);

    /** Comparte o descarga; cerrar la hoja de compartir no es un error. */
    const compartir = async () => {
        if (!canvas) return;
        try {
            const resultado = await compartirPng(canvas, titulo, titulo);
            if (resultado === 'descargado') toast('Imagen descargada: adjúntala en WhatsApp Web', 'success');
        } catch (err) {
            if (/** @type {Error} */ (err).name !== 'AbortError')
                toast(mensajeError(err, 'No se pudo compartir'), 'error');
        }
    };

    const descargar = async () => {
        if (!canvas) return;
        try {
            await descargarPng(canvas, titulo);
            toast('Imagen descargada', 'success');
        } catch (err) {
            toast(mensajeError(err, 'No se pudo descargar la imagen'), 'error');
        }
    };

    return (
        <Modal
            titulo="Imagen del programa"
            onCerrar={onCerrar}
            pie={
                // En celular las dos acciones ocupan una fila; Cerrar queda en la X y en Escape
                <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                    <Boton className="max-sm:hidden" variante="secundario" onClick={onCerrar}>
                        Cerrar
                    </Boton>
                    <Boton variante="acento" icono={DownloadSimple} disabled={!canvas} onClick={descargar}>
                        Descargar
                    </Boton>
                    <Boton
                        variante="exito"
                        icono={puedeCompartir ? ShareNetwork : WhatsappLogo}
                        disabled={!canvas}
                        onClick={compartir}
                    >
                        <span className="sm:hidden">Compartir</span>
                        <span className="max-sm:hidden">Compartir por WhatsApp</span>
                    </Boton>
                </div>
            }
        >
            <p className="body-6 mb-3 text-muted">
                {puedeCompartir
                    ? 'Al compartir se abre el menú para compartir de tu dispositivo: elige WhatsApp y el contacto o grupo.'
                    : 'En la PC se descarga la imagen y se abre WhatsApp Web: adjúntala ahí, porque el navegador no permite enviar archivos directamente.'}
            </p>
            {error ? (
                <p className="body-6 text-danger">No se pudo preparar la imagen.</p>
            ) : imagen ? (
                <img src={imagen} alt={titulo} className="w-full rounded-lg border border-line" />
            ) : (
                <div
                    role="status"
                    aria-label="Preparando la imagen"
                    className="aspect-[1.9/1] w-full animate-pulse rounded-lg bg-fill motion-reduce:animate-none"
                />
            )}
        </Modal>
    );
}
