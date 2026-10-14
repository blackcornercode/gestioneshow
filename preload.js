const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Operazioni Dati & File System
    readData: () => ipcRenderer.invoke('read-data'),
    saveData: (data) => ipcRenderer.invoke('save-data', data),
    openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
    exportData: (impostazioni) => ipcRenderer.invoke('export-data', impostazioni),
    importData: () => ipcRenderer.invoke('import-data'),
    apriCsv: () => ipcRenderer.invoke('open-csv'),
    salvaCsv: (testo) => ipcRenderer.invoke('save-csv', testo),
    readTags: () => ipcRenderer.invoke('read-tags'),
    saveTags: (catalogo) => ipcRenderer.invoke('save-tags', catalogo),
    readSites: () => ipcRenderer.invoke('read-sites'),
    saveSites: (catalogo) => ipcRenderer.invoke('save-sites', catalogo),

    // Logging & Utility di Sistema
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    appendLog: (logData) => ipcRenderer.invoke('append-log', logData),

    // Gestione Changelog & Aggiornamenti
    getChangelog: () => ipcRenderer.invoke('get-changelog'),
    checkForUpdateChangelog: () => ipcRenderer.invoke('check-for-update-changelog'),

    // Connettori dei siti (main/connettori/): elenco con le capacità e funzioni per sito
    elencoConnettori: () => ipcRenderer.invoke('get-connectors'),
    importaTransazioni: (sito, opzioni) => ipcRenderer.invoke('connector-transactions', sito, opzioni),
    salvaCopiaImportazione: (sito, dump) => ipcRenderer.invoke('connector-save-dump', sito, dump),
    modelleOnline: (sito) => ipcRenderer.invoke('connector-online-models', sito),
    statoProfilo: (sito, urlProfilo) => ipcRenderer.invoke('connector-profile-status', sito, urlProfilo),
    fotoModella: (sito, urlProfilo) => ipcRenderer.invoke('connector-model-photos', sito, urlProfilo),
    pingSito: (sito) => ipcRenderer.invoke('connector-ping', sito),
    creditoSito: (sito) => ipcRenderer.invoke('connector-credit', sito),

    // Apertura Link Esterni
    openExternal: (url) => ipcRenderer.invoke('open-external', url),

    // Evento dal Menù di Sistema
    onOpenChangelog: (callback) => {
        const subscription = (event, ...args) => callback(...args);
        ipcRenderer.on('open-changelog-trigger', subscription);

        return () => {
            ipcRenderer.removeListener('open-changelog-trigger', subscription);
        };
    },

    // Privacy: preferenze, PIN di sblocco, riduzione a icona rapida
    leggiPreferenze: () => ipcRenderer.invoke('read-preferences'),
    salvaPreferenza: (chiave, valore) => ipcRenderer.invoke('save-preference', chiave, valore),
    impostaPin: (dati) => ipcRenderer.invoke('set-pin', dati),
    verificaPin: (pin) => ipcRenderer.invoke('verify-pin', pin),
    riduciFinestra: () => ipcRenderer.invoke('minimize-window')
});