# Gestione Show MCG V2

![Version](https://img.shields.io/badge/version-v1.10.7-blue.svg)
![Platform](https://img.shields.io/badge/platform-Electron-brightgreen.svg)

**Gestione Show MCG** è un'applicazione desktop basata sull'architettura **Electron**, progettata per la registrazione, l'organizzazione e l'analisi economica degli show e delle interazioni. Il sistema offre un monitoraggio completo della spesa rispetto a budget mensili prefissati e fornisce metriche e classifiche automatiche sui dati inseriti.

---

## 📸 Caratteristiche Principali

- **Tracciamento Completo**: Registrazione dettagliata di ciascuna sessione (data/ora, performer, piattaforma, costi, valutazioni e recensioni).
- **Classifica Automatica**: Elaborazione automatica delle metriche delle modella/performer in base a frequenza e punteggio medio.
- **Controllo Finanziario**: Monitoraggio dei costi mensili con soglie di budget configurabili e barre di avanzamento grafiche.
- **Sincronizzazione Remota**: Funzionalità integrata per l'importazione automatica delle transazioni da area clienti web.
- **Personalizzazione Visiva**: Supporto per temi multipli (Grigio Chiaro, Chiaro Standard, Scuro) e ridimensionamento dinamico del font.
- **Gestione Dati Integrata**: Backup e ripristino in formato JSON, con filtri avanzati per anno, ricerca testo e paginazione.

---

## 🚀 Sezioni e Navigazione

L'interfaccia si sviluppa in tre sezioni principali accessibili dalla barra superiore:

### 1. Form & Cronologia
Consente l'inserimento manuale, la modifica e la consultazione dell'archivio storico degli show.

| Campo | Tipo Dato | Descrizione |
| :--- | :--- | :--- |
| **Data e Ora** | Data/Ora ISO | Data e orario esatto della sessione. |
| **Nome Modella** | Testo (Autocompletamento) | Nome della performer. Recupera automaticamente link e foto salvati. |
| **Piattaforma** | Menù a tendina custom | Opzioni: *Teams, Telegram, Skype, Zoom, Altro*. Disabilitato se "Regalo". |
| **Costo (€)** | Numerico (Decimali) | Importo economico speso. |
| **Voto / Punteggio** | Selezione (1-5 o TBD) | Valutazione qualitativa (1-5) o `TBD` (To Be Defined) per revisioni rinvii. |
| **Regalo / Recensione**| Checkbox | Contrassegna eventi gratuiti/regalo o presenza di recensione. |
| **URL Foto / Profilo** | URL Web | Link esterni per l'avatar e il profilo web della modella. |

#### Funzionalità avanzate della Cronologia:
- **Paginazione Dinamica**: Selezione di vista a 5, 10, 20 elementi o elenco completo.
- **Filtri e Ricerca**: Filtro per anno (generato dinamicamente) e ricerca istantanea per testo.
- **Badge Origine**: Distinzione visiva tra record ad inserimento `👤 Manuale` o `🤖 Auto MCG`.

---

### 2. Classifica Generale Modelle
Elabora la cronologia salvata per generare indicatori prestazionali e statistici:

- **Podio Automatico**: Assegnazione visiva delle prime posizioni (🥇 1°, 🥈 2°, 🥉 3°) per le valutazioni più alte.
- **Media Voti**: Calcolo ponderato escludendo sessioni contrassegnate come regali o `TBD`.
- **Scheda Dettaglio (Modal)**: Cliccando su una riga si apre il resoconto storico dettagliato con quella singola modella.

---

### 3. Statistiche Mensili e Budget
Fornisce il controllo finanziario sulle uscite e i costi operativi:

- **Impostazione Budget**: Definisce la soglia massima speso mensile (€).
- **Barra di Avanzamento**: Monitoraggio percentuale in tempo reale con avvisi cromatici al raggiungimento o superamento dei limiti impostati.

---

## ⚙️ Funzioni di Sistema e Utility

Accessibili direttamente dall'intestazione dell'applicazione:

- **🔄 Sincronizzazione Automatica MCG**: Scarica e importa in automatico le transazioni dell'area clienti web non ancora registrate localmente.
- **💾 Esportazione / Importazione Backup**: Ripristino e salvataggio dei dati in formato JSON.
- **🎨 Accessibilità e Temi**:
  - **Dimensione Testo**: Pulsanti `A+` / `A-` per modificare al volo la grandezza dei font (12px - 26px).
  - **Temi Visivi**: Selezione tra *Grigio Chiaro*, *Chiaro Standard* e *Scuro*.
- **📁 Gestione Cartella Dati**: Collegamento rapido alla cartella `userData` di sistema per consultare file JSON e log.

---

## 🛠️ Requisiti e Installazione

1. Assicurati di aver installato [Node.js](https://nodejs.org/) (versione consigliata LTS).
2. Clona il repository locale ed entra nella directory del progetto:
   ```bash
   git clone https://github.com/blackcornercode/gestioneshow.git
   cd GestioneShow
   ```
3. Installa le dipendenze:
   ```bash
   npm install
   ```
4. Avvia l'applicazione in ambiente di sviluppo:
   ```bash
   npm start
   ```

---

## 📦 Build e Distribuzione

Per compilare l'applicazione per la distribuzione tramite l'eseguibile `AVVIA.bat` o generare i pacchetti binaries:

```bash
npm run make
```
*I file compilati verranno generati nella cartella `dist/` (esclusa dal tracciamento Git).*
