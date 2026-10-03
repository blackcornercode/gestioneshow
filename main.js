const { app, BrowserWindow, ipcMain, dialog, shell, Menu, net, screen } = require('electron');
const path = require('path');
const fs = require('fs').promises;

const changelogPath = path.join(__dirname, 'changelog.json');
const dataPath = path.join(app.getPath('userData'), 'shows_data.json');
const dataBackupPath = path.join(app.getPath('userData'), 'shows_data.bak.json');
const windowStatePath = path.join(app.getPath('userData'), 'window_state.json');
const logFilePath = path.join(app.getPath('userData'), 'app.log');

// Numero massimo di righe conservate nel file di log (le più recenti, in testa)
const MAX_RIGHE_LOG = 5000;

// Domini da cui l'app può scaricare pagine (scraping foto / stato online)
const DOMINIO_MCG = 'mondocamgirls.com';

// Protocolli che l'app può aprire all'esterno (browser, Teams, Telegram)
const PROTOCOLLI_ESTERNI_CONSENTITI = ['http:', 'https:', 'msteams:', 'tg:'];

let mainWindow = null;
let splashWindow = null;
let saveStateTimeout = null;

// Inizializzazione Store Asincrono: la Promise permette agli handler di attenderla
const storePronto = (async () => {
    try {
        const Store = (await import('electron-store')).default;
        return new Store();
    } catch (err) {
        console.error('Errore inizializzazione electron-store:', err);
        return null;
    }
})();

/* ==========================================================================
   FUNZIONALITÀ UTILITY E LOGS (Scrittura in testa)
   ========================================================================== */

// Le scritture sono messe in coda: due log ravvicinati non si sovrascrivono più a vicenda
let codaLog = Promise.resolve();

function logToFile(level, message, details = '') {
    codaLog = codaLog.then(() => scriviRigaLog(level, message, details));
    return codaLog;
}

async function scriviRigaLog(level, message, details) {
    try {
        const timestamp = new Date().toISOString();
        const detailsText = details ? ` - ${details}` : '';
        const nuovaRiga = `[${timestamp}] [${level}] ${message}${detailsText}`;

        let righeEsistenti = [];
        try {
            const contenuto = await fs.readFile(logFilePath, 'utf8');
            righeEsistenti = contenuto.split('\n').filter(Boolean);
        } catch {
            // Se il file non esiste ancora, verrà creato
        }

        // Nuova riga in cima (più recenti in alto), file limitato a MAX_RIGHE_LOG righe
        const righe = [nuovaRiga, ...righeEsistenti].slice(0, MAX_RIGHE_LOG);
        await fs.writeFile(logFilePath, righe.join('\n') + '\n', 'utf8');
    } catch (err) {
        console.error('Errore scrittura log:', err);
    }
}

// Scrittura atomica: scrive su file temporaneo e poi rinomina, così un crash
// a metà scrittura non lascia mai un file JSON troncato.
async function scriviFileAtomico(percorso, contenuto) {
    const tmp = `${percorso}.tmp`;
    await fs.writeFile(tmp, contenuto, 'utf-8');
    await fs.rename(tmp, percorso);
}

async function salvaDatiShow(data) {
    if (!Array.isArray(data)) {
        throw new Error('Dati non validi: era atteso un array di show.');
    }
    // Copia di sicurezza della versione precedente
    try {
        await fs.copyFile(dataPath, dataBackupPath);
    } catch (err) {
        if (err.code !== 'ENOENT') throw err;
    }
    await scriviFileAtomico(dataPath, JSON.stringify(data, null, 2));
}

function boundsVisibiliSuSchermo(bounds) {
    if (bounds.x === undefined || bounds.y === undefined) return true;
    return screen.getAllDisplays().some(({ workArea: a }) =>
        bounds.x < a.x + a.width && bounds.x + bounds.width > a.x &&
        bounds.y < a.y + a.height && bounds.y + bounds.height > a.y
    );
}

