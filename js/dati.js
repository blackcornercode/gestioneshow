/* ==========================================================================
   CARICAMENTO DATI E AGGIORNAMENTO INTERFACCIA
   ========================================================================== */
async function aggiornaInterfaccia() {
    try {
        tuttiGliShow = await window.electronAPI.readData();
        tuttiGliShow.forEach(s => {
            const idNum = Number(s.id);
            if (Number.isFinite(idNum) && idNum > ultimoIdGenerato) ultimoIdGenerato = idNum;
        });
        logger.info(`Dati letti. Totale show caricati: ${tuttiGliShow.length}`);

        aggiornaMappeModelle(tuttiGliShow);
        aggiornaDatalistModelle(tuttiGliShow);
        inizializzaFiltroAnni(tuttiGliShow);
        popolaSelettoreAnni(tuttiGliShow);
        
        caricaCronologia(tuttiGliShow);
        caricaStatisticheMensili(tuttiGliShow);
        caricaMedieEStoricizzazione(tuttiGliShow);
        // Mantiene l'eventuale ricerca attiva nella classifica
        filtraClassificaModelle();

        aggiornaIndicatoreBudgetHomepage(tuttiGliShow);
    } catch (err) {
        logger.error("Errore durante l'aggiornamento dell'interfaccia", err);
        alert(`❌ Impossibile caricare i dati: ${err.message}`);
    }
}

function aggiornaMappeModelle(shows) {
    mappaImmaginiModelle = {};
    mappaUrlModelle = {};
    const showsOrdinatiPerData = [...shows].sort((a, b) => timestampShow(a) - timestampShow(b));
    
    showsOrdinatiPerData.forEach(show => {
        if (show.nome) {
            const chiave = show.nome.trim().toLowerCase();
            if (show.immagine) mappaImmaginiModelle[chiave] = show.immagine;
            if (show.urlProfilo || show.url) mappaUrlModelle[chiave] = show.urlProfilo || show.url;
        }
    });
}

/* ==========================================================================
   ESPORTAZIONE E IMPORTAZIONE BACKUP
   ========================================================================== */
async function esportaDati() {
    try {
        if (window.electronAPI && window.electronAPI.exportData) {
            // Il budget sta in localStorage: va passato perché finisca nel backup
            const impostazioni = { monthly_budget: localStorage.getItem('monthly_budget') || '' };
            const esito = await window.electronAPI.exportData(impostazioni);
            if (esito && esito.success) {
                logger.success("Dati esportati con successo.");
            } else if (esito && !esito.cancelled) {
                logger.error("Esportazione non riuscita", esito.error);
                alert(`❌ Esportazione non riuscita: ${esito.error}`);
            }
        }
    } catch (err) {
        logger.error("Errore durante l'esportazione dei dati", err);
    }
}

async function importaDati() {
    try {
        if (window.electronAPI && window.electronAPI.importData) {
            // Prima qualsiasi risposta (anche "annullata" o un errore) veniva
            // registrata come importazione riuscita
            const esito = await window.electronAPI.importData();
            if (esito && esito.success) {
                ripristinaImpostazioniBackup(esito.impostazioni);
                logger.success("Dati importati con successo.");
                aggiornaInterfaccia();
            } else if (esito && !esito.cancelled) {
                logger.error("Importazione non riuscita", esito.error);
                alert(`❌ Importazione non riuscita: ${esito.error}`);
            }
        }
    } catch (err) {
        logger.error("Errore durante l'importazione dei dati", err);
    }
}

// I backup vecchi non hanno impostazioni: in quel caso il budget attuale resta invariato
function ripristinaImpostazioniBackup(impostazioni) {
    if (!impostazioni || impostazioni.monthly_budget === undefined) return;
    localStorage.setItem('monthly_budget', impostazioni.monthly_budget);
    const budgetInput = document.getElementById('monthlyBudgetInput');
    if (budgetInput) budgetInput.value = impostazioni.monthly_budget;
}

async function apriCartellaDati() {
    try {
        if (window.electronAPI && window.electronAPI.openDataFolder) {
            await window.electronAPI.openDataFolder();
        }
    } catch (err) {
        logger.error("Errore nell'apertura della cartella dati", err);
    }
}
