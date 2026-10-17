/* ==========================================================================
   AVVIO E COLLEGAMENTI DELL'INTERFACCIA
   ==========================================================================
   Unico script caricato da index.html (type="module"): importa i moduli,
   registra le azioni dell'interfaccia (data-azione, vedi azioni.js), collega
   l'archivio alle viste e avvia l'applicazione. */
import { aggiornaInterfaccia, alCambioArchivio, aggiornaViste } from './archivio.js';
import { inizializzaAzioni, registraAzioni } from './azioni.js';
import { initChangelogCheck, inizializzaListenerChangelogMenu, apriModalChangelog, chiudiModalChangelog } from './changelog.js';
import { caricaMedieEStoricizzazione, filtraClassificaModelle } from './classifica.js';
import { caricaConnettori } from './connettori.js';
import { inizializzaCredito, aggiornaCredito, aggiornaTestoCredito } from './credito-mcg.js';
import { inizializzaFiltriCronologia, inizializzaFiltroAnni, caricaCronologia, cambiaPagina, resetFiltriCronologia, filtraCronologiaPerNome } from './cronologia.js';
import { esportaDati, importaDati, apriCartellaDati } from './dati.js';
import { inizializzaFiltriSalvati } from './filtri-salvati.js';
import { impostaTipo, cliccaVoto, scegliParametroShow, durataRapida, aggiornaAnteprimaCostoMinuto, aggiornaRiepilogoDettagli, sincronizzaFormAssistito, ultimoShowModella, convertiImportoValuta, inizializzaConvertitoreValuta, alternaCostoInEuro, mostraNuovoTag, durataLibera } from './form-assistito.js';
import { inizializzaUrlProfiloForm, impostaDataOraAttuale, autocompilaDatiModella, aggiornaPulsanteForm, aggiornaDatalistModelle, toggleForm, annullaModifica, gestisciStatoRegalo, modificaShow, eliminaShow, ripetiUltimoShow, inizializzaScorciatoieForm, svuotaForm } from './form-show.js';
import { apriModalImmagine, chiudiModalImmagine, navigaGalleria } from './galleria.js';
import { disegnaSelettoreSitoForm, scegliSitoForm, aggiornaSelectSiti, apriGestioneSiti, chiudiGestioneSiti, disegnaGestioneSiti, creaSitoDaGestione, rinominaSito, cambiaSiglaSito, cambiaColoreSito, cambiaValutaSito, cambiaTassoSito, cambiaAttivoSito, applicaSitiAttivi, controllaBenvenuto, aggiornaBenvenuto, confermaBenvenuto, eliminaSito, cambiaSitoPredefinito, inizializzaSiti } from './gestione-siti.js';
import { avviaImportazioneCsv, chiudiImportazioneCsv, confermaImportazioneCsv, aggiornaAnteprimaCsv, impostaValutaDalSito, esportaCronologiaCsv } from './importa-csv.js';
import { impostaVistaGraficoSpesa } from './grafico-spesa.js';
import { caricaLingua, linguaCorrente } from './i18n.js';
import { logger, registraErroriGlobali } from './logger.js';
import { inizializzaMenuHeader } from './menu-header.js';
import { apriModalModella, chiudiModalModella, aggiornaBadgeSchedaModella } from './modale-modella.js';
import { verificaProfiliSospesi, inizializzaProfiliSospesi } from './profili-sospesi.js';
import { ridisegnaPreventivo, aggiornaPreventivo, cambiaModellaPreventivo, durataPreventivo, durataLiberaPreventivo, usaNelPreventivo, aggiornaPreventivoScheda, apriPreventivoDaScheda, ordinaPrezzi, disegnaPrezziSuggeriti } from './preventivo.js';
import { apriRecensione, chiudiRecensione, copiaRecensione, modificaDaRecensione } from './recensione.js';
import { apriUnisciModella, chiudiUnisciModella, cambiaSitoSepara, aggiornaAnteprimaUnisci, confermaUnisciModella } from './unisci-modelle.js';
import { inizializzaPrivacy, aggiornaTestiPrivacy, cambiaSfocatura, cambiaAspettoNeutro, cambiaBloccoMinuti, apriFinestraPin, chiudiFinestraPin, salvaPin, sblocca, registraTastoRapido, ripristinaTastoRapido } from './privacy.js';
import { mostraVersioneApp, inizializzaTema, inizializzaFont, inizializzaGestioneBudget, apriTab, cambiaTema, aumentaFont, riduciFont, inizializzaNoteComplete, cambiaNoteComplete, inizializzaRegistro, cambiaLivelloLog, apriLog, cancellaLog } from './preferenze.js';
import { selezionaShow, selezionaPagina, selezionaTuttiFiltrati, deselezionaTutti, eliminaSelezionati, apriModificaMultipla, applicaModificaMultipla, chiudiModificaMultipla } from './selezione.js';
import { sincronizzaTransazioniMondoCamGirls, importaCronologiaCompletaMcg } from './sincronizzazione.js';
import { stato } from './stato.js';
import { verificaStatoMCG, aggiornaTestoStatoMCG } from './stato-mcg.js';
import { disegnaSelettoreTagForm, alternaTagForm, creaTagDaForm, disegnaTagModificaMultipla, alternaTagModificaMultipla, aggiornaFiltroTag, apriGestioneTag, chiudiGestioneTag, disegnaGestioneTag, creaTagDaGestione, rinominaTag, cambiaColoreTag, eliminaTag, inizializzaTag } from './tag.js';
import { inizializzaStatoOnline } from './stato-online.js';
import { popolaSelettoreAnni, caricaStatisticheMensili, aggiornaStatisticheMensili, selezionaMeseDettaglio, aggiornaIndicatoreBudgetHomepage } from './statistiche.js';
import { apriLinkEsterno, copiaEApriTeams, espandiNota } from './utils.js';

