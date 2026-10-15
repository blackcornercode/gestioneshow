# Changelog

Novità di ogni versione di **Diario Privato** (*Private Diary*, già *Gestione Show MCG*).
Generato da `changelog.json` con `npm run changelog`: per modificarlo, modificare `changelog.json`.

## 2.0.1

### ✨ Novità

- Il pulsante Cartella è passato dal menu Dati a Impostazioni › Dati e si chiama «Cartella dati»; la sezione «Backup e dati» del menu Dati si chiama ora «Backup» e i suoi due pulsanti (Esporta, Importa) hanno titolo e descrizione come gli altri del menu
- Impostazioni › Registro (log): si sceglie cosa annotare in app.log (niente, solo errori, errori e avvisi, tutto), con i pulsanti per aprire e cancellare il registro. Il registro ora riporta il messaggio e lo stack degli errori (prima restava «{}»), annota gli errori non gestiti e l'arresto dell'interfaccia, non contiene più nomi di modelle, tag e siti, e le righe inviate dall'interfaccia sono ripulite e limitate in lunghezza
- Due nuovi parametri dello show, facoltativi: qualità di video e audio (Alta, Media, Bassa) e inquadratura della camera (orizzontale o verticale). Si scelgono nel form, nella sezione Com'è andata, compaiono sotto il voto in tutte le tabelle, si cambiano con la modifica multipla e sono nell'esportazione CSV. Ripeti ultimo show riprende l'inquadratura. La sezione Com'è andata mostra voto, qualità, inquadratura e recensione in quattro riquadri affiancati, con icona, titolo e una nota breve (due per riga se la finestra è stretta)
- Scheda Preventivo, tra Classifica e Statistiche: per ogni modella un €/min suggerito (media degli ultimi 5 show con durata, sul sito scelto se lei ne ha almeno 2 lì), il prezzo atteso per la durata scelta, l'ultimo show con lei della stessa durata e il confronto del prezzo chiesto (anche in token) con la sua media e con la tua media generale: in linea entro ±10%, più caro o più conveniente. Sotto, la tabella dei prezzi suggeriti di tutte le modelle con la tendenza e i prezzi per 10, 15, 30 e 60 minuti, ordinabile cliccando sulle intestazioni (dal più costoso al meno costoso e viceversa, ordine ricordato alla riapertura) e con un pulsante per aprire la scheda di ogni modella, presente anche nel calcolatore; accanto al nome i badge Online e Sospesa/Rimossa come in classifica e la casella «Solo online», ricordata alla riapertura
- Riquadro Preventivo nella scheda della modella e prezzo atteso nel form appena scelte modella e durata, prima di scrivere il costo
- Credito residuo su Mondo Cam Girls nell'intestazione, accanto all'indicatore MCG: viene letto a ogni sincronizzazione e poi aggiornato da solo ogni 15 minuti (o con un clic) usando il login salvato, senza aprire finestre; se MCG chiede di nuovo il login resta l'ultimo valore letto, con la data
- Opzione «Mostra le note per intero» (Impostazioni › Tabelle): note e tag completi in cronologia, dettaglio del mese e scheda modella, senza doverli aprire con un clic
- L'app ricorda alla riapertura anche l'ordine e i filtri delle tabelle (sito e tag della cronologia, sito e «Solo online» della classifica), oltre a quelli già salvati; la ricerca per nome no. Reset Filtri li riporta ai valori predefiniti

### 🎨 Interfaccia

- Menu Impostazioni più ordinato, su due colonne con le sezioni Aspetto (lingua, tema, testo), Tabelle, Siti e tag e Privacy

### 🐛 Correzioni

- Un regalo registrato dopo Ripeti ultimo show (o dopo aver scelto una durata) veniva salvato con la durata dello show, che per i regali è nascosta
- Nella scheda della modella, nei riquadri per sito, alcune etichette (in inglese «Total duration» e «Total spent») si sovrapponevano e in tedesco e russo le parole lunghe venivano spezzate; ora ogni etichetta resta intera e, se non c'è spazio, va sulla riga sotto. La pagina dichiara anche la lingua dell'interfaccia, utile ai lettori di schermo

## 2.0.0

### ✨ Novità

