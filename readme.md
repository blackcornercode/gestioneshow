# Gestione Show MCG V2

![Version](https://img.shields.io/badge/version-v1.11.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Electron-brightgreen.svg)

**Gestione Show MCG** è un'applicazione desktop basata sull'architettura **Electron**, progettata per il monitoraggio, l'organizzazione e la storicizzazione degli show con **camgirl**. Il sistema offre un tracciamento avanzato delle sessioni e della spesa rispetto a budget mensili prefissati, fornendo metriche, statistiche economiche e classifiche automatiche. È nativamente integrata con il portale web **Mondo Cam Girls**.

---

## 📸 Caratteristiche Principali

- **Storicizzazione e Monitoraggio Show**: Registrazione dettagliata di ciascuna sessione con camgirl (data/ora, performer, piattaforma utilizzata, costi, valutazioni e recensioni).
- **Integrazione Mondo Cam Girls**: Sincronizzazione remota integrata per l'importazione automatica delle transazioni direttamente dall'area clienti web del sito Mondo Cam Girls.
- **Internazionalizzazione (i18n)**: Supporto nativo multilingua (Italiano 🇮🇹 ed Inglese 🇬🇧) con caricamento dinamico e persistenza della lingua selezionata.
- **Classifica Automatica Performer**: Elaborazione automatica delle metriche e delle valutazioni delle modella/camgirl in base a frequenza e punteggio medio.
- **Controllo Finanziario e Budget**: Monitoraggio della spesa mensile con soglie configurabili, avvisi di sforamento e barre di avanzamento grafiche.
- **Personalizzazione Visiva**: Supporto per temi multipli (*Neve & Nebbia*, *Luce Chiara*, *Eclissi Scura*) e ridimensionamento dinamico del font.
- **Gestione Dati Integrata**: Backup e ripristino in formato JSON (archivio show e budget mensile), con filtri avanzati per anno, ricerca per nome e paginazione.

---

## 🚀 Sezioni e Navigazione

L'interfaccia si sviluppa in tre sezioni principali accessibili dalla barra superiore:

### 1. Form & Cronologia
Consente l'inserimento manuale, la modifica e la consultazione dell'archivio storico degli show.

Il form è chiuso di default per lasciare spazio alla cronologia: si apre con **＋ Nuovo show** oppure con il pulsante ✏️ (Modifica) di una riga. Dopo il salvataggio si richiude; chiudendolo durante una modifica, la modifica viene annullata, mentre una bozza di nuovo show resta compilata.

| Campo | Tipo Dato | Descrizione |
| :--- | :--- | :--- |
| **Data e Ora** | Data/Ora ISO | Data e orario esatto della sessione. Una data non valida blocca il salvataggio con un avviso. |
| **Nome Modella** | Testo (Autocompletamento) | Nome della camgirl. Recupera automaticamente link e foto salvati. |
| **Piattaforma** | Menù a tendina custom | Opzioni: *Teams, Telegram, Skype, Zoom, Altro*. Disabilitato se "Regalo". |
| **Costo (€)** | Numerico (Decimali) | Importo economico speso per lo show. |
| **Durata Show** | Numerico (minuti) | Durata della sessione, usata anche per il costo al minuto. |
| **Voto / Punteggio** | Selezione (1-5 o TBD) | Valutazione qualitativa (1-5) o `TBD` (*To Be Decided*) per revisioni rinviate. |
| **Regalo / Recensione**| Checkbox | Contrassegna eventi gratuiti/regalo o presenza di recensione lasciata. |
| **URL Foto / Profilo** | URL Web | Link esterni per la foto e il profilo web della performer. |

#### Funzionalità avanzate della Cronologia:
- **Paginazione Dinamica**: Selezione di vista a 5, 10, 20 elementi o elenco completo.
- **Filtri e Ricerca**: Filtro per anno (generato dinamicamente) e ricerca istantanea per testo.
- **Badge Origine**: Distinzione visiva tra record ad inserimento manuale (`👤`) o importati da MCG (`🤖 MCG`).
- **Righe compatte**: Modifica (✏️) ed Elimina (🗑️) sono pulsanti a icona; nickname e note lunghi sono troncati con "…" e il testo completo compare al passaggio del mouse. Cliccando su una nota (o premendo Invio quando è selezionata) la si espande per leggerla tutta; un secondo clic la richiude. Se la finestra è stretta, la tabella scorre in orizzontale invece di tagliare le colonne.
- **Costo al Minuto (€/min)**: Calcolato automaticamente come costo ÷ durata. Mostra `–` per gli show senza durata registrata e per i regali.
- **Colori con significato** (gli stessi in cronologia, scheda modella e dettaglio del mese):
  - **Voto**: badge verde (5), verde acqua (4), ambra (3), rosso (1-2); `TBD` in grigio.
  - **€/min**: verde se lo show è costato meno al minuto della tua media su tutti gli show, rosso se di più; entro ±10% dalla media resta neutro. Il valore della media compare passando il mouse.
  - **Dati mancanti e regali**: durata non registrata mostrata come `–` in grigio; costo e voto dei regali attenuati.
  - Tutte le coppie testo/sfondo rispettano il contrasto minimo WCAG di 4.5:1 in ogni tema, righe a zebra comprese.

---

### 2. Classifica Generale Modelle
Elabora la cronologia salvata per generare indicatori prestazionali e statistici sulle camgirl:

- **Podio Automatico**: Assegnazione visiva delle prime posizioni (🥇 1°, 🥈 2°, 🥉 3°) per le valutazioni più alte.
- **Media Voti**: Calcolo ponderato escludendo sessioni contrassegnate come regali o `TBD`.
- **€/min Medio**: Costo medio al minuto per modella, presente anche nella scheda dettaglio. È calcolato come spesa ÷ minuti dei soli show con durata registrata, regali esclusi, così gli show più vecchi senza durata non gonfiano il risultato.
- **Scheda Dettaglio (Modal)**: Cliccando su una riga si apre il resoconto storico dettagliato degli show effettuati con la singola modella.

---

### 3. Statistiche Mensili e Budget
Fornisce il controllo finanziario sulle uscite e sui costi degli show:

- **Impostazione Budget**: Definisce la soglia massima di spesa mensile (€).
- **Avanzamento e Indicatori Dynamic**: Monitoraggio percentuale in tempo reale con avvisi cromatici e messaggi contestuali tradotti in base al superamento o rispetto del budget.
- **Visualizzazione Tabellare Dettagliata**: Prospetto dei 12 mesi con contatore degli show effettuati, totale speso e vista espandibile per singolo mese.

---

## ⚙️ Funzioni di Sistema e Utility

L'intestazione mostra sempre **🔄 Sincronizza MCG** e l'indicatore di raggiungibilità del sito. Le altre funzioni sono raccolte in due menu a tendina:
- **💾 Dati**: Esporta, Importa, Cartella.
- **⚙️ Impostazioni**: dimensione del testo, lingua, tema.

I menu si chiudono con un clic fuori o con `Esc`.

- **🌍 Selezione Lingua (i18n)**: Switch istantaneo tra Italiano (`it`) e Inglese (`en`), dal menu Impostazioni.
- **🔄 Sincronizzazione Automatica MCG**: Scarica e importa in automatico le transazioni dal profilo Mondo Cam Girls non ancora registrate localmente.
  - **Anti-duplicato**: una transazione è considerata già salvata se esiste uno show con la stessa modella e la stessa data/ora (al minuto). Se nella pagina ci sono più transazioni con la stessa modella nello stesso minuto, vengono importate tutte quelle non ancora presenti.
  - Le righe della tabella senza una data valida (intestazioni, totali) vengono ignorate.
- **💾 Esportazione / Importazione Backup**: Ripristino e salvataggio dell'intero archivio in formato JSON, incluso il budget mensile. I backup delle versioni precedenti (solo elenco show) restano importabili; in quel caso il budget attuale non viene modificato.
- **🎨 Accessibilità e Temi**:
  - **Dimensione Testo**: Pulsanti `A+` / `A-` per modificare al volo la grandezza dei font (12px - 26px).
  - **Temi Visivi**: Selezione tra *Neve & Nebbia*, *Luce Chiara* ed *Eclissi Scura*. I colori di stato (budget, mese corrente, badge) sono definiti come variabili CSS per ogni tema in `style.css`.
  - **Font e icone in locale**: il font Inter e le icone Font Awesome sono inclusi tra le dipendenze (`@fontsource/inter`, `@fortawesome/fontawesome-free`), quindi l'interfaccia si vede correttamente anche offline.
- **📁 Gestione Cartella Dati**: Collegamento rapido alla cartella `userData` di sistema per consultare file JSON e log.

---

## 💾 Dati e Backup

I dati sono salvati nella cartella `userData` dell'applicazione (apribile dal pulsante **📁 Cartella Dati**):

| File | Contenuto |
| :--- | :--- |
| `shows_data.json` | Archivio degli show (array JSON). Scritto in modo atomico: un crash durante il salvataggio non lo lascia mai troncato. |
| `shows_data.bak.json` | Copia della versione precedente, aggiornata a ogni salvataggio o importazione. |
| `shows_data.corrotto-<timestamp>.json` | Copia di un archivio illeggibile, conservata invece di sovrascriverlo. |
| `app.log` | Log dell'applicazione (righe più recenti in alto, massimo 5000). |
| `window_state.json` | Dimensione e posizione della finestra. |

Il budget mensile, il tema, la lingua e i filtri sono salvati nel `localStorage` dell'interfaccia.

Formato del file di backup esportato:

```json
{
  "formato": "gestioneshow-backup",
  "versione": 1,
  "versioneApp": "1.11.0",
  "shows": [ ... ],
  "impostazioni": { "monthly_budget": "300" }
}
```

---

## 🗂️ Struttura del Progetto

| Percorso | Ruolo |
| :--- | :--- |
| `main.js` | Processo principale Electron: finestre, salvataggio dati e backup, log, scaricamento pagine da Mondo Cam Girls. |
| `preload.js` | Espone all'interfaccia le funzioni del processo principale (`window.electronAPI`). |
| `index.html`, `style.css`, `splash.html` | Pagina principale, stili e schermata di avvio. |
| `locales/` | Traduzioni `it.json` e `en.json`. |
| `changelog.json` | Novità per versione, mostrate nel modale *Novità e Changelog*. |
| `js/` | Codice dell'interfaccia, suddiviso in moduli (vedi sotto). |

I moduli in `js/` sono script classici caricati in ordine da `index.html` e condividono lo scope globale, necessario per gli `onclick` inline nell'HTML. `app.js` va caricato per ultimo.

| Modulo | Contenuto |
| :--- | :--- |
| `logger.js` | Log a console, a file e nel pannello log. |
| `i18n.js` | Caricamento lingue e funzione `t()`. |
| `stato.js` | Variabili globali dell'applicazione. |
| `utils.js` | Funzioni comuni: escape HTML, ID univoci, lettura delle date (anche formato italiano `gg/mm/aaaa`), formattazione importi e durate, link esterni. |
| `preferenze.js` | Schede, tema, dimensione font, budget, versione. |
| `galleria.js` | Lightbox e navigazione foto. |
| `form-show.js` | Form di inserimento/modifica, autocompilazione, eliminazione. |
| `dati.js` | Caricamento dati, aggiornamento interfaccia, esportazione/importazione backup. |
| `cronologia.js` | Cronologia show, filtri e paginazione. |
| `statistiche.js` | Statistiche mensili e indicatori budget. |
| `classifica.js` | Classifica modelle. |
| `modale-modella.js` | Scheda dettaglio modella e foto da Mondo Cam Girls. |
| `sincronizzazione.js` | Importazione transazioni da Mondo Cam Girls. |
| `changelog.js` | Modale novità. |
| `stato-mcg.js` | Indicatore di raggiungibilità di Mondo Cam Girls. |
| `menu-header.js` | Menu a tendina Dati e Impostazioni dell'intestazione. |
| `app.js` | Avvio dell'applicazione. |

---

## 🛠️ Requisiti e Installazione

1. Assicurati di aver installato [Node.js](https://nodejs.org/) (versione consigliata LTS).
2. Clona il repository ed entra nella directory del progetto:
   ```bash
   git clone https://github.com/blackcornercode/gestioneshow.git
   cd gestioneshow
   ```
3. Installa le dipendenze:
   ```bash
   npm install
   ```
4. Avvia l'applicazione con `npm start` (oppure con `AVVIA.bat` su Windows).
   > Se l'avvio dal terminale di VS Code fallisce con `Cannot read properties of undefined (reading 'getPath')`, è impostata la variabile d'ambiente `ELECTRON_RUN_AS_NODE`: rimuovila prima di lanciare l'app.
5. Per creare l'eseguibile portable per Windows:
   ```bash
   npm run dist
   ```
   Il file viene creato in `dist/GestioneShowMCG-<versione>-portable.exe`.
   Per una prova veloce senza creare l'eseguibile, `npm run pack` prepara solo la cartella `dist/win-unpacked/` (circa 10 secondi invece di quasi 2 minuti); l'app si avvia da `dist/win-unpacked/Gestione Show MCG.exe`.

### Cosa include la build
La configurazione è nella sezione `build` di `package.json` ed è pensata per tenere l'eseguibile leggero:
- **Solo i file dell'app**: `files` elenca esplicitamente i file necessari (`main.js`, `preload.js`, pagine, stili, `js/`, `locales/`, `changelog.json`, icona). File di sviluppo come `.vscode/`, `AVVIA.bat` e `readme.md` restano fuori. Un nuovo file usato dall'app va aggiunto a questo elenco.
- **Dipendenze ridotte al necessario**: di Font Awesome vengono inclusi solo il CSS e i font `.woff2`; del font Inter solo i pesi usati (400, 500, 600, 700), senza corsivo e solo in formato `.woff2`.
- **Lingue di Chromium**: `electronLanguages` mantiene solo italiano e inglese invece di 55 lingue.

| | Prima | Dopo |
| :--- | ---: | ---: |
| Eseguibile portable | 106 MB | 93 MB |
| Codice e risorse dell'app (`app.asar`) | 25 MB, 3220 file | 2.4 MB |
| Lingue di Chromium | 49 MB | 1.3 MB |

La parte restante dell'eseguibile è il runtime di Electron, che non si può ridurre.
