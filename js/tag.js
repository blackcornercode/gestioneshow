import { salvaCatalogoTag, eliminaTagDalCatalogo } from './archivio.js';
import { conteggioTag } from './calcoli.js';
import { t } from './i18n.js';
import { filtroSalvato } from './filtri-salvati.js';
import { logger } from './logger.js';
import { stato } from './stato.js';
import { escapeHtml } from './utils.js';

/* ==========================================================================
   TAG DEGLI SHOW
   ==========================================================================
   Il catalogo (stato.catalogoTag, file tags.json) elenca i tag con nome e
   colore; ogni show salva gli ID dei suoi tag nel campo "tag". Rinominare un
   tag o cambiarne il colore modifica solo il catalogo; eliminarlo lo toglie
   anche dagli show (archivio.js). Qui: etichette colorate, selettore del form,
   scelta dei tag nella modifica multipla, filtro della cronologia e finestra
   "Gestisci tag". */

// Stessi colori di main/catalogo-tag.js e delle classi tag-colore-* in style.css
export const COLORI_TAG = ['blu', 'verde', 'acqua', 'viola', 'rosa', 'rosso', 'arancio', 'ambra', 'grigio'];
const LUNGHEZZA_MASSIMA_NOME = 40;

const testo = (chiave, valori = {}) =>
    Object.entries(valori).reduce((s, [k, v]) => s.replace(`{${k}}`, v), t(chiave));
const classeColore = (tag) => `tag-colore-${COLORI_TAG.includes(tag.colore) ? tag.colore : 'grigio'}`;

export function tagDaId(id) {
    return stato.catalogoTag.find(tag => tag.id === id) || null;
}

// Tag di uno show nell'ordine del catalogo (gli ID non più nel catalogo vengono ignorati)
export function tagDelloShow(show) {
    const ids = new Set(show.tag || []);
    return stato.catalogoTag.filter(tag => ids.has(tag.id));
}

// Etichetta colorata non cliccabile
export function etichettaTag(tag, classe = '', suffisso = '') {
    return `<span class="etichetta-tag ${classeColore(tag)}${classe ? ' ' + classe : ''}">${escapeHtml(tag.nome)}${escapeHtml(suffisso)}</span>`;
}

// Etichetta cliccabile per i selettori; azione = attributo data-azione completo
// (scritto per intero, così il test moduli lo trova tra le azioni usate)
const AZIONE_FORM = 'data-azione="alterna-tag-form"';
const AZIONE_MULTIPLA = 'data-azione="alterna-tag-multipla"';
function pulsanteTag(tag, azione, { classe = '', premuto = false, prefisso = '', titolo = '' } = {}) {
    return `<button type="button" class="etichetta-tag selezionabile ${classeColore(tag)}${classe ? ' ' + classe : ''}"
        aria-pressed="${premuto}"${titolo ? ` title="${escapeHtml(titolo)}"` : ''} ${azione} data-id="${escapeHtml(tag.id)}">${escapeHtml(prefisso)}${escapeHtml(tag.nome)}</button>`;
}

// Catalogo ordinato per nome dopo ogni aggiunta o modifica
const ordinaCatalogo = (catalogo) => [...catalogo].sort((a, b) => a.nome.localeCompare(b.nome, 'it', { sensitivity: 'base' }));
const trovaPerNome = (nome) => stato.catalogoTag.find(tag => tag.nome.toLowerCase() === nome.toLowerCase());

// Crea un tag (o restituisce quello esistente con lo stesso nome, maiuscole a parte)
async function creaTag(nomeInserito) {
    const nome = nomeInserito.trim().slice(0, LUNGHEZZA_MASSIMA_NOME);
    if (!nome) return null;
    const esistente = trovaPerNome(nome);
    if (esistente) return esistente;
    const nuovo = {
        id: `tag-${Date.now().toString(36)}`,
        nome,
        colore: COLORI_TAG[stato.catalogoTag.length % COLORI_TAG.length]
    };
    await salvaCatalogoTag(ordinaCatalogo([...stato.catalogoTag, nuovo]));
    logger.success('Tag creato');
    return nuovo;
}

/* --------------------------------------------------------------------------
   FORM DELLO SHOW
   -------------------------------------------------------------------------- */
