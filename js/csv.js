import { chiaveModella, ordinaPerData } from './calcoli.js';
import { costoAlMinuto, timestampShow } from './utils.js';

/* ==========================================================================
   CSV: LETTURA, IMPORTAZIONE ED ESPORTAZIONE (roadmap multi-sito, fase 5)
   ==========================================================================
   Funzioni pure, senza accesso alla pagina (verificate da tests/csv.test.js).
   L'importazione rende l'app utilizzabile con qualsiasi sito che permetta di
   scaricare lo storico degli acquisti; la finestra è in importa-csv.js. */

/* --------------------------------------------------------------------------
   LETTURA DEL FILE
   -------------------------------------------------------------------------- */

// Separatore più frequente nella prima riga, fuori dalle virgolette
function trovaSeparatore(primaRiga) {
    const conteggi = { ';': 0, ',': 0, '\t': 0 };
    let traVirgolette = false;
    for (const c of primaRiga) {
        if (c === '"') traVirgolette = !traVirgolette;
        else if (!traVirgolette && c in conteggi) conteggi[c]++;
    }
    return Object.entries(conteggi).sort((a, b) => b[1] - a[1])[0][1] > 0
        ? Object.entries(conteggi).sort((a, b) => b[1] - a[1])[0][0]
        : ',';
}

// { intestazioni, righe, separatore }: campi tra virgolette (anche con a capo e "" dentro),
// BOM iniziale ignorato, righe vuote scartate
export function leggiCsv(testo) {
    const sorgente = String(testo || '').replace(/^﻿/, '');
    const primaRiga = sorgente.split(/\r?\n/, 1)[0] || '';
    const separatore = trovaSeparatore(primaRiga);
    const righe = [];
    let riga = [], campo = '', traVirgolette = false;
    for (let i = 0; i < sorgente.length; i++) {
        const c = sorgente[i];
        if (traVirgolette) {
            if (c === '"' && sorgente[i + 1] === '"') { campo += '"'; i++; }
            else if (c === '"') traVirgolette = false;
            else campo += c;
        } else if (c === '"') {
            traVirgolette = true;
        } else if (c === separatore) {
            riga.push(campo); campo = '';
        } else if (c === '\n' || c === '\r') {
            if (c === '\r' && sorgente[i + 1] === '\n') i++;
            riga.push(campo); righe.push(riga); riga = []; campo = '';
        } else {
            campo += c;
        }
    }
    if (campo !== '' || riga.length) { riga.push(campo); righe.push(riga); }
    const piene = righe.map(r => r.map(v => v.trim())).filter(r => r.some(v => v !== ''));
    return { intestazioni: piene[0] || [], righe: piene.slice(1), separatore };
}

/* --------------------------------------------------------------------------
   COLONNE: abbinamento indovinato dalle intestazioni (italiano e inglese)
   -------------------------------------------------------------------------- */
export const CAMPI_IMPORT = ['data', 'ora', 'modella', 'importo', 'durata', 'note', 'nickname'];

const MODELLI_INTESTAZIONI = {
    data: /^(data|date|giorno|day|data e ora|date ?time|timestamp|quando)$/,
    ora: /^(ora|orario|time|hour)$/,
    modella: /^(modella|model|nome|name|performer|camgirl|broadcaster|utente|user|username)$/,
    importo: /^(importo|costo|costo \(€\)|prezzo|spesa|amount|cost|price|total|totale|token|tokens|crediti|credits|pagato|paid)$/,
    durata: /^(durata|durata \(min\)|duration|minuti|minutes|min)$/,
    note: /^(note|notes|nota|descrizione|description|commento|comment)$/,
    nickname: /^(nickname|nick|nickname chat)$/
};

