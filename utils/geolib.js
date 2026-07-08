"use strict";

const { supabase } = require('../supabase/client');

function generarDistanciaHaversine(coord1, coord2) {
    if (!coord1 || !coord2) return null;
    const [lat1, lng1] = coord1.split(',').map(Number);
    const [lat2, lng2] = coord2.split(',').map(Number);
    
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function generarPuntuacion(distancia, preferenciaProximidad, nivelMovilidad, esNoRepeticion) {
    const pesoProximidad = getPesoPreferencia(preferenciaProximidad);
    const puntuacionProximidad = Math.max(0, 100 - distancia / 0.3) * pesoProximidad; // 0-100 con peso de preferencia
    
    const puntuacionVariedad = esNoRepeticion ? 30 : 0; // 30 pts por no repetir
    const puntuacionMovilidad = getBonusMovilidad(nivelMovilidad); // -10 a +15
    
    return Math.max(0, puntuacionProximidad + puntuacionVariedad + puntuacionMovilidad);
}

function getPesoPreferencia(preferencia) {
    switch (preferencia) {
        case 'muy_alta': return 1.0;
        case 'normal': return 0.5;
        case 'baja': return 0.2;
        default: return 0.3;
    }
};

const getBonusMovilidad = (nivel) => {
    switch (nivel) {
        case 'alta': return 15;
        case 'normal': return 8;
        case 'baja': return -10;
        default: return 0;
    }
}

async function verificarDisponibilidadConductor(conductorId, diaSemana, turnoNumero, modalidad) {
    const { data, error } = await supabase
        .from('disponibilidad_conductor')
        .select('*')
        .eq('conductor_id', conductorId)
        .eq('dia_semana', diaSemana)
        .eq('turno_numero', turnoNumero)
        .eq('modalidad', modalidad)
        .single();
    
    return data !== null && data !== undefined && !error;
}

async function verificarDisponibilidadZoom(conductorId) {
    const { data, error } = await supabase
        .from('conductores')
        .select('pc_para_zoom')
        .eq('id', conductorId)
        .single();
    
    return data?.pc_para_zoom === true;
}

function generarMensajeWhatsApp(asignaciones) {
    if (!asignaciones || asignaciones.length === 0) {
        return 'No hay turnos asignados';
    }
    
    let mensaje = '📅 PROGRAMACIÓN SEMANAL DE TURNOS DE PREDICACIÓN\n\n';
    
    const asignacionesPorDia = {};
    asignaciones.forEach(asignacion => {
        if (!asignacionesPorDia[asignacion.dia]) {
            asignacionesPorDia[asignacion.dia] = [];
        }
        asignacionesPorDia[asignacion.dia].push(asignacion);
    });
    
    const diasOrden = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
    
    for (const dia of diasOrden) {
        if (asignacionesPorDia[dia]) {
            mensaje += `${dia}\n`;
            asignacionesPorDia[dia].forEach(a => {
                const tiempo = `${a.hora_inicio} - ${a.hora_fin}`;
                const conductor = a.conductores?.nombre || 'N/A';
                const telefono = a.conductores?.telefono || '';
                const distancia = a.distancia ? `${a.distancia.toFixed(1)} km` : 'N/A';
                const modalidad = a.modalidad === 'zoom' ? '🟢 Zoom' :
                                 a.modalidad === 'casa' ? '🏠 Casa' :
                                 a.modalidad === 'cartas' ? '📝 Cartas' : a.modalidad;
                
                mensaje += `  ⏰ ${tiempo} | ${a.territorio_id} (${modalidad})\n`;
                mensaje += `    👤 ${conductor}${telefono ? ` | 📱 ${telefono}` : ''} | 📏 ${distancia}\n`;
            });
            mensaje += '\n';
        }
    }
    
    mensaje += '🤖 Generado por Sistema de Asignación Automática';
    return mensaje;
};

module.exports = {
    generarDistanciaHaversine,
    generarPuntuacion,
    verificarDisponibilidadConductor,
    verificarDisponibilidadZoom,
    generarMensajeWhatsApp
};