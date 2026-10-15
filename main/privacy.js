// Preferenze di privacy (preferenze.json nella cartella dati), lette dal processo
// principale già all'avvio: il titolo e l'icona della finestra vanno decisi
// prima che l'interfaccia sia caricata.
//   aspettoNeutro  titolo "Agenda" e icona generica invece di nome e icona dell'app
//   pin            { sale, hash } del PIN di sblocco (scrypt), oppure null
//   bloccoMinuti   blocco automatico dopo N minuti di inattività (0 = mai)
//   livelloLog     cosa scrive il registro app.log: off, error, warn o info (main/log.js)
// Il PIN impedisce di usare l'app aperta: i file nella cartella dati non sono cifrati.
const crypto = require('crypto');
const { LIVELLI_LOG, LIVELLO_PREDEFINITO } = require('./log');

const TITOLO_APP = 'Private Diary';
const TITOLO_NEUTRO = 'Agenda';
const MINUTI_BLOCCO_CONSENTITI = [0, 5, 15, 30, 60];
const PREFERENZE_PREDEFINITE = Object.freeze({ aspettoNeutro: false, pin: null, bloccoMinuti: 0, livelloLog: LIVELLO_PREDEFINITO });

// Tentativi di sblocco: dopo MAX_TENTATIVI errori consecutivi si attende ATTESA_MS
const MAX_TENTATIVI = 5;
const ATTESA_MS = 30 * 1000;

const pinValido = (pin) => typeof pin === 'string' && /^\d{4,8}$/.test(pin);

function calcolaHashPin(pin, sale = crypto.randomBytes(16).toString('hex')) {
    return { sale, hash: crypto.scryptSync(pin, sale, 32).toString('hex') };
}

function pinCorretto(pin, salvato) {
    if (!salvato || !pinValido(pin)) return false;
    const atteso = Buffer.from(salvato.hash, 'hex');
    const calcolato = crypto.scryptSync(pin, salvato.sale, 32);
    return atteso.length === calcolato.length && crypto.timingSafeEqual(atteso, calcolato);
}

// Valori letti dal file portati a forma valida (campi mancanti o sbagliati -> predefiniti)
function normalizzaPreferenze(dati) {
    const p = dati && typeof dati === 'object' ? dati : {};
    const pin = p.pin && typeof p.pin.sale === 'string' && /^[0-9a-f]{64}$/.test(p.pin.hash || '') ? { sale: p.pin.sale, hash: p.pin.hash } : null;
    return {
        aspettoNeutro: p.aspettoNeutro === true,
        pin,
        // Senza PIN il blocco automatico non ha senso
        bloccoMinuti: pin && MINUTI_BLOCCO_CONSENTITI.includes(p.bloccoMinuti) ? p.bloccoMinuti : 0,
        livelloLog: LIVELLI_LOG.includes(p.livelloLog) ? p.livelloLog : LIVELLO_PREDEFINITO
    };
}

// Quello che l'interfaccia può sapere: mai il PIN né il suo hash
function preferenzePubbliche(preferenze) {
    return { aspettoNeutro: preferenze.aspettoNeutro, pinImpostato: Boolean(preferenze.pin), bloccoMinuti: preferenze.bloccoMinuti, livelloLog: preferenze.livelloLog };
}

// Conteggio dei tentativi errati: { registraErrore(), registraSuccesso(), attesaResidua(ora) }
function contatoreTentativi() {
    let errori = 0;
    let bloccatoFino = 0;
    return {
        attesaResidua: (ora = Date.now()) => Math.max(0, bloccatoFino - ora),
        registraErrore(ora = Date.now()) {
            errori++;
            if (errori >= MAX_TENTATIVI) {
                errori = 0;
                bloccatoFino = ora + ATTESA_MS;
            }
        },
        registraSuccesso() {
            errori = 0;
            bloccatoFino = 0;
        }
    };
}

module.exports = {
    TITOLO_APP, TITOLO_NEUTRO, MINUTI_BLOCCO_CONSENTITI, PREFERENZE_PREDEFINITE, MAX_TENTATIVI, ATTESA_MS,
    pinValido, calcolaHashPin, pinCorretto, normalizzaPreferenze, preferenzePubbliche, contatoreTentativi
};
