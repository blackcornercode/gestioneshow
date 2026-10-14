import { chiaveModella, urlDelSito } from './calcoli.js';
import { logger } from './logger.js';
import { stato } from './stato.js';
import { sitoDaId } from './siti.js';

/* ==========================================================================
   CONNETTORI DEI SITI (lato interfaccia)
   ==========================================================================
   I connettori vivono nel processo principale (main/connettori/): qui arriva
   solo l'elenco dei siti che ne hanno uno, con le funzioni che offrono.
   Badge, galleria, indicatore e importazione automatica di un sito si usano
   solo se il sito è in uso e il suo connettore offre quella funzione.
   Le parti specifiche di un sito (es. l'indirizzo dei profili MCG) stanno in
   js/connettore-<id>.js. */

// Funzioni che un connettore può offrire (stessi nomi di main/connettori/index.js)
export const FUNZIONI = Object.freeze({
    TRANSAZIONI: 'transazioni',
    COPIA: 'copia',
    ONLINE: 'online',
    PROFILO: 'profilo',
    FOTO: 'foto',
    PING: 'ping',
    CREDITO: 'credito'
});

// Da chiamare all'avvio, prima di indicatore, stato online e profili sospesi
export async function caricaConnettori() {
    try {
        const elenco = await window.electronAPI?.elencoConnettori?.();
        stato.connettori = Object.fromEntries((Array.isArray(elenco) ? elenco : []).map(c => [c.id, c.capacita]));
    } catch (err) {
        logger.warn('Elenco dei connettori non disponibile', err.message);
        stato.connettori = {};
    }
}

// Profilo della modella su un sito (ultimo indirizzo salvato negli show di quel sito), '' se manca
export function urlProfiloSulSito(nome, sito) {
    return stato.mappaUrlPerSito[chiaveModella(nome)]?.[sito] || '';
}

// Profili di tutte le modelle su un sito { chiave: url }
export function urlModelleDelSito(sito) {
    return urlDelSito(stato.mappaUrlPerSito, sito);
}

// Il sito è in uso (o il catalogo non è ancora caricato) e il suo connettore offre la funzione?
export function funzioneDisponibile(sito, funzione) {
    const voce = sitoDaId(sito);
    const inUso = stato.catalogoSiti.length === 0 || !voce || voce.attivo !== false;
    return inUso && (stato.connettori[sito] || []).includes(funzione);
}
