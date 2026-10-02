/* ==========================================================================
   GESTIONE FORM E AUTOCOMPILAZIONE
   ========================================================================== */
function gestisciStatoRegalo() {
    const piattaformaSelect = document.getElementById('piattaforma');
    const punteggioSelect = document.getElementById('punteggio');
    const isRegaloCheckbox = document.getElementById('isRegalo');
    const dropdownWrapper = document.getElementById('customPiattaformaDropdown');
    const costoInput = document.getElementById('costo');
    
    if (!isRegaloCheckbox) return;

    if (isRegaloCheckbox.checked) {
        if (piattaformaSelect) {
            piattaformaSelect.disabled = true;
            piattaformaSelect.value = '';
        }
        if (dropdownWrapper) {
            dropdownWrapper.style.pointerEvents = 'none';
            dropdownWrapper.style.opacity = '0.5';
        }
        if (punteggioSelect) {
            punteggioSelect.disabled = true;
            punteggioSelect.required = false;
            punteggioSelect.value = '';
        }
    } else {
        if (piattaformaSelect) piattaformaSelect.disabled = false;
        if (dropdownWrapper) {
            dropdownWrapper.style.pointerEvents = 'auto';
            dropdownWrapper.style.opacity = '1';
        }
        if (punteggioSelect) {
            punteggioSelect.disabled = false;
            punteggioSelect.required = true;
        }
        if (costoInput) costoInput.disabled = false;
    }
}

function impostaDataOraAttuale() {
    const dataInput = document.getElementById('dataOra');
    if (dataInput) {
        const oraLocale = new Date();
        oraLocale.setMinutes(oraLocale.getMinutes() - oraLocale.getTimezoneOffset());
        dataInput.value = oraLocale.toISOString().slice(0, 16);
    }
}

function aggiornaDatalistModelle(datiShow) {
    const datalist = document.getElementById('listaModelleSuggerite');
    if (!datalist) return;

    datalist.innerHTML = '';
    const mappaModelle = new Map();

    const showsOrdinati = [...datiShow].sort((a, b) => timestampShow(a) - timestampShow(b));

    showsOrdinati.forEach(show => {
        if (show.nome && show.nome.trim() !== '') {
            const nomeChiave = show.nome.trim().toLowerCase();
            const esistente = mappaModelle.get(nomeChiave) || {};

            mappaModelle.set(nomeChiave, {
                nome: show.nome.trim(),
                urlProfilo: show.urlProfilo || show.url || esistente.urlProfilo || '',
                immagine: show.immagine || esistente.immagine || '',
                piattaforma: show.piattaforma || esistente.piattaforma || 'Teams',
                nickname: show.nickname || esistente.nickname || ''
            });
        }
    });

    elencoModelleUniche = Array.from(mappaModelle.values());

    elencoModelleUniche.forEach(modella => {
        const option = document.createElement('option');
        option.value = modella.nome;
        datalist.appendChild(option);
    });
}

function impostaPiattaformaCustom(valorePiattaforma) {
    const selectPiattaforma = document.getElementById('piattaforma');
    const customSelectedSpan = document.getElementById('customSelectSelected');

    if (selectPiattaforma) {
        selectPiattaforma.value = valorePiattaforma;
    }

    if (customSelectedSpan) {
        customSelectedSpan.innerHTML = iconePiattaformaHTML[valorePiattaforma] || `<i class="fa-solid fa-globe" style="color: #6c757d;"></i> ${escapeHtml(valorePiattaforma)}`;
    }
}

function autocompilaDatiModella() {
    const editIdInput = document.getElementById('editId');
    if (editIdInput && editIdInput.value) return;

    const inputNome = document.getElementById('nome');
    if (!inputNome) return;

    const nomeInserito = inputNome.value.trim().toLowerCase();
    if (!nomeInserito) return;

    const modellaTrovata = elencoModelleUniche.find(m => m.nome.toLowerCase() === nomeInserito);

    const inputImmagine = document.getElementById('immagine');
    const inputUrlProfilo = document.getElementById('urlProfilo');
    const inputNickname = document.getElementById('nickname');

    if (modellaTrovata) {
        if (modellaTrovata.urlProfilo && inputUrlProfilo) {
            inputUrlProfilo.value = modellaTrovata.urlProfilo;
        }
        if (modellaTrovata.immagine && inputImmagine) {
            inputImmagine.value = modellaTrovata.immagine;
        }
        if (modellaTrovata.nickname && inputNickname) {
            inputNickname.value = modellaTrovata.nickname;
        }
        if (modellaTrovata.piattaforma) {
            impostaPiattaformaCustom(modellaTrovata.piattaforma);
        }
    } else {
        if (mappaImmaginiModelle[nomeInserito] && inputImmagine) {
            inputImmagine.value = mappaImmaginiModelle[nomeInserito];
        }
        if (mappaUrlModelle[nomeInserito] && inputUrlProfilo) {
            inputUrlProfilo.value = mappaUrlModelle[nomeInserito];
        }
    }
}