/* --------------------------------------------------------------------------
   AZIONI DELL'INTERFACCIA: nome usato negli attributi data-* -> funzione
   -------------------------------------------------------------------------- */
registraAzioni({
    // Intestazione e menu
    'sincronizza-mcg': () => sincronizzaTransazioniMondoCamGirls(),
    'cronologia-completa-mcg': () => importaCronologiaCompletaMcg(),
    'esporta-backup': () => esportaDati(),
    'importa-backup': () => importaDati(),
    'apri-cartella-dati': () => apriCartellaDati(),
    'riduci-testo': () => riduciFont(),
    'aumenta-testo': () => aumentaFont(),
    'cambia-lingua': (el) => cambiaLingua(el.value),
    'cambia-tema': (el) => cambiaTema(el.value),
    'cambia-note-complete': (el) => cambiaNoteComplete(el),
    'apri-tab': (el) => apriTab(el.dataset.tab, el),

    // Form e cronologia
    'toggle-form': () => toggleForm(),
    'annulla-modifica': () => annullaModifica(),
    'gestisci-regalo': () => gestisciStatoRegalo(),
    'tipo-show': (el) => { impostaTipo(el.dataset.tipo); gestisciStatoRegalo(); },
    'voto-stelle': (el) => cliccaVoto(el),
    'scegli-qualita': (el) => scegliParametroShow(el, 'qualitaShow'),
    'scegli-camera': (el) => scegliParametroShow(el, 'cameraShow'),
    'durata-rapida': (el) => durataRapida(el),
    'costo-ultimo': () => {
        const ultimo = ultimoShowModella();
        const costo = document.getElementById('costo');
        if (ultimo && costo) costo.value = ultimo.costo;
        aggiornaAnteprimaCostoMinuto();
    },
    'anteprima-costo-minuto': () => aggiornaAnteprimaCostoMinuto(),
    'riepilogo-dettagli': () => aggiornaRiepilogoDettagli(),
    'ripeti-ultimo-show': () => ripetiUltimoShow(),
    'svuota-form': () => svuotaForm(),
    'modifica-show': (el) => modificaShow(el.dataset.id),
    'apri-recensione': (el) => apriRecensione(el),
    'chiudi-recensione': () => chiudiRecensione(),
    'copia-recensione': () => copiaRecensione(),
    'modifica-recensione': () => modificaDaRecensione(),
    'elimina-show': (el) => eliminaShow(el.dataset.id),
    'filtra-cronologia': () => filtraCronologiaPerNome(),
    'reset-filtri-cronologia': () => resetFiltriCronologia(),
    'cambia-pagina': (el) => cambiaPagina(Number(el.dataset.direzione)),
    'espandi-nota': (el) => espandiNota(el),

    // Selezione multipla della cronologia
    'seleziona-show': (el) => selezionaShow(el),
    'seleziona-pagina': (el) => selezionaPagina(el),
    'seleziona-tutti-filtrati': () => selezionaTuttiFiltrati(),
    'deseleziona-tutti': () => deselezionaTutti(),
    'elimina-selezionati': () => eliminaSelezionati(),
    'modifica-selezionati': () => apriModificaMultipla(),
    'applica-modifica-multipla': () => applicaModificaMultipla(),
    'chiudi-modifica-multipla': () => chiudiModificaMultipla(),

    // Tag degli show
    'alterna-tag-form': (el) => alternaTagForm(el),
    'crea-tag-form': () => creaTagDaForm(),
    'alterna-tag-multipla': (el) => alternaTagModificaMultipla(el),
    'apri-gestione-tag': () => apriGestioneTag(),
    'chiudi-gestione-tag': () => chiudiGestioneTag(),
    'crea-tag-gestione': () => creaTagDaGestione(),
    'rinomina-tag': (el) => rinominaTag(el),
    'colore-tag': (el) => cambiaColoreTag(el),
    'elimina-tag': (el) => eliminaTag(el),

    // Siti di provenienza degli show
    'scegli-sito-form': (el) => scegliSitoForm(el),
    'apri-gestione-siti': () => apriGestioneSiti(),
    'chiudi-gestione-siti': () => chiudiGestioneSiti(),
    'crea-sito-gestione': () => creaSitoDaGestione(),
    'rinomina-sito': (el) => rinominaSito(el),
    'sigla-sito': (el) => cambiaSiglaSito(el),
    'colore-sito': (el) => cambiaColoreSito(el),
    'valuta-sito': (el) => cambiaValutaSito(el),
    'tasso-sito': (el) => cambiaTassoSito(el),
    'attivo-sito': (el) => cambiaAttivoSito(el),
    'benvenuto-siti': () => aggiornaBenvenuto(),
    'conferma-benvenuto': () => confermaBenvenuto(),
    'converti-importo': () => convertiImportoValuta(),
    'durata-libera': (el) => durataLibera(el),
    'alterna-costo-euro': () => alternaCostoInEuro(),
    'mostra-nuovo-tag': () => mostraNuovoTag(),

    // File CSV: importazione dello storico di qualsiasi sito ed esportazione della cronologia
    'importa-csv': () => avviaImportazioneCsv(),
    'esporta-csv': () => esportaCronologiaCsv(),
    'anteprima-csv': () => aggiornaAnteprimaCsv(),
    'sito-csv': () => { impostaValutaDalSito(); aggiornaAnteprimaCsv(); },
    'chiudi-importa-csv': () => chiudiImportazioneCsv(),
    'conferma-importa-csv': () => confermaImportazioneCsv(),
    'elimina-sito': (el) => eliminaSito(el),
    'cambia-sito-predefinito': (el) => cambiaSitoPredefinito(el),

    // Classifica, statistiche, scheda modella
    'filtra-classifica': () => filtraClassificaModelle(),
    'cambia-anno-statistiche': () => aggiornaStatisticheMensili(),
    'vista-grafico-spesa': (el) => { impostaVistaGraficoSpesa(el.dataset.vista); caricaStatisticheMensili(stato.tuttiGliShow); },
    'seleziona-mese': (el) => selezionaMeseDettaglio(el.dataset.mese === '' ? null : Number(el.dataset.mese)),
    'apri-scheda-modella': (el) => apriModalModella(el.dataset.nome),

    // Preventivo (scheda Preventivo e riquadro nella scheda della modella)
    'prev-modella': () => cambiaModellaPreventivo(),
    'prev-aggiorna': () => aggiornaPreventivo(),
    'prev-durata': (el) => durataPreventivo(el),
    'prev-durata-libera': (el) => durataLiberaPreventivo(el),
    'prev-usa-modella': (el) => { usaNelPreventivo(el.dataset.nome); window.scrollTo({ top: 0, behavior: 'smooth' }); },
    'prev-ordina': (el) => ordinaPrezzi(el),
    'prev-filtra': () => disegnaPrezziSuggeriti(),
    'scheda-preventivo': (el) => aggiornaPreventivoScheda(el),
    'apri-preventivo': (el, e) => { e.preventDefault(); apriPreventivoDaScheda(el); },
    'chiudi-scheda-modella': () => chiudiModalModella(),
    'apri-unisci-modella': (el) => apriUnisciModella(el),
    'chiudi-unisci-modella': () => chiudiUnisciModella(),
    'sito-separa-modella': () => cambiaSitoSepara(),
    'anteprima-unisci-modella': () => aggiornaAnteprimaUnisci(),
    'conferma-unisci-modella': () => confermaUnisciModella(),

    // Registro (log)
    'cambia-livello-log': (el) => cambiaLivelloLog(el),
    'apri-log': () => apriLog(),
    'cancella-log': () => cancellaLog(),

    // Privacy
    'cambia-sfocatura': (el) => cambiaSfocatura(el),
    'cambia-aspetto-neutro': (el) => cambiaAspettoNeutro(el),
    'cambia-blocco-minuti': (el) => cambiaBloccoMinuti(el),
    'apri-finestra-pin': (el) => apriFinestraPin(el),
    'chiudi-finestra-pin': () => chiudiFinestraPin(),
    'salva-pin': () => salvaPin(),
    'sblocca-app': () => sblocca(),
    'registra-tasto-rapido': () => registraTastoRapido(),
    'ripristina-tasto-rapido': () => ripristinaTastoRapido(),

    // Foto, link e lightbox
    'ingrandisci-foto': (el) => apriModalImmagine(el.dataset.url),
    'apri-link': (el, e) => { e.preventDefault(); apriLinkEsterno(el.dataset.url); },
    'aggiorna-credito': () => aggiornaCredito(),
    'copia-apri-teams': (el, e) => { e.preventDefault(); copiaEApriTeams(el.dataset.nick); },
    'chiudi-lightbox': () => chiudiModalImmagine(),
    'naviga-galleria': (el) => navigaGalleria(Number(el.dataset.direzione)),
    // Clic sull'immagine ingrandita: non deve chiudere il lightbox
    'nessuna': () => {}
});

