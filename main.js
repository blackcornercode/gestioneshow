const { app, BrowserWindow, ipcMain, dialog, shell, Menu, net } = require('electron');
const path = require('path');
const fs = require('fs').promises;

const changelogPath = path.join(__dirname, 'changelog.json');
const dataPath = path.join(app.getPath('userData'), 'shows_data.json');
const windowStatePath = path.join(app.getPath('userData'), 'window_state.json');
const logFilePath = path.join(app.getPath('userData'), 'app.log');

let store = null;
let mainWindow = null;
let splashWindow = null;
let saveStateTimeout = null;

// Inizializzazione Store Asincrono
(async () => {
    try {
        const Store = (await import('electron-store')).default;
        store = new Store();
    } catch (err) {
        console.error('Errore inizializzazione electron-store:', err);
    }
})();

/* ==========================================================================
   FUNZIONALITÀ UTILITY E LOGS (Scrittura in testa)
   ========================================================================== */

async function logToFile(level, message, details = '') {
    try {
        const timestamp = new Date().toISOString();
        const detailsText = details ? ` - ${details}` : '';
        const nuovaRiga = `[${timestamp}] [${level}] ${message}${detailsText}\n`;

        let contenutoEsistente = '';
        try {
            // Legge il file esistente se presente
            contenutoEsistente = await fs.readFile(logFilePath, 'utf8');
        } catch {
            // Se il file non esiste ancora, verrà creato
            contenutoEsistente = '';
        }

        // Mette la nuova riga in cima (prepend) anziché in fondo (append)
        await fs.writeFile(logFilePath, nuovaRiga + contenutoEsistente, 'utf8');
    } catch (err) {
        console.error('Errore scrittura log:', err);
    }
}

async function loadWindowState() {
    try {
        const data = await fs.readFile(windowStatePath, 'utf-8');
        return JSON.parse(data);
    } catch {
        return { width: 1350, height: 850, x: undefined, y: undefined };
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

function downloadHtmlPage(targetUrl) {
    return new Promise((resolve) => {
        const request = net.request({
            method: 'GET',
            url: targetUrl,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        let body = '';
        request.on('response', (response) => {
            response.on('data', (chunk) => body += chunk.toString('utf8'));
            response.on('end', () => resolve(body));
        });
        request.on('error', () => resolve(''));
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

ipcMain.handle('append-log', async (event, logData) => {
    await logToFile(logData.level || 'INFO', logData.message || '', logData.details || '');
    return { success: true };
});

ipcMain.handle('open-data-folder', async () => {
    try {
        await shell.openPath(app.getPath('userData'));
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-external', async (event, url) => {
    try {
        await shell.openExternal(url);
        return { success: true };
    } catch (error) {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            await shell.openExternal('https://teams.microsoft.com');
        }
        return { success: false, error: error.message };
    }
});

/* --- GESTIONE DATI E BACKUP --- */

ipcMain.handle('read-data', async () => {
    try {
        const data = await fs.readFile(dataPath, 'utf-8');
        return JSON.parse(data);
    } catch {
        await fs.writeFile(dataPath, JSON.stringify([]), 'utf-8');
        return [];
    }
});

ipcMain.handle('save-data', async (event, data) => {
    try {
        await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle('export-data', async () => {
    try {
        const { filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Esporta Backup Dati',
            defaultPath: path.join(app.getPath('downloads'), `backup_shows_${Date.now()}.json`),
            filters: [{ name: 'File JSON', extensions: ['json'] }]
        });

        if (filePath) {
            const data = await fs.readFile(dataPath, 'utf-8');
            await fs.writeFile(filePath, data, 'utf-8');
            return { success: true };
        }
        return { success: false, error: 'Esportazione annullata' };
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
            if (Array.isArray(parsedData)) {
                await fs.writeFile(dataPath, JSON.stringify(parsedData, null, 2), 'utf-8');
                return { success: true };
            }
            return { success: false, error: 'Formato del file non valido (deve essere un array JSON).' };
        }
        return { success: false, error: 'Importazione annullata' };
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

    let htmlContent = `<div style="font-family: inherit; line-height: 1.5; color: var(--text-main, #333);">`;
    for (const [version, changes] of Object.entries(data)) {
        htmlContent += `
            <div style="margin-bottom: 20px; border-bottom: 1px solid rgba(0,0,0,0.1); padding-bottom: 10px;">
                <h3 style="margin: 0 0 8px 0; color: var(--accent-color, #2a9d8f);">Versione ${version}</h3>
                <ul style="padding-left: 20px; margin: 0;">
                    ${changes.map(item => `<li style="margin-bottom: 4px;">${item}</li>`).join('')}
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
    const lastVersion = store ? store.get('last_seen_version', null) : null;

    if (store && lastVersion !== currentVersion) {
        store.set('last_seen_version', currentVersion);
        return { shouldShow: true, version: currentVersion };
    }
    return { shouldShow: false, version: currentVersion };
});

/* --- SCRAPING & SINCRONIZZAZIONE --- */

ipcMain.handle('fetch-transazioni-html', async (event, targetUrl) => {
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

        win.loadURL(targetUrl || 'https://www.mondocamgirls.com/it/areacliente_transazioni.html?pagina_vis=0');

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