"use strict";

let currentUser = null;
let token = null;
let turnoCount = 0;
const TEMPLATE_ID = '00000000-0000-0000-0000-000000000001';
let modoPlantilla = false;

const DIAS_ORDEN = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const FRANJAS = [
    'Madrugada (6:30 AM)', 'Mañana (8:20 AM)', 'Mañana (8:50 AM)', 'Tarde (6:20 PM)', 'Domingo (10:20 AM)'
];

const COND_DISP_SEL = {}; // conductor_id -> { dia|hora -> bool }

function getToken() { return localStorage.getItem('token'); }
function getUser() { try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; } }

function capitalize(s) { return s ? s.charAt(0) + s.slice(1).toLowerCase() : ''; }

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sidebar) return;
    if (window.innerWidth <= 1024) {
        sidebar.classList.remove('collapsed');
        sidebar.classList.toggle('open');
        if (overlay) overlay.classList.toggle('active');
    } else {
        sidebar.classList.toggle('collapsed');
    }
}
function parseLocalDate(str) {
    if (!str) return null;
    const parts = str.split('T')[0].split('-');
    if (parts.length !== 3) return new Date(str);
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

function showToast(message, type = 'info', duration = 4000) {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.innerHTML = `<span>${message}</span><button onclick="this.parentElement.remove()">?-</button>`;
    c.appendChild(t);
    setTimeout(() => { if (t.parentElement) t.remove(); }, duration);
}

async function apiFetch(url, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    const t = getToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error del servidor');
    return data;
}

function setLoading(btn, loading) {
    const text = btn.querySelector('.btn-text');
    const spin = btn.querySelector('.btn-loading');
    btn.disabled = loading;
    if (text) text.style.display = loading ? 'none' : 'inline';
    if (spin) spin.style.display = loading ? 'inline-flex' : 'none';
}

function formatDate(d) {
    if (!d) return '';
    const dt = parseLocalDate(d);
    if (!dt) return '';
    return dt.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

/* ====== AUTH ====== */
function handleOAuthRedirect() {
    const hash = window.location.hash.substring(1);
    if (!hash) return false;
    const params = new URLSearchParams(hash);
    const at = params.get('access_token');
    if (!at) return false;
    fetch('/api/auth/google/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: at })
    }).then(r => r.json()).then(data => {
        if (data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            window.history.replaceState(null, '', window.location.pathname);
            window.location.reload();
        } else {
            showToast(data.error || 'Error autenticando', 'error', 8000);
            window.history.replaceState(null, '', window.location.pathname);
        }
    }).catch(() => {
        showToast('Error de conexión', 'error');
        window.history.replaceState(null, '', window.location.pathname);
    });
    return true;
}

async function checkAuth() {
    token = getToken();
    if (!token) { window.location.href = '/'; return; }
    try {
        await apiFetch('/api/auth/validate');
        const u = getUser();
        if (u) {
            currentUser = u;
            document.getElementById('user-name').textContent = u.nombre || u.email;
            document.getElementById('user-avatar').textContent = (u.nombre || 'U')[0];
            checkSuperAdmin();
        }
    } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/';
    }
}

/* ====== TABS ====== */
function initTabs() {
    const titles = { asignacion: 'Asignación', programa: 'Programa Semanal', conductores: 'Conductores', puntos: 'Puntos de Reunión', historial: 'Historial', admin: 'Admin' };
    document.querySelectorAll('.nav-item[data-tab]').forEach(tab => {
        tab.addEventListener('click', e => {
            e.preventDefault();
            const name = tab.dataset.tab;
            document.querySelectorAll('.nav-item[data-tab]').forEach(t => t.classList.remove('active'));
            document.getElementById('nav-plantilla')?.classList.remove('active');
            tab.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            const t = document.getElementById(`tab-${name}`);
            if (t) t.classList.add('active');
            const pt = document.getElementById('page-title');
            if (pt) pt.textContent = titles[name] || name;
            if (name === 'conductores') renderDisp();
            if (name === 'asignacion') {
                const sel = document.getElementById('sel-semana');
                if (sel && sel.value) cargarAsignacionesExistentes(sel.value);
            }
            if (name === 'programa' && editandoProgramaId) cancelarEdicionPrograma();
            if (name === 'puntos') listarPuntos();
            if (window.innerWidth <= 1024) {
                document.getElementById('sidebar').classList.remove('open');
                document.getElementById('sidebar-overlay').classList.remove('active');
            }
            if (name === 'historial') cargarHistorial();
            if (name === 'admin') { cargarAllowedEmails(); cargarConfig(); }
        });
    });
}

/* ====== TAB 1: ASIGNACI?"N ====== */
async function loadSemanas() {
    const sel = document.getElementById('sel-semana');
    if (!sel) return;
    try {
        const d = await apiFetch('/api/programa-semanal/con-estado');
        sel.innerHTML = '<option value="">Seleccionar semana...</option>';
        (d.programas || []).forEach(p => {
            const badge = (p.asignados || 0) > 0 ? ` ✓ ${p.asignados} asignados` : '';
            sel.innerHTML += `<option value="${p.id}">${formatDate(p.semana_inicio)} - ${formatDate(p.semana_fin)}${badge}</option>`;
        });
    } catch { sel.innerHTML = '<option value="">Error</option>'; }
}

async function listarProgramasAsignacion() {
    const tbody = document.getElementById('tbody-programas-asignacion');
    if (!tbody) return;
    try {
        const d = await apiFetch('/api/programa-semanal/con-estado');
        window.__semanaData = {};
        tbody.innerHTML = '';
        if (!d.programas || d.programas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999">No hay programas</td></tr>';
            return;
        }
        d.programas.forEach(p => {
            window.__semanaData[p.id] = { inicio: p.semana_inicio, fin: p.semana_fin, asignados: p.asignados || 0, total: p.total_turnos || 0 };
            const badge = (p.asignados || 0) > 0 ? `<span style="color:#28a745">✓ ${p.asignados}</span>` : '<span style="color:#999">0</span>';
            const hasAsignados = (p.asignados || 0) > 0;
            tbody.innerHTML += `<tr>
                <td>${formatDate(p.semana_inicio)} — ${formatDate(p.semana_fin)}</td>
                <td>${p.total_turnos || 0}</td>
                <td>${badge}</td>
                <td style="white-space:nowrap">
                    ${hasAsignados ? `<button class="btn btn-sm btn-info" onclick="verAsignacion('${p.id}')"><i class="fas fa-eye"></i> Ver</button>
                    <button class="btn btn-sm btn-success" onclick="exportarResultadosSheets('${p.id}')"><i class="fab fa-google"></i></button>` : ''}
                    <button class="btn btn-sm btn-warning" onclick="borrarAsignaciones('${p.id}')"><i class="fas fa-eraser"></i> Limpiar</button>
                </td>
            </tr>`;
        });
    } catch { tbody.innerHTML = '<tr><td colspan="4">Error</td></tr>'; }
}

async function verAsignacion(semanaId) {
    if (!semanaId) return;
    const sel = document.getElementById('sel-semana');
    if (sel) sel.value = semanaId;
    const card = document.getElementById('card-resultados');
    try {
        const d = await apiFetch(`/api/asignacion/asignaciones/semana/${semanaId}`);
        const asignaciones = d.asignaciones || [];
        const hanAsignado = asignaciones.some(a => a.conductor_id);
        if (!hanAsignado) { card.style.display = 'none'; return; }
        const data = {
            resumen: {
                total_turnos: asignaciones.length,
                asignados: asignaciones.filter(a => a.conductor_id).length,
                sin_asignar: asignaciones.filter(a => !a.conductor_id).length,
                conductores_utilizados: [...new Set(asignaciones.filter(a => a.conductor_id).map(a => a.conductor_id))].length
            },
            resultados: asignaciones.map(t => ({
                turno_id: t.id,
                dia: t.dia,
                hora: t.hora,
                grupo: t.grupo,
                territorio: t.territorio,
                punto_reunion: t.punto_reunion,
                asignado: !!t.conductor_id,
                conductor_asignado: t.conductores ? { id: t.conductores.id, nombre: t.conductores.nombre, grupo: t.conductores.grupo } : null
            }))
        };
        window.__semanaActual = semanaId;
        window.__editandoAsignacion = true;
        mostrarResultados(data, semanaId);
        const btnGuardar = document.querySelector('#resultados-actions .btn-text');
        if (btnGuardar) btnGuardar.textContent = 'Actualizar Asignación';
        document.getElementById('resultados-actions').style.display = 'block';
    } catch { card.style.display = 'none'; }
}

async function cargarAsignacionesExistentes(semanaId) {
    const card = document.getElementById('card-resultados');
    if (!semanaId) return;
    try {
        const d = await apiFetch(`/api/asignacion/asignaciones/semana/${semanaId}`);
        const asignaciones = d.asignaciones || [];
        const hanAsignado = asignaciones.some(a => a.conductor_id);
        if (!hanAsignado) {
            card.style.display = 'none';
            return;
        }
        const data = {
            resumen: {
                total_turnos: asignaciones.length,
                asignados: asignaciones.filter(a => a.conductor_id).length,
                sin_asignar: asignaciones.filter(a => !a.conductor_id).length,
                conductores_utilizados: [...new Set(asignaciones.filter(a => a.conductor_id).map(a => a.conductor_id))].length
            },
            resultados: asignaciones.map(t => ({
                turno_id: t.id,
                dia: t.dia,
                hora: t.hora,
                grupo: t.grupo,
                territorio: t.territorio,
                punto_reunion: t.punto_reunion,
                asignado: !!t.conductor_id,
                conductor_asignado: t.conductores ? { id: t.conductores.id, nombre: t.conductores.nombre, grupo: t.conductores.grupo } : null
            }))
        };
        window.__semanaActual = semanaId;
        window.__editandoAsignacion = true;
        mostrarResultados(data, semanaId);
        const btnGuardar = document.querySelector('#resultados-actions .btn-text');
        if (btnGuardar) btnGuardar.textContent = 'Actualizar Asignación';
        document.getElementById('resultados-actions').style.display = 'block';
    } catch {
        card.style.display = 'none';
    }
}