/* --------------------------------------------------------------------------
   AGGIORNAMENTO DELLE VISTE
   -------------------------------------------------------------------------- */
// Chiamata dall'archivio dopo ogni modifica (e dal cambio lingua)
function ridisegnaViste() {
    aggiornaDatalistModelle();
    inizializzaFiltroAnni(stato.tuttiGliShow);
    // Tag: prima il filtro (usato da caricaCronologia), poi form, modifica multipla e gestione
    aggiornaFiltroTag();
    // Siti: select dei filtri e della modifica multipla, scelta nel form, gestione
    applicaSitiAttivi();
    aggiornaSelectSiti();
    disegnaSelettoreSitoForm();
    disegnaGestioneSiti();
    disegnaSelettoreTagForm();
    disegnaTagModificaMultipla();
    disegnaGestioneTag();
    popolaSelettoreAnni(stato.tuttiGliShow);
    caricaCronologia(stato.tuttiGliShow);
    caricaStatisticheMensili(stato.tuttiGliShow);
    caricaMedieEStoricizzazione(stato.tuttiGliShow);
    ridisegnaPreventivo();
    // Mantiene l'eventuale ricerca e il filtro "Solo online" della classifica
    filtraClassificaModelle();
    aggiornaIndicatoreBudgetHomepage(stato.tuttiGliShow);
    // Primo avvio con l'archivio vuoto: quali siti usi?
    controllaBenvenuto();
    // Verifica in background i profili MCG non controllati di recente (anche delle modelle nuove)
    verificaProfiliSospesi();
}
alCambioArchivio(ridisegnaViste);

