"use strict";

const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase/client');

router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('puntos_reunion')
            .select('*')
            .eq('activo', true)
            .order('nombre');
        if (error) throw error;
        res.json({ puntos: data || [] });
    } catch (error) {
        console.error('Error GET /puntos-reunion:', error);
        res.status(500).json({ error: 'Error al obtener puntos de reunión' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { nombre, ubicacion } = req.body;
        if (!nombre) return res.status(400).json({ error: 'nombre es requerido' });
        const { data, error } = await supabase
            .from('puntos_reunion')
            .insert([{ nombre, ubicacion: ubicacion || null }])
            .select()
            .single();
        if (error) throw error;
        res.status(201).json({ mensaje: 'Punto de reunión creado', punto: data });
    } catch (error) {
        console.error('Error POST /puntos-reunion:', error);
        res.status(500).json({ error: 'Error al crear punto de reunión' });
    }
});

async function isFijo(id) {
    const { data } = await supabase.from('puntos_reunion').select('fijo').eq('id', id).single();
    return data?.fijo === true;
}

router.put('/:id', async (req, res) => {
    try {
        if (await isFijo(req.params.id)) return res.status(403).json({ error: 'No se puede modificar un punto fijo' });
        const { nombre, ubicacion, activo } = req.body;
        const updates = {};
        if (nombre !== undefined) updates.nombre = nombre;
        if (ubicacion !== undefined) updates.ubicacion = ubicacion;
        if (activo !== undefined) updates.activo = activo;
        const { data, error } = await supabase.from('puntos_reunion').update(updates).eq('id', req.params.id).select().single();
        if (error) throw error;
        res.json({ mensaje: 'Punto de reunión actualizado', punto: data });
    } catch (error) {
        console.error('Error PUT /puntos-reunion/:id:', error);
        res.status(500).json({ error: 'Error al actualizar punto de reunión' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        if (await isFijo(req.params.id)) return res.status(403).json({ error: 'No se puede eliminar un punto fijo' });
        const { error } = await supabase.from('puntos_reunion').update({ activo: false }).eq('id', req.params.id);
        if (error) throw error;
        res.json({ mensaje: 'Punto de reunión desactivado' });
    } catch (error) {
        console.error('Error DELETE /puntos-reunion/:id:', error);
        res.status(500).json({ error: 'Error al eliminar punto de reunión' });
    }
});

module.exports = router;
