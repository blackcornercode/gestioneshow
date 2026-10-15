import { chiaveModella, schedaRapidaModella, prezzoSuggerito } from './calcoli.js';
import { t } from './i18n.js';
import { suggerisciSitoForm, sitoSceltoForm } from './gestione-siti.js';
import { badgeSospesa } from './profili-sospesi.js';
import { sitoDaId, urlVerificaTasso } from './siti.js';
import { badgeOnline } from './stato-online.js';
import { stato } from './stato.js';
import { tagDaId, etichettaTag, impostaTagSuggeriti } from './tag.js';
import { escapeHtml, costoAlMinuto, formattaCostoAlMinuto, eUsernameTeams } from './utils.js';

/* ==========================================================================
   FORM "AGGIUNGI / MODIFICA SHOW": PARTI ASSISTITE
   ==========================================================================
   I valori salvati restano nei campi di sempre (isRegalo, punteggio, durataShow,
   costo...), letti da form-show.js; qui ci sono i comandi che li impostano
   (tipo show/regalo, stelle, durate rapide) e le informazioni calcolate mentre
   si compila: €/min, mini-scheda della modella, riepilogo dei dettagli. */

const el = (id) => document.getElementById(id);
const euro = (valore) => `€ ${Number(valore).toFixed(2)}`;
let schedaCorrente = null;

/* --- Tipo: show o regalo --- */
export function impostaTipo(tipo) {
    const casella = el('isRegalo');
    if (casella) casella.checked = tipo === 'regalo';
}

// Pulsanti e campi visibili coerenti con la casella isRegalo (i campi .solo-show
// spariscono per i regali: style.css, .modalita-regalo)
export function aggiornaVistaTipo() {
    const regalo = Boolean(el('isRegalo')?.checked);
    document.querySelectorAll('[data-azione="tipo-show"]').forEach(btn => {
        const attivo = (btn.dataset.tipo === 'regalo') === regalo;
        btn.classList.toggle('attivo', attivo);
        btn.setAttribute('aria-pressed', String(attivo));
    });
    el('showForm')?.classList.toggle('modalita-regalo', regalo);
    aggiornaAnteprimaCostoMinuto();
    aggiornaRiepilogoDettagli();
}

/* --- Voto (badge come in cronologia): nessun voto = TBD al salvataggio --- */
export function cliccaVoto(pulsante) {
    const select = el('punteggio');
    if (!select) return;
    // Un secondo clic sullo stesso valore lo toglie
    select.value = select.value === pulsante.dataset.voto ? '' : pulsante.dataset.voto;
    aggiornaStelle();
}

export function aggiornaStelle() {
    const valore = el('punteggio')?.value || '';
    document.querySelectorAll('.scelta-voto [data-azione="voto-stelle"]').forEach(btn => {
        const scelto = btn.dataset.voto === valore;
        btn.classList.toggle('scelto', scelto);
        btn.setAttribute('aria-pressed', String(scelto));
    });
}

/* --- Qualità e inquadratura (facoltative): un secondo clic sulla scelta la toglie --- */
export function scegliParametroShow(pulsante, idCampo) {
    const campo = el(idCampo);
    if (!campo) return;
    campo.value = campo.value === pulsante.dataset.valore ? '' : pulsante.dataset.valore;
    aggiornaParametriShow();
}

export function aggiornaParametriShow() {
    const allinea = (idCampo, pulsanti) => {
        const valore = el(idCampo)?.value || '';
        pulsanti.forEach(btn => {
            const scelto = btn.dataset.valore === valore;
            btn.classList.toggle('attivo', scelto);
            btn.setAttribute('aria-pressed', String(scelto));
        });
    };
    allinea('qualitaShow', document.querySelectorAll('[data-azione="scegli-qualita"]'));
    allinea('cameraShow', document.querySelectorAll('[data-azione="scegli-camera"]'));
}

/* --- Durata rapida e €/min --- */
export function durataRapida(pulsante) {
    const campo = el('durataShow');
    if (campo) campo.value = pulsante.dataset.minuti;
    aggiornaAnteprimaCostoMinuto();
}

// Durata scritta nel campo "altro…"
export function durataLibera(campo) {
    const durata = el('durataShow');
    if (durata) durata.value = campo.value;
    aggiornaAnteprimaCostoMinuto();
}

