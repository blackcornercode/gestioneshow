import { modificaShow } from './form-show.js';
import { trovaShow } from './archivio.js';
import { t } from './i18n.js';
import { logger } from './logger.js';

/* ==========================================================================
   TESTO DELLA RECENSIONE
   ==========================================================================
   Il testo si scrive a mano nel form (campo testoRecensione dello show, anche
   con l'interruttore spento) e si legge qui, in una finestra di sola lettura
   aperta dal pulsante a fumetto della colonna Recensione. Nessun invio a MCG. */

const el = (id) => document.getElementById(id);

// Show di cui si sta leggendo la recensione
let idCorrente = null;

export function apriRecensione(pulsante) {
    const show = trovaShow(pulsante.dataset.id);
    if (!show || !show.testoRecensione) return;
    idCorrente = show.id;
    el('titoloRecensione').textContent = `${t('review.title')} · ${show.nome} · ${(show.dataFormattata || '').split(' ')[0]}`;
    // textContent: il testo scritto dall'utente non è mai interpretato come HTML
    el('testoRecensioneLettura').textContent = show.testoRecensione;
    el('btnCopiaRecensione').textContent = t('review.copy');
    el('modalRecensione').style.display = 'block';
}

export function chiudiRecensione() {
    const modal = el('modalRecensione');
    if (modal) modal.style.display = 'none';
}

export async function copiaRecensione() {
    const show = trovaShow(idCorrente);
    if (!show) return;
    try {
        await navigator.clipboard.writeText(show.testoRecensione);
        el('btnCopiaRecensione').textContent = t('review.copied');
    } catch (err) {
        logger.warn('Recensione non copiata negli appunti', err?.message);
        alert(t('review.not_copied'));
    }
}

// Apre lo show nel form di modifica, sopra le finestre eventualmente aperte
export function modificaDaRecensione() {
    const id = idCorrente;
    chiudiRecensione();
    const scheda = el('modalModella');
    if (scheda) scheda.style.display = 'none';
    if (id !== null) modificaShow(id);
}
