# 🛠️ Diario Privato: documentazione per lo sviluppo

Architettura, struttura del codice, test e build. Le regole per chi modifica il codice sono riassunte anche in [CLAUDE.md](../CLAUDE.md). L'evoluzione prevista verso una cronologia multi-sito è descritta in [ROADMAP.md](ROADMAP.md).

## 🗂️ Struttura del Progetto

| Percorso | Ruolo |
| :--- | :--- |
| `main.js` | Processo principale Electron: ciclo di vita dell'app, finestre, menu e stato della finestra. Registra i gestori IPC di `main/`. |
| `main/ipc-dati.js` | Archivio degli show e catalogo dei tag: lettura, salvataggio (con copia `.bak`), esportazione e importazione dei backup. |
| `main/catalogo-siti.js` | Catalogo dei siti di provenienza: validazione e siti iniziali (Mondo Cam Girls sempre presente). |
| `main/conversione.js` | Riconosce un archivio delle versioni precedenti alla 2.0, di cui `ipc-dati.js` salva una copia (`shows_data.prima-2.0.json`) prima che l'interfaccia lo converta. |
| `main/catalogo-tag.js` | Validazione del catalogo dei tag, colori disponibili e tag iniziali. |
| `main/ipc-sistema.js` | Versione, log, apertura di cartelle e link esterni, changelog e avviso "Novità". |
| `main/ipc-privacy.js`, `main/privacy.js` | Privacy: nome e icona neutri della finestra, PIN di sblocco (verificato solo nel processo principale), riduzione a icona rapida. |
| `main/ipc-connettori.js` | Canali generici dei connettori: l'interfaccia indica il sito e la funzione (transazioni, copia diagnostica, modelle online, stato del profilo, foto, raggiungibilità). |
| `main/connettori/index.js` | Registro dei connettori e delle funzioni che ciascuno offre. Per un nuovo sito: `main/connettori/<id>/index.js` che esporta `{ id, capacita }`. |
| `main/connettori/mcg/` | Connettore di Mondo Cam Girls: `index.js` (lettura delle transazioni con login, modelle online, profili sospesi o rimossi, foto, ping, credito residuo dell'area clienti), `indirizzi.js` (URL dei profili, pagina sospesa e credito disponibile, funzioni pure), `pagine.js` (lettura pagina per pagina della cronologia transazioni). |
| `main/canali.js` | Nomi dei canali IPC tra interfaccia e processo principale. |
| `main/log.js`, `main/rete.js`, `main/file.js`, `main/percorsi.js` | Supporto: log, download di pagine e ping con timeout (comuni ai connettori), scrittura atomica dei file e lettura del testo dei CSV (UTF-8 o Windows-1252), percorsi dei dati. |
| `tests/` | Test automatici (`npm test`), esclusi dalla build. |
| `tools/` | Strumenti di sviluppo, esclusi dalla build: screenshot del README con dati dimostrativi (`npm run screenshot`) e `CHANGELOG.md` da `changelog.json` (`npm run changelog`). |
| `docs/` | Guida all'uso, questa documentazione, screenshot e note di rilascio. |
| `preload.js` | Espone all'interfaccia le funzioni del processo principale (`window.electronAPI`). |
| `index.html`, `style.css`, `splash.html` | Pagina principale, stili e schermata di avvio. |
| `locales/` | Traduzioni `it.json` e `en.json`. |
| `changelog.json` | Novità per versione, mostrate nel modale *Novità e Changelog*. |
| `js/` | Codice dell'interfaccia, suddiviso in moduli (vedi sotto). |

I file di `js/` sono **moduli ES** (`import`/`export`): `index.html` carica solo `js/app.js` (`<script type="module">`), che importa gli altri. Lo stato condiviso tra i moduli è un unico oggetto `stato` (in `stato.js`), perché le variabili importate sono in sola lettura.

**Azioni dell'interfaccia.** L'HTML non contiene JavaScript (`onclick`, `onchange`, `onerror`…): gli elementi dichiarano un'azione con attributi `data-azione`, `data-al-cambio` o `data-al-input` (es. `<button data-azione="modifica-show" data-id="…">`), e `azioni.js` le esegue con un solo ascoltatore sul documento. La tabella di tutte le azioni è in `app.js` (`registraAzioni`). Se più elementi annidati hanno un'azione vince il più interno (es. la foto dentro una riga cliccabile).

**Content-Security-Policy.** `index.html` vieta script esterni e codice JavaScript scritto nell'HTML (`script-src 'self'`): un eventuale testo malevolo inserito in un campo non può eseguire codice. `splash.html` non permette script.

| Modulo | Contenuto |
| :--- | :--- |
| `logger.js` | Log a console, a file e nel pannello log. |
| `i18n.js` | Elenco delle lingue (`LINGUE`), caricamento, funzione `t()` e `localeCorrente()` per le date formattate nella lingua dell'interfaccia. |
| `stato.js` | Stato condiviso: l'oggetto `stato` (archivio in memoria, filtri, pagina corrente, classifica…). |
| `azioni.js` | Esecuzione delle azioni dichiarate negli attributi `data-azione`/`data-al-cambio`/`data-al-input`, e sostituzione delle foto che non si caricano. |
| `utils.js` | Funzioni comuni: escape HTML, ID univoci, lettura delle date (anche formato italiano `gg/mm/aaaa`), normalizzazione dei record vecchi (`normalizzaShow`), formattazione importi, voti e durate, link esterni. |
| `calcoli.js` | Calcoli puri sugli show, senza accesso alla pagina: classifica, totali di una modella, statistiche per anno, budget, filtri e pagine della cronologia, modifica di più show insieme, mappe di foto e profili. Verificati dai test. |
| `righe-show.js` | Disegnatore unico delle righe degli show: ogni colonna (intestazione e cella) è definita una volta; cronologia, dettaglio del mese e scheda modella sono elenchi di colonne. |
| `archivio.js` | Archivio in memoria: letto da disco solo all'avvio e dopo un'importazione; aggiunte, modifiche ed eliminazioni (anche di più show insieme) salvano su disco e ridisegnano le viste senza rileggere il file. |
| `preferenze.js` | Schede, tema, dimensione font, note per intero (classe `note-complete` sul body), budget, versione. |
| `filtri-salvati.js` | Ordine e filtri delle tabelle ricordati alla riapertura (localStorage); la ricerca per nome resta esclusa. |
| `galleria.js` | Lightbox e navigazione foto. |
| `form-show.js` | Form di inserimento/modifica, autocompilazione, eliminazione. |
| `dati.js` | Esportazione e importazione dei backup, apertura della cartella dati. |
| `cronologia.js` | Cronologia show, filtri e paginazione. |
| `tag.js` | Tag degli show: etichette colorate, selettore del form, scelta nella modifica multipla, filtro della cronologia e finestra Gestisci tag. |
| `siti.js` | Siti di provenienza degli show (solo dati): `SITO_MCG`, ricerca nel catalogo, sigla, sito predefinito (localStorage). |
| `gestione-siti.js` | Siti nell'interfaccia: badge nelle tabelle, scelta del sito nel form, filtri di cronologia e classifica, campo della modifica multipla, finestra Gestisci siti. |
| `csv.js` | CSV come funzioni pure: lettura (separatore, virgolette, BOM), abbinamento delle colonne, lettura di date, importi e durate, preparazione dell'importazione (nuovi, doppioni, errori, conversione di valuta) ed esportazione. Verificato da `tests/csv.test.js`. |
| `importa-csv.js` | Finestra di importazione da CSV ed esportazione della cronologia. |
| `selezione.js` | Selezione multipla della cronologia: barra della selezione, eliminazione e modifica di più show insieme. |
| `grafico-spesa.js` | Grafico a barre della spesa (per mese o per anno), disegnato in SVG senza librerie esterne. |
| `statistiche.js` | Statistiche mensili e indicatori budget. |
| `classifica.js` | Classifica modelle. |
| `preventivo.js` | Scheda Preventivo (prezzo atteso, confronto del prezzo chiesto con la media della modella e con quella generale), tabella dei prezzi suggeriti e riquadro nella scheda della modella; i calcoli (`prezzoSuggerito`, `valutaPrezzo`, `prezziSuggeriti`) sono in `calcoli.js`. |
| `modale-modella.js` | Scheda dettaglio modella: profili e totali per sito, foto dal sito che le offre. |
| `unisci-modelle.js` | Unisci / separa modelle dalla scheda (rinomina degli show con `rinominaModella` di `calcoli.js`, che salva il nome di acquisto in `nomeOriginale`). |
| `connettori.js` | Funzioni dei connettori ricevute dal processo principale (`caricaConnettori`) e `funzioneDisponibile(sito, funzione)`, da controllare prima di contattare un sito; profilo di una modella su un sito (`urlProfiloSulSito`, `urlModelleDelSito`). |
| `connettore-mcg.js` | Parti del connettore MCG usate dall'interfaccia: sottodominio del profilo e indirizzo dedotto dal nome. |
| `sincronizzazione.js` | Importazione transazioni da Mondo Cam Girls. |
| `changelog.js` | Modale novità. |
| `stato-mcg.js` | Indicatore di raggiungibilità di Mondo Cam Girls. |
| `credito-mcg.js` | Credito residuo su Mondo Cam Girls nell'intestazione: letto a ogni sincronizzazione e in background con il login salvato (funzione `credito` del connettore), ultimo valore in localStorage. |
| `profili-sospesi.js` | Profili sospesi o rimossi su Mondo Cam Girls: verifica in background e badge in classifica e nella scheda. |
| `stato-online.js` | Modelle online su Mondo Cam Girls: badge e filtro in classifica e nella scheda. |
| `privacy.js` | Sfocatura delle foto, schermata di blocco con PIN, blocco per inattività, tasto rapido personalizzabile per nascondere l'app, opzioni di privacy del menu Impostazioni. |
| `form-assistito.js` | Parti assistite del form: show/regalo, stelle, durate rapide, €/min mentre si scrive, mini-scheda della modella, riepilogo dei dettagli. |
| `menu-header.js` | Menu a tendina Dati e Impostazioni dell'intestazione. |
| `app.js` | Punto di ingresso: importa i moduli, registra le azioni dell'interfaccia, collega l'archivio alle viste, avvia l'applicazione. |

---

## 🛠️ Requisiti e Installazione

1. Assicurati di aver installato [Node.js](https://nodejs.org/) (versione consigliata LTS).
2. Clona il repository ed entra nella directory del progetto:
   ```bash
   git clone https://github.com/blackcornercode/private-diary.git
   cd private-diary
   ```
3. Installa le dipendenze:
   ```bash
   npm install
   ```
4. Avvia l'applicazione con `npm start` (oppure con `AVVIA.bat` su Windows).
   > Se l'avvio dal terminale di VS Code fallisce con `Cannot read properties of undefined (reading 'getPath')`, è impostata la variabile d'ambiente `ELECTRON_RUN_AS_NODE`: rimuovila prima di lanciare l'app.
5. Per creare l'installer e l'eseguibile portable per Windows:
   ```bash
   npm run dist
   ```
   Vengono creati due file in `dist/`:
   - `PrivateDiary-<versione>-setup.exe`: installer NSIS **per utente** (in `%LOCALAPPDATA%\Programs\Private Diary`, senza permessi di amministratore), con scelta della cartella, collegamenti nel menu Start e sul desktop, nella lingua di Windows se è tra quelle dell'app (`installerLanguages`), altrimenti in inglese. Il rumeno manca: l'NSIS di electron-builder non ha tutti i suoi testi e la build si ferma (gli avvisi valgono come errori), quindi per chi ha Windows in rumeno l'installer è in inglese e l'app in rumeno. Il disinstallatore non tocca i dati (`deleteAppDataOnUninstall: false`).
   - `PrivateDiary-<versione>-portable.exe`: versione portable. A ogni avvio si estrae sempre nella stessa cartella, `%TEMP%\PrivateDiary` (`portable.unpackDirName`), invece che in una cartella con nome casuale: l'estrazione in cartelle temporanee sempre diverse è uno dei comportamenti che gli antivirus (es. AVG con *IDP.ALEXA*) giudicano sospetti.

   L'eseguibile non è firmato digitalmente, quindi SmartScreen e alcuni antivirus possono segnalarlo come sconosciuto: vedi la sezione sugli avvisi antivirus del README. La soluzione definitiva sarebbe un certificato di firma del codice.
   Per una prova veloce senza creare l'eseguibile, `npm run pack` prepara solo la cartella `dist/win-unpacked/` (circa 10 secondi invece di quasi 2 minuti); l'app si avvia da `dist/win-unpacked/Private Diary.exe`.

### Test automatici
```bash
npm test
```
Esegue i test in `tests/` con il test runner integrato di Node (nessuna dipendenza aggiuntiva), in meno di un secondo:
- **funzioni dell'interfaccia** (`utils.js`, `calcoli.js`, `righe-show.js`, `archivio.js`, parte di `sincronizzazione.js`): date, normalizzazione dei record vecchi, €/min, voti, durate, importi e tipi delle transazioni MCG. I moduli ES di `js/` vengono importati in Node con sostituti minimi di `document` e `localStorage` (`js/package.json` indica a Node che sono moduli ES);
- **struttura dei moduli** (`moduli.test.js`): ogni nome importato esiste nel modulo di origine, ogni funzione di un altro modulo usata nel codice è importata, ogni azione usata nell'HTML è registrata in `app.js`, e l'HTML non contiene JavaScript inline;
- **funzioni del processo principale** (`main/connettori/mcg/indirizzi.js`, `main/connettori/mcg/pagine.js`, registro dei connettori);
- **coerenza dei canali IPC**: ogni canale usato in `preload.js` deve essere definito in `main/canali.js` e avere un gestore registrato (il preload, in sandbox, non può importare `canali.js`);
- **traduzioni** (`traduzioni.test.js`): ogni lingua di `LINGUE` ha il suo file in `locales/` con le stesse chiavi e gli stessi segnaposto (`{n}`, `{nome}`…) di `it.json`, e compare in entrambi i selettori della lingua di `index.html`.

`npm run dist` esegue automaticamente i test prima della build (`predist`): se un test fallisce, l'eseguibile non viene creato.

### Aggiungere una lingua
1. Copiare `locales/en.json` in `locales/<codice>.json` e tradurre i testi, lasciando invariati chiavi, segnaposto tra graffe ed emoji. Il nome dell'app resta «Private Diary» (in italiano «Diario Privato»).
2. Aggiungere la lingua a `LINGUE` in `js/i18n.js` (nome e formato delle date, es. `'de-DE'`) e un `<option>` ai due selettori `selectLingua` e `linguaBenvenuto` di `index.html`.
3. In `package.json` aggiungere il codice a `build.electronLanguages` (senza, la lingua di Windows non viene riconosciuta al primo avvio) e a `build.nsis.installerLanguages`, poi verificare con `npm run dist`: se l'NSIS non ha tutti i testi della lingua la build si ferma con «warning treated as error», e la lingua va tolta da `installerLanguages` (come il rumeno).
4. `npm test` segnala chiavi mancanti, segnaposto diversi o selettori incompleti.

Restano solo in italiano i menu della finestra (File, Finestra, ?), le finestre Informazioni e Contatti e i messaggi di avviso (`alert`/`confirm`) scritti direttamente nel codice.

### Cosa include la build
La configurazione è nella sezione `build` di `package.json` ed è pensata per tenere l'eseguibile leggero:
- **Solo i file dell'app**: `files` elenca esplicitamente i file necessari (`main.js`, `preload.js`, pagine, stili, `js/`, `locales/`, `changelog.json`, icona). File di sviluppo come `.vscode/`, `AVVIA.bat`, `docs/`, `tools/` e i README restano fuori. Un nuovo file usato dall'app va aggiunto a questo elenco.
- **Dipendenze ridotte al necessario**: di Font Awesome vengono inclusi solo il CSS e i font `.woff2`; del font Inter solo i pesi usati (400, 500, 600, 700), senza corsivo e solo in formato `.woff2`.
- **Lingue di Chromium**: `electronLanguages` mantiene solo le lingue dell'interfaccia invece di 55 (servono anche a riconoscere la lingua di Windows al primo avvio; per il portoghese sia `pt-BR` sia `pt-PT`). I valori della tabella sono stati misurati con le sole italiano e inglese; con le otto lingue della 2.0.0 le lingue di Chromium occupano 6.6 MB, `app.asar` 2.9 MB e l'eseguibile portable 105 MB.

| | Prima | Dopo |
| :--- | ---: | ---: |
| Eseguibile portable | 106 MB | 93 MB |
| Codice e risorse dell'app (`app.asar`) | 25 MB, 3220 file | 2.4 MB |
| Lingue di Chromium | 49 MB | 1.3 MB |

La parte restante dell'eseguibile è il runtime di Electron, che non si può ridurre.


## 📸 Screenshot e anteprima per GitHub
```bash
npm run screenshot
```
Rigenera le immagini in `docs/screenshot/` (cronologia, form, classifica, scheda modella, statistiche, privacy e l'anteprima social 1280×640). L'app parte con `--user-data-dir` su una cartella temporanea che contiene solo un **archivio dimostrativo** (`tools/screenshot/genera-demo.cjs`: modelle, nickname e note inventati, avatar grafici al posto delle foto): i dati veri non vengono mai letti. L'interfaccia è in inglese, come il README principale.

## 📜 Changelog
```bash
npm run changelog
```
Genera `CHANGELOG.md` e le note di rilascio dell'ultima versione (`docs/note-di-rilascio.md`) da `changelog.json`, che resta l'unica fonte (è anche quella mostrata nell'app).