// Nuovo elenco delle modelle online (stato-online.js): classifica e scheda aperta
document.addEventListener('modelle-online-aggiornate', () => {
    filtraClassificaModelle();
    aggiornaBadgeSchedaModella();
    disegnaPrezziSuggeriti();
    caricaCronologia(stato.tuttiGliShow);   // bordo verde delle foto
});
// Esito della verifica dei profili sospesi (profili-sospesi.js)
document.addEventListener('profili-sospesi-aggiornati', () => {
    filtraClassificaModelle();
    aggiornaBadgeSchedaModella();
    disegnaPrezziSuggeriti();
});

async function cambiaLingua(nuovaLingua) {
    if (!nuovaLingua) return;
    try {
        logger.info(`Cambio lingua richiesto: ${nuovaLingua}`);
        // caricaLingua salva già la preferenza in localStorage ('appLang')
        await caricaLingua(nuovaLingua);
        // Ridisegna le viste generate da JS (dalla memoria, senza rileggere il disco)
        aggiornaViste();
        aggiornaTestoStatoMCG();
        aggiornaTestoCredito();
        aggiornaPulsanteForm();
        aggiornaTestiPrivacy();
        sincronizzaFormAssistito();
        logger.success(`Lingua aggiornata a: ${nuovaLingua}`);
    } catch (err) {
        logger.error(`Errore durante il cambio lingua a "${nuovaLingua}"`, err);
    }
}

/* --------------------------------------------------------------------------
   CONTROLLI CON COMPORTAMENTO PROPRIO
   -------------------------------------------------------------------------- */
