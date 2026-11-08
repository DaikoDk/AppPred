import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    actividadPendiente,
    iniciarActividad,
    reiniciarActividad,
    suscribirActividad,
    terminarActividad
} from './actividad.js';

beforeEach(() => reiniciarActividad());

describe('contador de actividad', () => {
    it('sube con cada trabajo que empieza y baja cuando termina', () => {
        iniciarActividad();
        iniciarActividad();
        expect(actividadPendiente()).toBe(2);
        terminarActividad();
        expect(actividadPendiente()).toBe(1);
    });

    it('nunca baja de cero', () => {
        terminarActividad();
        terminarActividad();
        expect(actividadPendiente()).toBe(0);
    });

    it('avisa a quien escucha y deja de avisar al darse de baja', () => {
        const oyente = vi.fn();
        const baja = suscribirActividad(oyente);
        iniciarActividad();
        terminarActividad();
        expect(oyente).toHaveBeenCalledTimes(2);
        baja();
        iniciarActividad();
        expect(oyente).toHaveBeenCalledTimes(2);
    });
});
