import { stessoInsieme } from './calcoli.js';
import { t, formattaData } from './i18n.js';
import { logger } from './logger.js';
import { stato } from './stato.js';
import { escapeHtml } from './utils.js';
import { SITO_MCG } from './siti.js';
import { funzioneDisponibile, urlProfiloSulSito, FUNZIONI } from './connettori.js';
import { slugProfiloMcg } from './connettore-mcg.js';
import { ripetiOgni } from './timer.js';

/* ==========================================================================
   MODELLE ONLINE SU MONDO CAM GIRLS
   ==========================================================================
   L'elenco delle modelle online arriva dal connettore MCG (funzione "online")
   come insieme di sottodomini dei profili (https://<slug>.mondocamgirls.com).
   Una modella risulta online se il sottodominio del suo profilo è nell'elenco. */
export const INTERVALLO_ONLINE_MS = 3 * 60 * 1000;

export let slugModelleOnline = null;      // Set dei profili online; null = stato non ancora noto
export let oraAggiornamentoOnline = null; // Date dell'ultimo aggiornamento riuscito

// true/false se lo stato è noto, null se non verificabile (stato non ancora letto
// o modella senza indirizzo del profilo MCG)
export function eModellaOnline(nome) {
    if (!slugModelleOnline) return null;
    const slug = slugProfiloMcg(urlProfiloSulSito(nome, SITO_MCG));
    return slug ? slugModelleOnline.has(slug) : null;
}

// Tooltip di badge e pallino: "online adesso (verificato alle hh:mm)"
function titoloOnline() {
    const ora = oraAggiornamentoOnline ? formattaData(oraAggiornamentoOnline, { hour: '2-digit', minute: '2-digit' }) : '';
    return t('online.tooltip').replace('{ora}', ora);
}

// Badge "Online" da mettere accanto al nome; stringa vuota se non è online
export function badgeOnline(nome) {
    if (eModellaOnline(nome) !== true) return '';
    return ` <span class="badge-online" title="${escapeHtml(titoloOnline())}">${escapeHtml(t('online.badge'))}</span>`;
}

// Pallino verde da mettere dopo il nome nelle tabelle; stringa vuota se non è online
export function pallinoOnline(nome) {
    if (eModellaOnline(nome) !== true) return '';
    return ` <span class="pallino-online" role="img" title="${escapeHtml(titoloOnline())}" aria-label="${escapeHtml(t('online.badge'))}"></span>`;
}

export async function aggiornaStatoOnline() {
    if (!window.electronAPI?.modelleOnline || !funzioneDisponibile(SITO_MCG, FUNZIONI.ONLINE)) return;
    try {
        const esito = await window.electronAPI.modelleOnline(SITO_MCG);
        if (!esito || !esito.success) {
            logger.warn('Stato online delle modelle non disponibile', esito && esito.error);
            return;
        }
        const nuovi = new Set(esito.slug);
        const invariati = stessoInsieme(slugModelleOnline, nuovi);
        slugModelleOnline = nuovi;
        oraAggiornamentoOnline = new Date(esito.aggiornato);
        if (invariati) {
            // Stesse modelle online: niente ridisegno delle tabelle, solo l'ora nei tooltip
            const titolo = titoloOnline();
            document.querySelectorAll('.badge-online, .pallino-online').forEach(elemento => { elemento.title = titolo; });
            return;
        }
        // Classifica e scheda modella si aggiornano ascoltando questo evento (app.js)
        document.dispatchEvent(new CustomEvent('modelle-online-aggiornate'));
    } catch (err) {
        logger.warn('Errore nel controllo delle modelle online', err.message);
    }
}

export function inizializzaStatoOnline() {
    aggiornaStatoOnline();
    ripetiOgni(aggiornaStatoOnline, INTERVALLO_ONLINE_MS);
}