const normalizzaIntestazione = (testo) => String(testo || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();

// Indice della colonna per ogni campo, -1 se non trovata
export function indovinaColonne(intestazioni) {
    const normali = intestazioni.map(normalizzaIntestazione);
    const mappatura = {};
    for (const campo of CAMPI_IMPORT) {
        mappatura[campo] = normali.findIndex(h => MODELLI_INTESTAZIONI[campo].test(h));
    }
    return mappatura;
}

/* --------------------------------------------------------------------------
   VALORI
   -------------------------------------------------------------------------- */

// Importo come numero positivo: "1.234,56 €", "1,234.56", "-60.00", "$12.50", "750 tk".
// null se non contiene un numero.
export function leggiImporto(testo) {
    let s = String(testo ?? '').replace(/[^\d.,-]/g, '').replace(/^-+/, '');
    if (!/\d/.test(s)) return null;
    const virgola = s.lastIndexOf(','), punto = s.lastIndexOf('.');
    if (virgola >= 0 && punto >= 0) {
        // Entrambi: il separatore dei decimali è l'ultimo
        s = virgola > punto ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if (virgola >= 0) {
        // Solo virgola: decimali se seguita da 1-2 cifre, altrimenti migliaia
        s = /,\d{1,2}$/.test(s) ? s.replace(/,(?=\d{3}(\D|$))/g, '').replace(',', '.') : s.replace(/,/g, '');
    } else if ((s.match(/\./g) || []).length > 1) {
        s = s.replace(/\./g, '');
    }
    const n = Math.abs(parseFloat(s));
    return Number.isFinite(n) ? n : null;
}

// Durata in minuti: "30", "30 min", "1:30" o "01:30:00" (ore:minuti), "1h 30m", "90m". null se assente.
export function leggiDurata(testo) {
    const s = String(testo ?? '').trim().toLowerCase();
    if (!s) return null;
    let m;
    if ((m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(s))) return Number(m[1]) * 60 + Number(m[2]);
    if ((m = /^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/.exec(s)) && (m[1] || m[2])) return Number(m[1] || 0) * 60 + Number(m[2] || 0);
    const n = parseFloat(s.replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
}

// Data e ora: ISO (2026-10-02, 2026-10-02 21:30, 2026-10-02T21:30), gg/mm/aaaa
// (anche con . o -) oppure mm/gg/aaaa con formato 'usa'. L'ora può stare in una
// colonna a parte. null se non riconosciuta.
export function leggiDataOra(testoData, testoOra = '', formato = 'auto') {
    const testo = `${String(testoData ?? '').trim()} ${String(testoOra ?? '').trim()}`.trim();
    let m, anno, mese, giorno;
    if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(testo))) {
        [anno, mese, giorno] = [m[1], m[2], m[3]];
    } else if ((m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(testo))) {
        [giorno, mese, anno] = formato === 'usa' ? [m[2], m[1], m[3]] : [m[1], m[2], m[3]];
        if (anno.length === 2) anno = `20${anno}`;
    } else {
        return null;
    }
    const orario = /(?:[T\s,]+)(\d{1,2})[:.](\d{2})(?:[:.]\d{2})?\s*(am|pm)?/i.exec(testo.slice(m[0].length));
    let ore = orario ? Number(orario[1]) : 0;
    const minuti = orario ? Number(orario[2]) : 0;
    if (orario?.[3]) ore = (ore % 12) + (/pm/i.test(orario[3]) ? 12 : 0);
    const d = new Date(Number(anno), Number(mese) - 1, Number(giorno), ore, minuti);
    // Scarta date impossibili (es. 31/02, che Date sposterebbe al 3 marzo)
    if (isNaN(d) || d.getMonth() !== Number(mese) - 1 || d.getDate() !== Number(giorno)) return null;
    return d;
}

/* --------------------------------------------------------------------------
   IMPORTAZIONE
   -------------------------------------------------------------------------- */
const arrotonda = (n) => Math.round(n * 100) / 100;
const chiaveDoppione = (nome, data) => `${chiaveModella(nome)}|${Math.floor(data.getTime() / 60000)}`;

// Show da importare, senza ID (lo assegna chi salva). Per ogni riga:
// { riga (numero nel file), stato: 'nuovo' | 'doppione' | 'errore', motivo, show }.
// Doppione: stessa modella alla stessa data e ora (al minuto) di uno show già
// salvato o di una riga precedente del file.
// opzioni: { sito, valuta, tasso (euro per unità), formatoData, modelle (chiave -> dati noti) }
export function preparaImportazione(righe, mappatura, opzioni, showEsistenti = []) {
    const { sito, valuta = 'EUR', tasso = 1, formatoData = 'auto', modelle = {} } = opzioni;
    const cella = (r, campo) => (mappatura[campo] >= 0 ? r[mappatura[campo]] ?? '' : '');
    const visti = new Set(showEsistenti
        .map(s => (s.nome && s.dataOraISO ? chiaveDoppione(s.nome, new Date(timestampShow(s))) : null))
        .filter(Boolean));

    const voci = righe.map((r, i) => {
        const riga = i + 2;   // la riga 1 del file è l'intestazione
        const nome = cella(r, 'modella').trim();
        const data = leggiDataOra(cella(r, 'data'), cella(r, 'ora'), formatoData);
        const importo = leggiImporto(cella(r, 'importo'));
        if (!data) return { riga, stato: 'errore', motivo: 'data' };
        if (!nome) return { riga, stato: 'errore', motivo: 'modella' };
        if (importo === null) return { riga, stato: 'errore', motivo: 'importo' };

        const chiave = chiaveDoppione(nome, data);
        if (visti.has(chiave)) return { riga, stato: 'doppione', motivo: 'doppione' };
        visti.add(chiave);

        const nota = modelle[chiaveModella(nome)] || {};
        const durata = leggiDurata(cella(r, 'durata'));
        const show = {
            dataOraISO: data.toISOString(),
            dataFormattata: `${data.toLocaleDateString('it-IT')} ${data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`,
            meseAnno: data.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
            nome,
            isRegalo: false,
            piattaforma: nota.piattaforma || 'Altro',
            punteggio: 'TBD',
            costo: arrotonda(valuta === 'EUR' ? importo : importo * tasso),
            durata: durata ?? 0,
            immagine: nota.immagine || '',
            urlProfilo: nota.urlProfilo || '',
            recensione: false,
            note: cella(r, 'note').trim(),
            nickname: cella(r, 'nickname').trim() || nota.nickname || '',
            tag: [],
            sito,
            importatoDa: sito
        };
        if (valuta !== 'EUR') show.importoOriginale = { valore: importo, valuta };
        return { riga, stato: 'nuovo', show };
    });
    return {
        voci,
        nuovi: voci.filter(v => v.stato === 'nuovo').length,
        doppioni: voci.filter(v => v.stato === 'doppione').length,
        errori: voci.filter(v => v.stato === 'errore').length
    };
}

/* --------------------------------------------------------------------------
   ESPORTAZIONE: ";" e virgola decimale, leggibile da Excel in italiano e
   reimportabile (intestazioni riconosciute da indovinaColonne)
   -------------------------------------------------------------------------- */
const INTESTAZIONI_EXPORT = ['Data', 'Ora', 'Modella', 'Sito', 'Piattaforma', 'Durata (min)', 'Costo (€)', '€/min', 'Voto',
    'Recensione', 'Regalo', 'Tag', 'Note', 'Nickname', 'Importato da', 'Importo originale', 'Valuta', 'Qualità', 'Inquadratura', 'Testo recensione'];

const campoCsv = (valore) => {
    const s = String(valore ?? '');
    return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const decimale = (n) => (n === null || n === undefined || n === '' ? '' : String(arrotonda(Number(n))).replace('.', ','));

// cataloghi: { siti: [...], tag: [...] } per scrivere i nomi invece degli ID
export function esportaCsv(shows, { siti = [], tag = [] } = {}) {
    const nomeSito = (id) => siti.find(s => s.id === id)?.nome || id || '';
    const nomeTag = (id) => tag.find(voce => voce.id === id)?.nome || id;
    const righe = ordinaPerData(shows, 'asc').map(s => {
        const d = new Date(timestampShow(s));
        const valida = !isNaN(d) && timestampShow(s) > 0;
        const pad = (n) => String(n).padStart(2, '0');
        return [
            valida ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : (s.dataFormattata || ''),
            valida ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '',
            s.nome, nomeSito(s.sito), s.isRegalo ? '' : (s.piattaforma || ''),
            s.durata || '', decimale(s.costo), decimale(costoAlMinuto(s)),
            s.isRegalo ? '' : (s.punteggio ?? ''), s.recensione ? 'sì' : 'no', s.isRegalo ? 'sì' : 'no',
            (s.tag || []).map(nomeTag).join(', '), s.note || '', s.nickname || '',
            s.importatoDa ? nomeSito(s.importatoDa) : '',
            s.importoOriginale ? decimale(s.importoOriginale.valore) : '', s.importoOriginale?.valuta || '',
            // In fondo, così le colonne precedenti restano dove erano
            s.isRegalo ? '' : (s.qualita || ''), s.isRegalo ? '' : (s.camera || ''),
            s.testoRecensione || ''
        ].map(campoCsv).join(';');
    });
    return '﻿' + [INTESTAZIONI_EXPORT.map(campoCsv).join(';'), ...righe].join('\r\n') + '\r\n';
}