const showForm = document.getElementById('showForm');
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

        let isAutoImport = false;
        if (editId) {
            const itemEsistente = tuttiGliShow.find(s => String(s.id) === String(editId));
            if (itemEsistente && itemEsistente.isAutoImport) {
                isAutoImport = true;
            }
        }

        const valPunteggio = punteggioSelect ? punteggioSelect.value : '';

        const showData = {
            id: editId ? (tuttiGliShow.find(s => String(s.id) === String(editId))?.id ?? editId) : generaIdUnico(),
            dataOraISO: dataOraValue.toISOString(),
            dataFormattata: dataOraValue.toLocaleDateString('it-IT') + ' ' + dataOraValue.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            meseAnno: dataOraValue.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
            nome: inputNome ? inputNome.value.trim() : '',
            isRegalo: isRegalo,
            piattaforma: isRegalo ? '' : (piattaformaSelect ? piattaformaSelect.value : ''),
            punteggio: isRegalo ? null : (valPunteggio === 'TBD' ? 'TBD' : parseInt(valPunteggio, 10) || 'TBD'),
            costo: inputCosto ? (parseFloat(inputCosto.value) || 0) : 0,
            durata: inputDurata ? (parseInt(inputDurata.value, 10) || 0) : 0, // <-- AGGIUNTO
            immagine: inputImmagine ? inputImmagine.value.trim() : '',
            urlProfilo: inputUrlProfilo ? inputUrlProfilo.value.trim() : '',
            recensione: inputRecensione ? inputRecensione.checked : false,
            note: inputNote ? inputNote.value : '',
            isAutoImport: isAutoImport,
            nickname: inputNickname ? inputNickname.value.trim() : ''
        };

        try {
            let shows = await window.electronAPI.readData();

            if (editId) {
                const index = shows.findIndex(s => String(s.id) === String(editId));
                if (index !== -1) shows[index] = showData;
                logger.success(`Show aggiornato con successo [ID: ${showData.id}]`, showData);
            } else {
                shows.push(showData);
                logger.success(`Nuovo show registrato con successo [ID: ${showData.id}]`, showData);
            }

            await salvaOAvvisa(shows);
            resetForm();
            impostaFormAperto(false);
            aggiornaInterfaccia();
        } catch (err) {
            logger.error("Errore durante il salvataggio dello show", err);
        }
    });
}

async function modificaShow(id) {
    logger.info(`Richiesta modifica per lo show ID: ${id}`);
    let shows = await window.electronAPI.readData();
    const item = shows.find(s => String(s.id) === String(id));
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
    if (inputUrlProfilo) inputUrlProfilo.value = item.urlProfilo || item.url || '';

    const inputImmagine = document.getElementById('immagine');
    if (inputImmagine) inputImmagine.value = item.immagine || '';

    const inputNickname = document.getElementById('nickname');
    if (inputNickname) inputNickname.value = item.nickname || '';

    // Popolamento Durata Show
    const inputDurata = document.getElementById('durataShow');
    if (inputDurata) inputDurata.value = item.durata || item.tempoShow || '';

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
        punteggioSelect.value = (item.punteggio !== undefined && item.punteggio !== null) ? item.punteggio : (item.voto || '');
    }

    const recensioneInput = document.getElementById('recensione');
    if (recensioneInput) recensioneInput.checked = Boolean(item.recensione);

    const noteInput = document.getElementById('note');
    if (noteInput) noteInput.value = item.note || '';

    const btnSalva = document.getElementById('btnSalva');
    const btnAnnulla = document.getElementById('btnAnnulla');

    if (btnSalva) {
        btnSalva.textContent = t('form.btn_update');
        btnSalva.classList.add('in-modifica');
    }
    if (btnAnnulla) btnAnnulla.style.display = 'block';

    impostaFormAperto(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function annullaModifica() {
    logger.info("Modifica annullata dall'utente.");
    resetForm();
    impostaFormAperto(false);
}

/* --- FORM A SCOMPARSA --- */
function formAperto() {
    const sezione = document.getElementById('sezioneForm');
    return Boolean(sezione) && !sezione.classList.contains('form-chiuso');
}

function impostaFormAperto(aperto) {
    const sezione = document.getElementById('sezioneForm');
    if (sezione) sezione.classList.toggle('form-chiuso', !aperto);
    aggiornaPulsanteForm();
}

// Testi dei pulsanti coerenti con lo stato (richiamata anche al cambio lingua,
// che altrimenti li riporterebbe sempre a "Nuovo show" e "Salva Record")
function aggiornaPulsanteForm() {
    const btnSalva = document.getElementById('btnSalva');
    const editIdInput = document.getElementById('editId');
    if (btnSalva) {
        btnSalva.textContent = t(editIdInput && editIdInput.value ? 'form.btn_update' : 'form.btn_save');
    }

    const btn = document.getElementById('btnToggleForm');
    if (!btn) return;
    const aperto = formAperto();
    btn.textContent = t(aperto ? 'form.btn_close' : 'form.btn_new');
    btn.setAttribute('aria-expanded', String(aperto));
    btn.classList.toggle('btn-secondary', aperto);
    btn.classList.toggle('btn-primary', !aperto);
}

function toggleForm() {
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

function resetForm() {
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
}

async function eliminaShow(id) {
    if (!confirm("Sei sicuro di voler eliminare questo record?")) return;
    
    try {
        let shows = await window.electronAPI.readData();
        shows = shows.filter(s => String(s.id) !== String(id));
        await salvaOAvvisa(shows);
        logger.success(`Show con ID ${id} eliminato.`);
        aggiornaInterfaccia();
    } catch (err) {
        logger.error("Errore durante l'eliminazione dello show", err);
    }
}
