/* ==========================================================================
   CHANGELOG E MODALE NOVITÀ
   ========================================================================== */
async function initChangelogCheck() {
    try {
        if (!window.electronAPI || !window.electronAPI.checkForUpdateChangelog) return;
        const esito = await window.electronAPI.checkForUpdateChangelog();
        if (esito && esito.shouldShow) apriModalChangelog();
    } catch (err) {
        logger.error("Errore nel controllo delle novità di versione", err);
    }
}

function inizializzaListenerChangelogMenu() {
    if (window.electronAPI && window.electronAPI.onOpenChangelog) {
        window.electronAPI.onOpenChangelog(() => {
            apriModalChangelog();
        });
    }
}

async function apriModalChangelog() {
    const modal = document.getElementById('changelogModal');
    const content = document.getElementById('changelogContent');

    if (!modal) {
        logger.warn("Elemento 'changelogModal' non trovato nel DOM.");
        return;
    }

    modal.style.display = 'block';
    modal.style.zIndex = '3000';
    logger.info("Modale Changelog aperto.");

    if (!content) return;

    try {
        if (window.electronAPI && window.electronAPI.getChangelog) {
            const changelogText = await window.electronAPI.getChangelog();
            if (changelogText) {
                content.innerHTML = changelogText;
                return;
            }
        }
    } catch (err) {
        logger.error("Errore nel recupero del Changelog via IPC", err);
    }

    if (content.innerHTML.includes('Caricamento') || content.innerHTML.trim() === '') {
        content.innerHTML = `
            <div style="font-family: inherit; line-height: 1.5; color: var(--text-color, #333);">
                <h3 style="margin-top: 0; color: var(--accent-color, #2a9d8f);">Novità della versione attuale</h3>
                <ul style="padding-left: 20px; margin-bottom: 10px;">
                    <li><strong>Integrazione Changelog:</strong> Corretto il sistema di apertura modale dal menu Electron e via Web.</li>
                    <li><strong>Gestione Budget:</strong> Migliorato il tracciamento delle spese e le barre di avanzamento mensili.</li>
                    <li><strong>Statistiche Mesi:</strong> Ottimizzata la visualizzazione degli show filtrati e il selettore anno.</li>
                    <li><strong>Stabilità generale:</strong> Piccole correzioni sull'importazione automatica dei dati.</li>
                </ul>
            </div>
        `;
    }
}

function chiudiModalChangelog() {
    const modal = document.getElementById('changelogModal');
    if (modal) {
        modal.style.display = 'none';
    }
}
