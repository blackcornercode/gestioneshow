// Gestori IPC della privacy: preferenze (aspetto neutro, blocco automatico, livello del registro),
// PIN di sblocco e riduzione a icona rapida. Le preferenze stanno in
// preferenze.json (main/privacy.js) e vengono lette in modo sincrono all'avvio,
// prima di creare le finestre.
const { ipcMain, nativeImage } = require('electron');
const fsSync = require('fs');
const path = require('path');
const canali = require('./canali');
const percorsi = require('./percorsi');
const { scriviFileAtomico } = require('./file');
const { logToFile, impostaLivello, livelloValido } = require('./log');
const {
    TITOLO_APP, TITOLO_NEUTRO, MINUTI_BLOCCO_CONSENTITI,
    pinValido, calcolaHashPin, pinCorretto, normalizzaPreferenze, preferenzePubbliche, contatoreTentativi
} = require('./privacy');

const ICONA_APP = path.join(__dirname, '..', 'icon.ico');
const ICONA_NEUTRA = path.join(__dirname, '..', 'icon-neutra.png');

let preferenze = normalizzaPreferenze({});
const tentativi = contatoreTentativi();

function caricaPreferenze() {
    try {
        preferenze = normalizzaPreferenze(JSON.parse(fsSync.readFileSync(percorsi.preferenze, 'utf8')));
    } catch (err) {
        if (err.code !== 'ENOENT') logToFile('WARN', 'Preferenze di privacy illeggibili, uso i valori predefiniti', err.message);
        preferenze = normalizzaPreferenze({});
    }
    impostaLivello(preferenze.livelloLog);
    return preferenze;
}

const salvaPreferenze = () => scriviFileAtomico(percorsi.preferenze, JSON.stringify(preferenze, null, 2));

// Nascondendo l'app con il tasto rapido il nome e l'icona neutri valgono anche se
// l'opzione è spenta: fino alla riapertura della finestra o, con un PIN, fino allo sblocco
let neutroTemporaneo = false;

const aspettoNeutro = () => preferenze.aspettoNeutro;
const neutroAttivo = () => preferenze.aspettoNeutro || neutroTemporaneo;
const titoloFinestra = () => (neutroAttivo() ? TITOLO_NEUTRO : TITOLO_APP);
const iconaFinestra = () => (neutroAttivo() ? ICONA_NEUTRA : ICONA_APP);

// Titolo e icona della finestra (barra delle applicazioni, Alt+Tab)
function applicaAspetto(finestra) {
    if (!finestra || finestra.isDestroyed()) return;
    finestra.setTitle(titoloFinestra());
    const icona = nativeImage.createFromPath(iconaFinestra());
    if (!icona.isEmpty()) finestra.setIcon(icona);
}

function fineNeutroTemporaneo(finestra) {
    if (!neutroTemporaneo) return;
    neutroTemporaneo = false;
    applicaAspetto(finestra);
}

function registra({ finestraPrincipale }) {
    ipcMain.handle(canali.LEGGI_PREFERENZE, () => preferenzePubbliche(preferenze));

    ipcMain.handle(canali.SALVA_PREFERENZA, async (event, chiave, valore) => {
        if (chiave === 'aspettoNeutro' && typeof valore === 'boolean') {
            preferenze.aspettoNeutro = valore;
        } else if (chiave === 'bloccoMinuti' && MINUTI_BLOCCO_CONSENTITI.includes(valore) && preferenze.pin) {
            preferenze.bloccoMinuti = valore;
        } else if (chiave === 'livelloLog' && livelloValido(valore)) {
            preferenze.livelloLog = valore;
            impostaLivello(valore);
        } else {
            return { success: false, error: 'Preferenza non valida' };
        }
        try {
            await salvaPreferenze();
        } catch (err) {
            return { success: false, error: err.message };
        }
        applicaAspetto(finestraPrincipale());
        return { success: true, preferenze: preferenzePubbliche(preferenze) };
    });

    // Imposta, cambia o (con nuovo = '') rimuove il PIN. Se ne esiste già uno va confermato.
    ipcMain.handle(canali.IMPOSTA_PIN, async (event, { attuale = '', nuovo = '' } = {}) => {
        if (preferenze.pin) {
            const attesaMs = tentativi.attesaResidua();
            if (attesaMs > 0) return { success: false, error: 'attesa', attesaMs };
            if (!pinCorretto(attuale, preferenze.pin)) {
                tentativi.registraErrore();
                return { success: false, error: 'pin_errato', attesaMs: tentativi.attesaResidua() };
            }
            tentativi.registraSuccesso();
        }
        if (nuovo === '') {
            preferenze.pin = null;
            preferenze.bloccoMinuti = 0;
        } else if (pinValido(nuovo)) {
            preferenze.pin = calcolaHashPin(nuovo);
        } else {
            return { success: false, error: 'pin_non_valido' };
        }
        try {
            await salvaPreferenze();
        } catch (err) {
            return { success: false, error: err.message };
        }
        await logToFile('INFO', nuovo === '' ? 'PIN di sblocco rimosso' : 'PIN di sblocco impostato');
        return { success: true, preferenze: preferenzePubbliche(preferenze) };
    });

    ipcMain.handle(canali.VERIFICA_PIN, (event, pin) => {
        const attesaMs = tentativi.attesaResidua();
        if (attesaMs > 0) return { success: false, attesaMs };
        if (pinCorretto(pin, preferenze.pin)) {
            tentativi.registraSuccesso();
            fineNeutroTemporaneo(finestraPrincipale());
            return { success: true };
        }
        tentativi.registraErrore();
        return { success: false, attesaMs: tentativi.attesaResidua() };
    });

    // Tasto rapido "nascondi": nome e icona neutri e riduzione a icona
    ipcMain.handle(canali.RIDUCI_FINESTRA, () => {
        const finestra = finestraPrincipale();
        if (!finestra || finestra.isDestroyed()) return;
        if (!preferenze.aspettoNeutro && !neutroTemporaneo) {
            neutroTemporaneo = true;
            applicaAspetto(finestra);
            // Senza PIN tornano nome e icona veri appena la finestra viene riaperta;
            // con il PIN dopo lo sblocco (VERIFICA_PIN), perché la schermata di blocco resti anonima
            finestra.once('restore', () => { if (!preferenze.pin) fineNeutroTemporaneo(finestra); });
        }
        finestra.minimize();
    });
}

module.exports = { registra, caricaPreferenze, aspettoNeutro, titoloFinestra, iconaFinestra, applicaAspetto };