- Diario Privato diventa una cronologia per tutti i siti di cam, non solo per Mondo Cam Girls: ogni sito ha le sue impostazioni e Mondo Cam Girls resta integrato in automatico
- Ogni show indica il sito su cui è stato acquistato (Mondo Cam Girls, Chaturbate, Stripchat, BongaCams, LiveJasmin, OnlyFans o siti aggiunti da te): scelta nel form con l'ultimo sito usato con la modella già proposto, badge colorato sotto l'ora in tutte le tabelle, filtro per sito in cronologia e classifica, vista Per sito nel grafico della spesa e sito nella modifica multipla
- Impostazioni › Gestisci siti, per nome, sigla e colore di ogni sito, nuovi siti e sito predefinito per gli show nuovi
- Importazione da CSV dello storico degli acquisti di qualsiasi sito (menu Dati): colonne riconosciute dalle intestazioni, scelta di sito, valuta e formato della data, anteprima con lo stato di ogni riga e controllo dei doppioni
- Esportazione della cronologia in CSV, apribile con Excel e reimportabile
- Valuta e tasso in euro per ogni sito (euro, dollari, sterline, token, crediti): il costo resta in euro, l'importo pagato in token o dollari viene ricordato e nel form un campo lo converte da solo
- Siti in uso (Impostazioni › Gestisci siti): nel form compaiono solo i siti che usi, e le funzioni di Mondo Cam Girls (indicatore, importazione automatica, modelle online, profili sospesi, foto) si attivano solo se lo usi
- Al primo avvio, con l'archivio vuoto, una finestra di benvenuto chiede la lingua (proposta in base a quella di Windows), su quali siti acquisti gli show e qual è il sito principale
- Modelle su più siti: la scheda mostra il profilo della modella su ogni sito e una tabella con show, spesa, €/min e voti per sito; nel form l'indirizzo del profilo segue il sito scelto
- Unisci / Separa nella scheda della modella: unisci gli show registrati con un altro nome (la stessa modella su un altro sito) o separa gli show di un sito quando lo stesso nome indica persone diverse. La sincronizzazione con Mondo Cam Girls ricorda il nome originale e non crea doppioni
- Interfaccia anche in spagnolo, francese, tedesco, portoghese (Brasile), rumeno e russo, oltre a italiano e inglese; al primo avvio viene proposta la lingua di Windows se è tra queste, e anche l'installer parla la lingua del sistema (per il rumeno resta in inglese)

### 🎨 Interfaccia

