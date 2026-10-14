import { copiaArchivio, salvaArchivio } from './archivio.js';
import { registraCredito } from './credito-mcg.js';
import { t } from './i18n.js';
import { logger } from './logger.js';
import { slugProfiloMcg, urlProfiloPredefinito } from './connettore-mcg.js';
import { stato } from './stato.js';
import { generaIdUnico, parseDataItaliana, dataDelloShow } from './utils.js';
import { SITO_MCG } from './siti.js';

/* ==========================================================================
   SINCRONIZZAZIONE TRANSAZIONI MONDO CAM GIRLS
   ==========================================================================
   Struttura della tabella "transazioni" di MCG (una riga per transazione):
     cella 0  data e ora ("02/10/26 18:17")
     cella 1  entrata, per ricariche e rimborsi ("35.00 €")
     cella 2  uscita, per i pagamenti ("-60.00 €")
     cella 3  tipo di transazione, con link javascript:dettaglitrans(<codice>)
              "Pagamento da conto ricaricabile" | "Ricarica con carta di credito"
              | "Rimborso su conto ricaricabile"
     cella 4  modella, con link al profilo (vuota per le ricariche)
   Il pagamento rimborsato e il rimborso hanno entrambi la classe "rimborsata". */

// "1.234,56 €" -> "1234.56". Prima veniva sostituita solo la prima virgola e i
// punti delle migliaia restavano, quindi 1.234,56 diventava 1,234.
export function convertiImportoItaliano(testo) {
    const pulito = String(testo).replace(/[€\s ]/g, '');
    return pulito.includes(',')
        ? pulito.replace(/\./g, '').replace(',', '.')
        : pulito;
}

// Testo di una cella senza spazi multipli o a capo
export const testoCella = (cella) => (cella.textContent || '').replace(/\s+/g, ' ').trim();

// Una riga è una transazione MCG se il tipo (cella 3) ha il link al dettaglio
export const eRigaTransazione = (riga) => Boolean(riga.querySelector('a[href*="dettaglitrans("]'));

export function tipoTransazione(testo) {
    const t = testo.toLowerCase();
    if (t.startsWith('pagamento')) return 'pagamento';
    if (t.startsWith('rimborso')) return 'rimborso';
    if (t.startsWith('ricarica')) return 'ricarica';
    return 'altro';
}

// Salva in locale (userData/mcg_ultima_sincronizzazione.json) le tabelle lette e
// l'esito di ogni riga: serve a capire la struttura reale della pagina di MCG
export async function salvaCopiaSincronizzazione(doc, esiti) {
    if (!window.electronAPI?.salvaCopiaImportazione) return;
    const tabelle = [...doc.querySelectorAll('table')].map((tabella, indice) => ({
        indice,
        intestazioni: [...tabella.querySelectorAll('th')].map(testoCella),
        righe: [...tabella.querySelectorAll('tr')].map(tr => [...tr.children].map(testoCella)).filter(r => r.length),
        html: tabella.outerHTML
    }));
    const esito = await window.electronAPI.salvaCopiaImportazione(SITO_MCG, {
        dataSincronizzazione: new Date().toISOString(),
        versioneApp: await window.electronAPI.getAppVersion(),
        numeroTabelle: tabelle.length,
        esitiRighe: esiti,
        tabelle
    });
    if (esito && esito.success) logger.info('Copia della pagina MCG salvata', esito.path);
}

// Segna uno show come rimborsato: non conta più nella spesa né nel €/min, ma
// il costo originale resta registrato
export function segnaRimborsato(show, rimborso) {
    show.costoOriginale = parseFloat(show.costo) || rimborso.importo;
    show.costo = 0;
    show.rimborsato = true;
    show.dataRimborso = rimborso.data.toISOString();
    const nota = `Rimborsato il ${rimborso.testoData} (€ ${show.costoOriginale.toFixed(2)})`;
    show.note = show.note ? `${show.note} · ${nota}` : nota;
}

