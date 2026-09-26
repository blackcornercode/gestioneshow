# Gestione Show MCG V2

![Version](https://img.shields.io/badge/version-v1.10.8-blue.svg)
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
- **Gestione Dati Integrata**: Backup e ripristino in formato JSON, con filtri avanzati per anno, ricerca per nome e paginazione.

---

## 🚀 Sezioni e Navigazione

L'interfaccia si sviluppa in tre sezioni principali accessibili dalla barra superiore:

### 1. Form & Cronologia
Consente l'inserimento manuale, la modifica e la consultazione dell'archivio storico degli show.

| Campo | Tipo Dato | Descrizione |
| :--- | :--- | :--- |
| **Data e Ora** | Data/Ora ISO | Data e orario esatto della sessione. |
| **Nome Modella** | Testo (Autocompletamento) | Nome della camgirl. Recupera automaticamente link e foto salvati. |
| **Piattaforma** | Menù a tendina custom | Opzioni: *Teams, Telegram, Skype, Zoom, Altro*. Disabilitato se "Regalo". |
| **Costo (€)** | Numerico (Decimali) | Importo economico speso per lo show. |
| **Voto / Punteggio** | Selezione (1-5 o TBD) | Valutazione qualitativa (1-5) o `TBD` (*To Be Decided*) per revisioni rinviate. |
| **Regalo / Recensione**| Checkbox | Contrassegna eventi gratuiti/regalo o presenza di recensione lasciata. |
| **URL Foto / Profilo** | URL Web | Link esterni per la foto e il profilo web della performer. |

#### Funzionalità avanzate della Cronologia:
- **Paginazione Dinamica**: Selezione di vista a 5, 10, 20 elementi o elenco completo.
- **Filtri e Ricerca**: Filtro per anno (generato dinamicamente) e ricerca istantanea per testo.
- **Badge Origine**: Distinzione visiva tra record ad inserimento `👤 Manuale` o `🤖 Auto MCG`.

---

### 2. Classifica Generale Modelle
Elabora la cronologia salvata per generare indicatori prestazionali e statistici sulle camgirl:

- **Podio Automatico**: Assegnazione visiva delle prime posizioni (🥇 1°, 🥈 2°, 🥉 3°) per le valutazioni più alte.
- **Media Voti**: Calcolo ponderato escludendo sessioni contrassegnate come regali o `TBD`.
- **Scheda Dettaglio (Modal)**: Cliccando su una riga si apre il resoconto storico dettagliato degli show effettuati con la singola modella.

---

### 3. Statistiche Mensili e Budget
Fornisce il controllo finanziario sulle uscite e sui costi degli show:

- **Impostazione Budget**: Definisce la soglia massima di spesa mensile (€).
- **Avanzamento e Indicatori Dynamic**: Monitoraggio percentuale in tempo reale con avvisi cromatici e messaggi contestuali tradotti in base al superamento o rispetto del budget.
- **Visualizzazione Tabellare Dettagliata**: Prospetto dei 12 mesi con contatore degli show effettuati, totale speso e vista espandibile per singolo mese.

---

## ⚙️ Funzioni di Sistema e Utility

Accessibili direttamente dall'intestazione dell'applicazione:

- **🌍 Selezione Lingua (i18n)**: Selettore orizzontale affiancato nell'header per lo switch istantaneo tra Italiano (`it`) e Inglese (`en`).
- **🔄 Sincronizzazione Automatica MCG**: Scarica e importa in automatico le transazioni dal profilo Mondo Cam Girls non ancora registrate localmente.
- **💾 Esportazione / Importazione Backup**: Ripristino e salvataggio dell'intero archivio in formato JSON.
- **🎨 Accessibilità e Temi**:
  - **Dimensione Testo**: Pulsanti `A+` / `A-` per modificare al volo la grandezza dei font (12px - 26px).
  - **Temi Visivi**: Selezione tra *Neve & Nebbia*, *Luce Chiara* ed *Eclissi Scura*.
- **📁 Gestione Cartella Dati**: Collegamento rapido alla cartella `userData` di sistema per consultare file JSON e log.

---

## 🛠️ Requisiti e Installazione

1. Assicurati di aver installato [Node.js](https://nodejs.org/) (versione consigliata LTS).
2. Clona il repository locale ed entra nella directory del progetto:
   ```bash
   git clone [https://github.com/blackcornercode/gestioneshow.git](https://github.com/blackcornercode/gestioneshow.git)
   cd GestioneShow
