import { t, formattaData } from './i18n.js';
import { logger } from './logger.js';
import { stato } from './stato.js';
import { slugProfiloMcg } from './connettore-mcg.js';
import { escapeHtml } from './utils.js';
import { SITO_MCG } from './siti.js';
import { funzioneDisponibile, urlProfiloSulSito, urlModelleDelSito, FUNZIONI } from './connettori.js';
import { ripetiOgni } from './timer.js';

/* ==========================================================================
   PROFILI SOSPESI O RIMOSSI SU MONDO CAM GIRLS
   ==========================================================================
   MCG non segnala la sospensione nell'elenco delle modelle: va letta la pagina
   di ogni profilo (funzione "profilo" del connettore MCG, che cerca l'avviso "PROFILE TEMPORARYLY
   SUSPENDED"). Un profilo eliminato non ha più il suo sottodominio: risulta "rimosso". Le pagine sono pesanti, quindi l'esito di ogni profilo resta
   valido per VALIDITA_MS e viene conservato in localStorage: a ogni avvio si
   riscaricano solo i profili non verificati di recente. È solo una cache:
   se va persa, i profili vengono semplicemente verificati di nuovo. */
const CHIAVE_CACHE = 'profiliSospesiMcg';
const VALIDITA_MS = 12 * 60 * 60 * 1000;
const IN_PARALLELO = 3;
export const INTERVALLO_VERIFICA_MS = 60 * 60 * 1000;

// sottodominio del profilo -> { sospeso: boolean, rimosso: boolean, verificato: millisecondi }
let profili = leggiCache();
let verificaInCorso = false;

function leggiCache() {
    try {
        const salvati = JSON.parse(localStorage.getItem(CHIAVE_CACHE) || '{}');
        return salvati && typeof salvati === 'object' ? salvati : {};
    } catch {
        return {};
    }
}

function salvaCache() {
    try {
        localStorage.setItem(CHIAVE_CACHE, JSON.stringify(profili));
    } catch { /* cache non disponibile: si riverificherà al prossimo avvio */ }
}

const slugDellaModella = (nome) => slugProfiloMcg(urlProfiloSulSito(nome, SITO_MCG));

export function eModellaSospesa(nome) {
    const slug = slugDellaModella(nome);
    return Boolean(slug && profili[slug]?.sospeso);
}

// Badge "Sospesa" o "Rimossa" da mettere accanto al nome; stringa vuota se il
// profilo è attivo o non ancora verificato
export function badgeSospesa(nome) {
    const slug = slugDellaModella(nome);
    const esito = slug && profili[slug];
    if (!esito || !(esito.sospeso || esito.rimosso)) return '';
    const data = formattaData(new Date(esito.verificato), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const tipo = esito.rimosso ? 'removed' : 'tooltip';
    const titolo = t(`suspended.${tipo}`).replace('{data}', data);
    const [classe, testo] = esito.rimosso ? ['badge-sospesa badge-rimossa', t('suspended.badge_removed')] : ['badge-sospesa', t('suspended.badge')];
    return ` <span class="${classe}" title="${escapeHtml(titolo)}">${escapeHtml(testo)}</span>`;
}

// Profili da verificare: uno per sottodominio, saltando quelli verificati di recente
export function profiliDaVerificare(mappaUrl, cache, adesso = Date.now()) {
    const daVerificare = new Map();
    Object.values(mappaUrl).forEach(url => {
        const slug = slugProfiloMcg(url);
        if (!slug || daVerificare.has(slug)) return;
        const esito = cache[slug];
        if (esito && adesso - esito.verificato < VALIDITA_MS) return;
        daVerificare.set(slug, `https://${slug}.mondocamgirls.com`);
    });
    return daVerificare;
}

export async function verificaProfiliSospesi() {
    if (verificaInCorso || !window.electronAPI?.statoProfilo || !funzioneDisponibile(SITO_MCG, FUNZIONI.PROFILO)) return;
    const coda = [...profiliDaVerificare(urlModelleDelSito(SITO_MCG), profili)];
    if (coda.length === 0) return;

    verificaInCorso = true;
    let verificati = 0;
    const lavoratore = async () => {
        while (coda.length) {
            const [slug, url] = coda.shift();
            try {
                const esito = await window.electronAPI.statoProfilo(SITO_MCG, url);
                // Profilo non riconosciuto (pagina non scaricata o cambiata): l'esito precedente resta
                if (esito?.success) {
                    profili[slug] = { sospeso: esito.sospeso, rimosso: Boolean(esito.rimosso), verificato: Date.now() };
                    verificati++;
                }
            } catch (err) {
                logger.warn(`Verifica del profilo ${slug} non riuscita`, err.message);
            }
        }
    };
    try {
        await Promise.all(Array.from({ length: IN_PARALLELO }, lavoratore));
        salvaCache();
        const elenco = (campo) => Object.entries(profili).filter(([, e]) => e[campo]).map(([slug]) => slug).join(', ') || 'nessuno';
        logger.info(`Profili MCG verificati: ${verificati}. Sospesi: ${elenco('sospeso')}. Rimossi: ${elenco('rimosso')}`);
        // Classifica e scheda modella si aggiornano ascoltando questo evento (app.js)
        document.dispatchEvent(new CustomEvent('profili-sospesi-aggiornati'));
    } finally {
        verificaInCorso = false;
    }
}

export function inizializzaProfiliSospesi() {
    // La prima verifica parte da ridisegnaViste, quando l'archivio è caricato;
    // qui si ricontrollano ogni ora i profili il cui esito è scaduto
    ripetiOgni(verificaProfiliSospesi, INTERVALLO_VERIFICA_MS);
}
