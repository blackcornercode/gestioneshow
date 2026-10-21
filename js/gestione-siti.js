import { salvaCatalogoSiti } from './archivio.js';
import { conteggioPerSito } from './calcoli.js';
import { t, linguaCorrente } from './i18n.js';
import { logger } from './logger.js';
import { sitoDaId, siglaSito, sitoPredefinito, impostaSitoPredefinito, sitiVisibili, mcgAttivo, SITO_MCG, VALUTE, urlVerificaTasso } from './siti.js';
import { stato } from './stato.js';
import { COLORI_TAG } from './tag.js';
import { escapeHtml } from './utils.js';
import { filtroSalvato } from './filtri-salvati.js';

/* ==========================================================================
   SITI NELL'INTERFACCIA (roadmap multi-sito, fase 2)
   ==========================================================================
   Badge del sito nelle tabelle, scelta del sito nel form, filtri per sito di
   cronologia e classifica, campo della modifica multipla e finestra
   "Gestisci siti" (catalogo e sito predefinito). I colori sono quelli dei tag
   (classi tag-colore-* in style.css). */

const LUNGHEZZA_MASSIMA_NOME = 40;
const LUNGHEZZA_MASSIMA_SIGLA = 6;

const el = (id) => document.getElementById(id);
const testo = (chiave, valori = {}) =>
    Object.entries(valori).reduce((s, [k, v]) => s.replace(`{${k}}`, v), t(chiave));
const classeColore = (sito) => `tag-colore-${sito && COLORI_TAG.includes(sito.colore) ? sito.colore : 'grigio'}`;

// Sigla colorata di un sito (scheda della modella, profili per sito)
export function badgeSito(id) {
    const sito = sitoDaId(id);
    return `<span class="badge-sito ${classeColore(sito)}" title="${escapeHtml(sito?.nome || id || '')}">${escapeHtml(siglaSito(id))}</span>`;
}

/* --------------------------------------------------------------------------
   BADGE NELLE TABELLE: sigla colorata del sito e, dopo, 🤖 se lo show è stato
   importato in automatico. "Inserito a mano" è il caso normale: nessuna icona,
   solo il tooltip. Con un solo sito in uso la sigla sarebbe uguale su tutte le
   righe: resta solo l'eventuale 🤖 (e niente se lo show è inserito a mano).
   -------------------------------------------------------------------------- */
export function badgeSitoShow(show) {
    const sito = sitoDaId(show.sito);
    const origine = show.importatoDa
        ? testo('sites.imported_from', { sito: sitoDaId(show.importatoDa)?.nome || show.importatoDa })
        : t('sites.manual');
    const titolo = escapeHtml(`${sito?.nome || show.sito || '–'} · ${origine}`);
    const icona = show.importatoDa ? '<span class="icona-importato" aria-hidden="true">🤖</span>' : '';
    const inUso = sitiVisibili();
    const unicoSito = inUso.length === 1 && inUso[0].id === show.sito;
    if (unicoSito) return icona ? `<span class="badge-sito badge-solo-origine" title="${titolo}">${icona}</span>` : '';
    return `<span class="badge-sito ${classeColore(sito)}" title="${titolo}">${escapeHtml(siglaSito(show.sito))}${icona}</span>`;
}

/* --------------------------------------------------------------------------
   FORM: un sito scelto tra pulsanti con la sigla. Per uno show nuovo è quello
   predefinito, poi diventa quello dell'ultimo show con la modella, finché
   non lo si sceglie a mano.
   -------------------------------------------------------------------------- */
let sitoForm = null;
let sceltoAMano = false;

