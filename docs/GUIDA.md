# 📔 Diario Privato: guida all'uso

Guida completa di tutte le funzioni dell'app. Per una presentazione rapida vedi il [README](../README.it.md); per architettura, test e build vedi [SVILUPPO.md](SVILUPPO.md).

## 📸 Caratteristiche Principali

- **Storicizzazione e Monitoraggio Show**: Registrazione dettagliata di ciascuna sessione con camgirl (data/ora, performer, piattaforma utilizzata, costi, valutazioni e recensioni).
- **Integrazione Mondo Cam Girls**: Sincronizzazione remota integrata per l'importazione automatica delle transazioni direttamente dall'area clienti web del sito Mondo Cam Girls.
- **Internazionalizzazione (i18n)**: Supporto nativo multilingua (italiano, inglese, spagnolo, francese, tedesco, portoghese, rumeno e russo) con caricamento dinamico e persistenza della lingua selezionata.
- **Classifica Automatica Performer**: Elaborazione automatica delle metriche e delle valutazioni delle modella/camgirl in base a frequenza e punteggio medio.
- **Controllo Finanziario e Budget**: Monitoraggio della spesa mensile con soglie configurabili, avvisi di sforamento e barre di avanzamento grafiche.
- **Personalizzazione Visiva**: Supporto per temi multipli (*Neve & Nebbia*, *Luce Chiara*, *Eclissi Scura*, *Bordeaux & Oro*) e ridimensionamento dinamico del font.
- **Tag, privacy e grafici**: tag personalizzabili per il tipo di show, PIN di sblocco, foto sfocate, nome neutro e grafico della spesa.
- **Gestione Dati Integrata**: Backup e ripristino in formato JSON (archivio show e budget mensile), con filtri avanzati per anno, ricerca per nome e paginazione.

---

## 👋 Primo avvio e siti in uso

Diario Privato funziona con **qualsiasi sito di cam**. Al primo avvio, con l'archivio vuoto, una finestra di benvenuto chiede la **lingua** (proposta in base a quella di Windows se è tra le otto disponibili, altrimenti inglese; cambiandola la finestra si traduce subito), **su quali siti acquisti gli show** e qual è il **sito principale** (predefinito per gli show nuovi). La scelta si cambia in qualsiasi momento in **⚙️ Impostazioni › 🌐 Gestisci siti** con la casella accanto alla sigla di ogni sito:
- nel form compaiono solo i **siti in uso** (più quello dello show che stai modificando); nei filtri anche i siti che hanno già degli show;
- le funzioni collegate a **Mondo Cam Girls** (indicatore «MCG: Online», credito residuo, sezione *Importa da Mondo Cam Girls* del menu Dati, filtro *Solo online*, badge Online/Sospesa, galleria foto della scheda) compaiono e contattano il sito **solo se Mondo Cam Girls è in uso**; la galleria della scheda solo per le modelle con show su MCG;
- per gli altri siti lo storico si importa da **CSV** (vedi sotto).

Chi aggiorna da una versione precedente non vede il benvenuto: tutti i siti restano in uso e l'app funziona come prima.

## 🚀 Sezioni e Navigazione

Sotto il nome dell'app, nell'intestazione, una riga ne riassume lo scopo: *Ogni show registrato, ogni euro sotto controllo, ogni modella al posto giusto in classifica.*

L'interfaccia si sviluppa in quattro sezioni principali accessibili dalla barra superiore:

### 1. Show & Cronologia
Consente l'inserimento manuale, la modifica e la consultazione dell'archivio storico degli show.

Il form è chiuso di default per lasciare spazio alla cronologia: si apre con **＋ Nuovo show** oppure con il pulsante ✏️ (Modifica) di una riga. Dopo il salvataggio si richiude; chiudendolo durante una modifica, la modifica viene annullata, mentre una bozza di nuovo show resta compilata.

Il form è diviso in quattro sezioni con un titolo, nell'ordine in cui si registra uno show. In alto, accanto al titolo (**Aggiungi show** o **Modifica show**), si sceglie **🎥 Show / 🎁 Regalo**: con «Regalo» spariscono durata, €/min, voto e piattaforma, che non valgono per i regali. In modifica una striscia gialla ricorda quale show stai modificando (data e modella).

