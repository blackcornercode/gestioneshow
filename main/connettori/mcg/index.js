// Connettore di Mondo Cam Girls (registro in main/connettori/index.js): lettura
// delle transazioni (con login), copia diagnostica della sincronizzazione,
// modelle online, profili sospesi o rimossi, foto e raggiungibilità.
const { BrowserWindow } = require('electron');
const dns = require('dns').promises;
const percorsi = require('../../percorsi');
const { scriviFileAtomico } = require('../../file');
const { logToFile } = require('../../log');
const { downloadHtmlPage, ping, USER_AGENT } = require('../../rete');
const { urlMcgValido, slugProfiloMcg, profiloSospeso, creditoDisponibile, richiedeLogin } = require('./indirizzi');
const { leggiPaginaCorrente, leggiTutteLePagine } = require('./pagine');

const SITO_MCG = 'mcg';   // ID del sito nel catalogo (main/catalogo-siti.js)

const URL_TRANSAZIONI = 'https://www.mondocamgirls.com/it/areacliente_transazioni.html?pagina_vis=0';
const URL_AREA_CLIENTE = 'https://www.mondocamgirls.com/it/areacliente.html';

// Credito disponibile nell'area clienti: { success, credito, letto } oppure
// { success: false, loginRichiesto, error }. Non apre finestre: usa i cookie del
// login fatto nella finestra di sincronizzazione (stessa sessione dell'app).
async function leggiCredito() {
    const html = await downloadHtmlPage(URL_AREA_CLIENTE, 15000, { conCookie: true });
    if (!html) return { success: false, loginRichiesto: false, error: 'pagina non scaricata' };
    const credito = creditoDisponibile(html);
    if (credito !== null) return { success: true, credito, letto: new Date().toISOString() };
    const login = richiedeLogin(html);
    return { success: false, loginRichiesto: login, error: login ? 'login richiesto' : 'credito non trovato nella pagina' };
}

// Modelle online su MCG. Si usa il servizio pubblico con cui il sito riempie la
// griglia delle modelle (getdata.html, filtro online=si, senza login): restituisce
// { items: [{ url, name, online, ... }], totalPages, ... }. Le modelle vengono
// identificate dal sottodominio del profilo (https://<slug>.mondocamgirls.com).
// Il risultato resta in memoria per qualche minuto per non interrogare il sito di continuo.
const URL_MODELLE_ONLINE = 'https://www.mondocamgirls.com/it/getdata.html';
const CACHE_ONLINE_MS = 2 * 60 * 1000;
const MAX_PAGINE_ONLINE = 10;
let cacheOnline = null;

// Apre la pagina transazioni di MCG (con login se serve) e restituisce
// { pagine: [html, ...], transazioni, completa, motivoFine } oppure null se la
// finestra viene chiusa. Con tutteLePagine legge l'intera cronologia.
function leggiTransazioni(opzioni = {}) {
    const urlTransazioni = (opzioni.url && urlMcgValido(opzioni.url)) ? opzioni.url : URL_TRANSAZIONI;
    const tutteLePagine = Boolean(opzioni.tutteLePagine);

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
                userAgent: USER_AGENT
            }
        });

        const safeResolve = (data) => {
            if (!isResolved) {
                isResolved = true;
                if (!win.isDestroyed()) win.close();
                resolve(data);
            }
        };
        // Transazioni lette: a login appena fatto si legge anche il credito. La finestra
        // si chiude prima, così la sua chiusura non può più annullare la lettura
        const concludi = async (data) => {
            if (isResolved) return;
            isResolved = true;
            if (!win.isDestroyed()) win.close();
            const credito = await leggiCredito().catch(err => ({ success: false, error: err.message }));
            resolve({ ...data, credito });
        };

        win.loadURL(urlTransazioni);

        // Dopo la prima pagina con transazioni la finestra naviga tra le pagine
        // successive: il flag evita che quei caricamenti riavviino la lettura
        let letturaAvviata = false;

        win.webContents.on('did-finish-load', async () => {
            try {
                if (win.isDestroyed() || letturaAvviata) return;
                if (!win.webContents.getURL().includes('areacliente_transazioni')) return;
                const prima = await leggiPaginaCorrente(win);
                // Pagina di login (stesso indirizzo, nessuna transazione): si aspetta l'accesso
                if (prima.codici.length === 0 && prima.richiedeLogin) return;
                letturaAvviata = true;

                // Senza transazioni riconoscibili si restituisce comunque la pagina:
                // l'interfaccia segnala che la struttura di MCG è cambiata
                if (!tutteLePagine || prima.codici.length === 0) {
                    await concludi({ pagine: [prima.html], transazioni: prima.codici.length, completa: false, motivoFine: 'solo la prima pagina' });
                    return;
                }

                const risultato = await leggiTutteLePagine(win, urlTransazioni, prima, (pagina, lette) => {
                    if (!win.isDestroyed()) win.setTitle(`MondoCamGirls - Lettura pagina ${pagina} (${lette} transazioni lette)…`);
                });
                await logToFile('INFO', 'Cronologia MCG letta', `${risultato.pagine.length} pagine, ${risultato.transazioni} transazioni, passo ${risultato.passo}: ${risultato.motivoFine}`);
                await concludi(risultato);
            } catch (err) {
                console.error("Errore lettura HTML sincronizzazione:", err);
                await logToFile('ERROR', 'Lettura pagine MCG non riuscita', err.message);
            }
        });

        win.on('closed', () => safeResolve(null));
    });
}

