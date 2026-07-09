"use strict";

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const { supabase } = require('../supabase/client');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

function getAuth() {
    const relativePath = process.env.GOOGLE_SA_KEY_PATH || path.join('secrets', 'service-account.json');
    const keyPath = path.resolve(process.cwd(), relativePath);
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    return new google.auth.JWT({ email: keyFile.client_email, key: keyFile.private_key, scopes: SCOPES });
}

const DIAS_ORDEN = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'];
const DIAS_NOMBRE = { LUNES: 'LUNES', MARTES: 'MARTES', MIERCOLES: 'MIÉRCOLES', JUEVES: 'JUEVES', VIERNES: 'VIERNES', SABADO: 'SÁBADO', DOMINGO: 'DOMINGO' };

function extraerHoraSimple(hora) {
    if (!hora) return '';
    const match = hora.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
    return match ? match[1].toUpperCase() : hora.toUpperCase();
}

function parseLocal(str) {
    if (!str) return null;
    const p = str.split('T')[0].split('-');
    if (p.length !== 3) return new Date(str);
    return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
}

function formatearHeader(semanaInicio, semanaFin) {
    if (!semanaInicio) return '';
    const inicio = parseLocal(semanaInicio);
    const fin = semanaFin ? parseLocal(semanaFin) : new Date(inicio);
    const opts = { day: 'numeric', month: 'long' };
    const año = inicio.getFullYear();
    return `Semana del ${inicio.toLocaleDateString('es-PE', opts)} al ${fin.toLocaleDateString('es-PE', opts)} del ${año}`;
}

function rgb(r, g, b) {
    return { red: r / 255, green: g / 255, blue: b / 255 };
}

const DAY_THEMES = {
    LUNES:     { base: rgb(0xFB, 0xE4, 0xD5), alternate: rgb(0xFF, 0xD6, 0xBB) },
    MARTES:    { base: rgb(0xE2, 0xEF, 0xD9), alternate: rgb(0xC5, 0xE1, 0xB9) },
    MIERCOLES: { base: rgb(0xDE, 0xEA, 0xF6), alternate: rgb(0xC9, 0xDA, 0xF8) },
    JUEVES:    { base: rgb(0xFF, 0xF2, 0xCC), alternate: rgb(0xFF, 0xED, 0xB9) },
    VIERNES:   { base: rgb(0xEA, 0xD1, 0xDC), alternate: rgb(0xED, 0xC4, 0xD8) },
    SABADO:    { base: rgb(0xFF, 0xDF, 0xC0), alternate: null },
    DOMINGO:   { base: rgb(0xFF, 0xE5, 0x99), alternate: null }
};

async function createSheetTab(spreadsheetId, sheetTitle) {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingNames = spreadsheet.data.sheets.map(s => s.properties.title);
    let finalTitle = sheetTitle;
    if (existingNames.includes(sheetTitle)) {
        finalTitle = `${sheetTitle} (${Date.now() % 1000})`;
    }
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: finalTitle } } }] }
    });
    return finalTitle;
}

async function getSpreadsheetId() {
    const { data } = await supabase
        .from('config')
        .select('value')
        .eq('key', 'spreadsheet_id')
        .single();
    return data?.value || process.env.SHEETS_SPREADSHEET_ID;
}