| Sezione | Campi |
| :--- | :--- |
| **Chi e quando** | **Modella** (con autocompletamento), **🌐 Sito** e **Data e ora** sulla stessa riga; i campi obbligatori hanno l'asterisco rosso. Il sito si sceglie tra le sigle (es. MCG, SC, CB) e accanto al titolo compare il nome completo: per uno show nuovo vale il **sito predefinito**, poi, appena scrivi il nome di una modella già nell'archivio, il sito del suo ultimo show, a meno che tu non l'abbia scelto a mano. La data è preimpostata all'ora attuale (una data non valida blocca il salvataggio con un avviso). Sotto, se la modella è già nell'archivio, la **mini-scheda**: foto, numero di show, media voti, ultimo show (data, costo, durata, piattaforma), badge Online/Sospesa e tag usati più spesso, con il pulsante **↻ Ripeti ultimo show** che compila durata, costo (anche in token), tag e dettagli come nell'ultimo show con lei. |
| **Lo show** | **Durata**: una barra con 10/15/20/30/45/60 minuti e il campo **altro…** per un valore libero; facoltativa (senza durata lo show resta fuori dal calcolo del €/min). **Costo (€)** con il pulsante **= ultimo** per riusare il prezzo dell'ultimo show. Se il sito fa pagare in un'altra valuta (token, dollari, crediti…) il campo principale diventa **Token pagati** (o *Dollari pagati*…), con accanto l'equivalente in euro calcolato col tasso del sito (es. «= € 64,96») e sotto il tasso («1 token = € 0,08 su Stripchat») con il link **inserisci in euro** per scrivere direttamente il costo in euro; l'importo originale resta nel tooltip del costo (simbolo ¤). **Costo al minuto**: calcolato mentre scrivi, verde o rosso rispetto alla tua media, che compare accanto. |
| **Com'è andata** | **Voto** con gli stessi colori della cronologia (1-2 rosso, 3 ambra, 4 verde acqua, 5 verde, TBD grigio): quelli non scelti hanno solo il contorno. Un secondo clic sullo stesso voto lo toglie; senza voto lo show viene salvato come TBD. **Recensione fatta** è un interruttore. |
| **Tag e note** | Tag a «pillola», pieni nel loro colore quando scelti; quelli usati di solito con la modella hanno una ★. **＋ Nuovo tag** apre il campo per crearne uno. Sotto, le **note** in testo libero e la sezione **Dettagli**, chiusa, con piattaforma, nickname, link al profilo e URL della foto: si compilano da soli dall'ultimo show o da MCG e il titolo ne mostra il riepilogo. I valori compilati da soli seguono il nome scritto: se il nome cambia (es. da «Anna» ad «Annabella») vengono sostituiti da quelli della nuova modella, o svuotati se è nuova; quelli scritti a mano restano. |

La **barra dei pulsanti** (🧹 Svuota, Annulla in modifica, 💾 Salva show) resta sempre visibile in fondo allo schermo mentre scorri il form. **Svuota** azzera in un colpo tutti i campi e lascia il form aperto (in modifica equivale ad annullare: i dati salvati non cambiano).

Scorciatoie: **Ctrl+Invio** salva, **Esc** chiude il form (in modifica equivale ad Annulla).

