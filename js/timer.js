import { appBloccata } from './privacy.js';

/* ==========================================================================
   CONTROLLI PERIODICI (indicatore MCG, credito, modelle online, profili)
   ==========================================================================
   Con la finestra ridotta a icona o l'app bloccata dal PIN nessuno vede i
   risultati: i controlli vengono saltati, senza contattare i siti. Ogni
   controllo saltato viene eseguito una volta sola appena l'app torna visibile
   e sbloccata. Il blocco per inattività (privacy.js) non passa da qui. */

const inPausa = () => Boolean(document.hidden) || appBloccata();
const inAttesa = new Set();

// Come setInterval, ma in pausa mentre l'app è nascosta o bloccata
export function ripetiOgni(funzione, ms) {
    return setInterval(() => {
        if (inPausa()) inAttesa.add(funzione);
        else funzione();
    }, ms);
}

export function riprendiControlli() {
    if (inPausa() || inAttesa.size === 0) return;
    const daEseguire = [...inAttesa];
    inAttesa.clear();
    daEseguire.forEach(funzione => funzione());
}

document.addEventListener('visibilitychange', riprendiControlli);
// Lanciato da sblocca() (privacy.js)
document.addEventListener('app-sbloccata', riprendiControlli);
