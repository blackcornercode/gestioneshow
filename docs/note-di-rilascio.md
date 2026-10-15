# Private Diary 2.0.1

## ⬇️ Download (Windows 10/11)

Negli *Assets* qui sotto:
- **`PrivateDiary-2.0.1-setup.exe`** (consigliato): installa l'app per il tuo utente, senza permessi di amministratore, con collegamenti nel menu Start e sul desktop.
- **`PrivateDiary-2.0.1-portable.exe`**: versione portable, da avviare senza installazione.

I dati delle versioni precedenti (anche di *Gestione Show MCG*) vengono letti automaticamente; disinstallando l'app i dati restano.

## 🛡️ Se Windows o l'antivirus segnalano l'app

L'eseguibile non ha una firma digitale e, essendo nuovo, non ha ancora una «reputazione»: alcuni antivirus (per esempio AVG e Avast, con segnalazioni generiche come *IDP.ALEXA*) e Windows SmartScreen possono bloccarlo per prudenza. È un falso positivo:
- con SmartScreen scegli **Ulteriori informazioni › Esegui comunque** (*More info › Run anyway*);
- se vuoi una verifica indipendente, carica il file su [VirusTotal](https://www.virustotal.com), che lo analizza con circa 70 antivirus;
- preferisci l'installer: la versione portable a ogni avvio si estrae in una cartella temporanea, un comportamento che alcuni antivirus giudicano sospetto;
- il codice è tutto in questo repository e puoi compilarlo da te (`npm run dist`).

## ✨ Novità

- Il pulsante Cartella è passato dal menu Dati a Impostazioni › Dati e si chiama «Cartella dati»; la sezione «Backup e dati» del menu Dati si chiama ora «Backup» e i suoi due pulsanti (Esporta, Importa) hanno titolo e descrizione come gli altri del menu
- Impostazioni › Registro (log): si sceglie cosa annotare in app.log (niente, solo errori, errori e avvisi, tutto), con i pulsanti per aprire e cancellare il registro. Il registro ora riporta il messaggio e lo stack degli errori (prima restava «{}»), annota gli errori non gestiti e l'arresto dell'interfaccia, non contiene più nomi di modelle, tag e siti, e le righe inviate dall'interfaccia sono ripulite e limitate in lunghezza
- Due nuovi parametri dello show, facoltativi: qualità di video e audio (Alta, Media, Bassa) e inquadratura della camera (orizzontale o verticale). Si scelgono nel form, nella sezione Com'è andata, compaiono sotto il voto in tutte le tabelle, si cambiano con la modifica multipla e sono nell'esportazione CSV. Ripeti ultimo show riprende l'inquadratura. La sezione Com'è andata mostra voto, qualità, inquadratura e recensione in quattro riquadri affiancati, con icona, titolo e una nota breve (due per riga se la finestra è stretta)
- Scheda Preventivo, tra Classifica e Statistiche: per ogni modella un €/min suggerito (media degli ultimi 5 show con durata, sul sito scelto se lei ne ha almeno 2 lì), il prezzo atteso per la durata scelta, l'ultimo show con lei della stessa durata e il confronto del prezzo chiesto (anche in token) con la sua media e con la tua media generale: in linea entro ±10%, più caro o più conveniente. Sotto, la tabella dei prezzi suggeriti di tutte le modelle con la tendenza e i prezzi per 10, 15, 30 e 60 minuti, ordinabile cliccando sulle intestazioni (dal più costoso al meno costoso e viceversa, ordine ricordato alla riapertura) e con un pulsante per aprire la scheda di ogni modella, presente anche nel calcolatore; accanto al nome i badge Online e Sospesa/Rimossa come in classifica e la casella «Solo online», ricordata alla riapertura
- Riquadro Preventivo nella scheda della modella e prezzo atteso nel form appena scelte modella e durata, prima di scrivere il costo
- Credito residuo su Mondo Cam Girls nell'intestazione, accanto all'indicatore MCG: viene letto a ogni sincronizzazione e poi aggiornato da solo ogni 15 minuti (o con un clic) usando il login salvato, senza aprire finestre; se MCG chiede di nuovo il login resta l'ultimo valore letto, con la data
- Opzione «Mostra le note per intero» (Impostazioni › Tabelle): note e tag completi in cronologia, dettaglio del mese e scheda modella, senza doverli aprire con un clic
- L'app ricorda alla riapertura anche l'ordine e i filtri delle tabelle (sito e tag della cronologia, sito e «Solo online» della classifica), oltre a quelli già salvati; la ricerca per nome no. Reset Filtri li riporta ai valori predefiniti

## 🎨 Interfaccia

- Menu Impostazioni più ordinato, su due colonne con le sezioni Aspetto (lingua, tema, testo), Tabelle, Siti e tag e Privacy

## 🐛 Correzioni

- Un regalo registrato dopo Ripeti ultimo show (o dopo aver scelto una durata) veniva salvato con la durata dello show, che per i regali è nascosta
- Nella scheda della modella, nei riquadri per sito, alcune etichette (in inglese «Total duration» e «Total spent») si sovrapponevano e in tedesco e russo le parole lunghe venivano spezzate; ora ogni etichetta resta intera e, se non c'è spazio, va sulla riga sotto. La pagina dichiara anche la lingua dell'interfaccia, utile ai lettori di schermo

---
Storia completa: [CHANGELOG.md](https://github.com/blackcornercode/private-diary/blob/main/CHANGELOG.md) · Contatti: blackcornermail@gmail.com