export function aggiornaAnteprimaCostoMinuto() {
    const durata = el('durataShow')?.value || '';
    let rapida = false;
    document.querySelectorAll('[data-azione="durata-rapida"]').forEach(btn => {
        const scelta = btn.dataset.minuti === durata;
        btn.classList.toggle('attivo', scelta);
        btn.setAttribute('aria-pressed', String(scelta));
        rapida ||= scelta;
    });
    // Il campo "altro…" mostra la durata solo se non è uno dei valori rapidi
    const altro = el('durataAltro');
    if (altro && document.activeElement !== altro) altro.value = rapida ? '' : durata;

    const box = el('anteprimaCostoMinuto');
    if (!box) return;
    // Con il costo ancora vuoto si mostra cosa manca invece di € 0.00
    const valore = el('costo')?.value === '' ? null : costoAlMinuto({
        costo: parseFloat(el('costo')?.value) || 0,
        durata: parseInt(durata, 10) || 0,
        isRegalo: Boolean(el('isRegalo')?.checked)
    });
    const riferimento = stato.costoMinutoRiferimento;
    box.classList.toggle('vuota', valore === null);
    box.innerHTML = valore === null
        ? `<span class="anteprima-media">${escapeHtml(t('form.per_min_empty'))}</span>`
        : `<strong>${formattaCostoAlMinuto(valore)}</strong>` +
          (riferimento ? ` <span class="anteprima-media">${escapeHtml(t('form.per_min_avg').replace('{media}', euro(riferimento)))}</span>` : '');
    aggiornaEquivalenteEuro();
    aggiornaPrezzoAtteso();
}

// Prezzo atteso per la durata scelta, prima ancora di scrivere il costo: con il €/min
// suggerito della modella sul sito del form (preventivo) e con la media generale
export function aggiornaPrezzoAtteso() {
    const box = el('prezzoAttesoForm');
    if (!box) return;
    const nome = el('nome')?.value.trim() || '';
    const minuti = parseInt(el('durataShow')?.value, 10) || 0;
    const media = stato.costoMinutoRiferimento;
    const suggerito = nome && minuti > 0 ? prezzoSuggerito(stato.tuttiGliShow, nome, { sito: sitoSceltoForm() }) : null;
    box.hidden = !nome || !(minuti > 0) || Boolean(el('isRegalo')?.checked) || (!suggerito && !media);
    if (box.hidden) return;
    const tua = media ? euro(media * minuti) : '–';
    box.textContent = suggerito
        ? t('quote.form_expected').replace('{min}', minuti).replace('{sua}', euro(suggerito.costoMinuto * minuti)).replace('{tua}', tua)
        : t('quote.form_expected_general').replace('{min}', minuti).replace('{tua}', tua);
}

/* --- Mini-scheda della modella --- */
export function ultimoShowModella() {
    return schedaCorrente?.ultimoShow || null;
}