async function ejecutarAsignacion() {
    const sel = document.getElementById('sel-semana');
    const semanaId = sel?.value;
    if (!semanaId) { showToast('Selecciona una semana', 'warning'); return; }
    const btn = document.getElementById('btn-ejecutar-asignacion');
    setLoading(btn, true);
    try {
        const d = await apiFetch('/api/asignacion/asignar', { method: 'POST', body: JSON.stringify({ semana_id: semanaId }) });
        showToast(`Previsualización: ${d.resumen.asignados} turnos asignados`, 'success');
        window.__editandoAsignacion = false;
        window.__semanaActual = semanaId;
        const btnGuardar = document.querySelector('#resultados-actions .btn-text');
        if (btnGuardar) btnGuardar.textContent = 'Guardar Asignación';
        document.getElementById('resultados-actions').style.display = 'block';
        mostrarResultados(d, semanaId);
    } catch (err) {
        showToast(err.message || 'Error', 'error');
    } finally { setLoading(btn, false); }
}

function mostrarResultados(data, semanaId) {
    const card = document.getElementById('card-resultados');
    if (!card) return;
    card.style.display = 'block';
    document.getElementById('stat-total').textContent = data.resumen?.total_turnos || 0;
    document.getElementById('stat-asignados').textContent = data.resumen?.asignados || 0;
    document.getElementById('stat-sin-asignar').textContent = data.resumen?.sin_asignar || 0;
    document.getElementById('stat-conductores').textContent = data.resumen?.conductores_utilizados || 0;
    document.getElementById('resultados-actions').style.display = 'block';
    const container = document.getElementById('resultados-day-groups');
    if (!container) return;
    const semanaData = window.__semanaData || {};
    const inicio = parseLocalDate(semanaData[semanaId]?.inicio);
    const diasMap = { LUNES: 0, MARTES: 1, MIERCOLES: 2, JUEVES: 3, VIERNES: 4, SABADO: 5, DOMINGO: 6 };
    function getDateStr(dia) {
        if (!inicio) return '';
        const d = new Date(inicio);
        d.setDate(d.getDate() + (diasMap[dia] || 0));
        return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    }
    window.__lastResultados = data;
    window.__semanaActual = semanaId;

    // Build disponibilidad map from response
    const dispMap = {};
    (data.disponibilidad || []).forEach(k => { dispMap[k] = true; });

    // Count how many times each conductor appears in results
    const asignCount = {};
    (data.resultados || []).forEach(r => {
        if (r.conductor_asignado?.id) {
            const id = r.conductor_asignado.id;
            asignCount[id] = (asignCount[id] || 0) + 1;
        }
    });

    // Get all active conductors for the dropdowns
    apiFetch('/api/conductores').then(cd => {
        window.__todosConductores = cd.conductores || [];
        renderResultadosTable(data, inicio, getDateStr, dispMap, asignCount);
    }).catch(() => {
        window.__todosConductores = [];
        renderResultadosTable(data, inicio, getDateStr, dispMap, asignCount);
    });
}

