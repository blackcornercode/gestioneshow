import { prezzoSuggerito, ultimoShowConDurata, valutaPrezzo, prezziSuggeriti, showsDiModella, chiaveModella, MINIMO_SHOW_SITO, ordinaPrezziSuggeriti, COLONNE_PREZZI } from './calcoli.js';
import { t } from './i18n.js';
import { apriTab } from './preferenze.js';
import { funzioneDisponibile, FUNZIONI } from './connettori.js';
import { sitoDaId, SITO_MCG } from './siti.js';
import { badgeSospesa } from './profili-sospesi.js';
import { stato } from './stato.js';
import { badgeOnline, eModellaOnline } from './stato-online.js';
import { escapeHtml } from './utils.js';

/* ==========================================================================
   PREVENTIVO
   ==========================================================================
   Quanto dovrebbe costare uno show prima di comprarlo: prezzo atteso con il €/min
   suggerito della modella (ultimi 5 show con durata, sul sito scelto se lei ne ha
   almeno 2 lì) e con la media generale; un prezzo chiesto viene confrontato con
   entrambi (in linea entro ±10%). Calcoli in calcoli.js; qui la scheda Preventivo,
   la tabella dei prezzi suggeriti e il riquadro nella scheda della modella.
   Il prezzo atteso nel form è in form-assistito.js. */

const el = (id) => document.getElementById(id);
const euro = (n) => `€ ${Number(n).toFixed(2)}`;
const testo = (chiave, valori = {}) =>
    Object.entries(valori).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), t(chiave));

// Nome come è registrato in archivio ("anna" -> "Anna"), o quello scritto se è nuova
function nomeRegistrato(scritto) {
    const chiave = chiaveModella(scritto);
    return stato.elencoModelleUniche.find(m => chiaveModella(m.nome) === chiave)?.nome || scritto.trim();
}

// Verdetto colorato del confronto (classi già usate per il €/min)
function badgeVerdetto(valutazione) {
    if (!valutazione) return '';
    const { esito, scarto } = valutazione;
    const [classe, chiave] = esito === 'caro' ? ['verdetto-caro', 'quote.more_expensive']
        : esito === 'conveniente' ? ['verdetto-conveniente', 'quote.cheaper'] : ['verdetto-in-linea', 'quote.in_line'];
    return `<span class="verdetto-preventivo ${classe}">${escapeHtml(testo(chiave, { p: Math.abs(Math.round(scarto)) }))}</span>`;
}

/* --------------------------------------------------------------------------
   SCHEDA PREVENTIVO
   -------------------------------------------------------------------------- */
// Siti in cui la modella ha show: "Tutti i siti" più uno per sito, con il conteggio
let modellaDeiSiti = '';
function aggiornaSitiPreventivo(nome) {
    const select = el('prevSito');
    if (!select) return;
    const precedente = select.value;
    const perSito = new Map();
    showsDiModella(stato.tuttiGliShow, nome).forEach(s => { if (s.sito) perSito.set(s.sito, (perSito.get(s.sito) || 0) + 1); });
    select.innerHTML = `<option value="">${escapeHtml(t('quote.all_sites'))}</option>` +
        [...perSito].map(([id, n]) => `<option value="${escapeHtml(id)}">${escapeHtml(testo('quote.site_option', { sito: sitoDaId(id)?.nome || id, n }))}</option>`).join('');
    // Alla scelta della modella si propone il sito del suo ultimo show, solo se lì ne ha
    // abbastanza per calcolare sul sito: altrimenti il prezzo chiesto verrebbe letto nella
    // valuta di un sito (es. token) su cui il calcolo usa comunque tutti i siti
    const ultimo = showsDiModella(stato.tuttiGliShow, nome)[0]?.sito || '';
    const proposto = (perSito.get(ultimo) || 0) >= MINIMO_SHOW_SITO ? ultimo : '';
    // Un sito scelto a mano resta finché la modella è la stessa (ridisegni, altre lettere)
    const stessaModella = chiaveModella(nome) === modellaDeiSiti;
    modellaDeiSiti = chiaveModella(nome);
    select.value = stessaModella && perSito.has(precedente) ? precedente : proposto;
}

// Prezzo chiesto: nella valuta del sito (token, dollari...) se il sito scelto non è in euro
function prezzoChiestoInEuro(sito) {
    const valore = parseFloat(el('prevPrezzo')?.value);
    const inValuta = sito && sito.valuta && sito.valuta !== 'EUR';
    const etichetta = el('etichettaPrevPrezzo');
    if (etichetta) etichetta.textContent = inValuta ? testo('quote.price_in', { valuta: t(`currency.${sito.valuta}`) }) : t('quote.price');
    const equivalente = el('prevEquivalente');
    const euroValore = valore > 0 ? (inValuta ? valore * sito.tasso : valore) : null;
    if (equivalente) equivalente.textContent = inValuta && euroValore ? `= ${euro(euroValore)}` : '';
    return euroValore;
}

