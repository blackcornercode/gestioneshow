# 🗺️ Roadmap: da diario MCG a diario degli show in cam

Diario Privato è nato per **Mondo Cam Girls** (MCG). L'obiettivo di questa roadmap è farlo diventare una **cronologia generica degli show in cam**, utilizzabile con qualsiasi sito e integrabile con altri siti oltre a MCG, mantenendo intatte le funzioni attuali per chi usa MCG.

**Stato:** ✅ Fasi 1, 2, 3, 4, 5 e 7 completate: **versione 2.0.0** · Prossima (facoltativa): Fase 6, un secondo connettore (es. Stripchat) sulla base della Fase 3

| Fase | Contenuto | Impegno | Valore | Stato |
| :---: | :--- | :---: | :---: | :---: |
| 1 | Campo «Sito» negli show e conversione dei dati | Medio | Fondamentale | ✅ Completata |
| 2 | Sito nel form, nelle tabelle, nei filtri e nelle statistiche | Medio | Alto | ✅ Completata |
| 3 | Architettura a connettori (MCG come primo connettore) | Alto | Alto per il futuro | ✅ Completata (2.0.0) |
| 4 | Modelle presenti su più siti | Medio | Medio | ✅ Completata (2.0.0) |
| 5 | Importazione ed esportazione CSV, valute e token | Medio | Alto | ✅ Completata |
| 6 | Nuovi connettori, un sito alla volta | Alto (per sito) | Variabile | Da fare |
| 7 | Aspetto neutro e rilascio 2.0 | Basso | Alto | ✅ Completata (2.0.0) |