// Analizza la pagina delle transazioni e restituisce gli show nuovi, quanti show
// già salvati sono stati modificati (rimborsi) e l'esito di ogni riga.
// Non salva nulla: il salvataggio lo fa il chiamante. Le modifiche ai rimborsi
// vengono fatte direttamente sugli oggetti di showsEsistenti.
export function analizzaTransazioniMcg(doc, showsEsistenti) {
    const nuoviShow = [];
    let showModificati = 0;
    let linkAggiornati = 0;

    // Show già salvato riconosciuto in pagina: se il suo indirizzo del profilo è
    // vuoto o era stato indovinato dal nome, si usa quello reale fornito da MCG.
    // Un indirizzo diverso (inserito a mano) non viene toccato.
    const aggiornaLinkProfilo = (show, r) => {
        if (!r.urlProfilo || show.urlProfilo === r.urlProfilo) return false;
        if (show.urlProfilo && show.urlProfilo !== urlProfiloPredefinito(show.nomeOriginale || show.nome)) return false;
        show.urlProfilo = r.urlProfilo;
        linkAggiornati++;
        return true;
    };

    // Chiave anti-duplicato: nome + data/ora al minuto, in ora locale
    const p2 = (n) => String(n).padStart(2, '0');
    const chiaveShow = (nome, d) =>
        `${nome}|${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
    // Gli show uniti o separati nella scheda della modella hanno un nome diverso da
    // quello su MCG: il confronto usa il nome con cui sono stati acquistati
    const nomeSuMcg = (show) => (show.nomeOriginale || show.nome || '').toLowerCase().trim();
    const stessoNome = (show, nome) => nomeSuMcg(show) === nome;

    // Show già salvati, raggruppati per modella. Ogni rappresentazione della data
    // salvata nel record (ISO, dataFormattata, data) conta come corrispondenza.
    // Ogni show può corrispondere a una sola transazione ("usato").
    const archivioPerNome = new Map();
    showsEsistenti.forEach(s => {
        const nome = nomeSuMcg(s);
        if (!nome) return;
        const date = [dataDelloShow(s), parseDataItaliana(s.dataFormattata)].filter(Boolean);
        const voce = {
            chiavi: new Set(date.map(d => chiaveShow(nome, d))),
            data: dataDelloShow(s),
            costo: s.rimborsato ? (parseFloat(s.costoOriginale) || 0) : (parseFloat(s.costo) || 0),
            show: s,
            usato: false
        };
        if (!archivioPerNome.has(nome)) archivioPerNome.set(nome, []);
        archivioPerNome.get(nome).push(voce);
    });

    // 1° passaggio: lettura di tutte le righe
    const righe = [...doc.querySelectorAll('table tbody tr, table tr')].map(riga => {
        const celle = riga.querySelectorAll('td');
        const r = { celle: [...riga.children].map(testoCella), esito: null };
        if (!eRigaTransazione(riga) || celle.length < 5) { r.esito = 'scartata: non è una transazione'; return r; }

        r.testoData = celle[0].textContent.trim();
        r.data = parseDataItaliana(r.testoData);
        r.tipo = tipoTransazione(testoCella(celle[3]));
        r.nome = testoCella(celle[4]);
        r.nomeNormalizzato = r.nome.toLowerCase();
        r.rimborsata = riga.classList.contains('rimborsata');
        // Link reale al profilo della modella (cella 4), normalizzato senza percorso
        const slug = slugProfiloMcg(celle[4].querySelector('a[href]')?.getAttribute('href'));
        r.urlProfilo = slug ? `https://${slug}.mondocamgirls.com` : '';
        const importo = (cella) => Math.abs(parseFloat(convertiImportoItaliano(cella.textContent || '0')) || 0);
        r.importo = r.tipo === 'rimborso' ? importo(celle[1]) : importo(celle[2]);

        if (!r.data) r.esito = 'scartata: data non leggibile';
        else if (r.tipo === 'ricarica') r.esito = 'ignorata: ricarica del conto';
        else if (r.tipo === 'altro') r.esito = `ignorata: tipo di transazione sconosciuto (${testoCella(celle[3])})`;
        else if (!r.nome || !isNaN(r.nome)) r.esito = `scartata: modella non indicata o non più presente su MCG (${r.nome || 'vuoto'})`;
        return r;
    });

    const rimborsi = righe.filter(r => !r.esito && r.tipo === 'rimborso');

    // 2° passaggio: pagamenti (gli show)
    const pagamenti = righe.filter(r => !r.esito && r.tipo === 'pagamento');

    // 2a: corrispondenza esatta (stessa modella, stessa data/ora al minuto).
    // Due show reali nello stesso minuto richiedono due show in archivio.
    pagamenti.forEach(r => {
        const chiave = chiaveShow(r.nomeNormalizzato, r.data);
        const voce = (archivioPerNome.get(r.nomeNormalizzato) || []).find(v => !v.usato && v.chiavi.has(chiave));
        if (voce) {
            voce.usato = true;
            r.esito = aggiornaLinkProfilo(voce.show, r) ? 'già presente (link del profilo aggiornato)' : 'già presente';
        }
    });

    // 2b: corrispondenza tollerante, solo dopo tutte quelle esatte: stessa modella
    // e stesso importo entro ±3 ore. Copre gli show importati in passato con
    // l'orario spostato di 1-2 ore (vecchio problema di fuso orario).
    const TOLLERANZA_MS = 3 * 60 * 60 * 1000;
    pagamenti.filter(r => !r.esito).forEach(r => {
        const voce = (archivioPerNome.get(r.nomeNormalizzato) || []).find(v => !v.usato && v.data
            && Math.abs(v.data - r.data) <= TOLLERANZA_MS && Math.abs(v.costo - r.importo) < 0.01);
        if (voce) {
            voce.usato = true;
            const link = aggiornaLinkProfilo(voce.show, r) ? ', link del profilo aggiornato' : '';
            r.esito = `già presente (orario diverso di ${Math.round(Math.abs(voce.data - r.data) / 60000)} min${link})`;
        }
    });

    // Nome attuale delle modelle rinominate (unite o separate): nome su MCG -> nome
    // nell'archivio, dallo show più recente. Gli show nuovi seguono la stessa modella.
    const nomeInArchivio = new Map();
    [...showsEsistenti].filter(s => s.nomeOriginale && s.sito === SITO_MCG)
        .sort((a, b) => (dataDelloShow(a) || 0) - (dataDelloShow(b) || 0))
        .forEach(s => nomeInArchivio.set(nomeSuMcg(s), s.nome));

    // 2c: i pagamenti rimasti sono show nuovi
    pagamenti.filter(r => !r.esito).forEach(r => {
        const nome = nomeInArchivio.get(r.nomeNormalizzato) || r.nome;
        const chiaveNome = nome.toLowerCase().trim();
        // Dati noti della modella dagli show precedenti (piattaforma, nickname):
        // prima la piattaforma era sempre "Teams"
        const modellaMemory = stato.elencoModelleUniche.find(m => m.nome.toLowerCase() === chiaveNome);

        const nuovoShow = {
            id: generaIdUnico(),
            dataOraISO: r.data.toISOString(),
            dataFormattata: r.testoData,
            meseAnno: r.data.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
            nome,
            isRegalo: false,
            piattaforma: (modellaMemory && modellaMemory.piattaforma) || 'Teams',
            punteggio: 'TBD',
            costo: r.importo,
            immagine: stato.mappaImmaginiModelle[chiaveNome] || '',
            urlProfilo: r.urlProfilo || stato.mappaUrlPerSito[chiaveNome]?.[SITO_MCG] || urlProfiloPredefinito(r.nome),
            recensione: false,
            note: '',
            sito: SITO_MCG,
            importatoDa: SITO_MCG
        };
        if (nome !== r.nome) nuovoShow.nomeOriginale = r.nome;
        if (modellaMemory && modellaMemory.nickname) nuovoShow.nickname = modellaMemory.nickname;

        // Pagamento nuovo già rimborsato: si collega subito al suo rimborso nella pagina
        if (r.rimborsata) {
            const rimborso = rimborsi
                .filter(x => !x.applicato && x.rimborsata && x.nomeNormalizzato === r.nomeNormalizzato
                    && Math.abs(x.importo - r.importo) < 0.01 && x.data >= r.data)
                .sort((a, b) => a.data - b.data)[0];
            if (rimborso) {
                segnaRimborsato(nuovoShow, rimborso);
                rimborso.applicato = true;
                rimborso.esito = `rimborso applicato al nuovo show del ${r.testoData}`;
            }
        }

        nuoviShow.push(nuovoShow);
        r.esito = nuovoShow.rimborsato ? 'importata (rimborsata)' : 'importata';
    });

    // 3° passaggio: rimborsi non ancora collegati. Non creano uno show (prima
    // diventavano uno show finto da 0 €): segnano come rimborsato il pagamento
    // già salvato della stessa modella, stesso importo, precedente al rimborso.
    rimborsi.filter(r => !r.applicato).forEach(r => {
        const dataISO = r.data.toISOString();
        if (showsEsistenti.some(s => stessoNome(s, r.nomeNormalizzato) && s.dataRimborso === dataISO)) {
            r.esito = 'rimborso già registrato';
            return;
        }
        const pagamento = showsEsistenti
            .filter(s => stessoNome(s, r.nomeNormalizzato) && !s.rimborsato && !s.isRegalo
                && Math.abs((parseFloat(s.costo) || 0) - r.importo) < 0.01)
            .map(s => ({ s, d: dataDelloShow(s) }))
            .filter(x => x.d && x.d <= r.data)
            .sort((a, b) => b.d - a.d)[0];
        if (!pagamento) {
            r.esito = 'rimborso: pagamento corrispondente non trovato';
            return;
        }
        segnaRimborsato(pagamento.s, r);
        showModificati++;
        r.esito = `rimborso applicato allo show del ${pagamento.s.dataFormattata || ''}`;
    });

    return { nuoviShow, showModificati, linkAggiornati, esiti: righe.map(r => ({ esito: r.esito, celle: r.celle })) };
}