#### Funzionalità avanzate della Cronologia:
- **Paginazione Dinamica**: Selezione di vista a 5, 10, 20 elementi o elenco completo.
- **Filtri e Ricerca**: Filtro per anno (generato dinamicamente, con la casella **Seleziona tutti** che spunta o toglie tutti gli anni e appare parzialmente spuntata se ne sono scelti solo alcuni; un anno che non ha più show, ad esempio perché sono stati eliminati, esce da solo dal filtro), filtro per **sito**, filtro per tag e ricerca istantanea per testo.
- **Badge del sito**: sotto l'ora di ogni show, in tutte le tabelle, la sigla del sito nel suo colore, con `🤖` se lo show è stato importato in automatico e `👤` se è stato inserito a mano (es. `🤖 MCG`, `👤 SC`). Il tooltip riporta il nome del sito e l'origine.
- **Sito di provenienza**: ogni show ricorda il sito su cui è stato acquistato; gli show registrati prima dell'introduzione dei siti sono di Mondo Cam Girls. Il sito è distinto dalla *piattaforma* (Teams, Telegram…), che indica dove lo show si è svolto. Vedi anche la [roadmap](ROADMAP.md) verso il supporto completo a più siti.
- **Spazio per tag e note**: in tutte le tabelle degli show (cronologia, dettaglio del mese, scheda modella) data e ora stanno su due righe e la colonna **Tag e note** prende tutto lo spazio che avanza, quindi le note troncate si leggono molto di più.
- **Righe compatte**: Modifica (✏️) ed Elimina (🗑️) sono pulsanti a icona; nickname e note lunghi sono troncati con "…" e il testo completo compare al passaggio del mouse. Cliccando su una nota (o premendo Invio quando è selezionata) la si espande per leggerla tutta; un secondo clic la richiude. Se la finestra è stretta, la tabella scorre in orizzontale invece di tagliare le colonne.
- **Chat con un clic**: sotto la piattaforma compare il nickname. Con **💬** il clic apre direttamente la chat: su Telegram con lo username, su Teams solo se il nickname è l'**email** della modella (Teams non permette di aprire una chat partendo dallo username). Con **📋** (username di Teams) il clic copia il nome negli appunti e apre Teams, dove va incollato nella ricerca o nel campo «A:» della nuova chat. Nel form, scegliendo Teams e scrivendo uno username, una nota sotto il nickname ricorda che con l'email la chat si apre direttamente.
- **Selezione multipla**: una casella all'inizio di ogni riga seleziona lo show; quella nell'intestazione seleziona l'intera pagina. La selezione resta valida cambiando pagina, ordine o filtri. Con almeno uno show selezionato compare una barra con il conteggio (e quanti selezionati sono nascosti dai filtri attuali) e i pulsanti:
  - **Seleziona tutti i risultati**: tutti gli show che passano i filtri, anche nelle altre pagine.
  - **✏️ Modifica selezionati**: **sito**, piattaforma, voto, recensione, durata e nickname impostati in un colpo solo; i campi lasciati su «non modificare» restano invariati. Come nel form, piattaforma e voto non vengono applicati ai regali.
  - **🗑️ Elimina selezionati**: dopo una conferma che avvisa se tra i selezionati ci sono show nascosti dai filtri.
  
  Entrambe le operazioni salvano su disco una sola volta.
- **Costo al Minuto (€/min)**: Calcolato automaticamente come costo ÷ durata. Mostra `–` per gli show senza durata registrata e per i regali.
- **Colori con significato** (gli stessi in cronologia, scheda modella e dettaglio del mese):
  - **Voto**: badge verde (5), verde acqua (4), ambra (3), rosso (1-2); `TBD` in grigio.
  - **€/min**: verde se lo show è costato meno al minuto della tua media su tutti gli show, rosso se di più; entro ±10% dalla media resta neutro. Il valore della media compare passando il mouse.
  - **Dati mancanti e regali**: durata non registrata mostrata come `–` in grigio; costo e voto dei regali attenuati.
  - Tutte le coppie testo/sfondo rispettano il contrasto minimo WCAG di 4.5:1 in ogni tema, righe a zebra comprese.

#### 🏷️ Tag degli show
I tag indicano a colpo d'occhio il tipo di show (es. Anal, Lush, Squirt). Sono personalizzabili e ognuno ha un colore.
- **Nel form**: sotto le note, clic su un tag per assegnarlo o toglierlo; un tag nuovo si crea scrivendolo nel campo e premendo Invio o **＋ Aggiungi**.
- **Nelle tabelle**: per non allargare la tabella, i tag stanno nella colonna **Tag e note**, sopra la nota. Si vedono i primi tre tag e un «+N» per gli altri; il clic sulla cella mostra tutti i tag e la nota completa. Il tooltip elenca tutti i tag.
- **Filtro**: il menu **🏷️ Tag** della cronologia mostra solo gli show con quel tag.
- **Modifica multipla**: nella finestra della modifica dei selezionati, ogni clic su un tag passa da «non modificare» a **+ aggiungi**, a **− togli** e di nuovo a «non modificare». Utile per assegnare i tag agli show già salvati.
- **Scheda modella**: la riga **Tipi di show** riassume i tag degli show fatti con la modella, dal più usato, con il numero di volte (es. `Squirt ×5`).
- **⚙️ Impostazioni › 🏷️ Gestisci tag**: creazione, rinomina, colore ed eliminazione. Rinomina e colore valgono subito per tutti gli show che usano il tag; eliminandolo, dopo una conferma con il numero di show coinvolti, viene tolto anche da quegli show.

Al primo avvio il catalogo contiene tre tag di esempio (Anal, Lush, Squirt), modificabili o eliminabili.

---

### 2. Classifica Generale Modelle
Elabora la cronologia salvata per generare indicatori prestazionali e statistici sulle camgirl:

