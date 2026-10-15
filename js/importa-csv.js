import { aggiungiShows } from './archivio.js';
import { chiaveModella } from './calcoli.js';
import { CAMPI_IMPORT, leggiCsv, indovinaColonne, preparaImportazione, esportaCsv } from './csv.js';
import { t } from './i18n.js';
import { logger } from './logger.js';
import { sitoDaId, sitoPredefinito, sitiVisibili } from './siti.js';
import { stato } from './stato.js';
import { escapeHtml, generaIdUnico } from './utils.js';

/* ==========================================================================
   IMPORTAZIONE ED ESPORTAZIONE CSV (roadmap multi-sito, fase 5)
   ==========================================================================
   Importazione in una finestra: il file scelto viene letto dal processo
   principale (open-csv), le colonne sono abbinate in automatico e si possono
   correggere; sito, valuta, tasso e formato della data valgono per tutte le
   righe. L'anteprima mostra lo stato di ogni riga (nuovo, doppione, errore) e
   l'importazione salva i nuovi show con un solo salvataggio. I calcoli sono in
   csv.js. */

const RIGHE_ANTEPRIMA = 12;
const el = (id) => document.getElementById(id);
const testo = (chiave, valori = {}) =>
    Object.entries(valori).reduce((s, [k, v]) => s.replace(`{${k}}`, v), t(chiave));
const euro = (n) => `€ ${Number(n).toFixed(2)}`;

let fileCsv = null;      // { nome, intestazioni, righe, separatore }
let esitoCorrente = null;

/* --------------------------------------------------------------------------
   ESPORTAZIONE
   -------------------------------------------------------------------------- */
export async function esportaCronologiaCsv() {
    try {
        const esito = await window.electronAPI.salvaCsv(esportaCsv(stato.tuttiGliShow, { siti: stato.catalogoSiti, tag: stato.catalogoTag }));
        if (esito?.success) logger.success(`Cronologia esportata in CSV: ${esito.percorso} (${stato.tuttiGliShow.length} show)`);
        else if (esito && !esito.cancelled) alert(`❌ ${t('csv.export_error')}: ${esito.error}`);
    } catch (err) {
        logger.error('Esportazione CSV non riuscita', err);
    }
}

/* --------------------------------------------------------------------------
   IMPORTAZIONE
   -------------------------------------------------------------------------- */
export async function avviaImportazioneCsv() {
    let esito;
    try {
        esito = await window.electronAPI.apriCsv();
    } catch (err) {
        logger.error('Apertura del CSV non riuscita', err);
        return;
    }
    if (!esito?.success) {
        if (esito && !esito.cancelled) alert(`❌ ${t('csv.open_error')}: ${esito.error}`);
        return;
    }
    const letto = leggiCsv(esito.testo);
    if (!letto.intestazioni.length || !letto.righe.length) {
        alert(t('csv.empty'));
        return;
    }
    fileCsv = { nome: esito.nome, ...letto };
    disegnaControlli(indovinaColonne(letto.intestazioni));
    impostaValutaDalSito();
    aggiornaAnteprimaCsv();
    el('modalImportaCsv').style.display = 'block';
}

export function chiudiImportazioneCsv() {
    el('modalImportaCsv').style.display = 'none';
    fileCsv = null;
    esitoCorrente = null;
}

