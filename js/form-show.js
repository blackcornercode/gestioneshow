import { aggiungiShow, aggiornaShow, rimuoviShow, trovaShow } from './archivio.js';
import { aggiornaVistaTipo, aggiornaStelle, aggiornaMiniScheda, aggiornaRiepilogoDettagli, sincronizzaFormAssistito, ultimoShowModella, importoOriginaleForm, impostaCostoInEuro, nascondiNuovoTag } from './form-assistito.js';
import { t } from './i18n.js';
import { logger } from './logger.js';
import { stato, iconePiattaformaHTML } from './stato.js';
import { impostaSitoForm, sitoSceltoForm } from './gestione-siti.js';
import { impostaTagForm, tagSceltiForm } from './tag.js';
import { urlProfiloSulSito } from './connettori.js';
import { escapeHtml, generaIdUnico } from './utils.js';

/* ==========================================================================
   GESTIONE FORM E AUTOCOMPILAZIONE
   ========================================================================== */
// Show o regalo: i regali non hanno piattaforma, voto e durata (i campi .solo-show
// vengono nascosti da aggiornaVistaTipo). Il voto non è obbligatorio: senza
// stelle lo show viene salvato come TBD.
export function gestisciStatoRegalo() {
    const piattaformaSelect = document.getElementById('piattaforma');
    const punteggioSelect = document.getElementById('punteggio');
    const isRegaloCheckbox = document.getElementById('isRegalo');
    if (!isRegaloCheckbox) return;

    const regalo = isRegaloCheckbox.checked;
    if (piattaformaSelect) {
        piattaformaSelect.disabled = regalo;
        if (regalo) piattaformaSelect.value = '';
        // Tornando a "Show" la piattaforma è quella dell'ultimo show con la modella
        else if (!piattaformaSelect.value) impostaPiattaformaCustom(ultimoShowModella()?.piattaforma || 'Teams');
    }
    if (punteggioSelect) {
        punteggioSelect.disabled = regalo;
        if (regalo) punteggioSelect.value = '';
    }
    aggiornaVistaTipo();
    aggiornaStelle();
}

export function impostaDataOraAttuale() {
    const dataInput = document.getElementById('dataOra');
    if (dataInput) {
        const oraLocale = new Date();
        oraLocale.setMinutes(oraLocale.getMinutes() - oraLocale.getTimezoneOffset());
        dataInput.value = oraLocale.toISOString().slice(0, 16);
    }
}

// Suggerimenti del campo "Nome Modella" (stato.elencoModelleUniche è calcolato da aggiornaViste)
export function aggiornaDatalistModelle() {
    const datalist = document.getElementById('listaModelleSuggerite');
    if (!datalist) return;
    datalist.innerHTML = '';
    stato.elencoModelleUniche.forEach(modella => {
        const option = document.createElement('option');
        option.value = modella.nome;
        datalist.appendChild(option);
    });
}

export function impostaPiattaformaCustom(valorePiattaforma) {
    const selectPiattaforma = document.getElementById('piattaforma');
    const customSelectedSpan = document.getElementById('customSelectSelected');

    if (selectPiattaforma) {
        selectPiattaforma.value = valorePiattaforma;
    }

    if (customSelectedSpan) {
        customSelectedSpan.innerHTML = iconePiattaformaHTML[valorePiattaforma] || `<i class="fa-solid fa-globe" style="color: #6c757d;"></i> ${escapeHtml(valorePiattaforma)}`;
    }
}

// Ultimi valori scritti dall'autocompilazione in profilo, foto e nickname. Il nome
// si scrive lettera per lettera: passando da "Anna" (già in archivio) ad "Annabella"
// i dati di Anna restavano nei campi e finivano nello show di Annabella. Un campo
// che contiene ancora il valore automatico segue il nome; uno scritto a mano resta.
const autocompilati = {};

