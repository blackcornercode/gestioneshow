// Gestori IPC di sistema: versione, log, apertura di cartelle e link esterni,
// changelog e avviso "Novità".
const { app, ipcMain, shell } = require('electron');
const fs = require('fs').promises;
const canali = require('./canali');
const percorsi = require('./percorsi');
const { logToFile, cancellaLog } = require('./log');

// Protocolli che l'app può aprire all'esterno (browser, Teams, Telegram)
const PROTOCOLLI_ESTERNI_CONSENTITI = ['http:', 'https:', 'msteams:', 'tg:'];

// Inizializzazione asincrona di electron-store: la Promise permette ai gestori di attenderla
const storePronto = (async () => {
    try {
        const Store = (await import('electron-store')).default;
        return new Store();
    } catch (err) {
        console.error('Errore inizializzazione electron-store:', err);
        return null;
    }
})();

async function apriUrlEsternoSicuro(url) {
    let protocollo;
    try {
        protocollo = new URL(url).protocol;
    } catch {
        return { success: false, error: 'URL non valido' };
    }
    // Blocca file://, javascript: ecc.: openExternal su un percorso locale può avviare eseguibili
    if (!PROTOCOLLI_ESTERNI_CONSENTITI.includes(protocollo)) {
        logToFile('WARN', 'Apertura link esterno bloccata', protocollo);
        return { success: false, error: `Protocollo non consentito: ${protocollo}` };
    }
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function leggiChangelog() {
    try {
        return JSON.parse(await fs.readFile(percorsi.changelog, 'utf8'));
    } catch (err) {
        console.error("Errore lettura changelog.json:", err);
        return null;
    }
}

// HTML del modale "Novità": le voci sono testo semplice, si fa l'escape e si
// mette in grassetto la categoria iniziale ("Novità:", "Fix:", ...)
function changelogInHtml(data) {
    if (!data) {
        return `
            <div style="font-family: inherit; line-height: 1.5;">
                <h3 style="margin-top: 0; color: var(--accent-color, #2a9d8f);">Novità v${app.getVersion()}</h3>
                <p>Elenco delle novità non disponibile.</p>
            </div>`;
    }

    const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const formattaVoce = (voce) => {
        const m = /^([^:]{1,25}):\s+(.*)$/s.exec(String(voce));
        return m ? `<strong>${escape(m[1])}:</strong> ${escape(m[2])}` : escape(voce);
    };

    let htmlContent = `<div style="font-family: inherit; line-height: 1.5; color: var(--text-color, #333);">`;
    for (const [version, changes] of Object.entries(data)) {
        htmlContent += `
            <div style="margin-bottom: 20px; border-bottom: 1px solid var(--border-color, rgba(0,0,0,0.1)); padding-bottom: 10px;">
                <h3 style="margin: 0 0 8px 0; color: var(--link-color, #2563eb);">Versione ${escape(version)}</h3>
                <ul style="padding-left: 20px; margin: 0;">
                    ${changes.map(item => `<li style="margin-bottom: 4px;">${formattaVoce(item)}</li>`).join('')}
                </ul>
            </div>`;
    }
    return htmlContent + `</div>`;
}

function registra() {
    ipcMain.handle(canali.VERSIONE_APP, () => app.getVersion());

    ipcMain.handle(canali.SCRIVI_LOG, async (event, dati) => {
        const logData = dati && typeof dati === 'object' ? dati : {};
        // Il livello va filtrato e il testo ripulito da logToFile; l'ora la mette il processo principale
        await logToFile(logData.level, logData.message, logData.details);
        return { success: true };
    });

    ipcMain.handle(canali.APRI_LOG, async () => {
        const errore = await shell.openPath(percorsi.log);
        return errore ? { success: false, error: errore } : { success: true };
    });

    ipcMain.handle(canali.CANCELLA_LOG, async () => {
        try {
            await cancellaLog();
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle(canali.APRI_CARTELLA_DATI, async () => {
        // shell.openPath non lancia eccezioni: restituisce una stringa di errore (vuota se ok)
        const errore = await shell.openPath(percorsi.cartellaDati);
        return errore ? { success: false, error: errore } : { success: true };
    });

    ipcMain.handle(canali.APRI_LINK_ESTERNO, (event, url) => apriUrlEsternoSicuro(String(url || '')));

    ipcMain.handle(canali.CHANGELOG, async () => changelogInHtml(await leggiChangelog()));

    ipcMain.handle(canali.NOVITA_DA_MOSTRARE, async () => {
        const currentVersion = app.getVersion();
        const store = await storePronto;
        const lastVersion = store ? store.get('last_seen_version', null) : null;

        if (store && lastVersion !== currentVersion) {
            store.set('last_seen_version', currentVersion);
            // primoAvvio: nessuna versione vista prima, cioè app appena installata
            return { shouldShow: true, primoAvvio: lastVersion === null, version: currentVersion };
        }
        return { shouldShow: false, version: currentVersion };
    });
}

module.exports = { registra, apriUrlEsternoSicuro, changelogInHtml };