export function disegnaSelettoreSitoForm() {
    const contenitore = el('sitoForm');
    if (!contenitore) return;
    if (!sitoForm || (stato.catalogoSiti.length && !sitoDaId(sitoForm))) sitoForm = sitoPredefinito();
    // Uno show nuovo, senza sito scelto a mano, non resta su un sito appena tolto dall'uso
    if (!sceltoAMano && !el('editId')?.value && sitoDaId(sitoForm)?.attivo === false) sitoForm = sitoPredefinito();
    contenitore.innerHTML = sitiVisibili([sitoForm]).map(sito => {
        const scelto = sito.id === sitoForm;
        return `<button type="button" class="etichetta-tag selezionabile ${classeColore(sito)}${scelto ? ' attivo' : ''}" aria-pressed="${scelto}"
            title="${escapeHtml(sito.nome)}" data-azione="scegli-sito-form" data-id="${escapeHtml(sito.id)}">${escapeHtml(sito.sigla)}</button>`;
    }).join('');
    const nome = el('nomeSitoForm');
    if (nome) nome.textContent = sitoDaId(sitoForm)?.nome || '';
    // Il form aggiorna il convertitore di valuta (form-assistito.js)
    document.dispatchEvent(new CustomEvent('sito-form-cambiato'));
}

// Valore da salvare nello show
export function sitoSceltoForm() {
    return sitoForm || sitoPredefinito();
}

// Da modifica, reset e "Ripeti ultimo show": il sito diventa quello indicato
export function impostaSitoForm(id) {
    sitoForm = id || sitoPredefinito();
    sceltoAMano = false;
    disegnaSelettoreSitoForm();
}

// Dalla mini-scheda: il sito dell'ultimo show con la modella, se non è già stato scelto a mano
export function suggerisciSitoForm(id) {
    if (sceltoAMano || !id || !sitoDaId(id)) return;
    sitoForm = id;
    disegnaSelettoreSitoForm();
}

export function scegliSitoForm(pulsante) {
    sitoForm = pulsante.dataset.id;
    sceltoAMano = true;
    disegnaSelettoreSitoForm();
}

/* --------------------------------------------------------------------------
   FILTRI DI CRONOLOGIA E CLASSIFICA, CAMPO DELLA MODIFICA MULTIPLA
   -------------------------------------------------------------------------- */
// Siti in uso più quelli che hanno già degli show (per filtrare anche i vecchi)
const opzioniSiti = () => sitiVisibili([...conteggioPerSito(stato.tuttiGliShow).keys()])
    .map(sito => `<option value="${escapeHtml(sito.id)}">${escapeHtml(sito.nome)}</option>`).join('');

function riempiSelect(id, primaVoce) {
    const select = el(id);
    if (!select) return;
    // Al primo disegno il select è vuoto: vale il filtro salvato (filtri-salvati.js)
    const candidato = select.value || filtroSalvato(id);
    const scelto = sitoDaId(candidato) ? candidato : '';
    select.innerHTML = `<option value="">${escapeHtml(primaVoce)}</option>${opzioniSiti()}`;
    select.value = scelto;
}

export function aggiornaSelectSiti() {
    riempiSelect('filtroSitoCronologia', t('sites.all'));
    riempiSelect('filtroSitoClassifica', t('sites.all'));
    riempiSelect('mmSito', t('selection.no_change'));
}

/* --------------------------------------------------------------------------
   FINESTRA "GESTISCI SITI"
   -------------------------------------------------------------------------- */
const finestra = () => el('modalGestioneSiti');

export function apriGestioneSiti() {
    if (!finestra()) return;
    disegnaGestioneSiti();
    finestra().style.display = 'block';
}

export function chiudiGestioneSiti() {
    if (finestra()) finestra().style.display = 'none';
}

