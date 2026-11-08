// @ts-check

/**
 * Texto de un error capturado (en `catch` el tipo es `unknown`).
 * @param {unknown} err
 * @param {string} porDefecto
 */
export function mensajeError(err, porDefecto) {
    return (err instanceof Error && err.message) || porDefecto;
}
