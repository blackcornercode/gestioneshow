// Nomi dei canali IPC tra interfaccia e processo principale. preload.js gira in
// sandbox e non può importare questo file: la corrispondenza tra i canali usati
// in preload.js e quelli registrati qui è verificata da tests/canali-ipc.test.js.
module.exports = Object.freeze({
    // Dati e backup (ipc-dati.js)
    LEGGI_ARCHIVIO: 'read-data',
    SALVA_ARCHIVIO: 'save-data',
    ESPORTA_BACKUP: 'export-data',
    IMPORTA_BACKUP: 'import-data',
    APRI_CSV: 'open-csv',
    SALVA_CSV: 'save-csv',
    LEGGI_TAG: 'read-tags',
    SALVA_TAG: 'save-tags',
    LEGGI_SITI: 'read-sites',
    SALVA_SITI: 'save-sites',

    // Sistema, log e changelog (ipc-sistema.js)
    VERSIONE_APP: 'get-app-version',
    SCRIVI_LOG: 'append-log',
    APRI_CARTELLA_DATI: 'open-data-folder',
    APRI_LINK_ESTERNO: 'open-external',
    CHANGELOG: 'get-changelog',
    NOVITA_DA_MOSTRARE: 'check-for-update-changelog',

    // Connettori dei siti (ipc-connettori.js): il primo argomento è l'ID del sito
    ELENCO_CONNETTORI: 'get-connectors',
    IMPORTA_TRANSAZIONI: 'connector-transactions',
    SALVA_COPIA_IMPORTAZIONE: 'connector-save-dump',
    MODELLE_ONLINE: 'connector-online-models',
    STATO_PROFILO: 'connector-profile-status',
    FOTO_MODELLA: 'connector-model-photos',
    PING_SITO: 'connector-ping',
    CREDITO_SITO: 'connector-credit',

    // Privacy (ipc-privacy.js)
    LEGGI_PREFERENZE: 'read-preferences',
    SALVA_PREFERENZA: 'save-preference',
    IMPOSTA_PIN: 'set-pin',
    VERIFICA_PIN: 'verify-pin',
    RIDUCI_FINESTRA: 'minimize-window',

    // Evento dal menu dell'applicazione verso l'interfaccia (main.js)
    EVENTO_APRI_CHANGELOG: 'open-changelog-trigger'
});