- Form Aggiungi / Modifica show più leggibile: quattro sezioni con un titolo (Chi e quando, Lo show, Com'è andata, Tag e note), modella, sito e data sulla stessa riga, durata in una barra unica, costo al minuto in evidenza, voti, siti e tag con un contorno ben visibile finché non sono scelti, recensione con un interruttore, sezione Dettagli in un riquadro ben visibile con il riepilogo a pillole, barra dei pulsanti sempre visibile e, in modifica, una striscia che ricorda quale show stai modificando
- Sui siti che fanno pagare in token o in un'altra valuta il campo principale del costo è l'importo pagato, con l'equivalente in euro accanto; «inserisci in euro» permette di scrivere direttamente il costo in euro
- Sotto il titolo dell'app un sottotitolo riassume in una riga a cosa serve
- Il nickname di Teams indica cosa fa il clic: 💬 apre direttamente la chat (con l'email della modella), 📋 copia lo username e apre Teams per cercarlo; nel form una nota suggerisce di usare l'email per aprire la chat con un clic
- Testi generici al posto dei riferimenti a Mondo Cam Girls fuori dalla sua sezione (nome del tema Bordeaux & Oro, finestra Informazioni)
- Al primo avvio dopo l'installazione non compare la finestra delle novità, ma solo il benvenuto

### 🐛 Correzioni

- «Nessun anno disponibile» nel filtro per anno restava in italiano con l'interfaccia in inglese
- Scrivendo nel form il nome di una modella nuova che inizia come quello di una già registrata (es. «Annabella» dopo «Anna»), profilo, foto e nickname della prima restavano nei Dettagli e venivano salvati nello show; ora i valori compilati da soli seguono il nome, quelli scritti a mano restano
- Eliminando tutti gli show dell'anno scelto nel filtro, la cronologia restava vuota senza nessuna casella da togliere; ora l'anno esce da solo dal filtro
- Aprendo di seguito le schede di due modelle, la galleria della seconda poteva mostrare le foto della prima; se il recupero delle foto falliva restava «Caricamento…» per sempre
- Nella mini-scheda del form la data dell'ultimo show importato da Mondo Cam Girls compariva tagliata (es. «02/10/26 1»)
- Con l'interfaccia in inglese restavano in italiano la riga dei totali sotto la cronologia, il giorno della settimana accanto alla data e i tooltip di Modifica, Elimina, foto e profilo web

### 🛠️ Tecnico

- Primo passo verso il supporto a più siti di cam (docs/ROADMAP.md, fase 1): ogni show ricorda il sito di provenienza (per gli show esistenti Mondo Cam Girls) e da quale sito è stato importato; nuovo catalogo dei siti incluso nel backup (formato versione 2, i backup precedenti restano importabili)
- All'avvio della 2.0 una copia dell'archivio delle versioni precedenti viene salvata in shows_data.prima-2.0.json prima della conversione al nuovo formato
- Il codice che contatta Mondo Cam Girls diventa il primo «connettore» (docs/ROADMAP.md, fase 3): ogni sito dichiara le funzioni che offre (importazione, modelle online, profili sospesi, foto, raggiungibilità) e badge, galleria e indicatore compaiono solo per i siti che le supportano. Nessun cambiamento per chi usa Mondo Cam Girls

## 1.12.3

### ✨ Novità

- Installer per Windows (PrivateDiary-setup.exe), per utente e senza permessi di amministratore, oltre alla versione portable; disinstallando l'app i dati restano

### 🎨 Interfaccia

- Sincronizza MCG e Cronologia completa MCG sono nel menu Dati, in una sezione evidenziata «Importa da Mondo Cam Girls», con una descrizione sotto ogni voce e un tooltip che spiega la differenza; il pulsante Sincronizza MCG non è più nell'intestazione

### 🛠️ Tecnico

- La versione portable si estrae sempre nella stessa cartella temporanea invece che in una con nome casuale, per ridurre i falsi positivi degli antivirus (es. AVG IDP.ALEXA); avviso con le istruzioni nei README e nelle note di rilascio

## 1.12.2

### 🐛 Correzioni

- Alcuni testi della scheda modella (sito web e galleria foto) restavano in italiano con l'interfaccia in inglese

### 🛠️ Tecnico

- Progetto presentato su GitHub come Private Diary: README in inglese e in italiano con screenshot, guida completa e documentazione per lo sviluppo in docs/, licenza ISC, CHANGELOG.md generato da changelog.json, modelli per le segnalazioni e test automatici a ogni push

## 1.12.0

### ✨ Novità

- Nuovo nome, Diario Privato (Private Diary in inglese e nel titolo della finestra); i dati e le impostazioni restano quelli di prima
- Selezione multipla nella cronologia, con una casella per riga e una per tutta la pagina, per eliminare o modificare più show insieme (piattaforma, voto, recensione, durata, nickname); la selezione resta attiva cambiando pagina o filtri
- Tag personalizzabili per indicare il tipo di show (es. Anal, Lush, Squirt), con nome e colore modificabili da Impostazioni › Gestisci tag
- Tag mostrati nella colonna Tag e note di cronologia, dettaglio del mese e scheda modella (i primi tre, gli altri con un clic), filtro per tag nella cronologia e aggiunta o rimozione di tag nella modifica multipla
- Nella scheda modella la riga Tipi di show riassume i tag dei suoi show, dal più usato
- Badge Sospesa per le modelle con il profilo temporaneamente sospeso su MCG e Rimossa per quelle il cui profilo non esiste più, in classifica e nella scheda modella (verifica in background, ripetuta ogni 12 ore per profilo)
- Grafico dell'andamento della spesa nelle Statistiche, per mese (con la linea del budget) o per anno
- Form Aggiungi / Modifica Show riorganizzato: scelta Show/Regalo in alto, mini-scheda della modella con il pulsante Ripeti ultimo show, durate rapide, €/min calcolato mentre si scrive, valutazione accanto al costo con gli stessi badge colorati della cronologia, tag suggeriti, dettagli raccolti in una sezione chiusa, pulsante Svuota per azzerare tutti i campi, Ctrl+Invio per salvare ed Esc per chiudere
- Tema Bordeaux & Oro con i colori di mondocamgirls.com
- Privacy dal menu Impostazioni: foto sfocate finché non ci si passa sopra, nome e icona neutri della finestra, PIN di sblocco con blocco automatico per inattività, tasto rapido personalizzabile (predefinito Ctrl+Shift+H) per bloccare e nascondere subito l'app, che mentre è nascosta mostra anche nome e icona neutri
- Menu ? › Contatti per scrivere allo sviluppatore (blackcornermail@gmail.com) o copiarne l'indirizzo, e nuova descrizione in Informazioni

### 🎨 Interfaccia

- Casella Seleziona tutti nel filtro per anno della cronologia
- Colonne Recensione (intestazione «Rec.») e Piattaforma più strette, così la cronologia non scorre più in orizzontale e le altre colonne hanno più spazio
- Più spazio per tag e note in tutte le tabelle degli show: data e ora su due righe, origine del record accanto all'ora invece che in una colonna a sé, e la colonna Tag e note prende tutto lo spazio che avanza
- Scheda della modella più larga
- In classifica i criteri di ordinamento e la legenda dei colori sono chiusi; si aprono con un clic sul titolo
- Anche il riquadro Obiettivo e Budget Mensile è chiuso e si apre con un clic sul titolo; accanto al titolo il badge Budget OK/KO mostra lo stato del budget anche a riquadro chiuso

### 🐛 Correzioni

- Alcuni pulsanti che dovevano restare nascosti erano visibili (es. Seleziona tutti i risultati quando erano già tutti selezionati)
- In classifica la piattaforma della modella spariva se il suo ultimo show era un regalo; ora vale quella dello show precedente

## 1.11.0

### ✨ Novità

- Durata degli show e costo al minuto (€/min), per singolo show e come media per modella; la media considera solo gli show con durata registrata, regali esclusi
- Interfaccia multilingua (italiano e inglese)
- Indicatore di raggiungibilità di Mondo Cam Girls nell'intestazione
- Colori con significato, cioè voto di ogni show come badge (5 verde, 4 verde acqua, 3 ambra, 1-2 rosso, TBD grigio) e €/min verde o rosso rispetto alla tua media (oltre ±10%)
- Legenda dei colori nella classifica, con il valore attuale della tua media €/min
- Il backup esportato include anche il budget mensile; i backup delle versioni precedenti restano importabili
- Importazione della cronologia completa di MCG dal menu Dati, che legge tutte le pagine delle transazioni e chiede conferma prima di salvare
- Stato online delle modelle su MCG, con badge Online accanto al nome in classifica e nella scheda e filtro Solo online, aggiornato ogni 3 minuti

### 🎨 Interfaccia

- Intestazione semplificata, con i menu Dati (Esporta, Importa, Cartella) e Impostazioni (testo, lingua, tema)
- Form di inserimento a scomparsa, che si apre con Nuovo show o con Modifica
- La durata dello show non è più obbligatoria; senza durata lo show resta fuori dal calcolo del €/min
- Tabelle più compatte e leggibili, con righe bicolore, pulsanti Modifica/Elimina a icona, nickname e note lunghi troncati (clic sulla nota per leggerla tutta), dati mancanti mostrati come – in grigio e regali attenuati
- Scheda modella con intestazione compatta su una sola riga
- Tema scuro completato e contrasto dei testi di almeno 4.5:1 (WCAG) in tutti i temi
- Font e icone inclusi nell'app, visibili anche senza connessione
- A pari merito in classifica viene prima la modella con lo show più recente (prima l'ordine dipendeva dal nome)

### 🔄 Sincronizzazione MCG

- Vengono importati tutti gli show con la stessa modella nello stesso minuto (prima solo uno) e ignorate le righe senza una data valida (prima importate con la data di oggi)
- I nuovi show prendono la piattaforma già usata con quella modella (prima sempre Teams)
- Vengono importati solo i pagamenti; ricariche e altre transazioni sono ignorate in base al tipo
- Viene usato il link reale del profilo fornito da MCG; negli show già salvati gli indirizzi vuoti o indovinati dal nome vengono corretti (quelli inseriti a mano restano invariati)
- Riconosciuti come già presenti anche gli show importati in passato con l'orario spostato (stessa modella e stesso importo entro ±3 ore)
- Avviso se la finestra di MCG viene chiusa prima di leggere le transazioni
- Se la pagina delle transazioni non ha la struttura attesa, l'importazione si ferma con un avviso invece di importare dati sbagliati
- A ogni sincronizzazione viene salvata nella cartella dati una copia della tabella letta, con l'esito di ogni riga (mcg_ultima_sincronizzazione.json)

### 🐛 Correzioni

- Un rimborso veniva importato come show da 0 €; ora segna come rimborsato il pagamento corrispondente, che non conta più nella spesa né nel €/min (il costo pagato resta visibile passando il mouse)
- Le date dei record più vecchi (gg/mm/aaaa) venivano lette con giorno e mese invertiti in filtri, statistiche, budget e ordinamenti
- Le foto delle modelle senza profilo salvato non venivano trovate (le maiuscole del nome sparivano dall'indirizzo)
- Con una data non valida il salvataggio falliva senza alcun messaggio
- Le tabelle tagliavano le ultime colonne, compresi i pulsanti Modifica/Elimina
- Nelle tabelle i valori centrati non erano allineati alle intestazioni
- L'evidenziazione del mese corrente nelle statistiche non era visibile, e cambiando lingua durante una modifica il pulsante tornava a Salva Record
- Modificando uno show rimborsato dal form si perdeva l'informazione del rimborso (costo pagato e data del rimborso)

### 🔒 Sicurezza

- Content-Security-Policy che vieta script esterni e codice JavaScript nell'HTML, così un testo malevolo in un campo non può eseguire codice

### 🛠️ Tecnico

- Codice dell'interfaccia suddiviso in moduli nella cartella js/ e ottimizzazione generale con l'IA
- Build ottimizzata, con eseguibile più leggero (93 MB invece di 106) che include solo i file necessari e le lingue italiano e inglese; nuovo nome del file GestioneShowMCG-<versione>-portable.exe
- Processo principale diviso in moduli nella cartella main/ (dati, sistema, Mondo Cam Girls), con i nomi dei canali IPC in un unico file
- I record salvati da versioni precedenti vengono convertiti al formato attuale alla lettura, al posto dei controlli sui campi vecchi sparsi nel codice
- Log scritto in coda in ordine cronologico, con rotazione oltre 1 MB (prima ogni riga riscriveva l'intero file)
- Test automatici (npm test), eseguiti anche prima di ogni build
- Rimossi codice e funzioni non più usati
- Archivio degli show in memoria, letto da disco solo all'avvio e dopo un'importazione; salvataggi, modifiche ed eliminazioni non rileggono più il file
- Calcoli di classifica, statistiche, budget e cronologia separati dal disegno delle pagine e coperti da test
- Righe di cronologia, dettaglio del mese e scheda modella disegnate da un'unica definizione delle colonne; stili spostati dal codice al foglio di stile
- Interfaccia convertita in moduli ES (import/export) con stato condiviso in un unico oggetto e dipendenze verificate dai test
- I 46 gestori scritti nell'HTML (onclick, onchange, onerror...) sostituiti da azioni dichiarate negli attributi e gestite da un unico modulo

## 1.10.7

### ✨ Novità

- Nickname della modella con collegamento rapido alla piattaforma di chat
- Sezione Criteri di Ordinamento nella classifica

### 🐛 Correzioni

- Ripristinata la funzione Sincronizza MCG

### 🛠️ Tecnico

- Progetto sotto controllo di versione Git e ottimizzazione generale

## 1.10.6

### ✨ Novità

- Filtro per anno nella cronologia e nelle statistiche
- Ingrandimento delle foto delle modelle
- Carosello con le foto recuperate dal profilo della modella

### 🐛 Correzioni

- Il testo si ingrandiva da solo dopo l'apertura di una pagina web

### 🛠️ Tecnico

- Ottimizzazione generale del codice

## 1.10.5

### ✨ Novità

- Verifica dello stato online delle modelle (non ancora funzionante)

### 🎨 Interfaccia

- Sistemati alcuni titoli

### 🛠️ Tecnico

- Ottimizzazione del codice con l'IA

## 1.10.3

### ✨ Novità

- Sistema di changelog

### 🐛 Correzioni

- L'importazione da MCG si bloccava
- Modali di dettaglio delle modelle

## 1.10.2

### ✨ Novità

- Schermata di caricamento (splash screen) all'avvio
- La versione corrente viene registrata nel log all'avvio

### 🐛 Correzioni

- Errore di sintassi nell'importazione dei dati e nel gestore append-log

## 1.10.1

### 🛠️ Tecnico

- Configurazione iniziale per la build dell'eseguibile portable
