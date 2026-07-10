"use strict";

const jwt = require('jsonwebtoken');
const router = require('express').Router();
const { supabase } = require('../supabase/client');
const { authenticateToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '24h';

function genToken(userId, email) {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
}

router.get('/google', async (req, res) => {
    try {
        const redirectUrl = process.env.SUPABASE_AUTH_REDIRECT_URL ||
            `${req.protocol}://${req.get('host')}/`;

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: redirectUrl,
                queryParams: { access_type: 'offline', prompt: 'consent' }
            }
        });
        if (error) return res.status(500).json({ error: 'Error iniciando OAuth' });
        return res.redirect(data.url);
    } catch (error) {
        console.error('Error en /api/auth/google:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

router.post('/google/callback', async (req, res) => {
    try {
        const { access_token } = req.body;
        if (!access_token) return res.status(400).json({ error: 'Token requerido' });

        const userResp = await fetch(`${process.env.SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'apikey': process.env.SUPABASE_ANON_KEY
            }
        });
        const userData = await userResp.json();
        if (!userResp.ok || !userData.id) {
            return res.status(401).json({ error: 'Token inválido' });
        }

        const email = (userData.email || '').toLowerCase();

        // Check allowed_emails table instead of env var
        const { data: allowed, error: dbError } = await supabase
            .from('allowed_emails')
            .select('email')
            .eq('email', email)
            .single();
        if (dbError || !allowed) {
            return res.status(403).json({ error: 'Email no autorizado' });
        }

        const token = genToken(userData.id, email);
        res.json({
            token,
            usuario: {
                id: userData.id,
                nombre: userData.user_metadata?.full_name || userData.user_metadata?.name || email.split('@')[0],
                email
            }
        });
    } catch (error) {
        console.error('Error en callback Google OAuth:', error);
        res.status(500).json({ error: 'Error interno en autenticación' });
    }
});

router.get('/validate', authenticateToken, async (req, res) => {
    res.json({ valido: true, usuarioId: req.userId });
});

/* ====== ALLOWED EMAILS CRUD (super admin only) ====== */

const MAX_USERS = 4;
const MAX_SUPER_ADMINS = 2;

async function checkSuperAdmin(email) {
    const { data } = await supabase
        .from('allowed_emails')
        .select('is_super_admin')
        .eq('email', email)
        .single();
    return data?.is_super_admin === true;
}

async function countSuperAdmins() {
    const { count, error } = await supabase
        .from('allowed_emails')
        .select('*', { count: 'exact', head: true })
        .eq('is_super_admin', true);
    if (error) return 0;
    return count;
}

async function countTotal() {
    const { count, error } = await supabase
        .from('allowed_emails')
        .select('*', { count: 'exact', head: true });
    if (error) return 0;
    return count;
}

router.get('/allowed-emails', authenticateToken, async (req, res) => {
    try {
        if (!await checkSuperAdmin(req.userEmail)) {
            return res.status(403).json({ error: 'Acceso denegado — se requiere super admin' });
        }
        const { data, error } = await supabase.from('allowed_emails').select('*').order('email');
        if (error) return res.status(500).json({ error: `Error al obtener lista: ${error.message}`, detalle: error });
        res.json(data);
    } catch (err) {
        console.error('GET /api/auth/allowed-emails error:', err);
        res.status(500).json({ error: `Error interno: ${err.message}`, stack: err.stack });
    }
});

router.post('/allowed-emails', authenticateToken, async (req, res) => {
    try {
        if (!await checkSuperAdmin(req.userEmail)) {
            return res.status(403).json({ error: 'Acceso denegado — se requiere super admin' });
        }
        const { email } = req.body;
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Email inválido' });
        }
        const total = await countTotal();
        if (total >= MAX_USERS) {
            return res.status(400).json({ error: `Límite de ${MAX_USERS} usuarios alcanzado` });
        }
        const clean = email.toLowerCase().trim();
        const { data, error } = await supabase
            .from('allowed_emails')
            .insert({ email: clean, added_by: req.userEmail })
            .select()
            .single();
        if (error) {
            if (error.code === '23505') return res.status(409).json({ error: 'El email ya está registrado' });
            return res.status(500).json({ error: `Error al añadir email: ${error.message}`, detalle: error });
        }
        res.json(data);
    } catch (err) {
        console.error('POST /api/auth/allowed-emails error:', err);
        res.status(500).json({ error: `Error interno: ${err.message}`, stack: err.stack });
    }
});

router.delete('/allowed-emails/:id', authenticateToken, async (req, res) => {
    if (!await checkSuperAdmin(req.userEmail)) {
        return res.status(403).json({ error: 'Acceso denegado — se requiere super admin' });
    }
    const { id } = req.params;
    const { data: target } = await supabase.from('allowed_emails').select('email').eq('id', id).single();
    if (!target) return res.status(404).json({ error: 'Email no encontrado' });
    if (target.email === req.userEmail) {
        return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
    }
    const { error } = await supabase.from('allowed_emails').delete().eq('id', id);
    if (error) return res.status(500).json({ error: 'Error al eliminar' });
    res.json({ success: true });
});

router.put('/allowed-emails/:id/toggle-admin', authenticateToken, async (req, res) => {
    if (!await checkSuperAdmin(req.userEmail)) {
        return res.status(403).json({ error: 'Acceso denegado — se requiere super admin' });
    }
    const { id } = req.params;
    const { data: target } = await supabase.from('allowed_emails').select('email, is_super_admin').eq('id', id).single();
    if (!target) return res.status(404).json({ error: 'Email no encontrado' });
    // Cannot toggle yourself
    if (target.email === req.userEmail) {
        return res.status(400).json({ error: 'Usa "Renunciar" para quitarte tu propio rol' });
    }
    // If making someone admin, check max limit
    if (!target.is_super_admin) {
        const count = await countSuperAdmins();
        if (count >= MAX_SUPER_ADMINS) {
            return res.status(400).json({ error: `Límite de ${MAX_SUPER_ADMINS} super admins alcanzado` });
        }
    }
    const { error } = await supabase
        .from('allowed_emails')
        .update({ is_super_admin: !target.is_super_admin })
        .eq('id', id);
    if (error) return res.status(500).json({ error: 'Error al actualizar' });
    res.json({ success: true });
});

router.post('/allowed-emails/renounce', authenticateToken, async (req, res) => {
    if (!await checkSuperAdmin(req.userEmail)) {
        return res.status(403).json({ error: 'No eres super admin' });
    }
    const count = await countSuperAdmins();
    if (count <= 1) {
        return res.status(400).json({ error: 'No puedes renunciar — eres el único super admin' });
    }
    const { error } = await supabase
        .from('allowed_emails')
        .update({ is_super_admin: false })
        .eq('email', req.userEmail);
    if (error) return res.status(500).json({ error: 'Error al renunciar' });
    res.json({ success: true, message: 'Has renunciado como super admin' });
});

/* ====== CONFIG ====== */

router.get('/config', authenticateToken, async (req, res) => {
    try {
        if (!await checkSuperAdmin(req.userEmail)) {
            return res.status(403).json({ error: 'Acceso denegado — se requiere super admin' });
        }
        const { data, error } = await supabase.from('config').select('*');
        if (error) return res.status(500).json({ error: `Error al obtener configuración: ${error.message}`, detalle: error });
        const config = {};
        (data || []).forEach(c => { config[c.key] = c.value; });
        if (config.spreadsheet_id) {
            config.spreadsheet_url = `https://docs.google.com/spreadsheets/d/${config.spreadsheet_id}`;
        }
        res.json(config);
    } catch (err) {
        console.error('GET /api/auth/config error:', err);
        res.status(500).json({ error: `Error interno: ${err.message}`, stack: err.stack });
    }
});

router.put('/config', authenticateToken, async (req, res) => {
    try {
        if (!await checkSuperAdmin(req.userEmail)) {
            return res.status(403).json({ error: 'Acceso denegado — se requiere super admin' });
        }
        const { key, value } = req.body;
        if (!key) return res.status(400).json({ error: 'key requerida' });
        const { error } = await supabase
            .from('config')
            .upsert({ key, value }, { onConflict: 'key' });
        if (error) return res.status(500).json({ error: `Error al guardar configuración: ${error.message}`, detalle: error });
        res.json({ success: true });
    } catch (err) {
        console.error('PUT /api/auth/config error:', err);
        res.status(500).json({ error: `Error interno: ${err.message}`, stack: err.stack });
    }
});

module.exports = router;