function renderResultadosTable(data, inicio, getDateStr, dispMap, asignCount) {
    const container = document.getElementById('resultados-day-groups');
    if (!container) return;
    const grupos = {};
    const FRANJA_ORDER = { 'Madrugada (6:30 AM)': 0, 'Mañana (8:20 AM)': 1, 'Tarde (6:20 PM)': 2, 'Domingo (10:20 AM)': 3 };
    (data.resultados || []).forEach(r => {
        const d = r.dia || 'OTRO';
        if (!grupos[d]) grupos[d] = [];
        grupos[d].push(r);
    });
    Object.values(grupos).forEach(arr => arr.sort((a, b) => (FRANJA_ORDER[a.hora] ?? 99) - (FRANJA_ORDER[b.hora] ?? 99)));
    const todosCond = window.__todosConductores || [];

    let html = '<div class="table-container"><table class="table" style="font-size:0.75rem"><thead><tr><th style="padding:3px 6px;font-size:0.65rem">Día</th><th style="padding:3px 6px;font-size:0.65rem">Hora</th><th style="padding:3px 6px;font-size:0.65rem">Grupo</th><th style="padding:3px 6px;font-size:0.65rem">Territorio</th><th style="padding:3px 6px;font-size:0.65rem">P. Reunión</th><th style="padding:3px 6px;font-size:0.65rem">Conductor</th></tr></thead><tbody>';
    DIAS_ORDEN.forEach(dia => {
        const items = grupos[dia] || grupos[dia.toUpperCase()] || [];
        if (items.length === 0) return;
        items.forEach((r, i) => {
            const color = DAY_COLORS[dia] || '#fff';
            let diaCell = '';
            if (items.length === 1) {
                diaCell = `${capitalize(dia)} ${getDateStr(dia)}`;
            } else if (i === 0) {
                diaCell = capitalize(dia);
            } else if (i === 1) {
                diaCell = getDateStr(dia);
            }
            const selectedId = r.conductor_asignado?.id || '';
            const turnoDia = r.dia;
            const turnoHora = r.hora;
            const opts = todosCond.map(c => {
                const sel = c.id === selectedId ? 'selected' : '';
                const count = asignCount?.[c.id] || 0;
                const isDisp = dispMap?.[`${c.id}|${turnoDia}|${turnoHora}`] === true;
                let label = c.nombre;
                if (count > 0) label += ` (${count})`;
                else if (!isDisp) label += ' (-99)';
                const disabled = '';
                return `<option value="${c.id}|${c.nombre}" ${sel} ${disabled}>${label}</option>`;
            }).join('');
            html += `<tr class="${r.asignado ? '' : 'sin-asignar'}" style="background:${color}" data-turno-id="${r.turno_id}">
                <td style="padding:1px 4px;border-bottom:1px solid #ddd;font-weight:${i <= 1 ? '600' : '400'}">${diaCell}</td>
                <td style="padding:1px 4px;border-bottom:1px solid #ddd">${r.hora || ''}</td>
                <td style="padding:1px 4px;border-bottom:1px solid #ddd">${r.grupo || ''}</td>
                <td style="padding:1px 4px;border-bottom:1px solid #ddd">${r.territorio || '—'}</td>
                <td style="padding:1px 4px;border-bottom:1px solid #ddd">${r.punto_reunion || '—'}</td>
                <td style="padding:1px 4px;border-bottom:1px solid #ddd">${r.asignado ? `<select class="form-control cond-select" style="font-size:0.7rem;padding:2px 4px;height:auto;width:100%">${opts}</select>` : '<span class="text-danger">SIN ASIGNAR</span>'}</td>
            </tr>`;
        });
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

async function confirmarAsignaciones() {
    const semanaId = window.__semanaActual;
    if (!semanaId) { showToast('No hay resultados para guardar', 'warning'); return; }
    const asignaciones = [];
    const condCount = {};
    document.querySelectorAll('#resultados-day-groups tbody tr[data-turno-id]').forEach(tr => {
        const select = tr.querySelector('.cond-select');
        if (!select) return;
        const val = select.value;
        if (!val) return;
        const [id, nombre] = val.split('|');
        if (!id) return;
        condCount[id] = (condCount[id] || 0) + 1;
        asignaciones.push({
            turno_id: tr.dataset.turnoId,
            conductor_id: id,
            conductor_nombre: nombre
        });
    });
    if (asignaciones.length === 0) { showToast('No hay asignaciones para guardar', 'warning'); return; }
    asignaciones.forEach(a => { a.cantidad_semanal = condCount[a.conductor_id]; });
    if (!confirm(`¿Guardar ${asignaciones.length} asignaciones?`)) return;
    try {
        await apiFetch('/api/asignacion/confirmar', {
            method: 'POST',
            body: JSON.stringify({ semana_id: semanaId, asignaciones })
        });
        showToast(`${asignaciones.length} asignaciones guardadas`, 'success');
        document.getElementById('card-resultados').style.display = 'none';
        if (window.__editandoAsignacion) {
            cargarAsignacionesExistentes(semanaId);
        }
        listarProgramasAsignacion();
        loadSemanas();
    } catch (err) { showToast(err.message || 'Error al guardar', 'error'); }
}

function exportarResultadosExcel() {
    const data = window.__lastResultados;
    if (!data) { showToast('Ejecuta una asignación primero', 'warning'); return; }
    const rows = [['Día', 'Hora', 'Grupo', 'Territorio', 'Punto Reunión', 'Conductor']];
    (data.resultados || []).forEach(r => {
        rows.push([r.dia || '', r.hora || '', r.grupo || '', r.territorio || '', r.punto_reunion || '', r.asignado ? (r.conductor_asignado?.nombre || '') : 'SIN ASIGNAR']);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Asignacion');
    XLSX.writeFile(wb, 'asignacion.xlsx');
    showToast('Excel descargado', 'success');
}

async function exportarResultadosSheets(semanaId) {
    if (!semanaId) semanaId = window.__semanaActual;
    if (!semanaId) { showToast('Selecciona una semana primero', 'warning'); return; }
    try {
        const res = await apiFetch('/api/asignacion/exportar-sheets', {
            method: 'POST',
            body: JSON.stringify({ semana_id: semanaId })
        });
        showToast(`${res.mensaje} — ${res.url}`, 'success', 8000);
        if (confirm(`¿Abrir "${res.sheetName}" en el navegador?`)) {
            window.open(res.url, '_blank');
        }
    } catch (err) {
        showToast(err.message || 'Error al exportar', 'error');
    }
}

function cancelarEdicionAsignacion() {
    const card = document.getElementById('card-resultados');
    if (card) card.style.display = 'none';
    window.__semanaActual = null;
}

async function borrarAsignaciones(semanaId) {
    if (!semanaId) { showToast('Selecciona una semana primero', 'warning'); return; }
    if (!confirm('¿Eliminar TODAS las asignaciones de esta semana? Los conductores quedarǭn sin asignar.')) return;
    try {
        await apiFetch(`/api/asignacion/semana/${semanaId}`, { method: 'DELETE' });
        showToast('Asignaciones eliminadas', 'success');
        document.getElementById('card-resultados').style.display = 'none';
        listarProgramasAsignacion();
        loadSemanas();
    } catch (err) { showToast(err.message || 'Error al borrar', 'error'); }
}

/* ====== TAB 2: PROGRAMA ====== */
let puntosSelectCache = [];
let editandoProgramaId = null;

async function cargarPuntosSelect() {
    try {
        const d = await apiFetch('/api/puntos-reunion');
        puntosSelectCache = d.puntos || [];
    } catch { puntosSelectCache = []; }
}

function opcionesPuntos() {
    if (puntosSelectCache.length === 0) return '<option value="">— Sin puntos —</option>';
    return '<option value="">—</option>' + puntosSelectCache.map(p =>
        `<option value="${p.nombre}">${p.nombre}</option>`
    ).join('');
}



const GRUPO_OPTIONS = ['TODA LA CONGREGACION', 'GRUPO A', 'GRUPO B'];
const MODALIDAD_OPTIONS = ['FISICO', 'ZOOM', 'CARTAS'];

const DEFAULT_TURNOS = [
    { dia: 'LUNES', hora: 'Mañana (8:20 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'LUNES', hora: 'Tarde (6:20 PM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'MARTES', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'MARTES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO A' },
    { dia: 'MARTES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO B' },
    { dia: 'MIERCOLES', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'MIERCOLES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO A' },
    { dia: 'MIERCOLES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO B' },
    { dia: 'MIERCOLES', hora: 'Tarde (6:20 PM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'JUEVES', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'JUEVES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO A' },
    { dia: 'JUEVES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO B' },
    { dia: 'JUEVES', hora: 'Tarde (6:20 PM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'VIERNES', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'VIERNES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO A' },
    { dia: 'VIERNES', hora: 'Mañana (8:20 AM)', grupo: 'GRUPO B' },
    { dia: 'VIERNES', hora: 'Tarde (6:20 PM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'SABADO', hora: 'Madrugada (6:30 AM)', grupo: 'TODA LA CONGREGACION' },
    { dia: 'DOMINGO', hora: 'Domingo (10:20 AM)', grupo: 'TODA LA CONGREGACION' },
];

async function toggleTurnosGrid() {
    const container = document.getElementById('turnos-container');
    const actions = document.getElementById('programa-actions');
    const btn = document.getElementById('btn-empezar-programa');
    if (!container) return;
    if (container.style.display === 'none') {
        container.style.display = 'block';
        if (actions) actions.style.display = 'block';
        if (btn) btn.innerHTML = '<i class="fas fa-times"></i> Cerrar';
        if (!editandoProgramaId || modoPlantilla) {
            try {
                const d = await apiFetch('/api/programa-semanal/plantilla');
                const prog = d.programa;
                if (prog && (prog.programa_semanal_turnos || []).length > 0) {
                    renderTurnosDesdeDatos(prog.programa_semanal_turnos, prog.filas_extra || []);
                } else {
                    renderEmptyTurnosGrid(true);
                }
            } catch {
                renderEmptyTurnosGrid(true);
            }
        }
    } else {
        container.style.display = 'none';
        if (actions) actions.style.display = 'none';
        if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Empezar a crear programa';
    }
}

const DAY_COLORS = {
    LUNES: '#fbe4d5', MARTES: '#e2efd9', MIERCOLES: '#deeaf6',
    JUEVES: '#fff2cc', VIERNES: '#ead1dc', SABADO: '#ffdfc0', DOMINGO: '#ffe599'
};
const COMPACT_STYLE = 'font-size:0.75rem;padding:0 2px;height:auto;line-height:1.1;border-width:1px;box-sizing:border-box';

function insertAfterDay(dia, tr) {
    const tbody = document.querySelector('#programa-table tbody');
    if (!tbody) return;
    const lastRow = tbody.querySelector(`tr[data-dia="${dia}"]:last-child`);
    if (lastRow) {
        lastRow.after(tr);
        return;
    }
    const idx = DIAS_ORDEN.indexOf(dia);
    for (let i = idx + 1; i < DIAS_ORDEN.length; i++) {
        const next = tbody.querySelector(`tr[data-dia="${DIAS_ORDEN[i]}"]`);
        if (next) { next.before(tr); return; }
    }
    tbody.appendChild(tr);
}

function insertBeforeDay(dia, tr) {
    const tbody = document.querySelector('#programa-table tbody');
    if (!tbody) return;
    const firstRow = tbody.querySelector(`tr[data-dia="${dia}"]`);
    if (firstRow) {
        firstRow.before(tr);
        return;
    }
    const idx = DIAS_ORDEN.indexOf(dia);
    for (let i = idx + 1; i < DIAS_ORDEN.length; i++) {
        const next = tbody.querySelector(`tr[data-dia="${DIAS_ORDEN[i]}"]`);
        if (next) { next.before(tr); return; }
    }
    tbody.appendChild(tr);
}

function renderEmptyTurnosGrid(preload) {
    const container = document.getElementById('turnos-container');
    if (!container) return;

    const inicio = parseLocalDate(document.getElementById('prog-semana-inicio')?.value);
    const diasOff = { LUNES: 0, MARTES: 1, MIERCOLES: 2, JUEVES: 3, VIERNES: 4, SABADO: 5, DOMINGO: 6 };
    function dateStr(dia) {
        if (!inicio) return '';
        const d = new Date(inicio);
        d.setDate(d.getDate() + (diasOff[dia] || 0));
        return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    }

    let html = '<div class="table-container"><table class="table" id="programa-table" style="font-size:0.75rem">';
    html += '<thead><tr><th style="width:7%;padding:3px 6px;font-size:0.65rem">Día</th><th style="width:18%;padding:3px 6px;font-size:0.65rem">Hora</th><th style="width:6%;padding:3px 6px;font-size:0.65rem">Grupo</th><th style="width:27%;padding:3px 6px;font-size:0.65rem">Territorio</th><th style="width:30%;padding:3px 6px;font-size:0.65rem">P. Reunión</th><th style="width:8%;padding:3px 6px;font-size:0.65rem">Modalidad</th><th style="width:4%;padding:3px 6px;font-size:0.65rem"></th></tr></thead>';
    html += '<tbody>';
    html += '</tbody></table></div>';
    container.innerHTML = html;
    if (preload) {
        DEFAULT_TURNOS.forEach(t => agregarFilaTurno(t.dia, t));
        agregarFilaExtra('MARTES');
        agregarFilaExtra('SABADO');
        agregarFilaExtra('SABADO');
        agregarFilaExtra('DOMINGO', null, true);
    }
}

function agregarFilaTurnoDesde(btn) {
    const tr = btn.closest('tr');
    agregarFilaTurno(tr.dataset.dia, null, tr);
}

function agregarFilaExtraDesde(btn, before) {
    const tr = btn.closest('tr');
    agregarFilaExtra(tr.dataset.dia, null, before ? 'before' : 'after', tr);
}

function renderTurnosDesdeDatos(turnos, extras) {
    const container = document.getElementById('turnos-container');
    if (!container) return;
    const inicio = parseLocalDate(document.getElementById('prog-semana-inicio')?.value);
    const diasOff = { LUNES: 0, MARTES: 1, MIERCOLES: 2, JUEVES: 3, VIERNES: 4, SABADO: 5, DOMINGO: 6 };
    function dateStr(dia) {
        if (!inicio) return '';
        const d = new Date(inicio);
        d.setDate(d.getDate() + (diasOff[dia] || 0));
        return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    }
    let html = '<div class="table-container"><table class="table" id="programa-table" style="font-size:0.75rem">';
    html += '<thead><tr><th style="width:7%;padding:3px 6px;font-size:0.65rem">Día</th><th style="width:18%;padding:3px 6px;font-size:0.65rem">Hora</th><th style="width:6%;padding:3px 6px;font-size:0.65rem">Grupo</th><th style="width:27%;padding:3px 6px;font-size:0.65rem">Territorio</th><th style="width:30%;padding:3px 6px;font-size:0.65rem">P. Reunión</th><th style="width:8%;padding:3px 6px;font-size:0.65rem">Modalidad</th><th style="width:4%;padding:3px 6px;font-size:0.65rem"></th></tr></thead>';
    html += '<tbody>';
    DIAS_ORDEN.forEach(dia => {
        const color = DAY_COLORS[dia] || '#fff';
        const turnosDia = turnos.filter(t => t.dia === dia);
        const extrasDia = extras.filter(e => e.dia === dia).sort((a, b) => (a.orden || 0) - (b.orden || 0));
        const allItems = [];
        extrasDia.filter(e => (e.orden || 0) < 0).forEach(e => allItems.push({ tipo: 'extra', datos: e }));
        turnosDia.forEach(t => allItems.push({ tipo: 'turno', datos: t }));
        extrasDia.filter(e => (e.orden || 0) >= 0).forEach(e => allItems.push({ tipo: 'extra', datos: e }));
        allItems.forEach((item, idx) => {
            const isFirst = idx === 0;
            const diaCell = isFirst ? capitalize(dia) + (turnosDia.length <= 1 && extrasDia.length === 0 ? `<br><small style="font-weight:400">${dateStr(dia)}</small>` : '') : (isFirst && turnosDia.length > 1 ? capitalize(dia) : '');
            const dateCell = (idx === 1 && turnosDia.length > 0) ? `<small style="font-weight:400">${dateStr(dia)}</small>` : '';
            if (item.tipo === 'turno') {
                const t = item.datos;
                const optsH = FRANJAS.map(h => `<option value="${h}" ${t.hora === h ? 'selected' : ''}>${h}</option>`).join('');
                const optsG = GRUPO_OPTIONS.map(g => `<option value="${g}" ${t.grupo === g ? 'selected' : ''}>${g.replace('TODA LA CONGREGACION', 'TODA').replace('GRUPO ', 'G')}</option>`).join('');
                const optsP = opcionesPuntos().replace(`value="${t.punto_reunion || ''}"`, `value="${t.punto_reunion || ''}" selected`);
                const optsM = MODALIDAD_OPTIONS.map(m => `<option value="${m}" ${t.modalidad === m ? 'selected' : ''}>${m}</option>`).join('');
                const CELL = 'padding:1px 2px;border-bottom:1px solid #ddd';
                html += `<tr class="programa-row" data-dia="${dia}" style="background:${color}">
                    <td class="dia-cell" style="${CELL};font-weight:600;font-size:0.7rem">${diaCell}</td>
                    <td style="${CELL}"><select class="form-control turno-hora" style="${COMPACT_STYLE}">${optsH}</select></td>
                    <td style="${CELL}"><select class="form-control turno-grupo" style="${COMPACT_STYLE}">${optsG}</select></td>
                    <td style="${CELL}"><input type="text" class="form-control turno-territorio" style="${COMPACT_STYLE}" value="${t.territorio || ''}"></td>
                    <td style="${CELL}"><select class="form-control turno-punto" style="${COMPACT_STYLE}">${optsP}</select></td>
                    <td style="${CELL}"><select class="form-control turno-modalidad" style="${COMPACT_STYLE}">${optsM}</select></td>
                    <td style="${CELL};white-space:nowrap;text-align:right">
                        <button type="button" onclick="agregarFilaTurnoDesde(this)" class="add-btn add-btn-turno" title="Agregar turno"><i class="fas fa-plus-circle"></i></button>
                        <button type="button" onclick="agregarFilaExtraDesde(this, true)" class="add-btn add-btn-extra" title="Agregar extra arriba"><i class="fas fa-pen"></i> <small>↑</small></button>
                        <button type="button" onclick="agregarFilaExtraDesde(this, false)" class="add-btn add-btn-extra" title="Agregar extra abajo"><i class="fas fa-pen"></i> <small>↓</small></button>
                        <button type="button" onclick="this.closest('tr').remove(); actualizarDias()" class="del-btn"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
            } else {
                const e = item.datos;
                const inp = (val, cls, ph, w) => `<input type="text" class="${cls}" placeholder="${ph}" style="width:${w};border:1px solid #ddd;border-radius:3px;padding:2px 4px;font-size:0.7rem" value="${val || ''}">`;
                html += `<tr class="extra-fila-row" data-dia="${dia}" data-antes="${(e.orden || 0) < 0 ? 'true' : 'false'}" style="background:${color}">
                    <td style="padding:2px 6px;border-bottom:1px dashed #ccc"></td>
                    <td style="padding:2px 6px;border-bottom:1px dashed #ccc">${inp(e.hora, 'extra-fila-hora', 'Hora', '70px')}</td>
                    <td style="padding:2px 6px;border-bottom:1px dashed #ccc">${inp(e.grupo, 'extra-fila-grupo', 'Grupo', '100%')}</td>
                    <td style="padding:2px 6px;border-bottom:1px dashed #ccc">${inp(e.territorio, 'extra-fila-territorio', 'Territorio', '100%')}</td>
                    <td style="padding:2px 6px;border-bottom:1px dashed #ccc">${inp(e.punto_reunion, 'extra-fila-punto', 'P. Reunión', '100%')}</td>
                    <td style="padding:2px 6px;border-bottom:1px dashed #ccc">${inp(e.conductor, 'extra-fila-conductor', 'Conductor', '100%')}</td>
                    <td style="padding:2px 6px;border-bottom:1px dashed #ccc;white-space:nowrap;text-align:right">
                        <button type="button" onclick="agregarFilaTurnoDesde(this)" class="add-btn add-btn-turno" title="Agregar turno"><i class="fas fa-plus-circle"></i></button>
                        <button type="button" onclick="agregarFilaExtraDesde(this, true)" class="add-btn add-btn-extra" title="Agregar extra arriba"><i class="fas fa-pen"></i> <small>↑</small></button>
                        <button type="button" onclick="agregarFilaExtraDesde(this, false)" class="add-btn add-btn-extra" title="Agregar extra abajo"><i class="fas fa-pen"></i> <small>↓</small></button>
                        <button type="button" onclick="this.closest('tr').remove(); actualizarDias()" class="btn-extra-del"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
            }
        });
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
    actualizarDias();
}

function agregarFilaTurno(dia, datos, refRow) {
    const optsH = FRANJAS.map(h => `<option value="${h}">${h}</option>`).join('');
    const optsG = GRUPO_OPTIONS.map(g => `<option value="${g}">${g.replace('TODA LA CONGREGACION', 'TODA').replace('GRUPO ', 'G')}</option>`).join('');
    const optsP = opcionesPuntos();
    const optsM = MODALIDAD_OPTIONS.map(m => `<option value="${m}">${m}</option>`).join('');
    const CELL = 'padding:1px 2px;border-bottom:1px solid #ddd';
    const d = datos || {};
    const color = DAY_COLORS[dia] || '#fff';

    // Build dia cell content based on preceding sibling rows
    const diaCell = capitalize(dia);

    const tr = document.createElement('tr');
    tr.className = 'programa-row';
    tr.dataset.dia = dia;
    tr.style.background = color;
    tr.innerHTML = `
        <td class="dia-cell" style="${CELL};font-weight:600;font-size:0.7rem">${diaCell}</td>
        <td style="${CELL}"><select class="form-control turno-hora" style="${COMPACT_STYLE}">${optsH}</select></td>
        <td style="${CELL}"><select class="form-control turno-grupo" style="${COMPACT_STYLE}">${optsG}</select></td>
        <td style="${CELL}"><input type="text" class="form-control turno-territorio" style="${COMPACT_STYLE}"></td>
        <td style="${CELL}"><select class="form-control turno-punto" style="${COMPACT_STYLE}">${optsP}</select></td>
        <td style="${CELL}"><select class="form-control turno-modalidad" style="${COMPACT_STYLE}">${optsM}</select></td>
        <td style="${CELL};white-space:nowrap;text-align:right">
            <button type="button" onclick="agregarFilaTurnoDesde(this)" class="add-btn add-btn-turno" title="Agregar turno"><i class="fas fa-plus-circle"></i></button>
            <button type="button" onclick="agregarFilaExtraDesde(this, true)" class="add-btn add-btn-extra" title="Agregar extra arriba"><i class="fas fa-pen"></i> <small>↑</small></button>
            <button type="button" onclick="agregarFilaExtraDesde(this, false)" class="add-btn add-btn-extra" title="Agregar extra abajo"><i class="fas fa-pen"></i> <small>↓</small></button>
            <button type="button" onclick="this.closest('tr').remove(); actualizarDias()" class="del-btn"><i class="fas fa-trash"></i></button>
        </td>
    `;
    if (d.hora) tr.querySelector('.turno-hora').value = d.hora;
    if (d.grupo) tr.querySelector('.turno-grupo').value = d.grupo;
    if (d.territorio) tr.querySelector('.turno-territorio').value = d.territorio;
    if (d.punto_reunion) tr.querySelector('.turno-punto').value = d.punto_reunion;
    if (d.modalidad) tr.querySelector('.turno-modalidad').value = d.modalidad;
    if (refRow) { refRow.after(tr); } else { insertAfterDay(dia, tr); }
    actualizarDias();
}

function agregarFilaExtra(dia, datos, alInicio, refRow) {
    const d = datos || {};
    const color = DAY_COLORS[dia] || '#fff';
    const esBefore = alInicio === true || alInicio === 'before';
    const tr = document.createElement('tr');
    tr.className = 'extra-fila-row';
    tr.dataset.dia = dia;
    tr.dataset.antes = esBefore ? 'true' : 'false';
    tr.style.background = color;
    const inp = (val, cls, ph, w) => `<input type="text" class="${cls}" placeholder="${ph}" style="width:${w};border:1px solid #ddd;border-radius:3px;padding:2px 4px;font-size:0.7rem" value="${val || ''}">`;
    tr.innerHTML = `
        <td style="padding:2px 6px;border-bottom:1px dashed #ccc"></td>
        <td style="padding:2px 6px;border-bottom:1px dashed #ccc">${inp(d.hora, 'extra-fila-hora', 'Hora', '70px')}</td>
        <td style="padding:2px 6px;border-bottom:1px dashed #ccc">${inp(d.grupo, 'extra-fila-grupo', 'Grupo', '100%')}</td>
        <td style="padding:2px 6px;border-bottom:1px dashed #ccc">${inp(d.territorio, 'extra-fila-territorio', 'Territorio', '100%')}</td>
        <td style="padding:2px 6px;border-bottom:1px dashed #ccc">${inp(d.punto_reunion, 'extra-fila-punto', 'P. Reunión', '100%')}</td>
        <td style="padding:2px 6px;border-bottom:1px dashed #ccc">${inp(d.conductor, 'extra-fila-conductor', 'Conductor', '100%')}</td>
        <td style="padding:2px 6px;border-bottom:1px dashed #ccc;white-space:nowrap;text-align:right">
            <button type="button" onclick="agregarFilaTurnoDesde(this)" class="add-btn add-btn-turno" title="Agregar turno"><i class="fas fa-plus-circle"></i></button>
            <button type="button" onclick="agregarFilaExtraDesde(this, true)" class="add-btn add-btn-extra" title="Agregar extra arriba"><i class="fas fa-pen"></i> <small>↑</small></button>
            <button type="button" onclick="agregarFilaExtraDesde(this, false)" class="add-btn add-btn-extra" title="Agregar extra abajo"><i class="fas fa-pen"></i> <small>↓</small></button>
            <button type="button" onclick="this.closest('tr').remove()" class="btn-extra-del"><i class="fas fa-trash"></i></button>
        </td>
    `;
    if (refRow) {
        if (esBefore) { refRow.before(tr); } else { refRow.after(tr); }
    } else if (esBefore) {
        insertBeforeDay(dia, tr);
    } else {
        insertAfterDay(dia, tr);
    }
}

function actualizarDias() {
    const semanaStart = parseLocalDate(document.getElementById('prog-semana-inicio')?.value);
    const diasOff = { LUNES: 0, MARTES: 1, MIERCOLES: 2, JUEVES: 3, VIERNES: 4, SABADO: 5, DOMINGO: 6 };
    function dateStr(dia) {
        if (!semanaStart) return '';
        const d = new Date(semanaStart);
        d.setDate(d.getDate() + (diasOff[dia] || 0));
        return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    }
    DIAS_ORDEN.forEach(dia => {
        const rows = document.querySelectorAll(`#programa-table tbody tr.programa-row[data-dia="${dia}"]`);
        rows.forEach((row, i) => {
            const cell = row.querySelector('.dia-cell');
            if (!cell) return;
            if (i === 0) {
                cell.innerHTML = rows.length === 1
                    ? `${capitalize(dia)}<br><small style="font-weight:400">${dateStr(dia)}</small>`
                    : capitalize(dia);
            } else if (i === 1) {
                cell.innerHTML = `<small style="font-weight:400">${dateStr(dia)}</small>`;
            } else {
                cell.innerHTML = '';
            }
        });
    });
}

async function guardarPrograma(e) {
    e.preventDefault();
    const btn = document.querySelector('#programa-actions button[type="submit"]');
    setLoading(btn, true);
    try {
        const turnos = [];
        document.querySelectorAll('#programa-table tbody tr.programa-row[data-dia]').forEach(row => {
            const dia = row.dataset.dia;
            const grupo = row.querySelector('.turno-grupo')?.value;
            if (!grupo) return;
            turnos.push({
                dia,
                hora: row.querySelector('.turno-hora')?.value,
                grupo,
                territorio: row.querySelector('.turno-territorio')?.value || null,
                punto_reunion: row.querySelector('.turno-punto')?.value || null,
                modalidad: row.querySelector('.turno-modalidad')?.value || 'FISICO'
            });
        });
        if (turnos.length === 0) { showToast('Completa al menos un turno (selecciona grupo)', 'warning'); return; }

        const filasExtra = [];
        document.querySelectorAll('#programa-table tbody tr.extra-fila-row').forEach(row => {
            filasExtra.push({
                dia: row.dataset.dia,
                hora: row.querySelector('.extra-fila-hora')?.value || '',
                grupo: row.querySelector('.extra-fila-grupo')?.value || '',
                territorio: row.querySelector('.extra-fila-territorio')?.value || '',
                punto_reunion: row.querySelector('.extra-fila-punto')?.value || '',
                conductor: row.querySelector('.extra-fila-conductor')?.value || '',
                orden: row.dataset.antes === 'true' ? -1 : 0
            });
        });

        const body = {
            turnos,
            filasExtra: filasExtra.length > 0 ? filasExtra : undefined
        };

        if (editandoProgramaId) {
            body.semana_inicio = document.getElementById('prog-semana-inicio')?.value;
            body.semana_fin = document.getElementById('prog-semana-fin')?.value;
            await apiFetch(`/api/programa-semanal/${editandoProgramaId}`, { method: 'PUT', body: JSON.stringify(body) });
            if (editandoProgramaId === TEMPLATE_ID) {
                showToast('Plantilla guardada', 'success');
                const banner = document.getElementById('edit-banner-text');
                if (banner) banner.textContent = 'PLANTILLA — haz clic en "Editar Plantilla" para modificar los turnos';
            } else {
                showToast('Programa actualizado', 'success');
                cancelarEdicionPrograma();
            }
        } else {
            body.semana_inicio = document.getElementById('prog-semana-inicio')?.value;
            body.semana_fin = document.getElementById('prog-semana-fin')?.value;
            await apiFetch('/api/programa-semanal', { method: 'POST', body: JSON.stringify(body) });
            showToast('Programa creado', 'success');
            e.target.reset();
            cancelarEdicionPrograma();
        }
        listarProgramas();
        listarProgramasAsignacion();
    } catch (err) {
        showToast(err.message || 'Error guardando', 'error');
    } finally { setLoading(btn, false); }
}

async function listarProgramas() {
    const tbody = document.getElementById('tbody-programas');
    if (!tbody) return;
    try {
        const d = await apiFetch('/api/programa-semanal');
        tbody.innerHTML = '';
        (d.programas || []).forEach(p => {
            const turnos = p.programa_semanal_turnos || [];
            tbody.innerHTML += `<tr>
                <td><strong>Semana</strong></td>
                <td>${formatDate(p.semana_inicio)} — ${formatDate(p.semana_fin)}</td>
                <td><span class="badge badge-info">${turnos.length} turnos</span></td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editarPrograma('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarPrograma('${p.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
    } catch { tbody.innerHTML = '<tr><td colspan="4">Error</td></tr>'; }
}

async function loadPlantilla() {
    const tabProg = document.getElementById('tab-programa');
    if (!tabProg?.classList.contains('active')) {
        document.querySelectorAll('.nav-item[data-tab]').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tabProg?.classList.add('active');
    }
    document.querySelectorAll('.nav-item[data-tab]').forEach(t => t.classList.remove('active'));
    document.getElementById('nav-plantilla')?.classList.add('active');
    const pt = document.getElementById('page-title');
    if (pt) pt.textContent = 'Plantilla (Editar modelo por defecto)';

    editandoProgramaId = TEMPLATE_ID;
    modoPlantilla = true;
    document.getElementById('form-programa')?.reset();
    document.getElementById('turnos-container').style.display = 'none';
    document.getElementById('programa-actions').style.display = 'none';
    document.getElementById('edit-banner').style.display = 'none';
    const cancelBtn = document.getElementById('btn-cancelar-edicion');
    if (cancelBtn) cancelBtn.style.display = 'none';
    const rstBtn = document.getElementById('btn-restablecer-plantilla');
    if (rstBtn) rstBtn.style.display = 'none';

    const banner = document.getElementById('edit-banner');
    if (banner) { banner.style.display = 'block'; document.getElementById('edit-banner-text').textContent = 'PLANTILLA — haz clic en "Editar Plantilla" para modificar los turnos'; }
    const btnEmpezar = document.getElementById('btn-empezar-programa');
    if (btnEmpezar) btnEmpezar.innerHTML = '<i class="fas fa-pencil-alt"></i> Editar Plantilla';
    const btnText = document.querySelector('#programa-actions .btn-text');
    if (btnText) btnText.textContent = 'Guardar Plantilla';
    const btnReset = document.getElementById('btn-restablecer-plantilla');
    if (btnReset) btnReset.style.display = 'inline-flex';
    const plantillaHeader = document.querySelector('#tab-programa .card:first-child .card-header h3');
    if (plantillaHeader) plantillaHeader.innerHTML = '<i class="fas fa-pencil-alt"></i> Editar Plantilla';
    const progCards = document.querySelectorAll('#tab-programa > .card');
    if (progCards.length > 1) progCards[1].style.display = 'none';

    // Fetch plantilla data for date fields
    try {
        const d = await apiFetch('/api/programa-semanal/plantilla');
        const prog = d.programa;
        if (prog) {
            document.getElementById('prog-semana-inicio').value = prog.semana_inicio;
            document.getElementById('prog-semana-fin').value = prog.semana_fin;
        }
    } catch (err) {
        console.error('Error cargando plantilla:', err);
    }
}

async function restablecerPlantilla() {
    if (!confirm('¿Restablecer la plantilla a los valores por defecto? Se perderǭn los cambios personalizados.')) return;
    try {
        await apiFetch('/api/programa-semanal/plantilla', { method: 'POST' });
        showToast('Plantilla restablecida', 'success');
        loadPlantilla();
    } catch (err) { showToast(err.message || 'Error', 'error'); }
}

async function eliminarPrograma(id) {
    if (id === TEMPLATE_ID) { showToast('No se puede eliminar la plantilla', 'warning'); return; }
    if (!confirm('¿Eliminar este programa?')) return;
    try {
        await apiFetch(`/api/programa-semanal/${id}`, { method: 'DELETE' });
        showToast('Programa eliminado', 'success');
        listarProgramas();
        listarProgramasAsignacion();
    } catch (err) { showToast(err.message || 'Error', 'error'); }
}

async function editarPrograma(id) {
    try {
        const resetBtn = document.getElementById('btn-restablecer-plantilla');
        if (resetBtn) resetBtn.style.display = 'none';
        const d = await apiFetch(`/api/programa-semanal/${id}`);
        const prog = d.programa;
        if (!prog) { showToast('Programa no encontrado', 'error'); return; }

        document.querySelector('[data-tab="programa"]')?.click();

        editandoProgramaId = id;
        document.getElementById('prog-semana-inicio').value = prog.semana_inicio;
        document.getElementById('prog-semana-fin').value = prog.semana_fin;
        document.querySelector('#tab-programa .card:first-child .card-header h3').innerHTML = '<i class="fas fa-edit" style="color:#e67e22"></i> <span style="color:#e67e22">Editando Programa</span>';
        const banner = document.getElementById('edit-banner');
        document.getElementById('edit-banner-text').textContent = `Editando programa: ${formatDate(prog.semana_inicio)} — ${formatDate(prog.semana_fin)}`;
        banner.style.display = 'block';
        document.getElementById('turnos-container').style.display = 'block';
        document.getElementById('programa-actions').style.display = 'block';
        const btn = document.getElementById('btn-empezar-programa');
        if (btn) btn.innerHTML = '<i class="fas fa-times"></i> Cerrar';
        renderEmptyTurnosGrid();

        const turnos = (prog.programa_semanal_turnos || []).sort((a, b) => {
            const da = DIAS_ORDEN.indexOf(a.dia);
            const db = DIAS_ORDEN.indexOf(b.dia);
            if (da !== db) return da - db;
            const ha = FRANJAS.indexOf(a.hora);
            const hb = FRANJAS.indexOf(b.hora);
            if (ha !== hb) return ha - hb;
            return (a.grupo || '').localeCompare(b.grupo || '');
        });
        turnos.forEach(t => {
            agregarFilaTurno(t.dia, {
                hora: t.hora,
                grupo: t.grupo,
                territorio: t.territorio,
                punto_reunion: t.punto_reunion,
                modalidad: t.modalidad
            });
        });

        const extras = prog.filas_extra || [];
        extras.filter(f => (f.orden ?? 0) < 0).forEach(f => {
            agregarFilaExtra(f.dia, { hora: f.hora, grupo: f.grupo, territorio: f.territorio, punto_reunion: f.punto_reunion, conductor: f.conductor }, true);
        });
        extras.filter(f => (f.orden ?? 0) >= 0).forEach(f => {
            agregarFilaExtra(f.dia, { hora: f.hora, grupo: f.grupo, territorio: f.territorio, punto_reunion: f.punto_reunion, conductor: f.conductor });
        });

        const submitBtn = document.querySelector('#programa-actions button[type="submit"] .btn-text');
        if (submitBtn) submitBtn.textContent = 'Actualizar Programa';
        const cancelBtn = document.getElementById('btn-cancelar-edicion');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
        showToast('Editando programa — modifica los turnos y guarda', 'info');
    } catch (err) { showToast(err.message || 'Error al cargar programa', 'error'); }
}

function cancelarEdicionPrograma() {
    editandoProgramaId = null;
    modoPlantilla = false;
    document.getElementById('form-programa')?.reset();
    document.querySelector('#tab-programa .card:first-child .card-header h3').innerHTML = '<i class="fas fa-calendar-plus"></i> Nuevo Programa Semanal';
    document.getElementById('edit-banner').style.display = 'none';
    document.getElementById('turnos-container').style.display = 'none';
    document.getElementById('programa-actions').style.display = 'none';
    const btn = document.getElementById('btn-empezar-programa');
    if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Empezar a crear programa';
    const submitText = document.querySelector('#programa-actions button[type="submit"] .btn-text');
    if (submitText) submitText.textContent = 'Guardar Programa';
    const cancelBtn = document.getElementById('btn-cancelar-edicion');
    if (cancelBtn) cancelBtn.style.display = 'none';
    const resetBtn = document.getElementById('btn-restablecer-plantilla');
    if (resetBtn) resetBtn.style.display = 'none';
    const progCards = document.querySelectorAll('#tab-programa > .card');
    if (progCards.length > 1) progCards[1].style.display = '';
}

/* ====== TAB 3: CONDUCTORES ====== */
async function guardarConductor(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setLoading(btn, true);
    const editId = btn.dataset.editId;
    const payload = {
        nombre: document.getElementById('cond-nombre')?.value,
        grupo: document.getElementById('cond-grupo')?.value,
        tiene_pc: document.getElementById('cond-tiene-pc')?.checked || false,
        poca_movilidad: document.getElementById('cond-poca-movilidad')?.checked || false,
        solo_parque: document.getElementById('cond-solo-parque')?.checked || false,
        ubicacion_casa: document.getElementById('cond-ubicacion')?.value || null
    };
    try {
        if (editId) {
            await apiFetch(`/api/conductores/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
            showToast('Conductor actualizado', 'success');
            delete btn.dataset.editId;
            btn.querySelector('.btn-text').textContent = 'Guardar Conductor';
            e.target.reset();
            listarConductores();
            renderDisp();
        } else {
            const res = await apiFetch('/api/conductores', { method: 'POST', body: JSON.stringify(payload) });
            showToast('Conductor creado', 'success');
            e.target.reset();
            listarConductores();
            editarDisp(res.conductor.id);
            document.querySelector('[data-tab="conductores"]')?.click();
        }
    } catch (err) { showToast(err.message || 'Error', 'error'); }
    finally { setLoading(btn, false); }
}

async function listarConductores() {
    const tbody = document.getElementById('tbody-conductores');
    if (!tbody) return;
    try {
        const d = await apiFetch('/api/conductores');
        tbody.innerHTML = '';
        (d.conductores || []).forEach(c => {
            tbody.innerHTML += `<tr data-id="${c.id}">
                <td><strong class="cond-name">${c.nombre}</strong></td>
                <td><span class="badge badge-${c.grupo === 'A' ? 'info' : c.grupo === 'C' ? 'purple' : 'warning'}">Grupo ${c.grupo}</span></td>
                <td><code>${c.ubicacion_casa || '—'}</code></td>
                <td>${c.tiene_pc ? '<span class="badge badge-info">PC</span>' : ''}${c.poca_movilidad ? ' <span class="badge badge-warning">P.Mov</span>' : ''}${c.solo_parque ? ' <span class="badge badge-success">Parque</span>' : ''}${!c.tiene_pc && !c.poca_movilidad && !c.solo_parque ? '—' : ''}</td>
                <td><button class="btn btn-sm btn-secondary" onclick="editarDisp('${c.id}')"><i class="fas fa-table"></i> Disponibilidad</button></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="eliminarConductor('${c.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        });
    } catch { tbody.innerHTML = '<tr><td colspan="5">Error</td></tr>'; }
}

function filtrarConductores() {
    const input = document.getElementById('filtro-conductores');
    const grupoEl = document.getElementById('filtro-grupo');
    const pcEl = document.getElementById('filtro-pc');
    const pmovEl = document.getElementById('filtro-pmov');
    const parqueEl = document.getElementById('filtro-parque');
    const tbody = document.getElementById('tbody-conductores');
    if (!input || !tbody) return;
    const q = input.value.toLowerCase();
    const grupo = grupoEl?.value || '';
    const soloPC = pcEl?.checked || false;
    const soloPMov = pmovEl?.checked || false;
    const soloParque = parqueEl?.checked || false;
    tbody.querySelectorAll('tr').forEach(tr => {
        const name = tr.querySelector('.cond-name');
        if (!name) { tr.style.display = 'none'; return; }
        if (!name.textContent.toLowerCase().includes(q)) { tr.style.display = 'none'; return; }
        const badges = tr.querySelectorAll('td:nth-child(4) .badge');
        const badgeTexts = Array.from(badges).map(b => b.textContent.trim());
        if (grupo) {
            const grupoBadge = tr.querySelector('td:nth-child(2) .badge');
            const g = grupoBadge ? grupoBadge.textContent.trim() : '';
            if (!g.includes(grupo)) { tr.style.display = 'none'; return; }
        }
        if (soloPC && !badgeTexts.includes('PC')) { tr.style.display = 'none'; return; }
        if (soloPMov && !badgeTexts.includes('P.Mov')) { tr.style.display = 'none'; return; }
        if (soloParque && !badgeTexts.includes('Parque')) { tr.style.display = 'none'; return; }
        tr.style.display = '';
    });
}

async function editarConductor(id) {
    try {
        const d = await apiFetch('/api/conductores');
        const c = (d.conductores || []).find(x => x.id === id);
        if (!c) { showToast('No encontrado', 'error'); return; }
        document.getElementById('cond-nombre').value = c.nombre || '';
        document.getElementById('cond-grupo').value = c.grupo || 'A';
        document.getElementById('cond-tiene-pc').checked = c.tiene_pc === true;
        document.getElementById('cond-poca-movilidad').checked = c.poca_movilidad === true;
        document.getElementById('cond-solo-parque') && (document.getElementById('cond-solo-parque').checked = c.solo_parque === true);
        document.getElementById('cond-ubicacion').value = c.ubicacion_casa || '';
        const btn = document.querySelector('#form-conductor button[type="submit"]');
        btn.dataset.editId = id;
        btn.querySelector('.btn-text').textContent = 'Actualizar Conductor';
        document.querySelector('[data-tab="conductores"]')?.click();
    } catch { showToast('Error', 'error'); }
}

async function eliminarConductor(id) {
    if (!confirm('¿Desactivar este conductor?')) return;
    try {
        await apiFetch(`/api/conductores/${id}`, { method: 'DELETE' });
        showToast('Conductor desactivado', 'success');
        listarConductores();
        renderDisp();
    } catch (err) { showToast(err.message || 'Error', 'error'); }
}

/* ====== TAB: PUNTOS REUNI?"N ====== */
async function guardarPunto(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    setLoading(btn, true);
    const editId = btn.dataset.editId;
    const payload = {
        nombre: document.getElementById('punto-nombre')?.value,
        ubicacion: document.getElementById('punto-ubicacion')?.value || null
    };
    try {
        if (editId) {
            await apiFetch(`/api/puntos-reunion/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
            showToast('Punto actualizado', 'success');
            delete btn.dataset.editId;
            btn.querySelector('.btn-text').textContent = 'Guardar Punto';
        } else {
            await apiFetch('/api/puntos-reunion', { method: 'POST', body: JSON.stringify(payload) });
            showToast('Punto creado', 'success');
        }
        e.target.reset();
        listarPuntos();
        await cargarPuntosSelect();
    } catch (err) { showToast(err.message || 'Error', 'error'); }
    finally { setLoading(btn, false); }
}

async function listarPuntos() {
    const tbody = document.getElementById('tbody-puntos');
    if (!tbody) return;
    try {
        const d = await apiFetch('/api/puntos-reunion');
        tbody.innerHTML = '';
        (d.puntos || []).forEach(p => {
            tbody.innerHTML += `<tr data-id="${p.id}">
                <td><strong>${p.nombre}${p.fijo ? ' <span class="badge badge-secondary">Fijo</span>' : ''}</strong></td>
                <td><code>${p.ubicacion || '—'}</code></td>
                <td>
                    ${p.fijo ? '' : `<button class="btn btn-sm btn-primary" onclick="editarPunto('${p.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarPunto('${p.id}')"><i class="fas fa-trash"></i></button>`}
                </td>
            </tr>`;
        });
    } catch { tbody.innerHTML = '<tr><td colspan="3">Error</td></tr>'; }
}

async function editarPunto(id) {
    try {
        const d = await apiFetch('/api/puntos-reunion');
        const p = (d.puntos || []).find(x => x.id === id);
        if (!p) { showToast('No encontrado', 'error'); return; }
        if (p.fijo) { showToast('No se puede editar un punto fijo', 'error'); return; }
        document.getElementById('punto-nombre').value = p.nombre || '';
        document.getElementById('punto-ubicacion').value = p.ubicacion || '';
        const btn = document.querySelector('#form-punto button[type="submit"]');
        btn.dataset.editId = id;
        btn.querySelector('.btn-text').textContent = 'Actualizar Punto';
        document.querySelector('[data-tab="puntos"]')?.click();
    } catch { showToast('Error', 'error'); }
}

async function eliminarPunto(id) {
    try {
        const d = await apiFetch('/api/puntos-reunion');
        const p = (d.puntos || []).find(x => x.id === id);
        if (p?.fijo) { showToast('No se puede eliminar un punto fijo', 'error'); return; }
        if (!confirm('¿Desactivar este punto de reunión?')) return;
        await apiFetch(`/api/puntos-reunion/${id}`, { method: 'DELETE' });
        showToast('Punto desactivado', 'success');
        listarPuntos();
        await cargarPuntosSelect();
    } catch (err) { showToast(err.message || 'Error', 'error'); }
}

/* ====== DISPONIBILIDAD (VIEW + EDIT MODE) ====== */
let dispConductorActual = null;
let dispEditMode = false;
let dispConductorData = {};

function sortKeyDisp(slot) {
    const diaIdx = DIAS_ORDEN.indexOf(slot.dia);
    const horaIdx = FRANJAS.indexOf(slot.hora);
    return diaIdx * 10 + horaIdx;
}

function getConductorName(id) {
    const row = document.querySelector(`#tbody-conductores tr[data-id="${id}"]`);
    if (row) return row.querySelector('.cond-name')?.textContent || id;
    return id;
}

async function editarDisp(id) {
    dispConductorActual = id;
    dispEditMode = false;
    try {
        const [dispRes, condRes] = await Promise.all([
            apiFetch(`/api/conductores/${id}/disponibilidad`),
            apiFetch('/api/conductores')
        ]);
        const dispList = dispRes.disponibilidad || [];
        COND_DISP_SEL[id] = {};
        dispList.forEach(item => {
            COND_DISP_SEL[id][`${item.dia}|${item.hora}`] = item.disponible;
        });
        const c = (condRes.conductores || []).find(x => x.id === id);
        if (c) dispConductorData[id] = c;
        renderDisp();
        document.querySelector('[data-tab="conductores"]')?.click();
    } catch { showToast('Error cargando disponibilidad', 'error'); }
}

function renderDisp() {
    const container = document.getElementById('disp-container');
    if (!container) return;
    const id = dispConductorActual;
    if (!id) { container.innerHTML = '<p class="text-muted">Selecciona un conductor y haz clic en "Disponibilidad".</p>'; return; }

    const slots = COND_DISP_SEL[id] || {};
    const trueSlots = Object.keys(slots).filter(k => slots[k] === true).map(k => {
        const [dia, hora] = k.split('|');
        return { dia, hora, disponible: true };
    });
    trueSlots.sort((a, b) => sortKeyDisp(a) - sortKeyDisp(b));
    const cd = dispConductorData[id] || {};

    let html = `<div class="disp-editor" data-conductor-id="${id}">`;
    html += `<h4 style="margin-bottom:10px">Conductor <strong>${getConductorName(id)}</strong></h4>`;

    if (!dispEditMode) {
        // === VIEW MODE ===
        if (trueSlots.length === 0) {
            html += '<p class="text-muted">Sin slots de disponibilidad.</p>';
        } else {
            html += '<div class="table-container"><table class="table"><thead><tr><th>Día</th><th>Hora</th></tr></thead><tbody>';
            trueSlots.forEach(s => {
                html += `<tr><td>${capitalize(s.dia)}</td><td>${s.hora}</td></tr>`;
            });
            html += '</tbody></table></div>';
        }
        html += '<div style="margin-top:10px;font-size:0.8rem;color:#555">';
        html += `Grupo: <strong>${cd.grupo || '—'}</strong> | PC Zoom: <strong>${cd.tiene_pc ? 'Sí' : 'No'}</strong> | Poca movilidad: <strong>${cd.poca_movilidad ? 'Sí' : 'No'}</strong>${cd.solo_parque ? ' | <span class="badge badge-success">Solo Parque</span>' : ''}`;
        if (cd.ubicacion_casa) html += ` | Ubicación: <code>${cd.ubicacion_casa}</code>`;
        html += '</div>';
        html += '<div style="margin-top:15px;display:flex;gap:8px">';
        html += `<button class="btn btn-primary" onclick="activarEditMode()"><i class="fas fa-edit"></i> Editar</button>`;
        html += `<button class="btn btn-secondary" onclick="cerrarDisp()"><i class="fas fa-times"></i> Cerrar</button>`;
        html += '</div>';
    } else {
        // === EDIT MODE ===
        const allKeys = Object.keys(slots);
        const editSlots = allKeys.map(k => {
            const [dia, hora] = k.split('|');
            return { dia, hora, disponible: slots[k] === true };
        });
        editSlots.sort((a, b) => sortKeyDisp(a) - sortKeyDisp(b));

        html += '<div class="table-container"><table class="table"><thead><tr><th>Día</th><th>Hora</th><th>Estado</th><th></th></tr></thead><tbody>';
        trueSlots.forEach(s => {
            html += `<tr><td>${capitalize(s.dia)}</td><td>${s.hora}</td><td><span class="badge badge-success">Disponible</span></td><td><button type="button" class="btn btn-sm btn-danger" onclick="eliminarSlot('${s.dia}','${s.hora}')"><i class="fas fa-trash"></i> Eliminar</button></td></tr>`;
        });
        editSlots.filter(s => !s.disponible).forEach(s => {
            html += `<tr style="opacity:0.5;text-decoration:line-through"><td>${capitalize(s.dia)}</td><td>${s.hora}</td><td><span class="badge badge-secondary">Eliminado</span></td><td><button type="button" class="btn btn-sm btn-warning" onclick="restaurarSlot('${s.dia}','${s.hora}')"><i class="fas fa-undo"></i> Restaurar</button></td></tr>`;
        });
        html += '</tbody></table></div>';

        // Add slot form
        html += '<div class="form-row disp-add-row" style="margin-top:10px;align-items:end">';
        html += '<div class="form-group"><label>Día</label><select class="form-control disp-add-dia">';
        DIAS_ORDEN.forEach(d => { html += `<option value="${d}">${capitalize(d)}</option>`; });
        html += '</select></div>';
        html += '<div class="form-group"><label>Hora</label><select class="form-control disp-add-hora">';
        FRANJAS.forEach(f => { html += `<option value="${f}">${f}</option>`; });
        html += '</select></div>';
        html += `<div class="form-group" style="align-self:end"><button type="button" class="btn btn-secondary" onclick="agregarSlot()"><i class="fas fa-plus"></i> Guardar</button></div>`;
        html += '</div>';

        // Conductor attributes editor
        html += '<div style="margin-top:15px;padding:12px;background:#f9f9f9;border-radius:6px;border:1px solid #eee">';
        html += '<strong style="font-size:0.85rem">Atributos del conductor</strong>';
        html += '<div class="form-row" style="margin-top:8px;align-items:end">';
        html += '<div class="form-group" style="margin-bottom:0"><label style="font-size:0.75rem">Grupo</label>';
        html += `<select id="edit-cond-grupo" class="form-control" style="font-size:0.75rem;padding:4px 6px">
            <option value="A" ${cd.grupo === 'A' ? 'selected' : ''}>Grupo A</option>
            <option value="B" ${cd.grupo === 'B' ? 'selected' : ''}>Grupo B</option>
            <option value="C" ${cd.grupo === 'C' ? 'selected' : ''}>Grupo C (Comodón)</option>
        </select></div>`;
        html += '<div class="form-group" style="margin-bottom:0"><label style="font-size:0.75rem">Ubicación Casa (lat,lng)</label>';
        html += `<input type="text" id="edit-cond-ubicacion" class="form-control" style="font-size:0.75rem;padding:4px 6px" value="${cd.ubicacion_casa || ''}" placeholder="-12.0464,-77.0428"></div>`;
        html += '<div class="form-group" style="margin-bottom:0"><label class="checkbox-label" style="font-size:0.75rem">';
        html += `<input type="checkbox" id="edit-cond-pc" ${cd.tiene_pc ? 'checked' : ''}> Tiene PC (Zoom)</label></div>`;
        html += '<div class="form-group" style="margin-bottom:0"><label class="checkbox-label" style="font-size:0.75rem">';
        html += `<input type="checkbox" id="edit-cond-movilidad" ${cd.poca_movilidad ? 'checked' : ''}> Poca Movilidad</label></div>`;
        html += '<div class="form-group" style="margin-bottom:0"><label class="checkbox-label" style="font-size:0.75rem">';
        html += `<input type="checkbox" id="edit-cond-solo-parque" ${cd.solo_parque ? 'checked' : ''}> Solo Parque</label></div>`;
        html += '</div></div>';

        html += '<div style="margin-top:15px;display:flex;gap:8px">';
        html += `<button class="btn btn-primary" onclick="guardarDisponibilidad()"><i class="fas fa-save"></i> Confirmar</button>`;
        html += `<button class="btn btn-secondary" onclick="cancelarEditMode()"><i class="fas fa-times"></i> Cancelar</button>`;
        html += '</div>';
    }

    html += '</div>';
    container.innerHTML = html;
}

async function activarEditMode() {
    try {
        const d = await apiFetch('/api/conductores');
        const c = (d.conductores || []).find(x => x.id === dispConductorActual);
        if (c) dispConductorData[dispConductorActual] = c;
    } catch {}
    dispEditMode = true;
    renderDisp();
}

function cancelarEditMode() {
    // Reload original state from server
    const id = dispConductorActual;
    if (id) editarDisp(id);
}

function cerrarDisp() {
    dispConductorActual = null;
    dispEditMode = false;
    renderDisp();
}

function agregarSlot() {
    const container = document.getElementById('disp-container');
    if (!container) return;
    const editor = container.querySelector('.disp-editor');
    if (!editor) return;
    const id = editor.dataset.conductorId;
    if (!id) return;
    const dia = editor.querySelector('.disp-add-dia')?.value;
    const hora = editor.querySelector('.disp-add-hora')?.value;
    if (!dia || !hora) return;
    if (!COND_DISP_SEL[id]) COND_DISP_SEL[id] = {};
    const key = `${dia}|${hora}`;
    if (COND_DISP_SEL[id][key] === true) {
        showToast('Este slot ya estǭ activo', 'warning');
        return;
    }
    COND_DISP_SEL[id][key] = true;
    renderDisp();
    showToast(`?o" ${capitalize(dia)} — ${hora}`, 'success');
}

function eliminarSlot(dia, hora) {
    if (!confirm(`¿Eliminar ${capitalize(dia)} — ${hora}?`)) return;
    const id = dispConductorActual;
    if (!id) return;
    const key = `${dia}|${hora}`;
    if (COND_DISP_SEL[id]) {
        COND_DISP_SEL[id][key] = false;
    }
    renderDisp();
}

function restaurarSlot(dia, hora) {
    const id = dispConductorActual;
    if (!id) return;
    const key = `${dia}|${hora}`;
    if (COND_DISP_SEL[id]) {
        COND_DISP_SEL[id][key] = true;
    }
    renderDisp();
    showToast(`Restaurado ${capitalize(dia)} — ${hora}`, 'success');
}

async function guardarDisponibilidad() {
    const id = dispConductorActual;
    if (!id) { showToast('Selecciona un conductor primero', 'warning'); return; }
    const slots = COND_DISP_SEL[id] || {};
    const records = Object.keys(slots).map(k => {
        const [dia, hora] = k.split('|');
        return { dia, hora, disponible: slots[k] === true };
    });
    try {
        const grupo = document.getElementById('edit-cond-grupo')?.value;
        const ubicacion_casa = document.getElementById('edit-cond-ubicacion')?.value || null;
        const tiene_pc = document.getElementById('edit-cond-pc')?.checked || false;
        const poca_movilidad = document.getElementById('edit-cond-movilidad')?.checked || false;
        const solo_parque = document.getElementById('edit-cond-solo-parque')?.checked || false;

        await Promise.all([
            apiFetch(`/api/conductores/${id}/disponibilidad`, {
                method: 'PUT',
                body: JSON.stringify({ disponibilidad: records })
            }),
            apiFetch(`/api/conductores/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ grupo, ubicacion_casa, tiene_pc, poca_movilidad, solo_parque })
            })
        ]);
        if (dispConductorData[id]) {
            dispConductorData[id].grupo = grupo;
            dispConductorData[id].ubicacion_casa = ubicacion_casa;
            dispConductorData[id].tiene_pc = tiene_pc;
            dispConductorData[id].poca_movilidad = poca_movilidad;
            dispConductorData[id].solo_parque = solo_parque;
        }
        showToast('Disponibilidad y atributos guardados', 'success');
        dispEditMode = false;
        renderDisp();
        listarConductores();
    } catch (err) { showToast(err.message || 'Error guardando', 'error'); }
}

/* ====== TAB 4: HISTORIAL ====== */
async function cargarHistorial() {
    try {
        const d = await apiFetch('/api/programa-semanal');
        const programas = d.programas || [];

        // Calcular stats
        const condSet = new Set();
        let totalAsig = 0;
        const porCond = {};

        for (const p of programas) {
            const turnos = p.programa_semanal_turnos || [];
            for (const t of turnos) {
                if (t.conductor_id) {
                    totalAsig++;
                    condSet.add(t.conductor_id);
                    if (!porCond[t.conductor_id]) porCond[t.conductor_id] = { nombre: 'Cargando...', total: 0, grupo: '' };
                    porCond[t.conductor_id].total++;
                }
            }
        }

        // Obtener nombres de conductores
        const cData = await apiFetch('/api/conductores');
        (cData.conductores || []).forEach(c => {
            if (porCond[c.id]) {
                porCond[c.id].nombre = c.nombre;
                porCond[c.id].grupo = c.grupo;
            }
        });

        document.getElementById('stat-total-asig').textContent = totalAsig;
        document.getElementById('stat-tasa').textContent = programas.length > 0 ? '100%' : '0%';
        document.getElementById('stat-conductores-act').textContent = condSet.size;

        const tbody = document.getElementById('tbody-historial');
        if (tbody) {
            tbody.innerHTML = '';
            Object.values(porCond).sort((a, b) => b.total - a.total).forEach(c => {
                tbody.innerHTML += `<tr><td>${c.nombre}</td><td><span class="badge badge-${c.grupo === 'A' ? 'info' : 'warning'}">${c.grupo || '—'}</span></td><td><strong>${c.total}</strong></td></tr>`;
            });
        }
    } catch { showToast('Error cargando historial', 'error'); }
}

/* ====== CONFIG ====== */

async function cargarConfig() {
    try {
        const cfg = await apiFetch('/api/auth/config');
        const input = document.getElementById('config-spreadsheet-id');
        const urlDiv = document.getElementById('config-spreadsheet-url');
        if (input) input.value = cfg.spreadsheet_id || '';
        if (urlDiv) {
            urlDiv.innerHTML = cfg.spreadsheet_url
                ? `<a href="${cfg.spreadsheet_url}" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> Abrir spreadsheet</a>`
                : '<span class="text-muted">No configurado</span>';
        }
    } catch { /* super admin check already handles 403 */ }
}

function extractSpreadsheetId(input) {
    const m = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : input;
}

async function saveConfigSpreadsheet() {
    const input = document.getElementById('config-spreadsheet-id');
    const raw = input?.value.trim();
    if (!raw) return showToast('Ingresa el ID o URL del spreadsheet', 'warning');
    const value = extractSpreadsheetId(raw);
    try {
        await apiFetch('/api/auth/config', {
            method: 'PUT',
            body: JSON.stringify({ key: 'spreadsheet_id', value })
        });
        showToast('Spreadsheet ID guardado', 'success');
        cargarConfig();
    } catch (err) {
        showToast(err.message || 'Error al guardar', 'error');
    }
}

/* ====== ADMIN ====== */

async function cargarAllowedEmails() {
    try {
        const data = await apiFetch('/api/auth/allowed-emails');
        const tbody = document.getElementById('tbody-allowed-emails');
        if (!tbody) return;
        const total = data.length;
        const admins = data.filter(e => e.is_super_admin).length;
        document.getElementById('admin-count-users').textContent = total;
        document.getElementById('admin-count-admins').textContent = admins;

        const addBtn = document.getElementById('btn-admin-add');
        if (addBtn) addBtn.disabled = total >= 4;

        tbody.innerHTML = '';
        data.forEach(e => {
            const isSelf = e.email === currentUser?.email;
            const canMakeAdmin = admins < 2 && !e.is_super_admin;
            const canRenounce = e.is_super_admin && admins > 1;

            let actionsHtml = '';
            if (isSelf && e.is_super_admin) {
                actionsHtml = `<button class="btn btn-warning" onclick="renounceAdmin()" ${canRenounce ? '' : 'disabled'} style="font-size:0.75rem;padding:2px 8px;height:auto;line-height:1.4" title="${canRenounce ? 'Renunciar como super admin' : 'Debe haber al menos 1 super admin'}">
                    <i class="fas fa-user-minus"></i> Renunciar
                </button>`;
            } else if (isSelf) {
                actionsHtml = `<span class="text-muted" style="font-size:0.8rem">—</span>`;
            } else {
                actionsHtml = `<button class="btn btn-${e.is_super_admin ? 'warning' : 'info'}" onclick="toggleAdminRole('${e.id}')" style="font-size:0.75rem;padding:2px 8px;height:auto;line-height:1.4">
                    <i class="fas ${e.is_super_admin ? 'fa-user-minus' : 'fa-user-shield'}"></i> ${e.is_super_admin ? 'Quitar Admin' : 'Hacer Admin'}
                </button>
                <button class="btn btn-danger" onclick="removeAllowedEmail('${e.id}')" style="font-size:0.75rem;padding:2px 8px;height:auto;line-height:1.4;margin-left:4px"><i class="fas fa-trash"></i></button>`;
            }

            tbody.innerHTML += `<tr>
                <td>${e.email}${isSelf ? ' <span class="badge badge-info">tú</span>' : ''}</td>
                <td style="text-align:center">${e.is_super_admin ? '<span class="badge badge-success"><i class="fas fa-check"></i></span>' : '<span class="badge badge-secondary">—</span>'}</td>
                <td>${e.added_by || '—'}</td>
                <td>${e.created_at ? new Date(e.created_at).toLocaleDateString('es-PE') : '—'}</td>
                <td style="white-space:nowrap">${actionsHtml}</td>
            </tr>`;
        });
    } catch (err) {
        showToast('Error cargando lista de emails', 'error');
    }
}

async function addAllowedEmail() {
    const input = document.getElementById('admin-new-email');
    const email = input?.value.trim();
    if (!email) return showToast('Ingresa un email', 'warning');
    try {
        await apiFetch('/api/auth/allowed-emails', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
        showToast('Email añadido correctamente', 'success');
        input.value = '';
        cargarAllowedEmails();
    } catch (err) {
        showToast(err.message || 'Error al añadir email', 'error');
    }
}

async function removeAllowedEmail(id) {
    if (!confirm('¿Eliminar este email de la lista de permitidos?')) return;
    try {
        await apiFetch(`/api/auth/allowed-emails/${id}`, { method: 'DELETE' });
        showToast('Email eliminado', 'success');
        cargarAllowedEmails();
    } catch (err) {
        showToast(err.message || 'Error al eliminar', 'error');
    }
}

async function toggleAdminRole(id) {
    try {
        await apiFetch(`/api/auth/allowed-emails/${id}/toggle-admin`, { method: 'PUT' });
        showToast('Rol actualizado', 'success');
        cargarAllowedEmails();
    } catch (err) {
        showToast(err.message || 'Error al actualizar rol', 'error');
    }
}

async function renounceAdmin() {
    if (!confirm('¿Renunciar como super admin? Ya no podrás gestionar la lista de emails.')) return;
    try {
        const res = await apiFetch('/api/auth/allowed-emails/renounce', { method: 'POST' });
        showToast(res.message || 'Has renunciado como super admin', 'success');
        document.getElementById('nav-admin').style.display = 'none';
        // Switch to default tab if on admin tab
        const adminTab = document.getElementById('tab-admin');
        if (adminTab?.classList.contains('active')) {
            document.querySelector('.nav-item[data-tab="programa"]')?.click();
        }
    } catch (err) {
        showToast(err.message || 'Error al renunciar', 'error');
    }
}

async function checkSuperAdmin() {
    try {
        const data = await apiFetch('/api/auth/allowed-emails');
        document.getElementById('nav-admin').style.display = '';
        return true;
    } catch {
        document.getElementById('nav-admin').style.display = 'none';
        return false;
    }
}

/* ====== INIT ====== */
document.addEventListener('DOMContentLoaded', async () => {
    if (handleOAuthRedirect()) return;
    if (document.querySelector('.dashboard-layout')) {
        await checkAuth();
        initTabs();
        loadSemanas();
        listarProgramasAsignacion();
        listarProgramas();
        listarConductores();
        cargarPuntosSelect();
        listarPuntos();
        cargarHistorial();
        bindFormEvents();
        initDateInputs();
    }
});

/* ====== DATE INPUT ENHANCEMENTS ====== */
function initDateInputs() {
    document.querySelectorAll('input[type="date"]').forEach(el => {
        el.addEventListener('click', function (e) {
            this.showPicker();
        });
    });
    const inicio = document.getElementById('prog-semana-inicio');
    const fin = document.getElementById('prog-semana-fin');
    if (inicio && fin) {
        inicio.addEventListener('change', function () {
            if (!this.value) { fin.value = ''; return; }
            const d = parseLocalDate(this.value);
            d.setDate(d.getDate() + 6);
            fin.value = d.getFullYear() + '-' +
                String(d.getMonth() + 1).padStart(2, '0') + '-' +
                String(d.getDate()).padStart(2, '0');
        });
    }
}

/* ====== LOGOUT ====== */
document.getElementById('btn-logout')?.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/';
});

function bindFormEvents() {
    const btnEjecutar = document.getElementById('btn-ejecutar-asignacion');
    if (btnEjecutar) btnEjecutar.addEventListener('click', ejecutarAsignacion);
    const selSemana = document.getElementById('sel-semana');
    if (selSemana) selSemana.addEventListener('change', () => verAsignacion(selSemana.value));
    const btnExcel = document.getElementById('btn-exportar-excel');
    if (btnExcel) btnExcel.addEventListener('click', exportarResultadosExcel);
    const btnSheets = document.getElementById('btn-exportar-sheets');
    if (btnSheets) btnSheets.addEventListener('click', () => exportarResultadosSheets(window.__semanaActual));
    const formProg = document.getElementById('form-programa');
    if (formProg) formProg.addEventListener('submit', guardarPrograma);
    const formCond = document.getElementById('form-conductor');
    if (formCond) formCond.addEventListener('submit', guardarConductor);
    const formPunto = document.getElementById('form-punto');
    if (formPunto) formPunto.addEventListener('submit', guardarPunto);
}