export function aggiornaMiniScheda() {
    const box = el('miniSchedaModella');
    const nome = el('nome')?.value.trim() || '';
    schedaCorrente = nome ? schedaRapidaModella(stato.tuttiGliShow, nome) : null;
    const ultimo = ultimoShowModella();
    const inModifica = Boolean(el('editId')?.value);

    // Tag usati di solito con lei, segnati nel selettore dei tag
    impostaTagSuggeriti(schedaCorrente?.tagFrequenti || []);
    // Per uno show nuovo il sito diventa quello dell'ultimo show con lei (se non scelto a mano)
    if (!inModifica) suggerisciSitoForm(schedaCorrente?.sitoUltimo);
    aggiornaPrezzoAtteso();
    const notaTag = el('notaTagSuggeriti');
    if (notaTag) notaTag.hidden = !schedaCorrente?.tagFrequenti.length;

    // "= ultimo": stesso costo dell'ultimo show con lei
    const btnCosto = el('btnCostoUltimo');
    if (btnCosto) {
        btnCosto.hidden = !(ultimo && ultimo.costo > 0);
        if (!btnCosto.hidden) btnCosto.textContent = t('form.cost_last').replace('{costo}', euro(ultimo.costo));
    }

    if (!box) return;
    if (!nome) {
        box.hidden = true;
        box.innerHTML = '';
        return;
    }
    box.hidden = false;
    if (!schedaCorrente) {
        box.innerHTML = `<span class="mini-scheda-nuova">${escapeHtml(t('form.mini_new'))}</span>`;
        return;
    }

    const foto = stato.mappaImmaginiModelle[chiaveModella(nome)] || '';
    const fotoHtml = foto
        ? `<img src="${escapeHtml(foto)}" class="thumb-img mini-scheda-foto" alt="" data-sostituto="${escapeHtml(t('table.no_photo'))}">`
        : `<div class="no-img mini-scheda-foto">${escapeHtml(t('table.no_photo'))}</div>`;
    const media = schedaCorrente.mediaTxt !== 'N/D' ? `${schedaCorrente.mediaTxt} / 5` : 'N/D';
    const ultimoHtml = ultimo ? escapeHtml(t('form.mini_last')
        // Solo il giorno: per gli show importati da MCG ("02/10/26 18:17") slice(0, 10) dava "02/10/26 1"
        .replace('{data}', (ultimo.dataFormattata || '').split(' ')[0])
        .replace('{costo}', euro(ultimo.costo || 0))
        .replace('{durata}', ultimo.durata ? `${ultimo.durata} min` : '–')
        .replace('{piattaforma}', ultimo.piattaforma || '–')) : '';
    const tagHtml = schedaCorrente.tagFrequenti.map(tagDaId).filter(Boolean).map(tag => etichettaTag(tag)).join('');

    box.innerHTML = `
        ${fotoHtml}
        <div class="mini-scheda-testo">
            <div><strong>${escapeHtml(t('form.mini_shows').replace('{n}', schedaCorrente.totaleShow))}</strong> · ${escapeHtml(t('form.mini_avg').replace('{media}', media))}${badgeOnline(nome)}${badgeSospesa(nome)}</div>
            ${ultimoHtml ? `<div class="mini-scheda-ultimo">${ultimoHtml}</div>` : ''}
            ${tagHtml ? `<div class="mini-scheda-tag">${tagHtml}</div>` : ''}
        </div>
        ${ultimo && !inModifica ? `<button type="button" class="btn-data mini-scheda-ripeti" data-azione="ripeti-ultimo-show" title="${escapeHtml(t('form.repeat_last_hint'))}">${escapeHtml(t('form.repeat_last'))}</button>` : ''}`;
}

/* --- Riepilogo della sezione "Dettagli" (chiusa) --- */
export function aggiornaRiepilogoDettagli() {
    const box = el('riepilogoDettagli');
    if (!box) return;
    const parti = [];
    if (!el('isRegalo')?.checked) parti.push(el('piattaforma')?.value || 'Teams');
    if (el('nickname')?.value.trim()) parti.push(el('nickname').value.trim());
    if (el('urlProfilo')?.value.trim()) parti.push(`🌐 ${t('form.details_profile')}`);
    if (el('immagine')?.value.trim()) parti.push(`🖼️ ${t('form.details_photo')}`);
    box.innerHTML = parti.map(parte => `<span class="pillola-dettaglio">${escapeHtml(parte)}</span>`).join('');

    // Teams apre la chat con un clic solo se il nickname è l'email della modella
    const notaTeams = el('notaNicknameTeams');
    if (notaTeams) notaTeams.hidden = Boolean(el('isRegalo')?.checked) || !eUsernameTeams(el('piattaforma')?.value, el('nickname')?.value);
}

// Allinea tutte le parti assistite ai valori dei campi (dopo modifica, reset, autocompilazione)
/* --- Costo in valuta: per i siti che fanno pagare in token, dollari... il campo
   principale è l'importo pagato e il costo in euro si calcola col tasso del sito.
   "inserisci in euro" torna al costo in euro (es. per uno show pagato a parte) --- */
const sitoInValuta = () => {
    const sito = sitoDaId(sitoSceltoForm());
    return sito && sito.valuta && sito.valuta !== 'EUR' ? sito : null;
};
let costoInEuro = false;

// Prima lettera maiuscola: "token pagati" -> "Token pagati"
const maiuscola = (testo) => testo.charAt(0).toUpperCase() + testo.slice(1);