export function disegnaSelettoreTagForm() {
    const contenitore = document.getElementById('tagForm');
    if (!contenitore) return;
    // Tolti i tag eliminati nel frattempo dal catalogo
    [...stato.tagForm].forEach(id => { if (!tagDaId(id)) stato.tagForm.delete(id); });
    contenitore.innerHTML = stato.catalogoTag.length
        ? stato.catalogoTag.map(tag => {
            const scelto = stato.tagForm.has(tag.id);
            // ★ sui tag usati di solito con la modella (form-assistito.js), finché non sono scelti
            const suggerito = !scelto && tagSuggeriti.has(tag.id);
            return pulsanteTag(tag, AZIONE_FORM, { premuto: scelto, classe: scelto ? 'attivo' : suggerito ? 'suggerito' : '', prefisso: suggerito ? '★ ' : '' });
        }).join('')
        : `<span class="tag-vuoto">${escapeHtml(t('tags.empty_form'))}</span>`;
}

let tagSuggeriti = new Set();
export function impostaTagSuggeriti(ids = []) {
    tagSuggeriti = new Set(ids);
    disegnaSelettoreTagForm();
}

export function impostaTagForm(ids = []) {
    stato.tagForm = new Set(ids);
    disegnaSelettoreTagForm();
}

// ID da salvare nello show, nell'ordine del catalogo
export function tagSceltiForm() {
    return stato.catalogoTag.filter(tag => stato.tagForm.has(tag.id)).map(tag => tag.id);
}

export function alternaTagForm(el) {
    const id = el.dataset.id;
    if (stato.tagForm.has(id)) stato.tagForm.delete(id);
    else stato.tagForm.add(id);
    disegnaSelettoreTagForm();
}

// Nuovo tag scritto nel form: viene creato e subito assegnato allo show
export async function creaTagDaForm() {
    const campo = document.getElementById('nuovoTagForm');
    if (!campo || !campo.value.trim()) return;
    try {
        const tag = await creaTag(campo.value);
        if (!tag) return;
        stato.tagForm.add(tag.id);
        campo.value = '';
        disegnaSelettoreTagForm();
    } catch (err) {
        logger.error('Creazione del tag non riuscita', err);
    }
}

/* --------------------------------------------------------------------------
   MODIFICA MULTIPLA: ogni clic passa da "non modificare" ad "aggiungi" (+),
   a "togli" (−) e di nuovo a "non modificare"
   -------------------------------------------------------------------------- */
export function disegnaTagModificaMultipla() {
    const contenitore = document.getElementById('mmTag');
    if (!contenitore) return;
    contenitore.innerHTML = stato.catalogoTag.length
        ? stato.catalogoTag.map(tag => {
            const scelta = stato.tagModificaMultipla.get(tag.id);
            const opzioni = scelta === '+' ? { classe: 'attivo tag-aggiungi', prefisso: '+ ', premuto: true, titolo: t('tags.bulk_add') }
                : scelta === '-' ? { classe: 'tag-togli', prefisso: '− ', premuto: true, titolo: t('tags.bulk_remove') }
                : { titolo: t('selection.no_change') };
            return pulsanteTag(tag, AZIONE_MULTIPLA, opzioni);
        }).join('')
        : `<span class="tag-vuoto">${escapeHtml(t('tags.empty'))}</span>`;
}

export function alternaTagModificaMultipla(el) {
    const id = el.dataset.id;
    const attuale = stato.tagModificaMultipla.get(id);
    const prossima = attuale === undefined ? '+' : attuale === '+' ? '-' : undefined;
    if (prossima) stato.tagModificaMultipla.set(id, prossima);
    else stato.tagModificaMultipla.delete(id);
    disegnaTagModificaMultipla();
}

/* --------------------------------------------------------------------------
   FILTRO DELLA CRONOLOGIA
   -------------------------------------------------------------------------- */
export function aggiornaFiltroTag() {
    const select = document.getElementById('filtroTagCronologia');
    if (!select) return;
    // Al primo disegno il select è vuoto: vale il filtro salvato (filtri-salvati.js)
    const candidato = select.value || filtroSalvato('filtroTagCronologia');
    const scelto = tagDaId(candidato) ? candidato : '';
    select.innerHTML = `<option value="">${escapeHtml(t('tags.all'))}</option>` +
        stato.catalogoTag.map(tag => `<option value="${escapeHtml(tag.id)}">${escapeHtml(tag.nome)}</option>`).join('');
    select.value = scelto;
}

/* --------------------------------------------------------------------------
   FINESTRA "GESTISCI TAG"
   -------------------------------------------------------------------------- */
const finestraGestione = () => document.getElementById('modalGestioneTag');

export function apriGestioneTag() {
    const modale = finestraGestione();
    if (!modale) return;
    disegnaGestioneTag();
    modale.style.display = 'block';
}