export function disegnaGestioneSiti() {
    const elenco = el('elencoGestioneSiti');
    if (!elenco) return;
    const usi = conteggioPerSito(stato.tuttiGliShow);
    elenco.innerHTML = stato.catalogoSiti.map(sito => {
        const id = escapeHtml(sito.id);
        const n = usi.get(sito.id) || 0;
        const colori = COLORI_TAG.map(colore => `<button type="button" class="campione-colore tag-colore-${colore}${colore === sito.colore ? ' attivo' : ''}"
            title="${escapeHtml(t('tags.color'))}" aria-label="${escapeHtml(t('tags.color'))}" aria-pressed="${colore === sito.colore}"
            data-azione="colore-sito" data-id="${id}" data-colore="${colore}"></button>`).join('');
        // Mondo Cam Girls e i siti usati da qualche show non si possono eliminare
        const motivoBlocco = sito.id === SITO_MCG ? t('sites.cannot_delete_mcg') : n > 0 ? testo('sites.in_use', { n }) : '';
        return `<div class="riga-gestione-sito${sito.attivo === false ? ' sito-non-usato' : ''}">
            <label class="casella-sito-attivo" title="${escapeHtml(t('sites.active_hint'))}">
                <input type="checkbox" data-al-cambio="attivo-sito" data-id="${id}"${sito.attivo !== false ? ' checked' : ''}>
                <span class="etichetta-tag ${classeColore(sito)}">${escapeHtml(sito.sigla)}</span>
            </label>
            <input type="text" class="nome-gestione-tag" value="${escapeHtml(sito.nome)}" maxlength="${LUNGHEZZA_MASSIMA_NOME}"
                aria-label="${escapeHtml(t('sites.name'))}" data-al-cambio="rinomina-sito" data-id="${id}">
            <input type="text" class="sigla-gestione-sito" value="${escapeHtml(sito.sigla)}" maxlength="${LUNGHEZZA_MASSIMA_SIGLA}"
                aria-label="${escapeHtml(t('sites.sigla'))}" title="${escapeHtml(t('sites.sigla'))}" data-al-cambio="sigla-sito" data-id="${id}">
            <select class="valuta-gestione-sito" aria-label="${escapeHtml(t('sites.currency'))}" title="${escapeHtml(t('sites.currency'))}" data-al-cambio="valuta-sito" data-id="${id}">
                ${VALUTE.map(v => `<option value="${v}"${v === sito.valuta ? ' selected' : ''}>${escapeHtml(t(`currency.${v}`))}</option>`).join('')}
            </select>
            <span class="tasso-con-verifica">
                <input type="number" class="tasso-gestione-sito" min="0.0001" step="any" value="${sito.tasso ?? 1}"${sito.valuta === 'EUR' ? ' disabled' : ''}
                    aria-label="${escapeHtml(t('sites.rate'))}" title="${escapeHtml(t('sites.rate'))}" data-al-cambio="tasso-sito" data-id="${id}">
                ${urlVerificaTasso(sito.valuta) ? `<a href="#" class="link-verifica-tasso" title="${escapeHtml(t('form.verify_rate_hint'))}" aria-label="${escapeHtml(t('form.verify_rate'))}" data-azione="apri-link" data-url="${escapeHtml(urlVerificaTasso(sito.valuta))}">🔎</a>` : ''}
            </span>
            <span class="colori-tag">${colori}</span>
            <span class="uso-tag">${escapeHtml(testo('tags.usage', { n }))}</span>
            <button type="button" class="btn-delete" title="${escapeHtml(motivoBlocco || t('sites.delete'))}" aria-label="${escapeHtml(t('sites.delete'))}"
                data-azione="elimina-sito" data-id="${id}"${motivoBlocco ? ' disabled' : ''}><i class="fa-solid fa-trash"></i></button>
        </div>`;
    }).join('');

    const predefinito = el('selectSitoPredefinito');
    if (predefinito) {
        predefinito.innerHTML = opzioniSiti();
        predefinito.value = sitoPredefinito();
    }
}

const trovaPerNome = (nome) => stato.catalogoSiti.find(sito => sito.nome.toLowerCase() === nome.toLowerCase());

async function salvaModificaSito(id, campi, descrizione) {
    try {
        await salvaCatalogoSiti(stato.catalogoSiti.map(sito => sito.id === id ? { ...sito, ...campi } : sito));
        logger.success(descrizione);
    } catch (err) {
        logger.error('Modifica del sito non riuscita', err);
        disegnaGestioneSiti();
    }
}