async function modelleOnline() {
    if (cacheOnline && Date.now() - cacheOnline.letto < CACHE_ONLINE_MS) return cacheOnline.risultato;
    try {
        const slug = new Set();
        let totalePagine = 1;
        for (let pagina = 0; pagina < Math.min(totalePagine, MAX_PAGINE_ONLINE); pagina++) {
            const corpo = await downloadHtmlPage(`${URL_MODELLE_ONLINE}?pagina_vis=${pagina}&online=si`);
            if (!corpo) throw new Error(`pagina ${pagina} non scaricata`);
            const dati = JSON.parse(corpo);
            if (!Array.isArray(dati.items)) throw new Error('risposta senza elenco "items"');
            // Nell'elenco compaiono anche modelle in evidenza non online: conta il campo "online"
            dati.items.filter(x => x.online === true).forEach(x => { const s = slugProfiloMcg(x.url); if (s) slug.add(s); });
            totalePagine = Number(dati.totalPages) || 1;
        }
        const risultato = { success: true, slug: [...slug], aggiornato: new Date().toISOString() };
        cacheOnline = { letto: Date.now(), risultato };
        return risultato;
    } catch (err) {
        await logToFile('WARN', 'Stato online delle modelle non disponibile', err.message);
        return { success: false, slug: [], error: err.message };
    }
}

// Il nome esiste nel DNS? Ogni profilo MCG ha un proprio sottodominio: quando il
// profilo viene eliminato il sottodominio smette di esistere (ENOTFOUND).
async function nomeRisolto(host) {
    try {
        await dns.lookup(host);
        return true;
    } catch (err) {
        if (err.code === 'ENOTFOUND') return false;
        throw err;
    }
}

// Stato del profilo: { success, sospeso, rimosso }.
// - rimosso: il sottodominio del profilo non esiste più, mentre il sito sì
//   (se non si risolve nemmeno www.mondocamgirls.com manca la rete: esito non valido);
// - sospeso: la pagina del profilo mostra l'avviso di sospensione.
// success = false se la pagina non è stata scaricata o non è riconoscibile.
async function statoSospensioneProfilo(urlProfilo) {
    if (!urlMcgValido(urlProfilo) || !slugProfiloMcg(urlProfilo)) {
        return { success: false, sospeso: null, rimosso: false, error: 'URL profilo non appartenente a MondoCamGirls' };
    }
    try {
        if (!(await nomeRisolto(new URL(urlProfilo).hostname))) {
            return (await nomeRisolto('www.mondocamgirls.com'))
                ? { success: true, sospeso: false, rimosso: true }
                : { success: false, sospeso: null, rimosso: false, error: 'rete non disponibile' };
        }
    } catch (err) {
        return { success: false, sospeso: null, rimosso: false, error: err.message };
    }
    const html = await downloadHtmlPage(urlProfilo);
    const sospeso = profiloSospeso(html);
    return sospeso === null
        ? { success: false, sospeso: null, rimosso: false, error: html ? 'pagina del profilo non riconosciuta' : 'pagina non scaricata' }
        : { success: true, sospeso, rimosso: false };
}

async function fotoModella(urlProfilo) {
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
}

// Salva le tabelle lette durante l'ultima sincronizzazione e l'esito di ogni riga.
// Il file viene sovrascritto a ogni sincronizzazione e resta solo in locale.
async function salvaCopia(dump) {
    try {
        if (!dump || typeof dump !== 'object') throw new Error('contenuto non valido');
        await scriviFileAtomico(percorsi.copiaSincronizzazioneMcg, JSON.stringify(dump, null, 2));
        return { success: true, path: percorsi.copiaSincronizzazioneMcg };
    } catch (error) {
        await logToFile('WARN', 'Salvataggio copia sincronizzazione MCG non riuscito', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = {
    id: SITO_MCG,
    capacita: {
        transazioni: leggiTransazioni,
        copia: salvaCopia,
        online: modelleOnline,
        profilo: statoSospensioneProfilo,
        foto: fotoModella,
        // Raggiungibilità del sito (indicatore nell'header)
        ping: () => ping('https://www.mondocamgirls.com'),
        // Credito disponibile nell'area clienti (serve il login già fatto)
        credito: leggiCredito
    }
};