export function chiudiGestioneTag() {
    const modale = finestraGestione();
    if (modale) modale.style.display = 'none';
}

export function disegnaGestioneTag() {
    const elenco = document.getElementById('elencoGestioneTag');
    if (!elenco) return;
    const usi = new Map(conteggioTag(stato.tuttiGliShow).map(({ id, conteggio }) => [id, conteggio]));

    if (stato.catalogoTag.length === 0) {
        elenco.innerHTML = `<p class="tag-vuoto">${escapeHtml(t('tags.empty'))}</p>`;
        return;
    }
    elenco.innerHTML = stato.catalogoTag.map(tag => {
        const id = escapeHtml(tag.id);
        const colori = COLORI_TAG.map(colore => `<button type="button" class="campione-colore tag-colore-${colore}${colore === tag.colore ? ' attivo' : ''}"
            title="${escapeHtml(t('tags.color'))}" aria-label="${escapeHtml(t('tags.color'))}" aria-pressed="${colore === tag.colore}"
            data-azione="colore-tag" data-id="${id}" data-colore="${colore}"></button>`).join('');
        return `<div class="riga-gestione-tag">
            ${etichettaTag(tag)}
            <input type="text" class="nome-gestione-tag" value="${escapeHtml(tag.nome)}" maxlength="${LUNGHEZZA_MASSIMA_NOME}"
                aria-label="${escapeHtml(t('tags.rename'))}" data-al-cambio="rinomina-tag" data-id="${id}">
            <span class="colori-tag">${colori}</span>
            <span class="uso-tag">${escapeHtml(testo('tags.usage', { n: usi.get(tag.id) || 0 }))}</span>
            <button type="button" class="btn-delete" title="${escapeHtml(t('tags.delete'))}" aria-label="${escapeHtml(t('tags.delete'))}"
                data-azione="elimina-tag" data-id="${id}"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    }).join('');
}

export async function creaTagDaGestione() {
    const campo = document.getElementById('nuovoTagGestione');
    if (!campo || !campo.value.trim()) return;
    try {
        if (trovaPerNome(campo.value.trim())) {
            alert(t('tags.duplicate'));
            return;
        }
        await creaTag(campo.value);
        campo.value = '';
        campo.focus();
    } catch (err) {
        logger.error('Creazione del tag non riuscita', err);
    }
}

export async function rinominaTag(campo) {
    const tag = tagDaId(campo.dataset.id);
    if (!tag) return;
    const nome = campo.value.trim().slice(0, LUNGHEZZA_MASSIMA_NOME);
    if (nome === tag.nome) return;
    const doppione = trovaPerNome(nome);
    if (!nome || (doppione && doppione.id !== tag.id)) {
        alert(t(nome ? 'tags.duplicate' : 'tags.empty_name'));
        campo.value = tag.nome;
        return;
    }
    try {
        await salvaCatalogoTag(ordinaCatalogo(stato.catalogoTag.map(x => x.id === tag.id ? { ...x, nome } : x)));
        logger.success('Tag rinominato');
    } catch (err) {
        campo.value = tag.nome;
        logger.error('Rinomina del tag non riuscita', err);
    }
}

export async function cambiaColoreTag(el) {
    const { id, colore } = el.dataset;
    if (!tagDaId(id) || !COLORI_TAG.includes(colore)) return;
    try {
        await salvaCatalogoTag(stato.catalogoTag.map(x => x.id === id ? { ...x, colore } : x));
    } catch (err) {
        logger.error('Cambio colore del tag non riuscito', err);
    }
}

export async function eliminaTag(el) {
    const tag = tagDaId(el.dataset.id);
    if (!tag) return;
    const usi = stato.tuttiGliShow.filter(s => (s.tag || []).includes(tag.id)).length;
    if (!confirm(testo('tags.confirm_delete', { nome: tag.nome, n: usi }))) return;
    try {
        const modificati = await eliminaTagDalCatalogo(tag.id);
        logger.success(`Tag eliminato (tolto da ${modificati} show)`);
    } catch (err) {
        logger.error('Eliminazione del tag non riuscita', err);
    }
}

// Invio nei campi "nuovo tag": crea il tag invece di inviare il form dello show
export function inizializzaTag() {
    const conInvio = (idCampo, azione) => document.getElementById(idCampo)?.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        azione();
    });
    conInvio('nuovoTagForm', creaTagDaForm);
    conInvio('nuovoTagGestione', creaTagDaGestione);
}