export function aggiornaConvertitoreValuta() {
    const box = el('convertitoreValuta');
    if (!box) return;
    const sito = sitoInValuta();
    const inValuta = Boolean(sito) && !costoInEuro;
    box.hidden = !inValuta;
    el('campoCostoEuro').hidden = inValuta;
    el('notaValuta').hidden = !sito;
    if (!sito) return;
    const valuta = t(`currency.${sito.valuta}`);
    el('etichettaImportoValuta').textContent = maiuscola(t('form.amount_in').replace('{valuta}', valuta));
    el('tassoImportoValuta').textContent = t('form.amount_rate').replace('{unita}', t(`currency_unit.${sito.valuta}`)).replace('{tasso}', euro(sito.tasso).replace('.00', '')).replace('{sito}', sito.nome);
    const urlVerifica = urlVerificaTasso(sito.valuta);
    const linkVerifica = el('linkVerificaTasso');
    linkVerifica.hidden = !urlVerifica;
    el('separatoreVerificaTasso').hidden = !urlVerifica;
    linkVerifica.dataset.url = urlVerifica || '';
    linkVerifica.textContent = t('form.verify_rate');
    el('linkCostoEuro').textContent = costoInEuro ? t('form.enter_in_currency').replace('{valuta}', valuta) : t('form.enter_in_euro');
    aggiornaEquivalenteEuro();
}

// "= € 64,96" accanto all'importo in valuta
function aggiornaEquivalenteEuro() {
    const span = el('equivalenteEuro');
    if (!span) return;
    const costo = parseFloat(el('costo')?.value);
    span.textContent = costo > 0 && el('importoValuta')?.value ? `= ${euro(costo)}` : '= € –';
}

export function convertiImportoValuta() {
    const sito = sitoInValuta();
    const valore = parseFloat(el('importoValuta')?.value);
    if (!sito || !(valore >= 0)) return;
    el('costo').value = (Math.round(valore * sito.tasso * 100) / 100).toFixed(2);
    aggiornaAnteprimaCostoMinuto();
}

// Passa dal costo in valuta a quello in euro e viceversa: l'importo in valuta
// si svuota passando agli euro (non corrisponderebbe più al costo)
export function alternaCostoInEuro() {
    costoInEuro = !costoInEuro;
    const importo = el('importoValuta');
    if (costoInEuro && importo) importo.value = '';
    aggiornaConvertitoreValuta();
    (costoInEuro ? el('costo') : importo)?.focus();
}

// In modifica: costo in euro se lo show non ha un importo in valuta; per uno show nuovo false
export function impostaCostoInEuro(valore) {
    costoInEuro = Boolean(valore);
    aggiornaConvertitoreValuta();
}

// Importo originale da salvare nello show (null se il sito è in euro, se il costo
// è stato inserito in euro o se il campo è vuoto)
export function importoOriginaleForm() {
    const sito = sitoInValuta();
    const valore = parseFloat(el('importoValuta')?.value);
    return sito && !costoInEuro && valore > 0 ? { valore, valuta: sito.valuta } : null;
}

/* --- Nuovo tag: il campo compare con il pulsante "＋ Nuovo tag" --- */
export function mostraNuovoTag() {
    const riga = el('nuovoTagRiga');
    if (!riga) return;
    riga.hidden = false;
    el('btnNuovoTagForm').hidden = true;
    el('nuovoTagForm')?.focus();
}

export function nascondiNuovoTag() {
    const riga = el('nuovoTagRiga');
    if (riga) riga.hidden = true;
    const btn = el('btnNuovoTagForm');
    if (btn) btn.hidden = false;
}

export function inizializzaConvertitoreValuta() {
    document.addEventListener('sito-form-cambiato', aggiornaConvertitoreValuta);
    // Il €/min suggerito dipende dal sito (preventivo)
    document.addEventListener('sito-form-cambiato', aggiornaPrezzoAtteso);
}

export function sincronizzaFormAssistito() {
    aggiornaVistaTipo();
    aggiornaConvertitoreValuta();
    aggiornaStelle();
    aggiornaParametriShow();
    aggiornaAnteprimaCostoMinuto();
    aggiornaMiniScheda();
    aggiornaRiepilogoDettagli();
}
