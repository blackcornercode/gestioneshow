// Log dell'applicazione (userData/app.log): una riga per evento, in ordine
// cronologico (le più recenti in fondo). Ogni riga viene aggiunta in coda al file;
// oltre DIMENSIONE_MAX il file diventa app.log.1 e se ne inizia uno nuovo.
// Prima ogni riga rileggeva e riscriveva l'intero file per metterla in cima.
const fs = require('fs').promises;

const DIMENSIONE_MAX = 1024 * 1024; // 1 MB
const LUNGHEZZA_MAX_MESSAGGIO = 1000;
const LUNGHEZZA_MAX_DETTAGLI = 4000;

// Gravità dei livelli. SUCCESS dell'interfaccia vale come INFO. Il livello scelto
// nelle impostazioni è la soglia: si scrivono i messaggi di quella gravità o superiore.
// AVVIO (riga con la versione) si scrive a qualsiasi livello, tranne "Niente".
const GRAVITA = Object.freeze({ INFO: 1, SUCCESS: 1, WARN: 2, ERROR: 3, AVVIO: 3 });
const LIVELLI_LOG = Object.freeze(['off', 'error', 'warn', 'info']);
const LIVELLO_PREDEFINITO = 'warn';
const SOGLIA = Object.freeze({ off: Infinity, error: 3, warn: 2, info: 1 });

let livelloAttivo = LIVELLO_PREDEFINITO;

const livelloValido = (livello) => LIVELLI_LOG.includes(livello);

function impostaLivello(livello) {
    livelloAttivo = livelloValido(livello) ? livello : LIVELLO_PREDEFINITO;
}

// Livelli sconosciuti (dall'interfaccia può arrivare qualsiasi stringa) diventano INFO
function normalizzaLivello(livello) {
    const maiuscolo = String(livello || '').toUpperCase();
    return maiuscolo in GRAVITA ? maiuscolo : 'INFO';
}

const eAmmesso = (livello, soglia = livelloAttivo) => GRAVITA[normalizzaLivello(livello)] >= SOGLIA[soglia];

// Una riga di log non deve poter contenere a capo (righe false) né essere enorme
function sanifica(testo, massimo) {
    const pulito = String(testo ?? '').replace(/[\r\n\u2028\u2029]+/g, ' ').trim();
    return pulito.length > massimo ? `${pulito.slice(0, massimo)}…` : pulito;
}

function formattaRiga(livello, messaggio, dettagli = '', data = new Date()) {
    const testoDettagli = sanifica(dettagli, LUNGHEZZA_MAX_DETTAGLI);
    return `[${data.toISOString()}] [${normalizzaLivello(livello)}] ${sanifica(messaggio, LUNGHEZZA_MAX_MESSAGGIO)}${testoDettagli ? ` - ${testoDettagli}` : ''}\n`;
}

// Le scritture sono messe in coda: due log ravvicinati non si sovrascrivono a vicenda
let coda = Promise.resolve();
// Dimensione del file corrente, letta una volta sola e poi aggiornata a ogni riga
let dimensioneFile = null;

async function ruotaSeNecessario() {
    const percorsi = require('./percorsi');
    if (dimensioneFile === null) {
        try {
            dimensioneFile = (await fs.stat(percorsi.log)).size;
        } catch {
            dimensioneFile = 0; // Il file non esiste ancora: verrà creato alla prima scrittura
        }
    }
    if (dimensioneFile <= DIMENSIONE_MAX) return;
    try {
        await fs.rename(percorsi.log, percorsi.logPrecedente);
    } catch {
        // Su Windows la rinomina può fallire se un altro programma tiene aperto il file
        // (o se il vecchio esiste ed è bloccato): si svuota il file, per non farlo crescere all'infinito
        await fs.writeFile(percorsi.log, '', 'utf8');
    }
    dimensioneFile = 0;
}

async function scriviRiga(riga) {
    try {
        await ruotaSeNecessario();
        await fs.appendFile(require('./percorsi').log, riga, 'utf8');
        dimensioneFile += Buffer.byteLength(riga);
    } catch (err) {
        console.error('Errore scrittura log:', err);
    }
}

function logToFile(livello, messaggio, dettagli = '') {
    if (!eAmmesso(livello)) return Promise.resolve();
    const riga = formattaRiga(livello, messaggio, dettagli);
    coda = coda.then(() => scriviRiga(riga));
    return coda;
}

// Cancella il log corrente e quello precedente
function cancellaLog() {
    coda = coda.then(async () => {
        const percorsi = require('./percorsi');
        for (const file of [percorsi.log, percorsi.logPrecedente]) {
            try {
                await fs.unlink(file);
            } catch (err) {
                if (err.code !== 'ENOENT') throw err;
            }
        }
        dimensioneFile = 0;
    });
    return coda;
}

// Conversione una tantum dei log scritti dalle versioni precedenti, che avevano
// le righe più recenti in cima: si riordinano dalla più vecchia alla più recente
async function convertiLogVecchioFormato() {
    try {
        const righe = (await fs.readFile(require('./percorsi').log, 'utf8')).split('\n').filter(Boolean);
        const data = r => (/^\[([^\]]+)\]/.exec(r) || [])[1] || '';
        if (righe.length > 1 && data(righe[0]) > data(righe[righe.length - 1])) {
            await fs.writeFile(require('./percorsi').log, righe.reverse().join('\n') + '\n', 'utf8');
        }
    } catch {
        // Nessun log esistente: niente da convertire
    }
}

module.exports = {
    logToFile, convertiLogVecchioFormato, cancellaLog, impostaLivello, livelloValido, eAmmesso, formattaRiga, sanifica,
    LIVELLI_LOG, LIVELLO_PREDEFINITO
};