// Select delle colonne (una per campo) e del sito
function disegnaControlli(mappatura) {
    const separatori = { ';': ';', ',': ',', '\t': 'TAB' };
    el('infoFileCsv').textContent = testo('csv.file_info', { nome: fileCsv.nome, righe: fileCsv.righe.length, colonne: fileCsv.intestazioni.length, separatore: separatori[fileCsv.separatore] });
    const opzioni = (scelta) => `<option value="-1">${escapeHtml(t('csv.no_column'))}</option>` +
        fileCsv.intestazioni.map((h, i) => `<option value="${i}"${i === scelta ? ' selected' : ''}>${escapeHtml(h || `#${i + 1}`)}</option>`).join('');
    el('mappaturaCsv').innerHTML = CAMPI_IMPORT.map(campo => `
        <div class="form-group">
            <label for="mappaCsv-${campo}">${escapeHtml(t(`csv.field_${campo}`))}${['data', 'modella', 'importo'].includes(campo) ? ' *' : ''}</label>
            <select id="mappaCsv-${campo}" data-campo="${campo}" data-al-cambio="anteprima-csv">${opzioni(mappatura[campo])}</select>
        </div>`).join('');
    el('csvSito').innerHTML = sitiVisibili([sitoPredefinito()]).map(s => `<option value="${escapeHtml(s.id)}">${escapeHtml(s.nome)}</option>`).join('');
    el('csvSito').value = sitoPredefinito();
}

// Valuta e tasso proposti dal catalogo del sito scelto (modificabili per questa importazione)
export function impostaValutaDalSito() {
    const sito = sitoDaId(el('csvSito').value);
    el('csvValuta').value = sito?.valuta || 'EUR';
    el('csvTasso').value = sito?.tasso ?? 1;
    aggiornaCampoTasso();
}

function aggiornaCampoTasso() {
    const inEuro = el('csvValuta').value === 'EUR';
    el('gruppoCsvTasso').hidden = inEuro;
    if (!inEuro) el('etichettaCsvTasso').textContent = testo('csv.rate_label', { valuta: el('csvValuta').value });
}

const mappaturaScelta = () => Object.fromEntries(CAMPI_IMPORT.map(campo => [campo, Number(el(`mappaCsv-${campo}`)?.value ?? -1)]));

export function aggiornaAnteprimaCsv() {
    if (!fileCsv) return;
    aggiornaCampoTasso();
    const modelle = Object.fromEntries(stato.elencoModelleUniche.map(m => [chiaveModella(m.nome), m]));
    esitoCorrente = preparaImportazione(fileCsv.righe, mappaturaScelta(), {
        sito: el('csvSito').value,
        valuta: el('csvValuta').value,
        tasso: Number(el('csvTasso').value) || 1,
        formatoData: el('csvFormatoData').value,
        modelle
    }, stato.tuttiGliShow);

    el('riepilogoCsv').innerHTML = `
        <span class="badge-csv nuovo">${escapeHtml(testo('csv.count_new', { n: esitoCorrente.nuovi }))}</span>
        <span class="badge-csv doppione">${escapeHtml(testo('csv.count_duplicates', { n: esitoCorrente.doppioni }))}</span>
        <span class="badge-csv errore">${escapeHtml(testo('csv.count_errors', { n: esitoCorrente.errori }))}</span>`;

    el('anteprimaCsv').innerHTML = esitoCorrente.voci.slice(0, RIGHE_ANTEPRIMA).map(v => {
        const s = v.show;
        const originale = s?.importoOriginale ? ` <small>(${escapeHtml(`${s.importoOriginale.valore} ${s.importoOriginale.valuta}`)})</small>` : '';
        return `<tr class="riga-csv-${v.stato}">
            <td>${v.riga}</td>
            <td><span class="badge-csv ${v.stato}">${escapeHtml(t(`csv.status_${v.stato}`))}</span></td>
            <td class="col-nowrap">${s ? escapeHtml(s.dataFormattata) : ''}</td>
            <td>${s ? escapeHtml(s.nome) : ''}</td>
            <td class="col-nowrap">${s ? euro(s.costo) + originale : ''}</td>
            <td>${s && s.durata ? `${s.durata} min` : ''}</td>
            <td>${v.stato === 'errore' ? escapeHtml(t(`csv.error_${v.motivo}`)) : escapeHtml(s?.note || '')}</td>
        </tr>`;
    }).join('');
    const altre = esitoCorrente.voci.length - RIGHE_ANTEPRIMA;
    el('altreRigheCsv').textContent = altre > 0 ? testo('csv.more_rows', { n: altre }) : '';

    const conferma = el('btnConfermaCsv');
    conferma.disabled = esitoCorrente.nuovi === 0;
    conferma.textContent = testo('csv.import_button', { n: esitoCorrente.nuovi });
}

export async function confermaImportazioneCsv() {
    if (!esitoCorrente || esitoCorrente.nuovi === 0) return;
    const nuovi = esitoCorrente.voci.filter(v => v.stato === 'nuovo').map(v => ({ id: generaIdUnico(), ...v.show }));
    const { doppioni, errori } = esitoCorrente;
    try {
        await aggiungiShows(nuovi);
        chiudiImportazioneCsv();
        logger.success(`Importati da CSV: ${nuovi.length} show; doppioni saltati: ${doppioni}; righe con errori: ${errori}`);
        alert(testo('csv.done', { n: nuovi.length, doppioni, errori }));
    } catch (err) {
        // salvaArchivio ha già mostrato l'errore: l'archivio resta com'era
        logger.error('Importazione CSV non riuscita', err);
    }
}