export async function creaSitoDaGestione() {
    const campo = el('nuovoSitoGestione');
    const nome = (campo?.value || '').trim().slice(0, LUNGHEZZA_MASSIMA_NOME);
    if (!nome) return;
    if (trovaPerNome(nome)) {
        alert(t('sites.duplicate'));
        return;
    }
    const nuovo = {
        id: `sito-${Date.now().toString(36)}`,
        nome,
        sigla: nome.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || 'SITO',
        colore: COLORI_TAG[stato.catalogoSiti.length % COLORI_TAG.length]
    };
    try {
        await salvaCatalogoSiti([...stato.catalogoSiti, nuovo]);
        logger.success('Sito creato');
        campo.value = '';
        campo.focus();
    } catch (err) {
        logger.error('Creazione del sito non riuscita', err);
    }
}

export async function rinominaSito(campo) {
    const sito = sitoDaId(campo.dataset.id);
    if (!sito) return;
    const nome = campo.value.trim().slice(0, LUNGHEZZA_MASSIMA_NOME);
    if (nome === sito.nome) return;
    const doppione = trovaPerNome(nome);
    if (!nome || (doppione && doppione.id !== sito.id)) {
        alert(t(nome ? 'sites.duplicate' : 'sites.empty_name'));
        campo.value = sito.nome;
        return;
    }
    await salvaModificaSito(sito.id, { nome }, `Sito rinominato: ${sito.nome} -> ${nome}`);
}

export async function cambiaSiglaSito(campo) {
    const sito = sitoDaId(campo.dataset.id);
    if (!sito) return;
    const sigla = campo.value.trim().slice(0, LUNGHEZZA_MASSIMA_SIGLA).toUpperCase();
    if (!sigla) {
        campo.value = sito.sigla;
        return;
    }
    if (sigla !== sito.sigla) await salvaModificaSito(sito.id, { sigla }, `Sigla del sito ${sito.nome}: ${sigla}`);
}

export async function cambiaColoreSito(pulsante) {
    const { id, colore } = pulsante.dataset;
    if (sitoDaId(id) && COLORI_TAG.includes(colore)) await salvaModificaSito(id, { colore }, `Colore del sito ${sitoDaId(id).nome}: ${colore}`);
}

// Valuta del sito: l'euro ha sempre tasso 1
export async function cambiaValutaSito(select) {
    const sito = sitoDaId(select.dataset.id);
    if (!sito || !VALUTE.includes(select.value)) return;
    const tasso = select.value === 'EUR' ? 1 : sito.tasso;
    await salvaModificaSito(sito.id, { valuta: select.value, tasso }, `Valuta del sito ${sito.nome}: ${select.value}`);
}

// Tasso: valore in euro di un'unità della valuta del sito
export async function cambiaTassoSito(campo) {
    const sito = sitoDaId(campo.dataset.id);
    const tasso = Number(campo.value);
    if (!sito) return;
    if (!(tasso > 0)) {
        campo.value = sito.tasso;
        return;
    }
    if (tasso !== sito.tasso) await salvaModificaSito(sito.id, { tasso }, `Tasso del sito ${sito.nome}: 1 ${sito.valuta} = € ${tasso}`);
}

// "In uso": solo i siti in uso compaiono nel form; per Mondo Cam Girls attiva le sue funzioni
export async function cambiaAttivoSito(casella) {
    const sito = sitoDaId(casella.dataset.id);
    if (!sito) return;
    if (!casella.checked && sitiVisibili().filter(s => s.id !== sito.id).length === 0) {
        alert(t('sites.need_one'));
        casella.checked = true;
        return;
    }
    await salvaModificaSito(sito.id, { attivo: casella.checked }, `Sito ${sito.nome}: ${casella.checked ? 'in uso' : 'non in uso'}`);
}

// Nasconde le parti dell'interfaccia legate a Mondo Cam Girls (classe .solo-mcg) se il sito non è in uso
export function applicaSitiAttivi() {
    document.body.classList.toggle('senza-mcg', !mcgAttivo());
}

/* --------------------------------------------------------------------------
   BENVENUTO AL PRIMO AVVIO (archivio vuoto): quali siti usi?
   -------------------------------------------------------------------------- */