export function autocompilaDatiModella() {
    aggiornaMiniScheda();
    const editIdInput = document.getElementById('editId');
    if (editIdInput && editIdInput.value) return;

    const inputNome = document.getElementById('nome');
    if (!inputNome) return;

    const nomeInserito = inputNome.value.trim().toLowerCase();
    const modellaTrovata = nomeInserito ? stato.elencoModelleUniche.find(m => m.nome.toLowerCase() === nomeInserito) : null;

    const valori = {
        // Profilo della modella sul sito scelto nel form (una modella può averne uno per sito)
        urlProfilo: nomeInserito ? urlProfiloSulSito(nomeInserito, sitoSceltoForm()) : '',
        immagine: modellaTrovata?.immagine || '',
        nickname: modellaTrovata?.nickname || ''
    };
    Object.entries(valori).forEach(([id, valore]) => {
        const campo = document.getElementById(id);
        if (!campo || (campo.value && campo.value !== autocompilati[id])) return;
        campo.value = valore;
        autocompilati[id] = valore;
    });

    if (modellaTrovata?.piattaforma) impostaPiattaformaCustom(modellaTrovata.piattaforma);
    aggiornaRiepilogoDettagli();
}

// Cambiando il sito di uno show nuovo, l'indirizzo del profilo segue il sito: se era
// quello della modella su un altro sito (o vuoto) diventa quello sul sito scelto
function aggiornaUrlProfiloPerSito() {
    const inputUrlProfilo = document.getElementById('urlProfilo');
    const nome = document.getElementById('nome')?.value.trim() || '';
    if (!inputUrlProfilo || !nome || document.getElementById('editId')?.value) return;
    const profiliNoti = Object.values(stato.mappaUrlPerSito[nome.toLowerCase()] || {});
    if (inputUrlProfilo.value && !profiliNoti.includes(inputUrlProfilo.value)) return;   // scritto a mano
    inputUrlProfilo.value = urlProfiloSulSito(nome, sitoSceltoForm());
    autocompilati.urlProfilo = inputUrlProfilo.value;
    aggiornaRiepilogoDettagli();
}

export function inizializzaUrlProfiloForm() {
    document.addEventListener('sito-form-cambiato', aggiornaUrlProfiloPerSito);
}

// "Ripeti ultimo show": stessi dettagli, durata, costo, tag e inquadratura dell'ultimo show con la
// modella; data, voto, qualità, recensione e note restano da compilare
export function ripetiUltimoShow() {
    const ultimo = ultimoShowModella();
    if (!ultimo) return;
    const imposta = (id, valore) => { const campo = document.getElementById(id); if (campo) campo.value = valore ?? ''; };
    const regalo = document.getElementById('isRegalo');
    if (regalo) regalo.checked = false;
    gestisciStatoRegalo();
    impostaPiattaformaCustom(ultimo.piattaforma || 'Teams');
    imposta('nickname', ultimo.nickname);
    // L'inquadratura di solito resta quella; la qualità va giudicata show per show
    imposta('cameraShow', ultimo.camera);
    imposta('urlProfilo', ultimo.urlProfilo);
    imposta('immagine', ultimo.immagine);
    imposta('durataShow', ultimo.durata || '');
    imposta('costo', ultimo.costo);
    // Importo in token o altra valuta come nell'ultimo show; se era in euro si ripete in euro
    imposta('importoValuta', ultimo.importoOriginale?.valore);
    impostaCostoInEuro(!ultimo.importoOriginale);
    impostaTagForm(ultimo.tag || []);
    impostaSitoForm(ultimo.sito);
    sincronizzaFormAssistito();
    logger.info("Form precompilato dall'ultimo show");
}

