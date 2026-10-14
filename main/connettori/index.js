// Registro dei connettori: un modulo per ogni sito che l'app sa contattare in
// automatico. Ogni connettore esporta { id, capacita }, dove id è l'ID del sito
// nel catalogo (siti.json) e capacita associa a ogni funzione offerta il gestore:
//   transazioni(opzioni)  legge la cronologia degli acquisti -> { pagine, ... } o null
//   copia(dump)           salva in locale la copia diagnostica dell'importazione
//   online()              profili online -> { success, slug: [...], aggiornato }
//   profilo(url)          stato del profilo -> { success, sospeso, rimosso }
//   foto(url)             foto pubbliche del profilo -> { success, images }
//   ping()                raggiungibilità del sito -> { online, status?, error? }
//   credito()             credito residuo sul sito (serve il login) -> { success, credito, letto } o { success: false, loginRichiesto }
// L'interfaccia chiede l'elenco con le capacità (ipc-connettori.js) e mostra
// badge, galleria e indicatori solo per i siti che le supportano.
// Per aggiungere un sito: creare main/connettori/<id>/index.js e registrarlo qui.
const mcg = require('./mcg');

const CONNETTORI = Object.freeze({ [mcg.id]: mcg });

function connettore(sito) {
    return Object.hasOwn(CONNETTORI, sito) ? CONNETTORI[sito] : null;
}

// [{ id, capacita: ['transazioni', 'online', ...] }]
function elencoConnettori() {
    return Object.values(CONNETTORI).map(c => ({ id: c.id, capacita: Object.keys(c.capacita) }));
}

// Gestore della capacità richiesta, o null se il sito non ha un connettore che la offre
function gestore(sito, capacita) {
    const c = connettore(sito);
    return c && Object.hasOwn(c.capacita, capacita) ? c.capacita[capacita] : null;
}

module.exports = { connettore, elencoConnettori, gestore };