export function aggiornaPreventivo() {
    const box = el('esitoPreventivo');
    if (!box) return;
    const scritto = el('prevModella')?.value.trim() || '';
    const minuti = parseInt(el('prevMinuti')?.value, 10) || 0;
    document.querySelectorAll('[data-azione="prev-durata"]').forEach(btn => btn.classList.toggle('attivo', Number(btn.dataset.minuti) === minuti));
    const idSito = el('prevSito')?.value || '';
    const prezzo = prezzoChiestoInEuro(sitoDaId(idSito));
    const media = stato.costoMinutoRiferimento;

    if (!scritto) {
        box.innerHTML = `<p class="nota-preventivo">${escapeHtml(t('quote.choose_model'))}</p>`;
        return;
    }
    if (!(minuti > 0)) {
        box.innerHTML = `<p class="nota-preventivo">${escapeHtml(t('quote.choose_duration'))}</p>`;
        return;
    }
    const nome = nomeRegistrato(scritto);
    const suggerito = prezzoSuggerito(stato.tuttiGliShow, nome, { sito: idSito });
    const stessaDurata = suggerito ? ultimoShowConDurata(stato.tuttiGliShow, nome, minuti, { sito: idSito }) : null;
    const parti = [];

    if (suggerito) {
        parti.push(`<div>${escapeHtml(testo('quote.expected', { min: minuti, nome }))}</div>`,
            `<div class="prezzo-atteso">${euro(suggerito.costoMinuto * minuti)} <small>(${escapeHtml(testo('quote.per_min', { valore: euro(suggerito.costoMinuto) }))})</small></div>`,
            `<div class="nota-preventivo">${escapeHtml(suggerito.sito
                ? testo('quote.based_on_site', { n: suggerito.showUsati, sito: sitoDaId(suggerito.sito)?.nome || suggerito.sito })
                : testo(idSito ? 'quote.based_on_all_few' : 'quote.based_on_all', { n: suggerito.showUsati }))}</div>`);
        if (stessaDurata) {
            parti.push(`<div class="nota-preventivo">${escapeHtml(testo('quote.same_duration', { min: minuti, costo: euro(stessaDurata.costo), data: (stessaDurata.dataFormattata || '').split(' ')[0] }))}</div>`);
        }
    } else {
        parti.push(`<div class="avviso-preventivo">${escapeHtml(testo('quote.no_data', { nome }))}</div>`);
    }
    parti.push(media
        ? `<div class="riga-preventivo"><span>${escapeHtml(testo('quote.with_avg', { valore: euro(media) }))}</span><strong>${euro(media * minuti)}</strong></div>`
        : `<div class="nota-preventivo">${escapeHtml(t('quote.no_avg'))}</div>`);

    if (prezzo) {
        parti.push(`<div class="prezzo-chiesto">${escapeHtml(testo('quote.asked', { prezzo: euro(prezzo), valore: euro(prezzo / minuti) }))}</div>`);
        if (suggerito) {
            parti.push(`<div class="riga-preventivo"><span>${escapeHtml(testo('quote.vs_model', { n: suggerito.showUsati }))}</span>${badgeVerdetto(valutaPrezzo(prezzo, minuti, suggerito.costoMinuto))}</div>`);
        }
        if (media) {
            parti.push(`<div class="riga-preventivo"><span>${escapeHtml(t('quote.vs_general'))}</span>${badgeVerdetto(valutaPrezzo(prezzo, minuti, media))}</div>`);
        }
    }
    // Modella già registrata: un pulsante apre la sua scheda
    if (showsDiModella(stato.tuttiGliShow, nome).length > 0) {
        parti.push(`<button type="button" class="btn-data btn-compatto apri-scheda-preventivo" data-azione="apri-scheda-modella" data-nome="${escapeHtml(nome)}">
            <i class="fa-solid fa-user"></i> ${escapeHtml(testo('quote.open_card', { nome }))}</button>`);
    }
    box.innerHTML = parti.join('');
}

// Modella scritta nel calcolatore: siti in cui ha show, poi il preventivo
export function cambiaModellaPreventivo() {
    aggiornaSitiPreventivo(nomeRegistrato(el('prevModella')?.value || ''));
    aggiornaPreventivo();
}