// Unisce le pagine lette in un'unica tabella, una riga per transazione: se due
// pagine si sovrappongono, la stessa transazione (stesso codice) compare una volta
export function unisciPagineMcg(pagine) {
    const parser = new DOMParser();
    const visti = new Set();
    const righe = [];
    pagine.forEach(html => {
        parser.parseFromString(html, 'text/html').querySelectorAll('table tr').forEach(tr => {
            if (!eRigaTransazione(tr)) return;
            const codice = (tr.querySelector('a[href*="dettaglitrans("]').getAttribute('href').match(/\d+/) || [''])[0];
            if (visti.has(codice)) return;
            visti.add(codice);
            righe.push(tr.outerHTML);
        });
    });
    // Senza transazioni si analizza la prima pagina così com'è, per la copia diagnostica
    if (righe.length === 0) return parser.parseFromString(pagine[0] || '', 'text/html');
    return parser.parseFromString(`<table class="tab_transazioni">${righe.join('')}</table>`, 'text/html');
}

// Importazione dell'intera cronologia (menu Dati)
export function importaCronologiaCompletaMcg() {
    return sincronizzaTransazioniMondoCamGirls({ tutteLePagine: true });
}

// opzioni.tutteLePagine: legge tutte le pagine della cronologia invece della sola
// prima, e chiede conferma prima di salvare
export async function sincronizzaTransazioniMondoCamGirls(opzioni = {}) {
    const tutteLePagine = Boolean(opzioni.tutteLePagine);
    try {
        if (!window.electronAPI?.importaTransazioni) {
            alert("Errore: Funzione di sincronizzazione non supportata.");
            return;
        }

        logger.info(tutteLePagine
            ? "Avvio importazione della cronologia completa da MondoCamGirls..."
            : "Avvio sincronizzazione transazioni da MondoCamGirls...");

        const lettura = await window.electronAPI.importaTransazioni(SITO_MCG, { tutteLePagine });

        if (!lettura || !Array.isArray(lettura.pagine) || lettura.pagine.length === 0) {
            logger.warn("Sincronizzazione annullata o finestra chiusa.");
            alert("ℹ️ Sincronizzazione annullata: la finestra di MondoCamGirls è stata chiusa prima di leggere le transazioni.");
            return;
        }

        // Credito letto dall'area clienti subito dopo le transazioni (login appena fatto)
        registraCredito(lettura.credito);

        const doc = unisciPagineMcg(lettura.pagine);

        // Controllo della struttura: se nessuna riga ha il link al dettaglio della
        // transazione, la pagina di MCG è cambiata e i dati non sono affidabili
        if (![...doc.querySelectorAll('table tr')].some(eRigaTransazione)) {
            await salvaCopiaSincronizzazione(doc, []).catch(() => {});
            logger.error("Sincronizzazione interrotta: struttura della pagina MCG non riconosciuta.");
            alert("⚠️ La pagina delle transazioni di MondoCamGirls non ha la struttura attesa: nessun dato è stato importato.\n\nUna copia della pagina è stata salvata nella cartella dati (mcg_ultima_sincronizzazione.json).");
            return;
        }

        // Copia dell'archivio in memoria: l'analisi segna i rimborsi direttamente sui
        // record, che finiscono nell'archivio solo se il salvataggio va a buon fine
        const showsEsistenti = copiaArchivio();

        const { nuoviShow, showModificati, linkAggiornati, esiti } = analizzaTransazioniMcg(doc, showsEsistenti);

        // La copia è solo diagnostica: un suo errore non deve bloccare l'importazione
        await salvaCopiaSincronizzazione(doc, esiti).catch(err => logger.warn('Copia sincronizzazione MCG non salvata', err.message));

        const riepilogoLettura = `Pagine lette: ${lettura.pagine.length} (${lettura.transazioni} transazioni)`;
        logger.info(`Lettura MCG: ${riepilogoLettura} - ${lettura.motivoFine}`);
        const avvisoIncompleta = tutteLePagine && !lettura.completa
            ? `\n\n⚠️ Lettura interrotta prima della fine: ${lettura.motivoFine}.`
            : '';

        if (nuoviShow.length === 0 && showModificati === 0 && linkAggiornati === 0) {
            logger.info("Sincronizzazione completata: nessun nuovo show da importare.");
            alert(`ℹ️ Tutti gli show letti risultano già salvati.${tutteLePagine ? `\n\n${riepilogoLettura}` : ''}${avvisoIncompleta}`);
            return;
        }

        // Con la cronologia completa i numeri possono essere grandi: conferma prima di salvare
        if (tutteLePagine) {
            const conferma = confirm(`${riepilogoLettura}\n\nShow nuovi da importare: ${nuoviShow.length}\nShow da segnare come rimborsati: ${showModificati}\nLink del profilo da aggiornare: ${linkAggiornati}${avvisoIncompleta}\n\nIl dettaglio di ogni riga è in mcg_ultima_sincronizzazione.json (cartella dati).\n\nProcedere con il salvataggio?`);
            if (!conferma) {
                logger.info("Importazione della cronologia completa annullata dall'utente.");
                return;
            }
        }

        await salvaArchivio([...showsEsistenti, ...nuoviShow]);
        logger.success(`Sincronizzazione completata: ${nuoviShow.length} nuovi show, ${showModificati} rimborsi applicati, ${linkAggiornati} link del profilo aggiornati.`);
        let messaggio = `✅ Sincronizzazione completata con successo!\n\nNuovi show importati: ${nuoviShow.length}`;
        if (showModificati > 0) messaggio += `\nShow segnati come rimborsati: ${showModificati}`;
        if (linkAggiornati > 0) messaggio += `\nLink del profilo aggiornati: ${linkAggiornati}`;
        alert(messaggio + avvisoIncompleta);

    } catch (err) {
        logger.error("Errore durante la sincronizzazione MondoCamGirls", err);
        alert("❌ Errore durante l'elaborazione dei dati della sincronizzazione.");
    }
}