**Percorso consigliato:** fasi 1 e 2 (cronologia generica, con la possibilità di indicare che uno show arriva da Mondo Cam Girls), poi fase 5 (import CSV, che rende l'app utile con qualunque sito senza scrivere connettori). Le fasi 3, 4 e 6 servono quando si vuole integrare un secondo sito in automatico.

## Punto di partenza

Prima della Fase 3 il codice che comunicava con MCG era concentrato in pochi moduli, oggi riuniti nel connettore `main/connettori/mcg/` (`main/ipc-mcg.js`, `main/mcg-pagine.js`, `main/rete.js`, `js/sincronizzazione.js`, `js/stato-mcg.js`, `js/stato-online.js`, `js/profili-sospesi.js`, galleria della scheda modella). Cronologia, classifica, statistiche, tag e privacy sono già generici. Le dipendenze nascoste erano tre: nessun campo «sito» negli show (ogni show era implicitamente MCG), l'indirizzo del profilo costruito come `https://<nome>.mondocamgirls.com`, e il campo `isAutoImport` che significava «importato da MCG».

---

## ✅ Fase 1: il campo «Sito» (fondamenta)

- [x] Catalogo dei siti `siti.json` (`main/catalogo-siti.js`), gestito come quello dei tag: `{ id, nome, sigla, colore, urlProfilo? }`. Siti iniziali: Mondo Cam Girls, Chaturbate, Stripchat, BongaCams, LiveJasmin, OnlyFans (altri si aggiungono in Gestisci siti). Mondo Cam Girls resta sempre nel catalogo.
- [x] Ogni show ha il campo **`sito`** (dove si è acquistato) distinto dalla **piattaforma** (dove si è svolto: Teams, Telegram…).
- [x] `isAutoImport` sostituito da **`importatoDa`**: l'ID del sito da cui lo show è stato importato, `null` se inserito a mano.
- [x] Conversione automatica alla lettura (`normalizzaShow`): gli show esistenti ricevono `sito: 'mcg'` e, se importati, `importatoDa: 'mcg'`.
- [x] Show nuovi dal form sul sito predefinito (per ora Mondo Cam Girls); la sincronizzazione MCG salva `sito` e `importatoDa`.
- [x] Badge di origine con la sigla del sito (`🤖 MCG`).
- [x] Backup in formato versione 2 con il catalogo dei siti; i backup precedenti restano importabili.
- [x] Lettura e salvataggio dei cataloghi (tag e siti) unificati in `main/ipc-dati.js`.
- [x] Test: conversione, validazione del catalogo, badge di origine.

## ✅ Fase 2: interfaccia multi-sito

- [x] Campo **Sito** nel form a pulsanti (sigle colorate), con il sito predefinito per gli show nuovi e l'ultimo sito usato con quella modella già scelto.
- [x] Badge colorato del sito nelle tabelle, sotto l'ora (nessuna colonna in più), con 🤖 se importato e 👤 se inserito a mano.
- [x] Filtro per sito in cronologia e classifica (la classifica si ricalcola sui soli show del sito).
- [x] Vista **Per sito** nel grafico della spesa (barre nel colore del sito, €/min nel tooltip).
- [x] Sito impostabile su più show insieme con la modifica multipla (anche sui regali).
- [x] **Impostazioni › Gestisci siti**: nome, sigla e colore, nuovi siti, eliminazione dei siti non usati, sito predefinito (incluso nel backup).
- [x] Guida, screenshot (dati dimostrativi su più siti) e test aggiornati.

## ✅ Fase 3: architettura a connettori

- [x] Un modulo per ogni sito con le funzioni che offre (`transazioni`, `copia`, `online`, `profilo`, `foto`, `ping`, `credito`), registrato in `main/connettori/index.js`; l'interfaccia riceve l'elenco all'avvio (`stato.connettori`).
- [x] Codice MCG spostato in `main/connettori/mcg/` (`index.js`, `indirizzi.js`, `pagine.js`) e `js/connettore-mcg.js` senza cambiarne il comportamento, verificato nell'app su una copia dei dati reali. Il file dell'interfaccia sta direttamente in `js/` (non in `js/connettori/`) perché il controllo dei moduli (`tests/moduli.test.js`) esamina solo quella cartella; la lettura delle pagine delle transazioni MCG resta in `js/sincronizzazione.js`. `main/rete.js` contiene solo funzioni comuni (download, ping).
- [x] Canali IPC generici con l'ID del sito come primo argomento (`main/ipc-connettori.js`): un sito senza connettore o senza quella funzione riceve `{ success: false }`.
- [x] Badge Online/Sospesa, galleria e indicatore di raggiungibilità solo se il sito è in uso e il suo connettore offre la funzione (`funzioneDisponibile()` di `js/connettori.js`); la galleria compare per il primo sito della modella che offre le foto.

**Per aggiungere un sito:** creare `main/connettori/<id>/index.js` che esporta `{ id, capacita }` con le sole funzioni che il sito permette, registrarlo in `main/connettori/index.js`, e mettere le parti di interfaccia specifiche in `js/connettore-<id>.js`.

## ✅ Fase 4: modelle presenti su più siti

- [x] Un profilo per sito per ogni modella, ricavato dagli show (ultimo `urlProfilo` degli show di ogni sito: `stato.mappaUrlPerSito`, `modella → { mcg: url, stripchat: url }`), senza un nuovo archivio. Stato online, profili sospesi e galleria usano il profilo sul sito del connettore; il form propone il profilo sul sito scelto.
- [x] Scheda modella con link per sito, totali complessivi e tabella **Per sito** (`profiliPerSito` in `calcoli.js`).
- [x] Unisci / separa modelle dalla scheda (`js/unisci-modelle.js`): gli show vengono rinominati e ricordano il nome di acquisto (`nomeOriginale`), che la sincronizzazione MCG usa per non creare doppioni e per assegnare gli show nuovi alla modella giusta (provato su una copia dei dati reali).

## ✅ Fase 5: importazione generica

- [x] Import da **CSV** (menu Dati) con abbinamento delle colonne indovinato dalle intestazioni (data, ora, modella, importo, durata, note, nickname), scelta di sito, valuta, tasso e formato della data, anteprima con lo stato di ogni riga e controllo dei doppioni (archivio e file): funziona con ogni sito che permette di scaricare lo storico degli acquisti.
- [x] Export CSV della cronologia (`;` e virgola decimale per Excel, reimportabile).
- [x] **Valuta** e tasso in euro per sito (euro, dollari, sterline, token, crediti) in Gestisci siti; gli show salvano il costo in euro e l'importo originale, nel form un convertitore calcola il costo dai token.

## Fase 6: nuovi connettori

- [x] Per ogni sito, verifica preliminare: termini d'uso, esportazione ufficiale o API, struttura delle pagine (ottobre 2026, da una connessione italiana):

| Sito | Raggiungibile | Termini d'uso | Esportazione / API ufficiale | Esito |
| :--- | :---: | :--- | :--- | :--- |
| Chaturbate | Sì, ma con verifica dell'età obbligatoria per l'Italia | Vietano esplicitamente qualsiasi mezzo automatico per raccogliere dati («robots/bots, crawlers, or data mining tools») | API JSON per affiliati (modelle online), con codice affiliato; CSV delle mance solo per chi trasmette | Niente lettura delle pagine. Possibile solo lo stato online tramite l'API per affiliati, se si ha un codice |
| Stripchat | No (il nome del sito non si risolve: blocco di rete) | Da verificare | Esistono indirizzi JSON pubblici non documentati, nessuna API ufficiale per gli utenti | Non realizzabile da qui |
| BongaCams | No (stesso blocco) | Da verificare | Nessuna nota | Non realizzabile da qui |
| LiveJasmin | No (stesso blocco) | Da verificare | Nessuna nota | Non realizzabile da qui |
| OnlyFans | Risponde 403 ai client non browser | Vietano lo scraping | Nessuna API pubblica | Non realizzabile |

**Conclusione:** oggi nessun sito permette un connettore come quello di MCG (lettura dello storico con login) nel rispetto dei termini d'uso. Lo storico degli altri siti si importa da **CSV** (fase 5). Restano possibili solo funzioni basate su API ufficiali, come lo stato online di Chaturbate con un codice affiliato.
- [ ] Prima l'import dello storico, poi stato online e foto.
- [ ] Test con pagine di esempio anonimizzate, come per MCG.

## ✅ Fase 7: aspetto neutro e rilascio 2.0

- [x] Siti **in uso** (Gestisci siti): solo questi nel form; le parti legate a MCG (indicatore «MCG: Online», importazione automatica, filtro Solo online, badge Online/Sospesa, galleria) compaiono e contattano il sito solo se MCG è in uso. Testi generici fuori dalla sezione MCG (tema Bordeaux & Oro, Informazioni).
- [x] Al primo avvio, con l'archivio vuoto, il benvenuto chiede quali siti usi e il sito principale (senza la finestra delle novità).
- [x] Rilascio come **2.0.0**: copia `shows_data.prima-2.0.json` prima della conversione, provata su una copia di un archivio reale (87 show convertiti, nessun dato perso); README e guida aggiornati.