const CHIAVE_BENVENUTO = 'benvenuto_completato';
let benvenutoControllato = false;

const benvenutoGiaFatto = () => {
    try { return localStorage.getItem(CHIAVE_BENVENUTO) === '1'; } catch { return true; }
};

// Chiamata a ogni ridisegno: apre il benvenuto una sola volta, solo con l'archivio vuoto
export function controllaBenvenuto() {
    if (benvenutoControllato || !stato.catalogoSiti.length) return;
    benvenutoControllato = true;
    if (stato.tuttiGliShow.length > 0 || benvenutoGiaFatto() || !el('modalBenvenuto')) return;
    el('sceltaSitiBenvenuto').innerHTML = stato.catalogoSiti.map(sito => `
        <label class="checkbox-label scelta-sito-benvenuto">
            <input type="checkbox" value="${escapeHtml(sito.id)}" data-al-cambio="benvenuto-siti">
            <span class="etichetta-tag ${classeColore(sito)}">${escapeHtml(sito.sigla)}</span> ${escapeHtml(sito.nome)}
        </label>`).join('');
    aggiornaBenvenuto();
    const lingua = el('linguaBenvenuto');
    if (lingua) lingua.value = linguaCorrente;
    el('modalBenvenuto').style.display = 'block';
}

// Il sito principale si sceglie tra quelli spuntati
export function aggiornaBenvenuto() {
    const scelti = [...document.querySelectorAll('#sceltaSitiBenvenuto input:checked')].map(c => c.value);
    const select = el('sitoPredefinitoBenvenuto');
    const precedente = select.value;
    select.innerHTML = scelti.map(id => `<option value="${escapeHtml(id)}">${escapeHtml(sitoDaId(id)?.nome || id)}</option>`).join('');
    if (scelti.includes(precedente)) select.value = precedente;
    el('btnConfermaBenvenuto').disabled = scelti.length === 0;
}

export async function confermaBenvenuto() {
    const scelti = new Set([...document.querySelectorAll('#sceltaSitiBenvenuto input:checked')].map(c => c.value));
    if (scelti.size === 0) return;
    try {
        await salvaCatalogoSiti(stato.catalogoSiti.map(sito => ({ ...sito, attivo: scelti.has(sito.id) })));
        impostaSitoPredefinito(el('sitoPredefinitoBenvenuto').value || [...scelti][0]);
        try { localStorage.setItem(CHIAVE_BENVENUTO, '1'); } catch { /* si riproporrà al prossimo avvio */ }
        impostaSitoForm(null);
        el('modalBenvenuto').style.display = 'none';
        logger.success(`Primo avvio: siti in uso ${[...scelti].join(', ')}`);
    } catch (err) {
        logger.error('Salvataggio dei siti in uso non riuscito', err);
    }
}

export async function eliminaSito(pulsante) {
    const sito = sitoDaId(pulsante.dataset.id);
    if (!sito || sito.id === SITO_MCG || conteggioPerSito(stato.tuttiGliShow).get(sito.id)) return;
    if (!confirm(testo('sites.confirm_delete', { nome: sito.nome }))) return;
    try {
        await salvaCatalogoSiti(stato.catalogoSiti.filter(s => s.id !== sito.id));
        logger.success('Sito eliminato');
    } catch (err) {
        logger.error('Eliminazione del sito non riuscita', err);
    }
}

export function cambiaSitoPredefinito(select) {
    if (!sitoDaId(select.value)) return;
    impostaSitoPredefinito(select.value);
    logger.info('Sito predefinito per i nuovi show cambiato');
    // Uno show nuovo in compilazione, senza sito scelto a mano, passa subito al nuovo predefinito
    if (!el('editId')?.value && !sceltoAMano) {
        sitoForm = select.value;
        disegnaSelettoreSitoForm();
    }
}

export function inizializzaSiti() {
    el('nuovoSitoGestione')?.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        creaSitoDaGestione();
    });
}
