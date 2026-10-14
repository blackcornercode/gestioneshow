import { t, localeCorrente } from './i18n.js';
import { logger } from './logger.js';
import { SITO_MCG } from './siti.js';
import { funzioneDisponibile, FUNZIONI } from './connettori.js';

/* ==========================================================================
   CREDITO RESIDUO SU MONDO CAM GIRLS
   ==========================================================================
   Il credito sta nell'area clienti, visibile solo dopo il login. Viene letto:
   - a ogni sincronizzazione, a login appena fatto (sincronizzazione.js);
   - all'avvio, ogni INTERVALLO_CREDITO_MS e al clic sul badge, senza aprire
     finestre, con i cookie del login salvato (funzione "credito" del connettore).
   Se MCG chiede di nuovo il login resta l'ultimo valore letto, con la sua data.
   L'ultimo valore è conservato in localStorage per mostrarlo subito all'avvio. */
export const INTERVALLO_CREDITO_MS = 15 * 60 * 1000;
const CHIAVE = 'creditoMcg';

let ultimo = leggiSalvato();      // { valore, letto } o null
let loginRichiesto = false;
let inCorso = false;

function leggiSalvato() {
    try {
        const dati = JSON.parse(localStorage.getItem(CHIAVE) || 'null');
        return dati && Number.isFinite(dati.valore) ? dati : null;
    } catch {
        return null;
    }
}

// Esito della funzione "credito" del connettore (anche quello letto durante la sincronizzazione)
export function registraCredito(esito) {
    if (!esito) return;
    if (esito.success && Number.isFinite(esito.credito)) {
        ultimo = { valore: esito.credito, letto: esito.letto || new Date().toISOString() };
        loginRichiesto = false;
        try { localStorage.setItem(CHIAVE, JSON.stringify(ultimo)); } catch { /* resta in memoria */ }
        logger.info(`Credito MCG: € ${ultimo.valore.toFixed(2)}`);
    } else {
        loginRichiesto = Boolean(esito.loginRichiesto);
        logger.warn('Credito MCG non letto', esito.error || '');
    }
    aggiornaTestoCredito();
}

export function aggiornaTestoCredito() {
    const badge = document.getElementById('creditoMcg');
    const valore = document.getElementById('creditoMcgValore');
    if (!badge || !valore) return;
    // Visibile se MCG è in uso e c'è qualcosa da mostrare (un valore o l'invito ad accedere)
    badge.hidden = !funzioneDisponibile(SITO_MCG, FUNZIONI.CREDITO) || (!ultimo && !loginRichiesto);
    valore.textContent = ultimo ? `€ ${ultimo.valore.toFixed(2)}` : '–';
    badge.classList.toggle('credito-da-aggiornare', loginRichiesto);
    const quando = ultimo ? new Date(ultimo.letto).toLocaleString(localeCorrente(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
    const righe = [];
    if (ultimo) righe.push(t('credit.tip').replace('{data}', quando));
    if (loginRichiesto) righe.push(t('credit.login_needed'));
    righe.push(t('credit.click'));
    badge.title = righe.join('\n');
}

export async function aggiornaCredito() {
    if (inCorso || !window.electronAPI?.creditoSito || !funzioneDisponibile(SITO_MCG, FUNZIONI.CREDITO)) return;
    inCorso = true;
    document.getElementById('creditoMcg')?.classList.add('in-aggiornamento');
    try {
        registraCredito(await window.electronAPI.creditoSito(SITO_MCG));
    } catch (err) {
        logger.warn('Errore nella lettura del credito MCG', err.message);
    } finally {
        inCorso = false;
        document.getElementById('creditoMcg')?.classList.remove('in-aggiornamento');
    }
}

export function inizializzaCredito() {
    aggiornaTestoCredito();
    aggiornaCredito();
    setInterval(aggiornaCredito, INTERVALLO_CREDITO_MS);
}
