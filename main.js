// Processo principale: ciclo di vita dell'app, finestre e menu.
// I gestori IPC stanno in main/, divisi per area:
//   main/ipc-dati.js     archivio degli show, esportazione e importazione backup
//   main/ipc-sistema.js  versione, log, link esterni, changelog
//   main/ipc-connettori.js  connettori dei siti (main/connettori/: transazioni, modelle online, foto, ping)
//   main/ipc-privacy.js  aspetto neutro, PIN di sblocco, riduzione a icona rapida
const { app, BrowserWindow, clipboard, dialog, Menu, screen, shell } = require('electron');
const path = require('path');

// La cartella dei dati resta %APPDATA%\gestioneshow qualunque sia il nome visibile
// dell'app (Private Diary): va fissata prima di caricare main/percorsi.js, che la legge.
// Con --user-data-dir (usato dalle prove su una copia dei dati) vale quella indicata.
if (!app.commandLine.hasSwitch('user-data-dir')) {
    app.setPath('userData', path.join(app.getPath('appData'), 'gestioneshow'));
}

const fs = require('fs').promises;
const canali = require('./main/canali');
const percorsi = require('./main/percorsi');
const { logToFile, convertiLogVecchioFormato } = require('./main/log');
const ipcDati = require('./main/ipc-dati');
const ipcSistema = require('./main/ipc-sistema');
const ipcConnettori = require('./main/ipc-connettori');
const ipcPrivacy = require('./main/ipc-privacy');

let mainWindow = null;
let splashWindow = null;
let saveStateTimeout = null;

/* ==========================================================================
   STATO DELLA FINESTRA (dimensione e posizione)
   ========================================================================== */

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
        const data = await fs.readFile(percorsi.statoFinestra, 'utf-8');
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
            await fs.writeFile(percorsi.statoFinestra, JSON.stringify(mainWindow.getBounds(), null, 2));
        }
    } catch (error) {
        console.error("Errore salvataggio stato finestra:", error);
    }
}

function debouncedSaveWindowState() {
    clearTimeout(saveStateTimeout);
    saveStateTimeout = setTimeout(saveWindowState, 500);
}

/* ==========================================================================
   INIZIALIZZAZIONE FINESTRE
   ========================================================================== */

/* ==========================================================================
   MENU "?": INFORMAZIONI E CONTATTI
   ========================================================================== */
const EMAIL_SVILUPPATORE = 'blackcornermail@gmail.com';
const COPYRIGHT = '© 2026 The Black Corner';

function mostraInformazioni() {
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Informazioni',
        message: `Diario Privato (Private Diary)  ·  v${app.getVersion()}`,
        detail: [
            'Il tuo diario privato degli show: ogni incontro registrato, ogni euro sotto controllo, ogni modella al posto giusto in classifica.',
            'Scopri chi vale davvero il tuo tempo con voti, costo al minuto, tag e statistiche; tieni d\'occhio il budget del mese e porta dentro lo storico dei tuoi siti di cam: da Mondo Cam Girls con un clic, dagli altri con un file CSV.',
            'E la discrezione viene prima di tutto: PIN, foto sfocate, nome neutro e un tasto per sparire all\'istante.',
            COPYRIGHT
        ].join('\n\n')
    });
}

async function mostraContatti() {
    const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Contatti',
        message: 'Contatta lo sviluppatore',
        detail: `Un'idea per una nuova funzione, un problema da segnalare o solo un saluto? Scrivi a:\n\n${EMAIL_SVILUPPATORE}\n\n${COPYRIGHT}`,
        buttons: ['✉️ Scrivi una email', 'Copia indirizzo', 'Chiudi'],
        defaultId: 0,
        cancelId: 2,
        noLink: true
    });
    if (response === 0) {
        // Indirizzo fisso: mailto non passa da apriUrlEsternoSicuro, che accetta solo link web e chat
        const oggetto = encodeURIComponent(`Private Diary v${app.getVersion()}`);
        shell.openExternal(`mailto:${EMAIL_SVILUPPATORE}?subject=${oggetto}`)
            .catch(err => logToFile('WARN', 'Apertura del programma di posta non riuscita', err.message));
    } else if (response === 1) {
        clipboard.writeText(EMAIL_SVILUPPATORE);
    }
}

function creaMenu() {
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
                            mainWindow.webContents.send(canali.EVENTO_APRI_CHANGELOG);
                        }
                    }
                },
                { type: 'separator' },
                { label: '✉️ Contatti', click: mostraContatti },
                { label: 'ℹ️ Informazioni', click: mostraInformazioni }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));
}

async function createWindow() {
    // Con l'aspetto neutro niente splash: mostrerebbe il nome dell'app
    if (!ipcPrivacy.aspettoNeutro()) {
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
    }

    const savedState = await loadWindowState();

    mainWindow = new BrowserWindow({
        width: savedState.width,
        height: savedState.height,
        x: savedState.x,
        y: savedState.y,
        minWidth: 1100,
        minHeight: 650,
        title: ipcPrivacy.titoloFinestra(),
        icon: ipcPrivacy.iconaFinestra(),
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
    // Il titolo resta quello deciso qui (nome dell'app o titolo neutro)
    mainWindow.on('page-title-updated', (event) => event.preventDefault());

    // La finestra principale non deve mai navigare via da index.html né aprire
    // nuove finestre: eventuali link vengono passati al browser di sistema
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        ipcSistema.apriUrlEsternoSicuro(url);
        return { action: 'deny' };
    });
    mainWindow.webContents.on('will-navigate', (event, url) => {
        if (url !== mainWindow.webContents.getURL()) {
            event.preventDefault();
            ipcSistema.apriUrlEsternoSicuro(url);
        }
    });

    creaMenu();

    mainWindow.once('ready-to-show', () => {
        if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
        mainWindow.show();
    });

    mainWindow.webContents.on('render-process-gone', (event, dettagli) => {
        logToFile('ERROR', "Processo dell'interfaccia terminato", `${dettagli.reason} (codice ${dettagli.exitCode})`);
    });

    mainWindow.webContents.on('did-finish-load', () => {
        logToFile('AVVIO', `Applicazione avviata (v${app.getVersion()})`, `Electron ${process.versions.electron}, ${process.platform} ${process.arch}`);
    });

    mainWindow.on('resize', debouncedSaveWindowState);
    mainWindow.on('move', debouncedSaveWindowState);
}

/* ==========================================================================
   AVVIO
   ========================================================================== */

// Errori che nessun try/catch ha intercettato: senza questi non resterebbe traccia
const descriviErrore = (err) => (err instanceof Error ? err.stack || err.message : String(err));
process.on('uncaughtException', (err) => { logToFile('ERROR', 'Errore non gestito nel processo principale', descriviErrore(err)); });
process.on('unhandledRejection', (motivo) => { logToFile('ERROR', 'Promise rifiutata e non gestita nel processo principale', descriviErrore(motivo)); });

// I gestori IPC vanno registrati una sola volta, prima di aprire le finestre
const finestraPrincipale = () => mainWindow;
ipcDati.registra({ finestraPrincipale });
ipcSistema.registra();
ipcConnettori.registra();
ipcPrivacy.registra({ finestraPrincipale });

app.whenReady().then(async () => {
    await convertiLogVecchioFormato();
    ipcPrivacy.caricaPreferenze();
    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