// Durata: un pulsante rapido oppure il campo "altro…", che mostra solo le durate libere
const DURATE_RAPIDE = ['10', '15', '20', '30', '45', '60'];
function impostaMinutiPreventivo(minuti) {
    const valore = String(minuti || '');
    if (el('prevMinuti')) el('prevMinuti').value = valore;
    const altro = el('prevMinutiAltro');
    if (altro && document.activeElement !== altro) altro.value = DURATE_RAPIDE.includes(valore) ? '' : valore;
}

export function durataPreventivo(pulsante) {
    impostaMinutiPreventivo(pulsante.dataset.minuti);
    aggiornaPreventivo();
}

export function durataLiberaPreventivo(campo) {
    impostaMinutiPreventivo(campo.value);
    aggiornaPreventivo();
}

// Dalla tabella o dalla scheda della modella: la modella (e la durata) nel calcolatore
export function usaNelPreventivo(nome, minuti = null) {
    const campo = el('prevModella');
    if (!campo || !nome) return;
    campo.value = nome;
    if (minuti > 0) impostaMinutiPreventivo(minuti);
    cambiaModellaPreventivo();
}

export function apriPreventivo(nome, minuti) {
    el('modalModella').style.display = 'none';
    apriTab('tabPreventivo', document.querySelector('.tab-btn[data-tab="tabPreventivo"]'));
    usaNelPreventivo(nome, minuti);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* --------------------------------------------------------------------------
   TABELLA DEI PREZZI SUGGERITI
   -------------------------------------------------------------------------- */
const DURATE_TABELLA = [10, 15, 30, 60];

// Colonne: [chiave di ordinamento, intestazione, allineata a destra]
const colonnePrezzi = () => [
    ['nome', t('quote.col_model'), false],
    ['show', t('quote.col_shows'), true],
    ['media', t('quote.col_avg'), true],
    ['suggerito', t('quote.col_recent'), true],
    ['tendenza', t('quote.col_trend'), false],
    ...DURATE_TABELLA.map(m => [`p${m}`, `${m} min`, true])
];

// Ordinamento della tabella, ricordato alla riapertura come i filtri delle altre tabelle.
// Predefinito: dalla modella con più show con durata.
const CHIAVE_ORDINE = 'ordinePrezziSuggeriti';
let ordinePrezzi = leggiOrdinePrezzi();

function leggiOrdinePrezzi() {
    try {
        const salvato = JSON.parse(localStorage.getItem(CHIAVE_ORDINE) || 'null');
        if (salvato && COLONNE_PREZZI.includes(salvato.colonna) && ['asc', 'desc'].includes(salvato.verso)) return salvato;
    } catch { /* ordine predefinito */ }
    return { colonna: 'show', verso: 'desc' };
}

// Clic su un'intestazione: la stessa colonna inverte l'ordine; una nuova parte dal
// valore più alto (i più costosi) o, per il nome, dalla A
export function ordinaPrezzi(intestazione) {
    const colonna = intestazione.dataset.colonna;
    if (!COLONNE_PREZZI.includes(colonna)) return;
    const verso = colonna === ordinePrezzi.colonna
        ? (ordinePrezzi.verso === 'asc' ? 'desc' : 'asc')
        : (colonna === 'nome' ? 'asc' : 'desc');
    ordinePrezzi = { colonna, verso };
    try { localStorage.setItem(CHIAVE_ORDINE, JSON.stringify(ordinePrezzi)); } catch { /* vale per questa sessione */ }
    disegnaPrezziSuggeriti();
}

function disegnaIntestazionePrezzi() {
    const testa = el('intestazionePrezzi');
    if (!testa) return;
    const suggerimento = escapeHtml(t('quote.sort_hint'));
    testa.innerHTML = `<tr>${colonnePrezzi().map(([colonna, nome, destra]) => {
        const attiva = colonna === ordinePrezzi.colonna;
        const freccia = attiva ? (ordinePrezzi.verso === 'asc' ? ' ▲' : ' ▼') : '';
        const ariaSort = attiva ? (ordinePrezzi.verso === 'asc' ? 'ascending' : 'descending') : 'none';
        return `<th class="ordinabile${destra ? ' col-destra' : ''}${attiva ? ' ordinata' : ''}" aria-sort="${ariaSort}" tabindex="0"
            title="${suggerimento}" data-azione="prev-ordina" data-tastiera data-colonna="${colonna}">${escapeHtml(nome)}${freccia}</th>`;
    }).join('')}<th class="col-centro">${escapeHtml(t('table.actions'))}</th></tr>`;
}

export function disegnaPrezziSuggeriti() {
    const corpo = el('listaPrezziSuggeriti');
    if (!corpo) return;
    disegnaIntestazionePrezzi();
    const tutte = prezziSuggeriti(stato.tuttiGliShow);
    // "Solo online": lo stato viene da Mondo Cam Girls, quindi vale solo se il sito è in uso
    const soloOnline = funzioneDisponibile(SITO_MCG, FUNZIONI.ONLINE) && Boolean(el('filtroSoloOnlinePreventivo')?.checked);
    const voci = ordinaPrezziSuggeriti(soloOnline ? tutte.filter(v => eModellaOnline(v.nome) === true) : tutte,
        ordinePrezzi.colonna, ordinePrezzi.verso);
    if (voci.length === 0) {
        const messaggio = soloOnline && tutte.length ? t('quote.no_online') : t('quote.table_empty');
        corpo.innerHTML = `<tr><td colspan="${6 + DURATE_TABELLA.length}" class="nota-preventivo">${escapeHtml(messaggio)}</td></tr>`;
        return;
    }
    const tendenze = { su: '▲ ', giu: '▼ ', stabile: '→ ' };
    const scheda = escapeHtml(t('table.open_model'));
    corpo.innerHTML = voci.map(v => `
        <tr class="cliccabile" data-azione="prev-usa-modella" data-nome="${escapeHtml(v.nome)}" title="${escapeHtml(t('quote.row_hint'))}">
            <td><strong>${escapeHtml(v.nome)}</strong>${badgeOnline(v.nome)}${badgeSospesa(v.nome)}</td>
            <td class="col-destra">${v.showConDurata}</td>
            <td class="col-destra">${euro(v.mediaTutti)}</td>
            <td class="col-destra"><strong>${euro(v.costoMinuto)}</strong></td>
            <td class="tendenza-${v.tendenza}">${tendenze[v.tendenza]}${escapeHtml(t(`quote.trend_${v.tendenza}`))}</td>
            ${DURATE_TABELLA.map(m => `<td class="col-destra">${euro(Math.round(v.costoMinuto * m))}</td>`).join('')}
            <td class="col-azioni col-centro"><button type="button" class="btn-scheda" title="${scheda}" aria-label="${scheda}"
                data-azione="apri-scheda-modella" data-nome="${escapeHtml(v.nome)}"><i class="fa-solid fa-user"></i></button></td>
        </tr>`).join('');
}

// Ridisegno dopo ogni modifica dell'archivio e al cambio lingua (app.js)
export function ridisegnaPreventivo() {
    aggiornaSitiPreventivo(nomeRegistrato(el('prevModella')?.value || ''));
    aggiornaPreventivo();
    disegnaPrezziSuggeriti();
}

/* --------------------------------------------------------------------------
   RIQUADRO NELLA SCHEDA DELLA MODELLA
   -------------------------------------------------------------------------- */
const MINUTI_SCHEDA = 30;

export function htmlPreventivoScheda(nome) {
    return `<div class="preventivo-scheda">
        <strong>${escapeHtml(t('quote.card_title'))}</strong>
        <label for="schedaPrevMinuti">${escapeHtml(t('quote.card_duration'))}</label>
        <input type="number" id="schedaPrevMinuti" min="1" value="${MINUTI_SCHEDA}" data-nome="${escapeHtml(nome)}" data-al-input="scheda-preventivo">
        <span>${escapeHtml(t('quote.card_min'))}</span>
        <span id="schedaPrevEsito" class="preventivo-scheda-esito">${esitoScheda(nome, MINUTI_SCHEDA)}</span>
        <a href="#" class="link-web preventivo-scheda-link" data-azione="apri-preventivo" data-nome="${escapeHtml(nome)}">${escapeHtml(t('quote.card_open'))}</a>
    </div>`;
}

function esitoScheda(nome, minuti) {
    if (!(minuti > 0)) return '';
    const suggerito = prezzoSuggerito(stato.tuttiGliShow, nome);
    const media = stato.costoMinutoRiferimento;
    const tua = media ? euro(media * minuti) : '–';
    if (!suggerito) return `<span class="nota-preventivo">${escapeHtml(testo('quote.card_no_data', { tua }))}</span>`;
    return `<span class="prezzo-atteso">${euro(suggerito.costoMinuto * minuti)}</span>
        <span class="nota-preventivo">${escapeHtml(testo('quote.card_hint', { valore: euro(suggerito.costoMinuto), tua }))}</span>`;
}

export function aggiornaPreventivoScheda(campo) {
    const esito = el('schedaPrevEsito');
    if (esito) esito.innerHTML = esitoScheda(campo.dataset.nome, parseInt(campo.value, 10) || 0);
}

export function apriPreventivoDaScheda(link) {
    apriPreventivo(link.dataset.nome, parseInt(el('schedaPrevMinuti')?.value, 10) || null);
}

