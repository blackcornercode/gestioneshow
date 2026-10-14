// Gestori IPC generici dei connettori (main/connettori/): l'interfaccia indica
// il sito e la funzione, qui si sceglie il connettore. Un sito senza connettore
// o senza quella capacità riceve { success: false } invece di un'eccezione.
const { ipcMain } = require('electron');
const canali = require('./canali');
const { elencoConnettori, gestore } = require('./connettori');

function esegui(sito, capacita, ...argomenti) {
    const funzione = gestore(sito, capacita);
    if (!funzione) return { success: false, error: `il sito "${sito}" non supporta la funzione "${capacita}"` };
    return funzione(...argomenti);
}

function registra() {
    ipcMain.handle(canali.ELENCO_CONNETTORI, () => elencoConnettori());
    ipcMain.handle(canali.IMPORTA_TRANSAZIONI, (event, sito, opzioni) => esegui(sito, 'transazioni', opzioni));
    ipcMain.handle(canali.SALVA_COPIA_IMPORTAZIONE, (event, sito, dump) => esegui(sito, 'copia', dump));
    ipcMain.handle(canali.MODELLE_ONLINE, (event, sito) => esegui(sito, 'online'));
    ipcMain.handle(canali.STATO_PROFILO, (event, sito, urlProfilo) => esegui(sito, 'profilo', urlProfilo));
    ipcMain.handle(canali.FOTO_MODELLA, (event, sito, urlProfilo) => esegui(sito, 'foto', urlProfilo));
    ipcMain.handle(canali.PING_SITO, (event, sito) => esegui(sito, 'ping'));
    ipcMain.handle(canali.CREDITO_SITO, (event, sito) => esegui(sito, 'credito'));
}

module.exports = { registra, esegui };