async function loadWindowState() {
    const predefinito = { width: 1350, height: 850, x: undefined, y: undefined };
    try {
        const data = await fs.readFile(windowStatePath, 'utf-8');
        const stato = { ...predefinito, ...JSON.parse(data) };
        // Se il monitor su cui era la finestra non c'è più, la si ricentra
        return boundsVisibiliSuSchermo(stato) ? stato : { ...stato, x: undefined, y: undefined };
    } catch {
        return predefinito;
    }
}

async function saveWindowState() {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    try {
        if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
            await fs.writeFile(windowStatePath, JSON.stringify(mainWindow.getBounds(), null, 2));
        }
    } catch (error) {
        console.error("Errore salvataggio stato finestra:", error);
    }
}

function debouncedSaveWindowState() {
    clearTimeout(saveStateTimeout);
    saveStateTimeout = setTimeout(saveWindowState, 500);
}

async function getChangelogJSON() {
    try {
        const rawData = await fs.readFile(changelogPath, 'utf8');
        return JSON.parse(rawData);
    } catch (err) {
        console.error("Errore lettura changelog.json:", err);
        return null;
    }
}

// Accetta solo URL https/http su mondocamgirls.com o suoi sottodomini
function urlMcgValido(targetUrl) {
    try {
        const u = new URL(targetUrl);
        const host = u.hostname.toLowerCase();
        return ['http:', 'https:'].includes(u.protocol) &&
            (host === DOMINIO_MCG || host.endsWith(`.${DOMINIO_MCG}`));
    } catch {
        return false;
    }
}

function downloadHtmlPage(targetUrl, timeoutMs = 15000) {
    return new Promise((resolve) => {
        let concluso = false;
        const fine = (valore) => {
            if (concluso) return;
            concluso = true;
            clearTimeout(timer);
            resolve(valore);
        };

        const request = net.request({
            method: 'GET',
            url: targetUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        // Senza timeout una pagina che non risponde bloccava la galleria per sempre
        const timer = setTimeout(() => {
            request.abort();
            fine('');
        }, timeoutMs);

        request.on('response', (response) => {
            if (response.statusCode < 200 || response.statusCode >= 300) {
                response.on('data', () => {});
                response.on('end', () => fine(''));
                return;
            }
            // I chunk vanno uniti come Buffer prima della decodifica: convertirli
            // uno per uno spezza i caratteri accentati a cavallo di due chunk
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => fine(Buffer.concat(chunks).toString('utf8')));
            response.on('error', () => fine(''));
        });
        request.on('error', () => fine(''));
        request.end();
    });
}

/* ==========================================================================
   INIZIALIZZAZIONE FINESTRE
   ========================================================================== */

async function createWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 250,
        frame: false,
        alwaysOnTop: true,
        transparent: false,
        center: true,
        resizable: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true }
    });
    splashWindow.loadFile('splash.html');

    const savedState = await loadWindowState();

    mainWindow = new BrowserWindow({
        width: savedState.width,
        height: savedState.height,
        x: savedState.x,
        y: savedState.y,
        minWidth: 1100,
        minHeight: 650,
        title: "Gestione Show MCG",
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            zoomFactor: 1.0,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true
        }
    });

    mainWindow.loadFile('index.html');

    // La finestra principale non deve mai navigare via da index.html né aprire
    // nuove finestre: eventuali link vengono passati al browser di sistema
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        apriUrlEsternoSicuro(url);
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url !== mainWindow.webContents.getURL()) {
            event.preventDefault();
            apriUrlEsternoSicuro(url);
        }
    });

    const menuTemplate = [
        { label: 'File', submenu: [{ role: 'quit', label: 'Esci' }] },
        {
            label: 'Finestra',
            submenu: [
                { role: 'minimize', label: 'Riduci a icona' },
                { role: 'zoom', label: 'Ingrandisci' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'Schermo intero' }
            ]
        },
        {
            label: '?',
            submenu: [
                {
                    label: '📋 Novità e Changelog',
                    click: () => {
                        if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.webContents.send('open-changelog-trigger');
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: 'Informazioni',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'Informazioni',
                            message: `Gestione Show v${app.getVersion()}`,
                            detail: 'Applicazione di gestione performance e classifica.'
                        });
                    }
                }
            ]
        }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

    mainWindow.once('ready-to-show', () => {
        if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
        mainWindow.show();
    });

    mainWindow.webContents.on('did-finish-load', () => {
        logToFile('INFO', `Applicazione avviata (v${app.getVersion()})`);
    });

    mainWindow.on('resize', debouncedSaveWindowState);
    mainWindow.on('move', debouncedSaveWindowState);
}