export const showForm = document.getElementById('showForm');
if (showForm) {
    showForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const editIdInput = document.getElementById('editId');
        const isRegaloCheckbox = document.getElementById('isRegalo');
        const piattaformaSelect = document.getElementById('piattaforma');
        const punteggioSelect = document.getElementById('punteggio');
        const inputNome = document.getElementById('nome');
        const inputImmagine = document.getElementById('immagine');
        const inputUrlProfilo = document.getElementById('urlProfilo');
        const inputCosto = document.getElementById('costo');
        const inputDurata = document.getElementById('durataShow'); // <-- AGGIUNTO
        const inputRecensione = document.getElementById('recensione');
        const inputTestoRecensione = document.getElementById('testoRecensione');
        const inputNote = document.getElementById('note');
        const inputNickname = document.getElementById('nickname');
        const dataOraInput = document.getElementById('dataOra');

        const editId = editIdInput ? editIdInput.value : '';
        const dataOraValue = dataOraInput ? new Date(dataOraInput.value) : new Date();
        // Con una data non valida toISOString() lancia un'eccezione fuori dal try
        // e il salvataggio falliva senza alcun messaggio
        if (isNaN(dataOraValue)) {
            alert('⚠️ Data e ora dello show non valide.');
            if (dataOraInput) dataOraInput.focus();
            return;
        }
        const isRegalo = isRegaloCheckbox ? isRegaloCheckbox.checked : false;

        const valPunteggio = punteggioSelect ? punteggioSelect.value : '';

        const showData = {
            id: editId ? (stato.tuttiGliShow.find(s => String(s.id) === String(editId))?.id ?? editId) : generaIdUnico(),
            dataOraISO: dataOraValue.toISOString(),
            dataFormattata: dataOraValue.toLocaleDateString('it-IT') + ' ' + dataOraValue.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            meseAnno: dataOraValue.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
            nome: inputNome ? inputNome.value.trim() : '',
            isRegalo: isRegalo,
            piattaforma: isRegalo ? '' : (piattaformaSelect ? piattaformaSelect.value : ''),
            punteggio: isRegalo ? null : (valPunteggio === 'TBD' ? 'TBD' : parseInt(valPunteggio, 10) || 'TBD'),
            // Qualità e inquadratura facoltative (null = non indicate); i regali non le hanno
            qualita: isRegalo ? null : (document.getElementById('qualitaShow')?.value || null),
            camera: isRegalo ? null : (document.getElementById('cameraShow')?.value || null),
            costo: inputCosto ? (parseFloat(inputCosto.value) || 0) : 0,
            // I regali non hanno durata: il campo è nascosto ma può conservare un valore
            // (es. dopo "Ripeti ultimo show"), che finiva salvato nel regalo
            durata: isRegalo || !inputDurata ? 0 : (parseInt(inputDurata.value, 10) || 0),
            immagine: inputImmagine ? inputImmagine.value.trim() : '',
            urlProfilo: inputUrlProfilo ? inputUrlProfilo.value.trim() : '',
            recensione: inputRecensione ? inputRecensione.checked : false,
            // Salvato anche con l'interruttore spento: il testo nascosto non si perde
            testoRecensione: inputTestoRecensione ? inputTestoRecensione.value.trim() : '',
            note: inputNote ? inputNote.value : '',
            // Sito scelto nel form; uno show nuovo è inserito a mano, in modifica l'origine
            // resta quella salvata (aggiornaShow unisce i campi a quelli esistenti)
            sito: sitoSceltoForm(),
            ...(editId ? {} : { importatoDa: null }),
            nickname: inputNickname ? inputNickname.value.trim() : '',
            tag: tagSceltiForm(),
            // Importo pagato nella valuta del sito (token, dollari...), se indicato
            importoOriginale: importoOriginaleForm()
        };

        try {
            // L'archivio salva su disco e ridisegna le viste (archivio.js)
            if (editId) {
                await aggiornaShow(editId, showData);
                logger.success(`Show aggiornato con successo [ID: ${showData.id}]`, showData);
            } else {
                await aggiungiShow(showData);
                logger.success(`Nuovo show registrato con successo [ID: ${showData.id}]`, showData);
            }
            resetForm();
            impostaFormAperto(false);
        } catch (err) {
            logger.error("Errore durante il salvataggio dello show", err);
        }
    });
}