function inizializzaSelectPiattaforma() {
    const customTrigger = document.querySelector('.custom-select-trigger');
    const customDropdown = document.getElementById('customPiattaformaDropdown');
    const selectPiattaforma = document.getElementById('piattaforma');
    if (!customTrigger || !customDropdown) return;

    customTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!document.getElementById('isRegalo')?.checked) customDropdown.classList.toggle('open');
    });

    document.querySelectorAll('.custom-option').forEach(option => {
        option.addEventListener('click', () => {
            if (selectPiattaforma) selectPiattaforma.value = option.getAttribute('data-value');
            const selectedSpan = document.getElementById('customSelectSelected');
            if (selectedSpan) selectedSpan.innerHTML = option.innerHTML;
            customDropdown.classList.remove('open');
            aggiornaRiepilogoDettagli();
        });
    });

    window.addEventListener('click', () => customDropdown.classList.remove('open'));
}

function inizializzaControlliCronologia() {
    document.getElementById('nome')?.addEventListener('input', autocompilaDatiModella);

    document.getElementById('limiteRisultati')?.addEventListener('change', (e) => {
        localStorage.setItem('limiteRisultati', e.target.value);
        stato.paginaCorrente = 1;
        caricaCronologia(stato.tuttiGliShow);
    });

    document.getElementById('ordineData')?.addEventListener('change', () => {
        stato.paginaCorrente = 1;
        caricaCronologia(stato.tuttiGliShow);
    });
}

function inizializzaModali() {
    // Clic sullo sfondo della scheda modella: la chiude
    window.addEventListener('click', (event) => {
        if (event.target === document.getElementById('modalModella')) chiudiModalModella();
    });

    document.getElementById('closeChangelogBtn')?.addEventListener('click', chiudiModalChangelog);
    document.getElementById('confirmChangelogBtn')?.addEventListener('click', chiudiModalChangelog);
    document.getElementById('openChangelogBtn')?.addEventListener('click', (e) => {
        e.preventDefault();
        apriModalChangelog();
    });
    inizializzaListenerChangelogMenu();
}

function inizializzaIndicatoreMCG() {
    // Verifica subito, poi ogni 60 secondi o al clic (dopo caricaLingua: testi già tradotti)
    verificaStatoMCG();
    setInterval(verificaStatoMCG, 60000);
    const mcgContainer = document.getElementById('mcgStatusContainer');
    if (!mcgContainer) return;
    mcgContainer.addEventListener('click', verificaStatoMCG);
    mcgContainer.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            verificaStatoMCG();
        }
    });
}

/* --------------------------------------------------------------------------
   AVVIO (i moduli vengono eseguiti a documento già analizzato)
   -------------------------------------------------------------------------- */
async function avvia() {
    registraErroriGlobali();
    logger.info("Inizializzazione applicazione...");
    inizializzaAzioni();
    await caricaLingua(linguaCorrente);
    // Prima dei dati: con un PIN l'app parte già bloccata
    await inizializzaPrivacy();
    // Funzioni dei connettori dei siti: servono a indicatore, stato online e profili sospesi
    await caricaConnettori();

    mostraVersioneApp();
    impostaDataOraAttuale();
    inizializzaFiltriCronologia();
    // Ordine e filtri ricordati: prima del primo disegno di cronologia e classifica
    inizializzaFiltriSalvati();
    inizializzaNoteComplete();
    inizializzaRegistro();
    aggiornaInterfaccia();
    inizializzaTema();
    inizializzaFont();
    inizializzaGestioneBudget();
    inizializzaMenuHeader();
    aggiornaPulsanteForm();
    inizializzaSelectPiattaforma();
    inizializzaControlliCronologia();
    inizializzaModali();
    inizializzaTag();
    inizializzaSiti();
    inizializzaConvertitoreValuta();
    inizializzaScorciatoieForm();
    inizializzaUrlProfiloForm();
    sincronizzaFormAssistito();

    // Mostra automaticamente le novità al primo avvio dopo un aggiornamento
    initChangelogCheck();
    inizializzaIndicatoreMCG();
    // Credito residuo su MCG: ultimo valore noto subito, poi lettura con il login salvato
    inizializzaCredito();
    // Modelle online su MCG: subito, poi ogni 3 minuti
    inizializzaStatoOnline();
    // Profili sospesi su MCG: ricontrollo orario dei profili verificati da più di 12 ore
    inizializzaProfiliSospesi();

    logger.success("Applicazione inizializzata con successo.");
}

avvia();
