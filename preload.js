const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Operazioni Dati & File System
    readData: () => ipcRenderer.invoke('read-data'),
    saveData: (data) => ipcRenderer.invoke('save-data', data),
    openDataFolder: () => ipcRenderer.invoke('open-data-folder'),
    exportData: () => ipcRenderer.invoke('export-data'),
    importData: () => ipcRenderer.invoke('import-data'),

    // Logging & Utility di Sistema
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    appendLog: (logData) => ipcRenderer.invoke('append-log', logData),
    relaunchApp: () => ipcRenderer.invoke('relaunch-app'),

    // Gestione Changelog & Aggiornamenti
    getChangelog: () => ipcRenderer.invoke('get-changelog'),
    getChangelogData: () => ipcRenderer.invoke('get-changelog-data'),
    checkForUpdateChangelog: () => ipcRenderer.invoke('check-for-update-changelog'),

    // Web Scraping & Status Online
    fetchTransazioniHtml: (url) => ipcRenderer.invoke('fetch-transazioni-html', url),
    checkModelOnlineStatus: (url) => ipcRenderer.invoke('check-model-online-status', url),
    fetchModellaFoto: (urlProfilo) => ipcRenderer.invoke('fetch-modella-foto', urlProfilo),

    // Apertura Link Esterni
    openExternal: (url) => ipcRenderer.invoke('open-external', url),

    // Evento dal Menù di Sistema
    onOpenChangelog: (callback) => {
        const subscription = (event, ...args) => callback(...args);
        ipcRenderer.on('open-changelog-trigger', subscription);

        return () => {
            ipcRenderer.removeListener('open-changelog-trigger', subscription);
        };
    }
});