export async function modificaShow(id) {
    logger.info(`Richiesta modifica per lo show ID: ${id}`);
    const item = trovaShow(id);
    if (!item) {
        logger.warn(`Show con ID ${id} non trovato per la modifica.`);
        return;
    }

    const editIdInput = document.getElementById('editId');
    if (editIdInput) editIdInput.value = item.id;
    
    if (item.dataOraISO) {
        const d = new Date(item.dataOraISO);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        const dataOraInput = document.getElementById('dataOra');
        if (dataOraInput) dataOraInput.value = d.toISOString().slice(0, 16);
    }

    const inputNome = document.getElementById('nome');
    if (inputNome) inputNome.value = item.nome || '';

    const inputUrlProfilo = document.getElementById('urlProfilo');
    if (inputUrlProfilo) inputUrlProfilo.value = item.urlProfilo || '';

    const inputImmagine = document.getElementById('immagine');
    if (inputImmagine) inputImmagine.value = item.immagine || '';

    const inputNickname = document.getElementById('nickname');
    if (inputNickname) inputNickname.value = item.nickname || '';

    // Popolamento Durata Show
    const inputDurata = document.getElementById('durataShow');
    if (inputDurata) inputDurata.value = item.durata || '';

    const piattaformaSelect = document.getElementById('piattaforma');
    const punteggioSelect = document.getElementById('punteggio');
    const isRegaloCheckbox = document.getElementById('isRegalo');
    const costoInput = document.getElementById('costo');

    if (piattaformaSelect) piattaformaSelect.disabled = false;
    if (punteggioSelect) punteggioSelect.disabled = false;
    if (costoInput) {
        costoInput.disabled = false;
        costoInput.value = (item.costo !== undefined && item.costo !== null) ? item.costo : 0;
    }

    if (isRegaloCheckbox) isRegaloCheckbox.checked = Boolean(item.isRegalo);
    gestisciStatoRegalo();

    const valorePiattaforma = item.piattaforma || 'Teams';
    impostaPiattaformaCustom(valorePiattaforma);

    if (!item.isRegalo && punteggioSelect) {
        punteggioSelect.value = (item.punteggio !== undefined && item.punteggio !== null) ? item.punteggio : '';
    }

    const qualitaInput = document.getElementById('qualitaShow');
    if (qualitaInput) qualitaInput.value = item.qualita || '';
    const cameraInput = document.getElementById('cameraShow');
    if (cameraInput) cameraInput.value = item.camera || '';

    const recensioneInput = document.getElementById('recensione');
    if (recensioneInput) recensioneInput.checked = Boolean(item.recensione);
    const testoRecensioneInput = document.getElementById('testoRecensione');
    if (testoRecensioneInput) testoRecensioneInput.value = item.testoRecensione || '';

    const noteInput = document.getElementById('note');
    if (noteInput) noteInput.value = item.note || '';
    impostaTagForm(item.tag || []);
    impostaSitoForm(item.sito);
    const importoValuta = document.getElementById('importoValuta');
    if (importoValuta) importoValuta.value = item.importoOriginale?.valore ?? '';
    // Show salvato in euro su un sito a token: si modifica il costo in euro
    impostaCostoInEuro(!item.importoOriginale);

    const banner = document.getElementById('bannerModifica');
    if (banner) {
        banner.textContent = t('form.editing').replace('{data}', (item.dataFormattata || '').split(' ')[0]).replace('{nome}', item.nome || '');
        banner.hidden = false;
    }

    const btnSalva = document.getElementById('btnSalva');
    const btnAnnulla = document.getElementById('btnAnnulla');

    if (btnSalva) {
        btnSalva.textContent = t('form.btn_update');
        btnSalva.classList.add('in-modifica');
    }
    if (btnAnnulla) btnAnnulla.style.display = 'block';

    sincronizzaFormAssistito();
    impostaFormAperto(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function annullaModifica() {
    logger.info("Modifica annullata dall'utente.");
    resetForm();
    impostaFormAperto(false);
}

/* --- FORM A SCOMPARSA --- */
export function formAperto() {
    const sezione = document.getElementById('sezioneForm');
    return Boolean(sezione) && !sezione.classList.contains('form-chiuso');
}

export function impostaFormAperto(aperto) {
    const sezione = document.getElementById('sezioneForm');
    if (sezione) sezione.classList.toggle('form-chiuso', !aperto);
    aggiornaPulsanteForm();
}

// Testi dei pulsanti coerenti con lo stato (richiamata anche al cambio lingua,
// che altrimenti li riporterebbe sempre a "Nuovo show" e "Salva Record")
export function aggiornaPulsanteForm() {
    const btnSalva = document.getElementById('btnSalva');
    const editIdInput = document.getElementById('editId');
    const inModifica = Boolean(editIdInput && editIdInput.value);
    if (btnSalva) btnSalva.textContent = t(inModifica ? 'form.btn_update' : 'form.btn_save');
    const titolo = document.getElementById('titoloForm');
    if (titolo) titolo.textContent = t(inModifica ? 'form.title_edit' : 'form.title');

    const btn = document.getElementById('btnToggleForm');
    if (!btn) return;
    const aperto = formAperto();
    btn.textContent = t(aperto ? 'form.btn_close' : 'form.btn_new');
    btn.setAttribute('aria-expanded', String(aperto));
    btn.classList.toggle('btn-secondary', aperto);
    btn.classList.toggle('btn-primary', !aperto);
}

export function toggleForm() {
    if (!formAperto()) {
        impostaFormAperto(true);
        document.getElementById('nome')?.focus();
        return;
    }
    // In modifica, chiudere equivale ad annullare; una bozza di nuovo show resta
    // invece compilata per quando si riapre il form
    const editIdInput = document.getElementById('editId');
    if (editIdInput && editIdInput.value) {
        annullaModifica();
    } else {
        impostaFormAperto(false);
    }
}

export function resetForm() {
    const editIdInput = document.getElementById('editId');
    const showForm = document.getElementById('showForm');
    const isRegaloCheckbox = document.getElementById('isRegalo');
    const piattaformaSelect = document.getElementById('piattaforma');
    const punteggioSelect = document.getElementById('punteggio');
    const costoInput = document.getElementById('costo');
    const btnSalva = document.getElementById('btnSalva');
    const btnAnnulla = document.getElementById('btnAnnulla');
    const inputDurata = document.getElementById('durataShow');
    
    if (inputDurata) inputDurata.value = '';
    if (editIdInput) editIdInput.value = '';
    if (showForm) showForm.reset();
    if (isRegaloCheckbox) isRegaloCheckbox.checked = false;

    if (piattaformaSelect) piattaformaSelect.disabled = false;
    if (punteggioSelect) punteggioSelect.disabled = false;
    if (costoInput) {
        costoInput.disabled = false;
        costoInput.value = '';
    }

    impostaPiattaformaCustom('Teams');
    gestisciStatoRegalo();

    if (btnSalva) {
        btnSalva.textContent = t('form.btn_save');
        btnSalva.classList.remove('in-modifica');
    }
    if (btnAnnulla) btnAnnulla.style.display = 'none';
    impostaDataOraAttuale();

    const nickInput = document.getElementById('nickname');
    if (nickInput) nickInput.value = '';
    impostaTagForm([]);
    impostaSitoForm(null);
    const importoValuta = document.getElementById('importoValuta');
    if (importoValuta) importoValuta.value = '';
    impostaCostoInEuro(false);
    nascondiNuovoTag();
    const banner = document.getElementById('bannerModifica');
    if (banner) banner.hidden = true;
    const dettagli = document.getElementById('dettagliForm');
    if (dettagli) dettagli.open = false;
    sincronizzaFormAssistito();
    aggiornaPulsanteForm();
}

// "Svuota": tutti i campi tornano vuoti (data all'ora attuale), il form resta aperto.
// In modifica equivale ad annullare la modifica: i dati salvati non cambiano.
export function svuotaForm() {
    const inModifica = Boolean(document.getElementById('editId')?.value);
    resetForm();
    impostaFormAperto(true);
    document.getElementById('nome')?.focus();
    logger.info(inModifica ? 'Form svuotato: modifica annullata' : 'Form svuotato');
}

// Scorciatoie del form: Ctrl+Invio salva, Esc chiude (in modifica equivale ad Annulla)
export function inizializzaScorciatoieForm() {
    const sezione = document.getElementById('sezioneForm');
    if (!sezione) return;
    sezione.addEventListener('keydown', (e) => {
        if (!formAperto()) return;
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            document.getElementById('showForm')?.requestSubmit();
        } else if (e.key === 'Escape' && !document.getElementById('customPiattaformaDropdown')?.classList.contains('open')) {
            e.preventDefault();
            toggleForm();
        }
    });
}

export async function eliminaShow(id) {
    if (!confirm("Sei sicuro di voler eliminare questo record?")) return;
    
    try {
        await rimuoviShow(id);
        logger.success(`Show con ID ${id} eliminato.`);
    } catch (err) {
        logger.error("Errore durante l'eliminazione dello show", err);
    }
}