/* ==========================================================================
   EVENTI APP ELECTRON
   ========================================================================== */

app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

/* ==========================================================================
   HANDLERS IPC
   ========================================================================== */

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('relaunch-app', () => {
    app.relaunch();
    app.exit(0);
});

ipcMain.handle('append-log', async (event, logData = {}) => {
    await logToFile(String(logData.level || 'INFO'), String(logData.message || ''), String(logData.details || ''));
    return { success: true };
});

ipcMain.handle('open-data-folder', async () => {
    // shell.openPath non lancia eccezioni: restituisce una stringa di errore (vuota se ok)
    const errore = await shell.openPath(app.getPath('userData'));
    return errore ? { success: false, error: errore } : { success: true };
});

async function apriUrlEsternoSicuro(url) {
    let protocollo;
    try {
        protocollo = new URL(url).protocol;
    } catch {
        return { success: false, error: 'URL non valido' };
    }
    // Blocca file://, javascript: ecc.: openExternal su un percorso locale può avviare eseguibili
    if (!PROTOCOLLI_ESTERNI_CONSENTITI.includes(protocollo)) {
        logToFile('WARN', 'Apertura link esterno bloccata', url);
        return { success: false, error: `Protocollo non consentito: ${protocollo}` };
    }
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

ipcMain.handle('open-external', (event, url) => apriUrlEsternoSicuro(String(url || '')));

/* --- GESTIONE DATI E BACKUP --- */

ipcMain.handle('read-data', async () => {
    let contenuto;
    try {
        contenuto = await fs.readFile(dataPath, 'utf-8');
    } catch (err) {
        if (err.code === 'ENOENT') {
            // Primo avvio: nessun archivio, si parte vuoti
            await scriviFileAtomico(dataPath, JSON.stringify([]));
            return [];
        }
        throw err;
    }

    try {
        const dati = JSON.parse(contenuto);
        if (!Array.isArray(dati)) throw new Error('il file non contiene un array');
        return dati;
    } catch (err) {
        // Archivio danneggiato: NON va sovrascritto. Se ne conserva una copia
        // e si segnala l'errore, invece di ripartire silenziosamente da zero.
        const copia = path.join(app.getPath('userData'), `shows_data.corrotto-${Date.now()}.json`);
        await fs.copyFile(dataPath, copia).catch(() => {});
        await logToFile('ERROR', 'Archivio show illeggibile', `${err.message} - copia salvata in ${copia}`);
        throw new Error(`Archivio dati illeggibile (${err.message}). Copia salvata in: ${copia}. Puoi ripristinare da shows_data.bak.json o da un backup.`);
    }
});

ipcMain.handle('save-data', async (event, data) => {
    try {
        await salvaDatiShow(data);
        return { success: true };
    } catch (error) {
        await logToFile('ERROR', 'Salvataggio dati fallito', error.message);
        return { success: false, error: error.message };
    }
});

// Impostazioni del renderer (in localStorage) incluse nel backup: solo chiavi note
const IMPOSTAZIONI_IN_BACKUP = ['monthly_budget'];

function filtraImpostazioni(impostazioni) {
    const pulite = {};
    if (impostazioni && typeof impostazioni === 'object') {
        for (const chiave of IMPOSTAZIONI_IN_BACKUP) {
            if (impostazioni[chiave] !== undefined && impostazioni[chiave] !== null) {
                pulite[chiave] = String(impostazioni[chiave]);
            }
        }
    }
    return pulite;
}

ipcMain.handle('export-data', async (event, impostazioni) => {
    try {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Esporta Backup Dati',
            defaultPath: path.join(app.getPath('downloads'), `backup_shows_${Date.now()}.json`),
            filters: [{ name: 'File JSON', extensions: ['json'] }]
        });

        if (filePath) {
            const shows = JSON.parse(await fs.readFile(dataPath, 'utf-8'));
            const backup = {
                formato: 'gestioneshow-backup',
                versione: 1,
                versioneApp: app.getVersion(),
                shows,
                impostazioni: filtraImpostazioni(impostazioni)
            };
            await fs.writeFile(filePath, JSON.stringify(backup, null, 2), 'utf-8');
            return { success: true };
        }
        return { success: false, cancelled: true, error: 'Esportazione annullata' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('import-data', async () => {
    try {
        const { filePaths } = await dialog.showOpenDialog(mainWindow, {
            title: 'Importa Backup Dati',
            filters: [{ name: 'File JSON', extensions: ['json'] }],
            properties: ['openFile']
        });

        if (filePaths?.length > 0) {
            const content = await fs.readFile(filePaths[0], 'utf-8');
            const parsedData = JSON.parse(content);
            // Accetta sia il formato attuale { shows, impostazioni } sia i backup
            // precedenti, che contenevano solo l'array degli show
            const shows = Array.isArray(parsedData) ? parsedData : parsedData?.shows;
            if (Array.isArray(shows)) {
                // salvaDatiShow conserva l'archivio attuale in shows_data.bak.json prima di sostituirlo
                await salvaDatiShow(shows);
                return { success: true, impostazioni: filtraImpostazioni(parsedData?.impostazioni) };
            }
            return { success: false, error: 'Formato del file non valido (atteso un backup di Gestione Show).' };
        }
        return { success: false, cancelled: true, error: 'Importazione annullata' };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

/* --- GESTIONE CHANGELOG E STORE --- */

ipcMain.handle('get-changelog', async () => {
    const data = await getChangelogJSON();
    if (!data) {
        return `
            <div style="font-family: inherit; line-height: 1.5;">
                <h3 style="margin-top: 0; color: var(--accent-color, #2a9d8f);">Novità v${app.getVersion()}</h3>
                <ul style="padding-left: 20px;">
                    <li>Migliorata la gestione del budget e delle statistiche.</li>
                    <li>Corretta l'apertura del modale Changelog dal menu.</li>
                </ul>
            </div>`;
    }

    // Le voci sono testo semplice: si fa l'escape e si mette in grassetto la
    // categoria iniziale ("Novità:", "Fix:", ...)
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
});

ipcMain.handle('get-changelog-data', async () => {
    return (await getChangelogJSON()) || {};
});

ipcMain.handle('check-for-update-changelog', async () => {
    const currentVersion = app.getVersion();
    const store = await storePronto;
    const lastVersion = store ? store.get('last_seen_version', null) : null;

    if (store && lastVersion !== currentVersion) {
        store.set('last_seen_version', currentVersion);
        return { shouldShow: true, version: currentVersion };
    }
    return { shouldShow: false, version: currentVersion };
});

/* --- SCRAPING & SINCRONIZZAZIONE --- */

ipcMain.handle('fetch-transazioni-html', async (event, targetUrl) => {
    const urlTransazioni = (targetUrl && urlMcgValido(targetUrl))
        ? targetUrl
        : 'https://www.mondocamgirls.com/it/areacliente_transazioni.html?pagina_vis=0';

    return new Promise((resolve) => {
        let isResolved = false;
        const win = new BrowserWindow({
            width: 1100,
            height: 750,
            show: true,
            title: "MondoCamGirls - Effettua il Login e sincronizza",
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const safeResolve = (data) => {
            if (!isResolved) {
                isResolved = true;
                if (!win.isDestroyed()) win.close();
                resolve(data);
            }
        };

        win.loadURL(urlTransazioni);

        win.webContents.on('did-finish-load', async () => {
            try {
                if (win.isDestroyed()) return;
                if (win.webContents.getURL().includes('areacliente_transazioni')) {
                    const html = await win.webContents.executeJavaScript('document.body.innerHTML');
                    if (html && html.includes('table')) safeResolve(html);
                }
            } catch (err) {
                console.error("Errore lettura HTML sincronizzazione:", err);
            }
        });

        win.on('closed', () => safeResolve(null));
    });
});

ipcMain.handle('check-model-online-status', async (event, urlProfilo) => {
    if (!urlMcgValido(urlProfilo)) {
        return { success: false, isOnline: false, error: 'URL profilo non valido' };
    }
    try {
        const body = await downloadHtmlPage(urlProfilo);
        if (!body) return { success: false, isOnline: false, error: 'Impossibile scaricare la pagina' };

        const html = body.toLowerCase();
        const isOffline = html.includes('off-line') || html.includes('offline') || html.includes('non è attualmente online');
        const hasLivePlayer = html.includes('player-live') || html.includes('is-online') || html.includes('stream-container');

        return { success: true, isOnline: !isOffline && hasLivePlayer };
    } catch (err) {
        return { success: false, isOnline: false, error: err.message };
    }
});

ipcMain.handle('fetch-modella-foto', async (event, urlProfilo) => {
    // Lo scraping è limitato a mondocamgirls.com: il renderer non può far
    // scaricare all'app pagine di domini arbitrari
    if (!urlMcgValido(urlProfilo)) {
        return { success: false, images: [], error: 'URL profilo non appartenente a MondoCamGirls' };
    }
    try {
        const baseUrl = urlProfilo.replace(/\/+$/, '');
        const hostName = new URL(baseUrl).hostname;
        const imageUrls = [];
        const MAX_PAGINE = 4;

        const ignorePattern = /logo|banner|icon|avatar|placeholder|badge|btn|thumb|small|preview|\/t\/|_t\.|mini|\d+x\d+|video|vcover|v_preview|\/videos\/|\/clips\/|\/camclip\/|\/mp-video|trailer|poster|play/i;
        const globalImgRegex = /(https?:[\\\/]+[^"'\s<>]+?\.(?:jpg|jpeg|png|webp))/gi;

        for (let pagina = 0; pagina < MAX_PAGINE; pagina++) {
            const targetUrl = pagina === 0 ? `${baseUrl}/#mp-foto` : `${baseUrl}/?pagina_foto=${pagina}#mp-foto`;
            const body = await downloadHtmlPage(targetUrl);
            if (!body) break;

            let fotoSectionHtml = body;
            const mpFotoIndex = body.indexOf('id="mp-foto"');
            if (mpFotoIndex !== -1) {
                fotoSectionHtml = body.substring(mpFotoIndex, mpFotoIndex + 15000);
            }

            let match;
            let nuoveFotoTrovate = 0;

            while ((match = globalImgRegex.exec(fotoSectionHtml)) !== null) {
                const imgUrl = match[1].replace(/\\/g, '');
                const belongsToModel = imgUrl.includes(hostName) || /\/(foto|gallery|photos)\//i.test(imgUrl);

                if (!ignorePattern.test(imgUrl) && belongsToModel && !imageUrls.includes(imgUrl)) {
                    imageUrls.push(imgUrl);
                    nuoveFotoTrovate++;
                }
            }

            if (nuoveFotoTrovate === 0 && pagina > 0) break;
        }

        return { success: true, images: imageUrls };
    } catch (err) {
        return { success: false, images: [], error: err.message };
    }
});

// Verifica se il sito MCG è raggiungibile (indicatore nell'header).
// Il timeout è gestito a mano: net.request di Electron non ha un'opzione "timeout".
ipcMain.handle('ping-mcg', () => {
    return new Promise((resolve) => {
        let concluso = false;
        const fine = (esito) => {
            if (concluso) return;
            concluso = true;
            clearTimeout(timer);
            resolve(esito);
        };

        const request = net.request({ method: 'HEAD', url: 'https://www.mondocamgirls.com' });
        const timer = setTimeout(() => {
            request.abort();
            fine({ online: false, error: 'timeout' });
        }, 5000);

        request.on('response', (response) => {
            const status = response.statusCode;
            response.on('data', () => {});
            fine({ online: status >= 200 && status < 400, status });
        });
        request.on('error', (error) => fine({ online: false, error: error.message }));
        request.end();
    });
});