- **Podio Automatico**: Assegnazione visiva delle prime posizioni (🥇 1°, 🥈 2°, 🥉 3°) per le valutazioni più alte.
- **Media Voti**: Calcolo ponderato escludendo sessioni contrassegnate come regali o `TBD`.
- **Filtro per sito**: con un sito scelto la classifica si ricalcola sui soli show di quel sito (media, totali e €/min compresi).
- **€/min Medio**: Costo medio al minuto per modella, presente anche nella scheda dettaglio. È calcolato come spesa ÷ minuti dei soli show con durata registrata, regali esclusi, così gli show più vecchi senza durata non gonfiano il risultato.
- **Scheda Dettaglio (Modal)**: Cliccando su una riga si apre il resoconto storico dettagliato degli show effettuati con la singola modella.
- **Modelle su più siti**: se una modella ha show su più siti, la scheda mostra l'indirizzo del suo profilo **su ogni sito** (con la sigla del sito) e una tabella **Per sito** con show, durata, spesa, €/min e media voti di ciascun sito; accanto alla sigla compare «come …» se sul sito usa un altro nome. Badge Online/Sospesa e galleria usano il profilo su Mondo Cam Girls. Nel form, l'indirizzo del profilo proposto è quello della modella sul sito scelto e cambia con il sito (un indirizzo scritto a mano resta).
- **🔗 Unisci… / ✂️ Separa…** (in fondo all'intestazione della scheda): le modelle sono riconosciute dal nome.
  - **Unisci** sposta su questa modella gli show registrati con un altro nome: la stessa modella su un altro sito, o un nome scritto in modo diverso. Si sceglie il nome tra quelli suggeriti e l'anteprima indica quanti show passano.
  - **Separa** (solo per le modelle con show su più siti) sposta gli show di un sito su un'altra modella, quando lo stesso nome indica persone diverse; il nome proposto è «Nome (SIGLA)» e, se esiste già, gli show si aggiungono ai suoi.
  - Ogni show ricorda il nome con cui è stato acquistato: la sincronizzazione con Mondo Cam Girls riconosce gli show già importati (nessun doppione) e assegna quelli nuovi alla modella giusta.
- **Modelle online**: accanto al nome compare il badge verde **● Online** se la modella è online su Mondo Cam Girls (anche nella scheda dettaglio e nella tabella del Preventivo); il filtro **Solo online** mostra solo quelle. Lo stato si aggiorna all'avvio e ogni 3 minuti, leggendo l'elenco delle modelle online dal servizio pubblico del sito (`getdata.html?online=si`, senza login). La modella viene riconosciuta dall'indirizzo del suo profilo (`https://<nome>.mondocamgirls.com`): senza un indirizzo valido lo stato non è verificabile e il badge non compare. Se il sito non risponde, i badge non compaiono e l'errore viene annotato nel log.
- **Profili sospesi o rimossi**: accanto al nome (in classifica, nella scheda e nella tabella del Preventivo) compare il badge rosso **⛔ Sospesa** se il profilo su MCG è temporaneamente sospeso (la pagina mostra l'avviso «PROFILE TEMPORARYLY SUSPENDED»: non si possono acquistare show), oppure il badge grigio **🚫 Rimossa** se il profilo non esiste più (il suo sottodominio non esiste più, mentre il sito risponde). MCG non lo indica nell'elenco delle modelle, quindi l'app legge in background la pagina di ogni profilo, tre alla volta. L'esito di ogni profilo vale 12 ore ed è conservato tra un avvio e l'altro: si riverificano solo i profili controllati da più di 12 ore (all'avvio e poi ogni ora). Il tooltip del badge indica quando è stato verificato.

---

### 3. Preventivo
Quanto dovrebbe costare uno show **prima di comprarlo**, per capire se il prezzo che ti chiede la modella è in linea.

- **Calcolatore**: scrivi la modella, scegli la durata (10-60 minuti o «altro…») e, se vuoi, il **prezzo chiesto**. Ottieni:
  - il **prezzo atteso** con il suo **€/min suggerito**, cioè la media degli **ultimi 5 show** con durata (regali e rimborsi esclusi): i prezzi cambiano nel tempo, quindi contano gli show recenti;
  - l'ultimo show con lei della **stessa durata**, con il prezzo pagato (utile se usa un listino a pacchetti);
  - il prezzo con la **tua media generale** su tutti gli show;
  - con un prezzo chiesto, i due confronti: **rispetto alla sua media** e **rispetto alla tua media generale**, ciascuno con un verdetto colorato («in linea» entro ±10%, «+X% più caro» in rosso, «X% più conveniente» in verde, la stessa soglia dei colori del €/min).
- **Sito**: la stessa modella può costare diversamente su siti diversi. Scegliendo un sito il calcolo usa solo gli show su quel sito, se lei ne ha almeno 2; altrimenti tutti i siti, e il riquadro lo dice. Viene proposto il sito del suo ultimo show, se lì ne ha almeno 2. Sui siti che fanno pagare in token, dollari o crediti il prezzo chiesto si scrive in quella valuta e viene convertito in euro con il tasso del sito.
- **Apri la scheda**: sotto il risultato del calcolatore, il pulsante **Apri la scheda di …** (solo per le modelle già registrate).
- **Modelle senza dati**: se non hai show con durata con lei, il riferimento è la tua media generale e il riquadro avvisa «dati insufficienti».
- **Prezzi suggeriti per modella**: tabella con, per ogni modella (con i badge **● Online** e **⛔ Sospesa** / **🚫 Rimossa** accanto al nome, come in classifica), gli show con durata, il €/min medio di sempre, quello degli ultimi 5 show, la **tendenza** (▲ in aumento, → stabile, ▼ in calo, oltre ±5%) e i prezzi già pronti per 10, 15, 30 e 60 minuti. Un clic su un'**intestazione** ordina la tabella per quella colonna (per i prezzi si parte dal più costoso, un secondo clic parte dal meno costoso; ▲/▼ indica la colonna e il verso; anche da tastiera con Invio); l'ordine scelto resta alla riapertura dell'app. Un clic su una riga porta la modella nel calcolatore, il pulsante **👤** apre direttamente la sua scheda. La casella **Solo online** mostra solo le modelle online in questo momento su Mondo Cam Girls (compare solo se MCG è in uso).
- **Nella scheda della modella** un riquadro *Preventivo* calcola il prezzo atteso per la durata scritta, con il link **apri nel Preventivo** per il calcolatore completo.
- **Nel form**, appena scegli modella e durata, sotto il costo al minuto compare il prezzo atteso («Atteso per 30 min: … (sua media) · … (tua media)»), calcolato sul sito scelto nel form, prima ancora di scrivere il costo.

---

### 4. Statistiche Mensili e Budget
Fornisce il controllo finanziario sulle uscite e sui costi degli show:

- **Impostazione Budget**: Definisce la soglia massima di spesa mensile (€).
- **Riquadro apribile con stato sempre visibile**: il riquadro *Obiettivo e Budget Mensile* è chiuso e si apre con un clic sul titolo; accanto al titolo il badge **Budget OK** (verde), **Budget KO** (rosso) o **Non impostato** (grigio) mostra lo stato anche a riquadro chiuso, e il suo tooltip riporta spesa, budget e importo rimanente o sforato.
- **Avanzamento e Indicatori Dynamic**: Monitoraggio percentuale in tempo reale con avvisi cromatici e messaggi contestuali tradotti in base al superamento o rispetto del budget.
- **Grafico della spesa**: barre con la spesa di ogni mese dell'anno scelto (**Per mese**) di ogni anno (**Per anno**) o di ogni sito (**Per sito**, su tutti gli anni, con le barre nel colore del sito e il €/min medio nel tooltip), con totale, numero di show e media mensile o annua. Nella vista per mese, se è impostato un budget, una linea tratteggiata lo indica e i mesi oltre il budget sono in rosso; il mese o l'anno in corso è evidenziato. Passando il mouse su una barra si vedono spesa e numero di show. La vista scelta viene ricordata.
- **Visualizzazione Tabellare Dettagliata**: Prospetto dei 12 mesi con contatore degli show effettuati, totale speso e vista espandibile per singolo mese.

---

## 🔒 Privacy

Dal menu **⚙️ Impostazioni › 🔒 Privacy**:

- **Sfoca le foto**: le foto delle modelle (cronologia, classifica, scheda, galleria, foto ingrandita, mini-scheda del form) restano sfocate e tornano nitide solo passandoci sopra con il mouse.
- **Nome e icona neutri**: la finestra si chiama «Agenda» e usa un'icona generica (un calendario) nella barra delle applicazioni e in Alt+Tab; all'avvio non compare la schermata con il nome dell'app. L'icona del file eseguibile e dei collegamenti non cambia.
- **PIN di sblocco** (4-8 cifre): con un PIN l'app parte bloccata e si blocca con il **tasto rapido per nascondere l'app** (che la riduce anche a icona) e, se scelto, dopo 5/15/30/60 minuti di inattività. Dopo 5 tentativi errati bisogna attendere 30 secondi. Il PIN non viene salvato in chiaro (hash scrypt con sale in `preferenze.json`); per cambiarlo o rimuoverlo serve quello attuale. **Protegge l'app aperta, ma non cifra i file dei dati.** Se lo dimentichi, chiudi l'app ed elimina `preferenze.json` dalla cartella dei dati.
- **Tasto rapido per nascondere l'app** (predefinito **Ctrl+Shift+H**): riduce subito a icona l'app, e la blocca se c'è un PIN. Mentre è nascosta la finestra usa anche nome e icona neutri, pure con l'opzione spenta: tornano quelli veri alla riapertura o, con un PIN, dopo lo sblocco (l'impostazione salvata non cambia). Si cambia con **Cambia** premendo la nuova combinazione (Esc annulla) e si ripristina con ↺. Lettere e numeri richiedono Ctrl o Alt (con il solo Shift scatterebbe scrivendo una maiuscola); i tasti F1-F12 si possono usare anche da soli. Le combinazioni già usate dall'app o dal sistema (Ctrl+C/V/X/A/Z/Y, Ctrl+Invio, Alt+F4, F5…) vengono rifiutate. Il tasto viene riconosciuto per posizione, quindi funziona con qualsiasi layout di tastiera.

## ⚙️ Funzioni di Sistema e Utility

L'intestazione mostra l'indicatore di raggiungibilità di Mondo Cam Girls e, accanto, il **💳 credito residuo** sul tuo account MCG (es. «💳 € 16.51»). Il credito si vede solo dopo il login, quindi viene letto:
- a ogni **Sincronizza MCG** o **Cronologia completa MCG**, subito dopo le transazioni;
- all'avvio, ogni 15 minuti e con un clic sul badge, senza aprire finestre, usando il login salvato nella finestra di sincronizzazione.

Se MCG chiede di nuovo il login resta l'ultimo valore letto, attenuato e in corsivo, con la data nel tooltip; basta una sincronizzazione per aggiornarlo. Prima della prima lettura il badge mostra «💳 –».

Le funzioni sono raccolte in due menu a tendina:
- **💾 Dati**, in due sezioni:
  - **🌐 Importa da Mondo Cam Girls** (evidenziata): **🔄 Sincronizza MCG** (ultime transazioni, rapida: da usare dopo ogni show) e **📜 Cronologia completa MCG** (tutte le pagine, più lenta: la prima volta o per recuperare show vecchi). Sotto ogni voce c'è una descrizione breve; il tooltip spiega la differenza per intero.
  - **💾 Backup e dati**: Esporta, Importa, Cartella.
- **⚙️ Impostazioni**, in sezioni su due colonne:
  - **🎨 Aspetto**: lingua, tema, dimensione del testo.
  - **📋 Tabelle**: **Mostra le note per intero**, che in cronologia, dettaglio del mese e scheda modella mostra note e tag completi, a capo, senza doverli aprire con un clic (spenta, la nota resta su una riga troncata con «…» e i tag oltre il terzo diventano «+N»).
  - **🗂️ Siti e tag**: Gestisci siti, Gestisci tag.
  - **🔒 Privacy** (seconda colonna): vedi la sezione [Privacy](#-privacy).

  Ogni scelta si salva da sola e resta alla riapertura dell'app.
  - **🌐 Gestisci siti**: nome, sigla (fino a 6 caratteri), colore, **valuta** (euro, dollari, sterline, token, crediti) e **tasso** in euro di ogni sito (i tassi iniziali sono indicativi: controllali), aggiunta di nuovi siti e **sito predefinito** per gli show nuovi (salvato anche nel backup). Mondo Cam Girls e i siti usati da almeno uno show non si possono eliminare: prima vanno spostati su un altro sito con la modifica multipla.

I menu si chiudono con un clic fuori o con `Esc`.

- **🌍 Selezione Lingua (i18n)**: Switch istantaneo, dal menu Impostazioni, tra italiano (`it`), inglese (`en`), spagnolo (`es`), francese (`fr`), tedesco (`de`), portoghese brasiliano (`pt`), rumeno (`ro`) e russo (`ru`). Anche i giorni della settimana, gli orari nei tooltip e le cifre del grafico seguono la lingua scelta; le date restano nel formato gg/mm/aaaa.
- **🔄 Sincronizzazione Automatica MCG**: Scarica e importa in automatico le transazioni dal profilo Mondo Cam Girls non ancora registrate localmente.
  - **Anti-duplicato**: una transazione è considerata già salvata se esiste uno show con la stessa modella e la stessa data/ora (al minuto). Se nella pagina ci sono più transazioni con la stessa modella nello stesso minuto, vengono importate tutte quelle non ancora presenti.
  - Le righe della tabella senza una data valida (intestazioni, totali) vengono ignorate.
  - **Solo i pagamenti diventano show**: il tipo di transazione (cella con il link al dettaglio) distingue "Pagamento da conto ricaricabile", "Ricarica con carta di credito" e "Rimborso su conto ricaricabile". Le ricariche vengono ignorate; i pagamenti in cui MCG mostra un codice numerico al posto della modella (profilo non più presente) vengono scartati.
  - **Rimborsi**: un rimborso non crea uno show ma segna come rimborsato il pagamento della stessa modella con lo stesso importo. Lo show rimborsato ha costo 0 € (con il simbolo ↩ e l'importo pagato nel tooltip), è escluso dal €/min e la nota riporta la data del rimborso. Un rimborso già applicato non viene riapplicato alle sincronizzazioni successive.
  - **Controllo della struttura**: se la pagina non contiene transazioni riconoscibili (link al dettaglio), l'importazione si ferma con un avviso e nessun dato viene salvato.
  - **Doppioni**: una transazione è già presente se esiste uno show della stessa modella alla stessa data e ora; in mancanza, se esiste uno show della stessa modella con lo stesso importo entro ±3 ore (copre show importati in passato con l'orario spostato). Ogni show dell'archivio corrisponde al massimo a una transazione.
- **📜 Cronologia completa MCG** (menu Dati): dopo il login legge tutte le pagine delle transazioni (`pagina_vis=1, 2, …`) invece della sola prima. Il passo tra le pagine viene ricavato dai link di paginazione della pagina. La lettura si ferma quando una pagina non contiene transazioni nuove (riconosciute dal codice della transazione), se MCG richiede di nuovo il login o dopo 300 pagine; l'avanzamento è mostrato nel titolo della finestra. Prima di salvare compare un riepilogo (pagine lette, show nuovi, rimborsi) da confermare. La sincronizzazione normale continua a leggere solo la prima pagina, che contiene le ultime 100 transazioni.
  - Foto, nickname e piattaforma dei nuovi show vengono presi dagli show precedenti della stessa modella.
  - **Link del profilo**: viene usato il link reale fornito da MCG nella tabella. Negli show già salvati, un indirizzo vuoto o indovinato dal nome viene sostituito con quello reale; un indirizzo diverso, inserito a mano, non viene toccato.
  - **Copia diagnostica**: a ogni sincronizzazione viene salvato `mcg_ultima_sincronizzazione.json` nella cartella dati, con le tabelle lette dalla pagina di MCG e l'esito di ogni riga (importata, già presente o scartata con il motivo). Il file viene sovrascritto ogni volta, resta solo sul computer e serve a capire la struttura della pagina se l'importazione non si comporta come previsto.
- **💾 Esportazione / Importazione Backup**: Ripristino e salvataggio dell'intero archivio in formato JSON, incluso il budget mensile. I backup delle versioni precedenti (solo elenco show) restano importabili; in quel caso il budget attuale non viene modificato.
- **🎨 Accessibilità e Temi**:
  - **Dimensione Testo**: Pulsanti `A+` / `A-` per modificare al volo la grandezza dei font (12px - 26px).
  - **Temi Visivi**: Selezione tra *Neve & Nebbia*, *Luce Chiara*, *Eclissi Scura* e *Bordeaux & Oro (MCG)*, con i colori di mondocamgirls.com (crema, bordeaux, oro). I colori di stato (budget, mese corrente, badge) sono definiti come variabili CSS per ogni tema in `style.css`.
  - **Font e icone in locale**: il font Inter e le icone Font Awesome sono inclusi tra le dipendenze (`@fontsource/inter`, `@fortawesome/fontawesome-free`), quindi l'interfaccia si vede correttamente anche offline.
- **📁 Gestione Cartella Dati**: Collegamento rapido alla cartella `userData` di sistema per consultare file JSON e log.

---

## 📄 Importazione ed esportazione CSV

Dal menu **💾 Dati › 📄 File CSV (tutti i siti)**:

- **📥 Importa da CSV**: importa lo storico degli acquisti scaricato da **qualsiasi sito** di cam. Dopo aver scelto il file si apre una finestra in tre passi:
  1. **Colonne del file**: data, ora (se in una colonna a parte), modella, importo, durata, note e nickname, abbinate in automatico dalle intestazioni (in italiano o in inglese) e modificabili. Data, modella e importo sono obbligatori.
  2. **Sito e importi**: il sito degli show importati, la valuta degli importi e il tasso in euro (proposti dal catalogo del sito, modificabili solo per questa importazione) e il formato della data (*gg/mm/aaaa* o *aaaa-mm-gg*, oppure *mm/gg/aaaa* per i file americani).
  3. **Anteprima**: per ogni riga lo stato (**nuovo**, **già presente**, **errore** con il motivo) e il conteggio complessivo. Una riga è già presente se esiste uno show della stessa modella alla stessa data e ora (al minuto), nell'archivio o più su nel file.

  Il pulsante **Importa N show** salva tutti gli show nuovi con un solo salvataggio. Gli show importati hanno il sito scelto, il costo in euro (con l'importo originale se in un'altra valuta), la durata e le note del file, la piattaforma, la foto e il profilo già noti per la modella, e voto **TBD** da completare. Il file può usare `;`, `,` o il tabulatore come separatore e la virgola o il punto per i decimali; i file salvati da Excel in italiano (codifica Windows) vengono letti correttamente.
- **📤 Esporta in CSV**: salva tutta la cronologia in un file CSV (`;` e virgola decimale, apribile con Excel in italiano) con data, ora, modella, sito, piattaforma, durata, costo, €/min, voto, recensione, regalo, tag, note, nickname, origine e importo originale. Il file si può reimportare: gli show già presenti vengono riconosciuti.

## 💾 Dati e Backup

I dati sono salvati nella cartella `userData` dell'applicazione (apribile dal pulsante **📁 Cartella Dati**):

| File | Contenuto |
| :--- | :--- |
| `shows_data.json` | Archivio degli show (array JSON). Scritto in modo atomico: un crash durante il salvataggio non lo lascia mai troncato. |
| `shows_data.bak.json` | Copia della versione precedente, aggiornata a ogni salvataggio o importazione. |
| `shows_data.prima-2.0.json` | Copia dell'archivio fatta una sola volta al primo avvio della 2.0, prima della conversione al nuovo formato (campi `sito` e `importatoDa`). |
| `shows_data.corrotto-<timestamp>.json` | Copia di un archivio illeggibile, conservata invece di sovrascriverlo. |
| `app.log` | Log dell'applicazione, in ordine cronologico (righe più recenti in fondo). Oltre 1 MB diventa `app.log.1` e ne viene iniziato uno nuovo. |
| `siti.json` | Catalogo dei siti di provenienza degli show (`id`, `nome`, `sigla`, `colore`, `valuta`, `tasso` in euro, `urlProfilo` facoltativo). Ogni show salva l'ID nel campo `sito`; `importatoDa` indica il sito da cui è stato importato (vuoto se inserito a mano); `importoOriginale` (`{ valore, valuta }`) l'importo pagato se diverso dall'euro. |
| `tags.json` | Catalogo dei tag (`id`, `nome`, `colore`). Gli show salvano solo gli ID dei tag nel campo `tag`, quindi rinominare un tag non modifica l'archivio. |
| `window_state.json` | Dimensione e posizione della finestra. |
| `preferenze.json` | Preferenze di privacy: nome e icona neutri, PIN di sblocco (solo hash e sale), minuti del blocco automatico. |
| `mcg_ultima_sincronizzazione.json` | Copia della tabella letta nell'ultima sincronizzazione MCG, con l'esito di ogni riga. |

Il budget mensile, il tema, la lingua, la dimensione del testo, le note per intero, la sfocatura, il tasto rapido e il sito predefinito sono salvati nel `localStorage` dell'interfaccia, come l'ordine e i filtri delle tabelle: in cronologia ordine, numero di risultati, anni, sito e tag; in classifica sito e «Solo online»; nel Preventivo «Solo online» e l'ordine della tabella dei prezzi; nelle statistiche la vista del grafico. La ricerca per nome no: di solito serve una volta sola. **Reset Filtri** riporta la cronologia ai valori predefiniti anche per le aperture successive.

Formato del file di backup esportato:

```json
{
  "formato": "gestioneshow-backup",
  "versione": 2,
  "versioneApp": "2.0.1",
  "shows": [ ... ],
  "tag": [ { "id": "lush", "nome": "Lush", "colore": "viola" } ],
  "siti": [ { "id": "mcg", "nome": "Mondo Cam Girls", "sigla": "MCG", "colore": "rosso" } ],
  "impostazioni": { "monthly_budget": "300" }
}
```