async function exportAsignacionToSheets(asignaciones, semanaInfo) {
    const spreadsheetId = await getSpreadsheetId();
    if (!spreadsheetId) {
        throw new Error('No hay spreadsheet_id configurado — ve a Admin > Configuración');
    }

    const semanaInicio = semanaInfo?.semana_inicio;
    const semanaFin = semanaInfo?.semana_fin;
    const dateStr = semanaInicio
        ? parseLocal(semanaInicio).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
        : 'desconocida';
    const sheetTitle = `Semana ${dateStr}`;

    const diffDates = parseLocal(semanaInicio);
    const diaNumero = {};
    if (diffDates) {
        DIAS_ORDEN.forEach((dia, i) => {
            const d = new Date(diffDates);
            d.setDate(d.getDate() + i);
            diaNumero[dia] = d.getDate();
        });
    }

    const colHeaders = ['DÍA', 'HORA', 'GRUPO', 'TERRITORIO', 'PUNTO DE REUNIÓN', 'CONDUCTOR'];

    const regulares = (asignaciones || []).filter(a => !a.es_extra);
    const extras = (asignaciones || []).filter(a => a.es_extra);

    const dataRows = [];
    dataRows.push([formatearHeader(semanaInicio, semanaFin), '', '', '', '', '']); // title
    dataRows.push(colHeaders); // headers

    const dayBlocks = []; // { dia, startRowIndex (in dataRows), endRowIndex (exclusive), rows }

    DIAS_ORDEN.forEach(dia => {
        const regs = regulares.filter(r => r.dia === dia);
        const exts = extras.filter(e => e.dia === dia);
        if (regs.length === 0 && exts.length === 0) return;

        const num = diaNumero[dia] || '';
        const nombreDia = DIAS_NOMBRE[dia] || dia;

        const allItems = [];

        const beforeExtras = exts.filter(e => (e.orden ?? 0) < 0);
        const afterExtras = exts.filter(e => (e.orden ?? 0) >= 0);

        beforeExtras.forEach(e => {
            allItems.push({
                hora: e.hora || '',
                grupo: (e.grupo || '').toUpperCase(),
                territorio: (e.territorio || '').toUpperCase(),
                punto: (e.punto_reunion || '').toUpperCase(),
                conductor: (e.conductor_extra || '').toUpperCase()
            });
        });

        regs.forEach(r => {
            allItems.push({
                hora: extraerHoraSimple(r.hora),
                grupo: (r.grupo || '').toUpperCase(),
                territorio: (r.territorio || '—').toUpperCase(),
                punto: (r.punto_reunion || '—').toUpperCase(),
                conductor: r.asignado && r.conductor_asignado ? (r.conductor_asignado.nombre || '').toUpperCase() : 'SIN ASIGNAR'
            });
        });

        afterExtras.forEach(e => {
            allItems.push({
                hora: e.hora || '',
                grupo: (e.grupo || '').toUpperCase(),
                territorio: (e.territorio || '').toUpperCase(),
                punto: (e.punto_reunion || '').toUpperCase(),
                conductor: (e.conductor_extra || '').toUpperCase()
            });
        });

        // Build rows for this day
        const blockStart = dataRows.length;
        const diaCell = `${nombreDia}\n${num}`;

        allItems.forEach((item, idx) => {
            dataRows.push([idx === 0 ? diaCell : '', item.hora, item.grupo, item.territorio, item.punto, item.conductor]);
        });

        dayBlocks.push({ dia, startRowIndex: blockStart, endRowIndex: dataRows.length });
    });

    const addedTitle = await createSheetTab(spreadsheetId, sheetTitle);

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const startRow = 2; // 0-indexed row for C3
    const startCol = 2; // 0-indexed column for C
    const numDataRows = dataRows.length;
    const endRow = startRow + numDataRows;
    const lastSheetRow = endRow; // exclusive

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${addedTitle}'!C3:H${lastSheetRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: dataRows }
    });

    const sheetObj = (await sheets.spreadsheets.get({ spreadsheetId }))
        .data.sheets.find(s => s.properties.title === addedTitle);
    const sId = sheetObj?.properties.sheetId;

    if (sId == null) {
        return { url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`, sheetName: addedTitle };
    }

    const requests = [];

    // ---- 1. Hide gridlines ----
    requests.push({
        updateSheetProperties: {
            properties: { sheetId: sId, gridProperties: { hideGridlines: true } },
            fields: 'gridProperties.hideGridlines'
        }
    });

    // ---- 2. Column widths ----
    requests.push({ updateDimensionProperties: { range: { sheetId: sId, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 }, properties: { pixelSize: 40 }, fields: 'pixelSize' } });
    requests.push({ updateDimensionProperties: { range: { sheetId: sId, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 }, properties: { pixelSize: 40 }, fields: 'pixelSize' } });
    requests.push({ updateDimensionProperties: { range: { sheetId: sId, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 }, properties: { pixelSize: 95 }, fields: 'pixelSize' } });
    requests.push({ updateDimensionProperties: { range: { sheetId: sId, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 }, properties: { pixelSize: 75 }, fields: 'pixelSize' } });
    requests.push({ updateDimensionProperties: { range: { sheetId: sId, dimension: 'COLUMNS', startIndex: 4, endIndex: 8 }, properties: { pixelSize: 220 }, fields: 'pixelSize' } });

    const titleRow = startRow; // row 2
    const headerRow = startRow + 1; // row 3
    const firstDataRow = startRow + 2; // row 4

    // ---- 3. Merge title row (C3:H3) ----
    requests.push({ mergeCells: { range: { sheetId: sId, startRowIndex: titleRow, endRowIndex: titleRow + 1, startColumnIndex: startCol, endColumnIndex: startCol + 6 }, mergeType: 'MERGE_ALL' } });

    // ---- 4. Title formatting ----
    requests.push({
        repeatCell: {
            range: { sheetId: sId, startRowIndex: titleRow, endRowIndex: titleRow + 1, startColumnIndex: startCol, endColumnIndex: startCol + 6 },
            cell: {
                userEnteredFormat: {
                    backgroundColor: { red: 1, green: 1, blue: 1 },
                    textFormat: { fontFamily: 'Arial Black', fontSize: 17, foregroundColor: rgb(0xC0, 0, 0), bold: true },
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE'
                }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
        }
    });

    // ---- 5. Header formatting ----
    const headerBg = rgb(0x2F, 0x55, 0x97);
    requests.push({
        repeatCell: {
            range: { sheetId: sId, startRowIndex: headerRow, endRowIndex: headerRow + 1, startColumnIndex: startCol, endColumnIndex: startCol + 6 },
            cell: {
                userEnteredFormat: {
                    backgroundColor: headerBg,
                    textFormat: { fontFamily: 'Arial Black', fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE'
                }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
        }
    });

    // ---- 6. Merge day cells vertically per block ----
    for (const block of dayBlocks) {
        const blockSheetStart = startRow + block.startRowIndex;
        const blockSheetEnd = startRow + block.endRowIndex;

        // Merge column C vertically across all rows of the block
        // Only merge if more than 1 row
        if (block.endRowIndex - block.startRowIndex > 1) {
            requests.push({
                mergeCells: {
                    range: { sheetId: sId, startRowIndex: blockSheetStart, endRowIndex: blockSheetEnd, startColumnIndex: 2, endColumnIndex: 3 },
                    mergeType: 'MERGE_ALL'
                }
            });
        }
    }

    // ---- 7. Body text formatting (columns D-H): Arial 10, #0F3B63, center ----
    // Applied BEFORE per-row styling so special rows can overwrite it.
    requests.push({
        repeatCell: {
            range: { sheetId: sId, startRowIndex: firstDataRow, endRowIndex: lastSheetRow, startColumnIndex: 3, endColumnIndex: 8 },
            cell: {
                userEnteredFormat: {
                    textFormat: { fontFamily: 'Arial', fontSize: 10, foregroundColor: rgb(0x0F, 0x3B, 0x63) },
                    verticalAlignment: 'MIDDLE',
                    horizontalAlignment: 'CENTER'
                }
            },
            fields: 'userEnteredFormat(textFormat,verticalAlignment,horizontalAlignment)'
        }
    });

    // ---- 8. Per-day colors: alternating base/alternate on D:H; base always on C ----
    for (const block of dayBlocks) {
        const theme = DAY_THEMES[block.dia];
        let altCounter = 0;

        for (let ri = block.startRowIndex; ri < block.endRowIndex; ri++) {
            const sheetRowIdx = startRow + ri;
            const row = dataRows[ri];

            // Column C: always base color
            requests.push({
                repeatCell: {
                    range: { sheetId: sId, startRowIndex: sheetRowIdx, endRowIndex: sheetRowIdx + 1, startColumnIndex: 2, endColumnIndex: 3 },
                    cell: { userEnteredFormat: { backgroundColor: theme.base } },
                    fields: 'userEnteredFormat(backgroundColor)'
                }
            });

            // Determine if this row is "non-regular" (excluded from alternating colors):
            // Regular rows always have territorio/punto/conductor filled (fallbacks '—', 'SIN ASIGNAR').
            // Extra filas (special or not) leave those cells empty.
            const territorio = row[3] || '';
            const punto = row[4] || '';
            const conductor = row[5] || '';
            const tieneCeldasVacias = !territorio || !punto || !conductor;

            // Scan ALL data columns (D-H) for REUNIÓN/WEEKEND text
            const celdasTexto = [row[1], row[2], row[3], row[4], row[5]].map(c => (c || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim());
            const esReunion = celdasTexto.some(c => c === 'REUNION DE FIN DE SEMANA' || c === 'WEEKEND MEETING' || c.includes('REUNION'));
            const isReunionSpecial = esReunion && tieneCeldasVacias;

            if (isReunionSpecial) {
                // Columns D-H: dark blue bg, white arial black text, centered
                requests.push({
                    repeatCell: {
                        range: { sheetId: sId, startRowIndex: sheetRowIdx, endRowIndex: sheetRowIdx + 1, startColumnIndex: 3, endColumnIndex: 8 },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: rgb(0, 0, 0x80),
                                textFormat: { fontFamily: 'Arial Black', fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
                                horizontalAlignment: 'CENTER',
                                verticalAlignment: 'MIDDLE'
                            }
                        },
                        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
                    }
                });
                // special rows don't affect alternation — altCounter NOT incremented
            } else if (tieneCeldasVacias) {
                // Non-regular extra row (empty cells but not REUNIÓN): apply base bg on D:H, skip alternation
                requests.push({
                    repeatCell: {
                        range: { sheetId: sId, startRowIndex: sheetRowIdx, endRowIndex: sheetRowIdx + 1, startColumnIndex: 3, endColumnIndex: 8 },
                        cell: { userEnteredFormat: { backgroundColor: theme.base } },
                        fields: 'userEnteredFormat(backgroundColor)'
                    }
                });
                // altCounter NOT incremented
            } else {
                // Regular row: alternate based on altCounter
                const bgColor = (theme.alternate && altCounter % 2 === 1) ? theme.alternate : theme.base;
                requests.push({
                    repeatCell: {
                        range: { sheetId: sId, startRowIndex: sheetRowIdx, endRowIndex: sheetRowIdx + 1, startColumnIndex: 3, endColumnIndex: 8 },
                        cell: { userEnteredFormat: { backgroundColor: bgColor } },
                        fields: 'userEnteredFormat(backgroundColor)'
                    }
                });
                altCounter++;
            }
        }
    }

    // ---- 9. DAY column text formatting (Arial 10, #1F4E79, center) ----
    // Apply to all merged day cells (they're in column C, rows firstDataRow to endRow)
    requests.push({
        repeatCell: {
            range: { sheetId: sId, startRowIndex: firstDataRow, endRowIndex: lastSheetRow, startColumnIndex: 2, endColumnIndex: 3 },
            cell: {
                userEnteredFormat: {
                    textFormat: { fontFamily: 'Arial', fontSize: 10, foregroundColor: rgb(0x1F, 0x4E, 0x79) },
                    horizontalAlignment: 'CENTER',
                    verticalAlignment: 'MIDDLE',
                    wrapStrategy: 'WRAP'
                }
            },
            fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
        }
    });

    // ---- 10. Row heights: equal for all data rows ----
    requests.push({
        updateDimensionProperties: {
            range: { sheetId: sId, dimension: 'ROWS', startIndex: firstDataRow, endIndex: lastSheetRow },
            properties: { pixelSize: 25 },
            fields: 'pixelSize'
        }
    });

    const borderSolid = { style: 'SOLID', color: { red: 0, green: 0, blue: 0 } };
    const borderThick = { style: 'SOLID_THICK', color: { red: 0, green: 0, blue: 0 } };

    // ---- 11. Borders: header row — each cell individually (all 4 sides SOLID) ----
    for (let ci = startCol; ci < startCol + 6; ci++) {
        requests.push({
            updateBorders: {
                range: { sheetId: sId, startRowIndex: headerRow, endRowIndex: headerRow + 1, startColumnIndex: ci, endColumnIndex: ci + 1 },
                top: borderSolid, bottom: borderSolid, left: borderSolid, right: borderSolid
            }
        });
    }

    // ---- 12. Borders: day block (C, outside only) ----
    for (const block of dayBlocks) {
        const blockSheetStart = startRow + block.startRowIndex;
        const blockSheetEnd = startRow + block.endRowIndex;
        requests.push({
            updateBorders: {
                range: { sheetId: sId, startRowIndex: blockSheetStart, endRowIndex: blockSheetEnd, startColumnIndex: 2, endColumnIndex: 3 },
                top: borderSolid, bottom: borderSolid, left: borderSolid, right: borderSolid
            }
        });
    }

    // ---- 13. Borders: each activity row (D:H, outside only) ----
    for (const block of dayBlocks) {
        for (let ri = block.startRowIndex; ri < block.endRowIndex; ri++) {
            const sheetRowIdx = startRow + ri;
            requests.push({
                updateBorders: {
                    range: { sheetId: sId, startRowIndex: sheetRowIdx, endRowIndex: sheetRowIdx + 1, startColumnIndex: 3, endColumnIndex: 8 },
                    top: borderSolid, bottom: borderSolid, left: borderSolid, right: borderSolid
                }
            });
        }
    }

    // ---- 14. Outer border: full table (C:H, SOLID_THICK) ----
    // Applied last so it overrides per-row borders on the outer edges.
    requests.push({
        updateBorders: {
            range: { sheetId: sId, startRowIndex: headerRow, endRowIndex: lastSheetRow, startColumnIndex: startCol, endColumnIndex: startCol + 6 },
            top: borderThick, bottom: borderThick, left: borderThick, right: borderThick
        }
    });

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
    });

    return {
        url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        sheetName: addedTitle
    };
}

module.exports = { exportAsignacionToSheets };
