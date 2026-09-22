/* ==========================================================================
   SISTEMA DI LOGGING (Ordinamento: più recenti in alto)
   ========================================================================== */
const logger = {
    formatTime() {
        const d = new Date();
        return `${d.toLocaleDateString('it-IT')} ${d.toLocaleTimeString('it-IT')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
    },

    write(level, message, details = null) {
        const timestamp = this.formatTime();
        const logEntry = `[${timestamp}] [${level}] ${message}`;

        if (level === 'ERROR') {
            console.error(logEntry, details || '');
        } else if (level === 'WARN') {
            console.warn(logEntry, details || '');
        } else {
            console.log(logEntry, details || '');
        }

        // Invia all'API Electron per il salvataggio su file
        const logData = { timestamp, level, message, details: details ? JSON.stringify(details) : '' };
        if (window.electronAPI) {
            if (window.electronAPI.prependLog) {
                window.electronAPI.prependLog(logData).catch(() => {});
            } else if (window.electronAPI.appendLog) {
                window.electronAPI.appendLog(logData).catch(() => {});
            }
        }

        // Renderizza nell'interfaccia grafica
        const logContainer = document.getElementById('logConsole');
        if (logContainer) {
            const row = document.createElement('div');
            row.className = `log-entry log-${level.toLowerCase()}`;
            row.style.fontSize = '0.8rem';
            row.style.fontFamily = 'monospace';
            row.style.marginBottom = '2px';
            
            if (level === 'ERROR') row.style.color = '#e63946';
            else if (level === 'WARN') row.style.color = '#ffb703';
            else if (level === 'SUCCESS') row.style.color = '#2a9d8f';
            else row.style.color = 'var(--text-main, #333)';

            row.textContent = `${logEntry} ${details ? '- ' + JSON.stringify(details) : ''}`;
            
            // Inserisce la nuova riga IN TESTA (in alto) anziché in coda
            logContainer.prepend(row);
            
            // Mantiene lo scroll ancorato in cima per vedere subito l'ultimo log
            logContainer.scrollTop = 0;
        }
    },

    info(msg, details) { this.write('INFO', msg, details); },
    success(msg, details) { this.write('SUCCESS', msg, details); },
    warn(msg, details) { this.write('WARN', msg, details); },
    error(msg, details) { this.write('ERROR', msg, details); }
};

/* ==========================================================================
   STATO APPLICAZIONE E VARIABILI GLOBALI
   ========================================================================== */
let mappaImmaginiModelle = {};
let mappaUrlModelle = {};
let tuttiGliShow = [];
let anniSelezionati = new Set();
let elencoModelleUniche = [];

let paginaCorrente = 1;
let currentFontSize = 18;
let classificaCompletaCache = [];

let galleriaCorrente = [];
let indiceFotoCorrente = 0;

let meseSelezionatoDettaglio = null;

const iconePiattaformaHTML = {
    'Teams': '<i class="fa-solid fa-users-rectangle" style="color: #6264A7;"></i> Teams',
    'Telegram': '<i class="fa-brands fa-telegram" style="color: #2AABEE;"></i> Telegram',
    'Skype': '<i class="fa-brands fa-skype" style="color: #00AFF0;"></i> Skype',
    'Zoom': '<i class="fa-solid fa-video" style="color: #2D8CFF;"></i> Zoom',
    'Altro': '<i class="fa-solid fa-globe" style="color: #6c757d;"></i> Altro'
};

/* ==========================================================================
   INIZIALIZZAZIONE
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {
    logger.info("Inizializzazione applicazione...");
    
    mostraVersioneApp();
    impostaDataOraAttuale();
    inizializzaFiltriCronologia();
    aggiornaInterfaccia();
    inizializzaTema();
    inizializzaFont();
    inizializzaGestioneBudget();

    const customTrigger = document.querySelector('.custom-select-trigger');
    const customDropdown = document.getElementById('customPiattaformaDropdown');
    const selectPiattaforma = document.getElementById('piattaforma');

    if (customTrigger && customDropdown) {
        customTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isRegalo = document.getElementById('isRegalo')?.checked;
            if (!isRegalo) {
                customDropdown.classList.toggle('open');
            }
        });

        document.querySelectorAll('.custom-option').forEach(option => {
            option.addEventListener('click', () => {
                const val = option.getAttribute('data-value');
                if (selectPiattaforma) selectPiattaforma.value = val;
                
                const selectedSpan = document.getElementById('customSelectSelected');
                if (selectedSpan) selectedSpan.innerHTML = option.innerHTML;

                customDropdown.classList.remove('open');
            });
        });

        window.addEventListener('click', () => {
            customDropdown.classList.remove('open');
        });
    }

    const closeBtn = document.getElementById('closeChangelogBtn');
    const confirmBtn = document.getElementById('confirmChangelogBtn');
    
    if (closeBtn) closeBtn.addEventListener('click', chiudiModalChangelog);
    if (confirmBtn) confirmBtn.addEventListener('click', chiudiModalChangelog);

    const openChangelogBtn = document.getElementById('openChangelogBtn');
    if (openChangelogBtn) {
        openChangelogBtn.addEventListener('click', (e) => {
            e.preventDefault();
            apriModalChangelog();
        });
    }

    inizializzaListenerChangelogMenu();

    const searchCronologiaInput = document.getElementById('searchModellaCronologia');
    if (searchCronologiaInput) {
        searchCronologiaInput.addEventListener('input', () => {
            filtraCronologiaPerNome();
        });
    }

    const inputNome = document.getElementById('nome');
    if (inputNome) {
        inputNome.addEventListener('input', autocompilaDatiModella);
    }

    const limiteSelect = document.getElementById('limiteRisultati');
    if (limiteSelect) {
        limiteSelect.addEventListener('change', (e) => {
            localStorage.setItem('limiteRisultati', e.target.value);
            paginaCorrente = 1;
            caricaCronologia(tuttiGliShow);
        });
    }

    const ordineSelect = document.getElementById('ordineData');
    if (ordineSelect) {
        ordineSelect.addEventListener('change', () => {
            paginaCorrente = 1;
            caricaCronologia(tuttiGliShow);
        });
    }

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('modalModella');
        if (event.target === modal) {
            chiudiModalModella();
        }
    });

    if (typeof initChangelogCheck === 'function') {
        initChangelogCheck();
    }
    
    logger.success("Applicazione inizializzata con successo.");
});

/* ==========================================================================
   UTILITIES ED HELPER
   ========================================================================== */
function generaLinkChat(piattaforma, nickname) {
    if (!nickname) return null;
    const nick = nickname.trim().replace(/^@/, '');

    switch (piattaforma) {
        case 'Telegram':
            return `https://t.me/${nick}`;
        case 'Teams':
            if (nick.includes('@')) {
                return `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(nick)}`;
            }
            return `https://teams.microsoft.com/l/call/0/0?with=${encodeURIComponent(nick)}`;
        case 'Skype':
        case 'Altro':
        default:
            return null;
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function apriLinkEsterno(event, url) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    
    if (!url) return;

    if (url.includes('teams.microsoft.com/l/call/')) {
        try {
            const urlObj = new URL(url);
            const nickname = urlObj.searchParams.get('with');

            if (nickname) {
                navigator.clipboard.writeText(nickname).then(() => {
                    alert(`📋 Nickname "${nickname}" copiato negli appunti!\n\nSi sta aprendo Teams: incolla il nome nella barra di ricerca in alto.`);
                }).catch(() => {});
            }
        } catch (e) {
            logger.error("URL Teams non valido", e);
        }
    }

    if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal(url);
    } else {
        window.open(url, '_blank');
    }
}

function apriTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const tabTarget = document.getElementById(tabId);
    if (tabTarget) tabTarget.classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    
    logger.info(`Cambiato scheda attiva: ${tabId}`);
}

/* ==========================================================================
   LIGHTBOX E GALLERIA FOTO
   ========================================================================== */
function apriModalImmagine(urlFoto, listaFoto = null, indice = 0) {
    if (!urlFoto) return;
    
    const modalImg = document.getElementById('modalImmagineIngrandita');
    const imgTarget = document.getElementById('imgIngrandita');
    const btnNavigazione = document.querySelectorAll('.nav-btn-lightbox');
    
    if (listaFoto && Array.isArray(listaFoto) && listaFoto.length > 1) {
        galleriaCorrente = listaFoto;
        indiceFotoCorrente = indice;
        btnNavigazione.forEach(btn => btn.style.display = 'block');
    } else {
        galleriaCorrente = [urlFoto];
        indiceFotoCorrente = 0;
        btnNavigazione.forEach(btn => btn.style.display = 'none');
    }

    if (modalImg && imgTarget) {
        imgTarget.src = galleriaCorrente[indiceFotoCorrente];
        modalImg.style.display = 'block';
        modalImg.style.zIndex = '2000';
    }
}

function navigaGalleria(direzione) {
    if (galleriaCorrente.length <= 1) return;

    indiceFotoCorrente += direzione;

    if (indiceFotoCorrente < 0) {
        indiceFotoCorrente = galleriaCorrente.length - 1;
    } else if (indiceFotoCorrente >= galleriaCorrente.length) {
        indiceFotoCorrente = 0;
    }

    const imgTarget = document.getElementById('imgIngrandita');
    if (imgTarget) {
        imgTarget.src = galleriaCorrente[indiceFotoCorrente];
    }
}

function chiudiModalImmagine() {
    const modalImg = document.getElementById('modalImmagineIngrandita');
    if (modalImg) {
        modalImg.style.display = 'none';
    }
}

document.addEventListener('keydown', (e) => {
    const modalImg = document.getElementById('modalImmagineIngrandita');
    if (modalImg && modalImg.style.display === 'block') {
        if (e.key === 'ArrowLeft') navigaGalleria(-1);
        if (e.key === 'ArrowRight') navigaGalleria(1);
        if (e.key === 'Escape') chiudiModalImmagine();
    }
});

/* ==========================================================================
   GESTIONE BUDGET E FONT
   ========================================================================== */
function inizializzaGestioneBudget() {
    const budgetInput = document.getElementById('monthlyBudgetInput');
    const saveBtn = document.getElementById('saveBudgetBtn');

    const savedBudget = localStorage.getItem('monthly_budget') || '';
    if (budgetInput) {
        budgetInput.value = savedBudget;
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const val = parseFloat(budgetInput.value) || 0;
            localStorage.setItem('monthly_budget', val > 0 ? val : '');
            logger.info(`Budget mensile aggiornato: € ${val}`);
            caricaStatisticheMensili(tuttiGliShow);
        });
    }
}

function inizializzaFont() {
    const fontSalvato = localStorage.getItem('appFontSize');
    if (fontSalvato) {
        currentFontSize = parseInt(fontSalvato, 10);
    }
    aggiornaDimensioneFont();
}

function aumentaFont() {
    if (currentFontSize < 26) {
        currentFontSize += 1;
        logger.info(`Font aumentato a: ${currentFontSize}px`);
        aggiornaDimensioneFont();
    }
}

function riduciFont() {
    if (currentFontSize > 12) {
        currentFontSize -= 1;
        logger.info(`Font ridotto a: ${currentFontSize}px`);
        aggiornaDimensioneFont();
    }
}

function aggiornaDimensioneFont() {
    document.documentElement.style.setProperty('font-size', `${currentFontSize}px`, 'important');
    localStorage.setItem('appFontSize', currentFontSize);
    
    const badge = document.getElementById('fontBadge');
    if (badge) {
        badge.textContent = `${currentFontSize}px`;
    }
}

/* ==========================================================================
   GESTIONE TEMA E VERSIONE
   ========================================================================== */
function inizializzaTema() {
    const temaSalvato = localStorage.getItem('theme') || 'grey';
    const selectTema = document.getElementById('selectTema');
    
    if (selectTema) {
        selectTema.value = temaSalvato;
    }
    applicatema(temaSalvato);
}

function cambiaTema(nomeTema) {
    localStorage.setItem('theme', nomeTema);
    logger.info(`Tema cambiato in: ${nomeTema}`);
    applicatema(nomeTema);
}

function applicatema(nomeTema) {
    document.body.classList.remove('theme-grey', 'theme-dark');
    if (nomeTema === 'grey') {
        document.body.classList.add('theme-grey');
    } else if (nomeTema === 'dark') {
        document.body.classList.add('theme-dark');
    }
}

async function mostraVersioneApp() {
    try {
        if (window.electronAPI && window.electronAPI.getAppVersion) {
            const versione = await window.electronAPI.getAppVersion();
            const elem = document.getElementById('appVersion');
            if (elem && versione) {
                elem.textContent = `v${versione}`;
            }
        }
    } catch (err) {
        logger.error("Errore durante il recupero della versione app", err);
    }
}

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

    const showsOrdinati = [...datiShow].sort((a, b) => new Date(a.dataOraISO || a.id) - new Date(b.dataOraISO || b.id));

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
        const inputRecensione = document.getElementById('recensione');
        const inputNote = document.getElementById('note');
        const inputNickname = document.getElementById('nickname');
        const dataOraInput = document.getElementById('dataOra');

        const editId = editIdInput ? editIdInput.value : '';
        const dataOraValue = dataOraInput ? new Date(dataOraInput.value) : new Date();
        const isRegalo = isRegaloCheckbox ? isRegaloCheckbox.checked : false;

        let isAutoImport = false;
        if (editId) {
            const itemEsistente = tuttiGliShow.find(s => s.id === parseInt(editId, 10));
            if (itemEsistente && itemEsistente.isAutoImport) {
                isAutoImport = true;
            }
        }

        const valPunteggio = punteggioSelect ? punteggioSelect.value : '';

        const showData = {
            id: editId ? parseInt(editId, 10) : Date.now(),
            dataOraISO: dataOraValue.toISOString(),
            dataFormattata: dataOraValue.toLocaleDateString('it-IT') + ' ' + dataOraValue.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
            meseAnno: dataOraValue.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
            nome: inputNome ? inputNome.value.trim() : '',
            isRegalo: isRegalo,
            piattaforma: isRegalo ? '' : (piattaformaSelect ? piattaformaSelect.value : ''),
            punteggio: isRegalo ? null : (valPunteggio === 'TBD' ? 'TBD' : parseInt(valPunteggio, 10) || 'TBD'),
            costo: inputCosto ? (parseFloat(inputCosto.value) || 0) : 0,
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
                const index = shows.findIndex(s => s.id === parseInt(editId, 10));
                if (index !== -1) shows[index] = showData;
                logger.success(`Show aggiornato con successo [ID: ${showData.id}]`, showData);
            } else {
                shows.push(showData);
                logger.success(`Nuovo show registrato con successo [ID: ${showData.id}]`, showData);
            }

            await window.electronAPI.saveData(shows);
            resetForm();
            aggiornaInterfaccia();
        } catch (err) {
            logger.error("Errore durante il salvataggio dello show", err);
        }
    });
}

async function modificaShow(id) {
    logger.info(`Richiesta modifica per lo show ID: ${id}`);
    let shows = await window.electronAPI.readData();
    const item = shows.find(s => s.id === id);
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
        btnSalva.textContent = 'Aggiorna Record';
        btnSalva.style.backgroundColor = '#ffc107';
        btnSalva.style.color = '#212529';
    }
    if (btnAnnulla) btnAnnulla.style.display = 'block';

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function annullaModifica() {
    logger.info("Modifica annullata dall'utente.");
    resetForm();
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
        btnSalva.textContent = 'Salva Record';
        btnSalva.style.backgroundColor = '#2563eb';
        btnSalva.style.color = 'white';
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
        shows = shows.filter(s => s.id !== id);
        await window.electronAPI.saveData(shows);
        logger.success(`Show con ID ${id} eliminato.`);
        aggiornaInterfaccia();
    } catch (err) {
        logger.error("Errore durante l'eliminazione dello show", err);
    }
}

/* ==========================================================================
   AGGIORNAMENTO INTERFACCIA E FILTRI
   ========================================================================== */
async function aggiornaInterfaccia() {
    try {
        tuttiGliShow = await window.electronAPI.readData();
        logger.info(`Dati letti. Totale show caricati: ${tuttiGliShow.length}`);

        aggiornaMappeModelle(tuttiGliShow);
        aggiornaDatalistModelle(tuttiGliShow);
        inizializzaFiltroAnni(tuttiGliShow);
        popolaSelettoreAnni(tuttiGliShow);
        
        const inputRicerca = document.getElementById('searchModellaCronologia');
        if (inputRicerca && inputRicerca.value.trim() !== '') {
            caricaCronologia(tuttiGliShow);
            if (typeof filtraCronologiaPerNome === 'function') {
                filtraCronologiaPerNome();
            }
        } else {
            caricaCronologia(tuttiGliShow);
        }

        caricaStatisticheMensili(tuttiGliShow);
        caricaMedieEStoricizzazione(tuttiGliShow);
    } catch (err) {
        logger.error("Errore durante l'aggiornamento dell'interfaccia", err);
    }
}

function aggiornaMappeModelle(shows) {
    mappaImmaginiModelle = {};
    mappaUrlModelle = {};
    const showsOrdinatiPerData = [...shows].sort((a, b) => new Date(a.dataOraISO || a.id) - new Date(b.dataOraISO || b.id));
    
    showsOrdinatiPerData.forEach(show => {
        if (show.nome) {
            const chiave = show.nome.trim().toLowerCase();
            if (show.immagine) mappaImmaginiModelle[chiave] = show.immagine;
            if (show.urlProfilo || show.url) mappaUrlModelle[chiave] = show.urlProfilo || show.url;
        }
    });
}

function inizializzaFiltriCronologia() {
    const limiteSalvato = localStorage.getItem('limiteRisultati');
    const limiteSelect = document.getElementById('limiteRisultati');
    if (limiteSelect && limiteSalvato) {
        limiteSelect.value = limiteSalvato;
    }
}

function inizializzaFiltroAnni(shows) {
    const container = document.getElementById('container-filtri-anni');
    if (!container) return;

    container.innerHTML = '';

    const salvati = localStorage.getItem('anniSelezionatiFiltro');
    if (salvati) {
        try {
            const arrAnni = JSON.parse(salvati);
            anniSelezionati = new Set(arrAnni);
        } catch (e) {
            console.error("Errore nel ripristino degli anni dal localStorage", e);
        }
    }

    const anniDisponibili = Array.from(new Set(
        shows.map(s => {
            if (s.dataOraISO) return new Date(s.dataOraISO).getFullYear();
            if (s.dataFormattata) {
                const parti = s.dataFormattata.split('/');
                return parti[2] ? parseInt(parti[2], 10) : null;
            }
            return null;
        }).filter(Boolean)
    )).sort((a, b) => b - a);

    if (anniDisponibili.length === 0) {
        container.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">Nessun anno disponibile</span>';
        return;
    }

    anniDisponibili.forEach(anno => {
        const wrapper = document.createElement('label');
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '4px';
        wrapper.style.fontSize = '0.85rem';
        wrapper.style.cursor = 'pointer';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = anno;
        checkbox.checked = anniSelezionati.has(anno);

        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                anniSelezionati.add(anno);
            } else {
                anniSelezionati.delete(anno);
            }
            
            localStorage.setItem('anniSelezionatiFiltro', JSON.stringify(Array.from(anniSelezionati)));

            paginaCorrente = 1;
            caricaCronologia(tuttiGliShow);
        });

        wrapper.appendChild(checkbox);
        wrapper.appendChild(document.createTextNode(anno));
        container.appendChild(wrapper);
    });
}

function filtraShowPerAnni(shows) {
    if (anniSelezionati.size === 0) {
        return shows;
    }

    return shows.filter(s => {
        let annoShow = null;
        if (s.dataOraISO) {
            annoShow = new Date(s.dataOraISO).getFullYear();
        } else if (s.dataFormattata) {
            const parti = s.dataFormattata.split('/');
            annoShow = parti[2] ? parseInt(parti[2], 10) : null;
        }
        return anniSelezionati.has(annoShow);
    });
}

function getPiattaformaFormatted(show) {
    if (show.isRegalo) {
        return '<span class="badge-regalo">🎁 Regalo</span>';
    }
    
    const nomePiattaforma = show.piattaforma || 'Teams';
    const iconaHtml = iconePiattaformaHTML[nomePiattaforma] || `<i class="fa-solid fa-globe"></i> ${escapeHtml(nomePiattaforma)}`;
    
    if (show.nickname) {
        const urlChat = generaLinkChat(nomePiattaforma, show.nickname);
        if (urlChat) {
            return `
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span>${iconaHtml}</span>
                    <a href="#" class="link-web" style="font-size: 0.82rem; font-weight: bold;" onclick="apriLinkEsterno(event, '${escapeHtml(urlChat)}')">
                        💬 ${escapeHtml(show.nickname)}
                    </a>
                </div>
            `;
        }
        return `${iconaHtml} <small>(${escapeHtml(show.nickname)})</small>`;
    }

    return iconaHtml;
}

/* ==========================================================================
   CRONOLOGIA E PAGINAZIONE
   ========================================================================== */
function caricaCronologia(shows) {
    const listaShow = document.getElementById('listaShow');
    if (!listaShow) return;
    listaShow.innerHTML = '';
    
    const limiteSelect = document.getElementById('limiteRisultati');
    const ordineSelect = document.getElementById('ordineData');
    
    const limiteValore = limiteSelect ? limiteSelect.value : '5';
    const ordine = ordineSelect ? ordineSelect.value : 'desc';
    
    const showsFiltrati = filtraShowPerAnni(shows);

    let showsOrdinati = [...showsFiltrati];
    showsOrdinati.sort((a, b) => {
        const dataA = new Date(a.dataOraISO || a.id);
        const dataB = new Date(b.dataOraISO || b.id);
        return ordine === 'asc' ? dataA - dataB : dataB - dataA;
    });

    let showsDaMostrare = showsOrdinati;
    let totalePagine = 1;

    if (limiteValore !== 'all') {
        const limitePerPagina = parseInt(limiteValore, 10);
        totalePagine = Math.ceil(showsOrdinati.length / limitePerPagina) || 1;

        if (paginaCorrente > totalePagine) paginaCorrente = totalePagine;
        if (paginaCorrente < 1) paginaCorrente = 1;

        const inizio = (paginaCorrente - 1) * limitePerPagina;
        const fine = inizio + limitePerPagina;
        showsDaMostrare = showsOrdinati.slice(inizio, fine);
    }

    const fragment = document.createDocumentFragment();

    showsDaMostrare.forEach(function(item) {
        const tr = document.createElement('tr');
        
        const fotoUrl = item.immagine || mappaImmaginiModelle[item.nome.trim().toLowerCase()] || '';
        const imgHtml = fotoUrl 
            ? `<img src="${escapeHtml(fotoUrl)}" class="thumb-img" style="cursor: pointer;" alt="foto" title="Clicca per ingrandire" onclick="event.stopPropagation(); apriModalImmagine('${escapeHtml(fotoUrl)}')" onerror="this.outerHTML='<div class=\\'no-img\\'>No Foto</div>'">`
            : `<div class="no-img">No Foto</div>`;

        const piattaformaTxt = getPiattaformaFormatted(item);
        
        let votoTxt = '-';
        if (!item.isRegalo) {
            if (item.punteggio === 'TBD' || !item.punteggio) {
                votoTxt = `<span style="background-color: #fff3cd; color: #856404; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 12px;">TBD</span>`;
            } else {
                votoTxt = `${item.punteggio} / 5`;
            }
        }

        const origineBadge = item.isAutoImport 
            ? `<span style="background-color: #e3f2fd; color: #0d47a1; padding: 3px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; white-space: nowrap;">🤖 Auto MCG</span>` 
            : `<span style="background-color: #f5f5f5; color: #616161; padding: 3px 8px; border-radius: 12px; font-size: 11px; white-space: nowrap;">👤 Manuale</span>`;

        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td style="white-space: nowrap;">${escapeHtml(item.dataFormattata || item.data)}</td>
            <td><strong>${escapeHtml(item.nome)}</strong></td>
            <td>${piattaformaTxt}</td>
            <td style="white-space: nowrap;">€ ${item.costo ? item.costo.toFixed(2) : '0.00'}</td>
            <td>${votoTxt}</td>
            <td>${origineBadge}</td>
            <td style="text-align: center;">${item.recensione ? '✅' : '❌'}</td>
            <td title="${escapeHtml(item.note)}">${escapeHtml(item.note)}</td>
            <td style="white-space: nowrap; text-align: right;">
                <button class="btn-edit" onclick="modificaShow(${item.id})">Modifica</button>
                <button class="btn-delete" onclick="eliminaShow(${item.id})">Elimina</button>
            </td>
        `;
        fragment.appendChild(tr);
    });

    listaShow.appendChild(fragment);
    aggiornaControlliPaginazione(totalePagine, limiteValore === 'all');
}

function cambiaPagina(direzione) {
    paginaCorrente += direzione;
    logger.info(`Navigazione pagina cronologia: ${paginaCorrente}`);
    caricaCronologia(tuttiGliShow);
}

function aggiornaControlliPaginazione(totalePagine, mostraTutti) {
    const btnIndietro = document.getElementById('btnPrevPagina');
    const btnAvanti = document.getElementById('btnNextPagina');
    const infoPagina = document.getElementById('infoPagina');
    const contenitorePaginazione = document.getElementById('controlliPaginazione');

    if (!contenitorePaginazione) return;

    if (mostraTutti || totalePagine <= 1) {
        contenitorePaginazione.style.display = 'none';
        return;
    }

    contenitorePaginazione.style.display = 'flex';
    
    if (btnIndietro) btnIndietro.disabled = (paginaCorrente <= 1);
    if (btnAvanti) btnAvanti.disabled = (paginaCorrente >= totalePagine);
    if (infoPagina) infoPagina.textContent = `Pagina ${paginaCorrente} di ${totalePagine}`;
}

function resetFiltriCronologia() {
    logger.info("Reset dei filtri cronologia richiesto.");
    const ordine = document.getElementById('ordineData');
    const limite = document.getElementById('limiteRisultati');
    if (ordine) ordine.value = 'desc';
    if (limite) limite.value = '5';
    
    const searchInput = document.getElementById('searchModellaCronologia');
    if (searchInput) searchInput.value = '';

    anniSelezionati.clear();
    localStorage.removeItem('anniSelezionatiFiltro');

    inizializzaFiltroAnni(tuttiGliShow);

    localStorage.removeItem('limiteRisultati');
    paginaCorrente = 1;
    caricaCronologia(tuttiGliShow);
}

/* ==========================================================================
   STATISTICHE MENSILI PER ANNO E DETTAGLIO MESI CLICCABILI
   ========================================================================== */
function popolaSelettoreAnni(dati) {
    const selectAnno = document.getElementById('selezionaAnnoStatistiche');
    if (!selectAnno) return;

    const anniSet = new Set();
    dati.forEach(item => {
        const dataRiferimento = item.dataOraISO || item.dataOra || item.data;
        if (dataRiferimento) {
            const anno = new Date(dataRiferimento).getFullYear();
            if (!isNaN(anno)) anniSet.add(anno);
        }
    });

    if (anniSet.size === 0) {
        anniSet.add(new Date().getFullYear());
    }

    const anniOrdinati = Array.from(anniSet).sort((a, b) => b - a);
    const annoSelezionatoCorrente = selectAnno.value;

    selectAnno.innerHTML = '';
    anniOrdinati.forEach(anno => {
        const option = document.createElement('option');
        option.value = anno;
        option.textContent = anno;
        selectAnno.appendChild(option);
    });

    if (annoSelezionatoCorrente && anniOrdinati.includes(parseInt(annoSelezionatoCorrente))) {
        selectAnno.value = annoSelezionatoCorrente;
    } else {
        selectAnno.value = anniOrdinati[0];
    }
}

function aggiornaStatisticheMensili() {
    meseSelezionatoDettaglio = null;
    caricaStatisticheMensili(tuttiGliShow);
}

function selezionaMeseDettaglio(idxMese) {
    if (meseSelezionatoDettaglio === idxMese) {
        meseSelezionatoDettaglio = null;
    } else {
        meseSelezionatoDettaglio = idxMese;
    }
    caricaStatisticheMensili(tuttiGliShow);
}

function caricaStatisticheMensili(shows) {
    const sezioneStatistiche = document.getElementById('sezioneStatistiche');
    const selectAnno = document.getElementById('selezionaAnnoStatistiche');
    if (!sezioneStatistiche) return;

    if (selectAnno && selectAnno.options.length === 0) {
        popolaSelettoreAnni(shows);
    }

    const annoSelezionato = selectAnno ? (parseInt(selectAnno.value) || new Date().getFullYear()) : new Date().getFullYear();
    sezioneStatistiche.innerHTML = '';

    const mesi = [
        "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
    ];

    const spesaMese = Array(12).fill(0);
    const countMese = Array(12).fill(0);
    const showPerMese = Array.from({ length: 12 }, () => []);

    let spesaMeseCorrente = 0;
    const meseCorrenteIdx = new Date().getMonth();
    const annoCorrenteNum = new Date().getFullYear();

    shows.forEach(show => {
        const dataRef = show.dataOraISO || show.dataOra || show.data;
        if (dataRef) {
            const d = new Date(dataRef);
            if (d.getFullYear() === annoSelezionato) {
                const meseIdx = d.getMonth();
                spesaMese[meseIdx] += parseFloat(show.costo) || 0;
                countMese[meseIdx] += 1;
                showPerMese[meseIdx].push(show);
            }
            if (d.getFullYear() === annoCorrenteNum && d.getMonth() === meseCorrenteIdx) {
                spesaMeseCorrente += parseFloat(show.costo) || 0;
            }
        }
    });

    const budgetPrefissato = parseFloat(localStorage.getItem('monthly_budget')) || 0;
    const mancante = budgetPrefissato - spesaMeseCorrente;

    const budgetStatusText = document.getElementById('budgetStatusText');
    const budgetRemainingText = document.getElementById('budgetRemainingText');
    const progressBar = document.getElementById('progressBar');

    if (budgetStatusText && budgetRemainingText && progressBar) {
        budgetStatusText.textContent = `Spesa Mese Corrente: € ${spesaMeseCorrente.toFixed(2)} / € ${budgetPrefissato.toFixed(2)}`;
        
        if (budgetPrefissato > 0) {
            const percentuale = Math.min(100, Math.max(0, (spesaMeseCorrente / budgetPrefissato) * 100));
            progressBar.style.width = `${percentuale}%`;
            
            if (mancante >= 0) {
                budgetRemainingText.textContent = `Rimanente: € ${mancante.toFixed(2)}`;
                budgetRemainingText.style.color = '#15803d';
                progressBar.style.backgroundColor = '#16a34a';
            } else {
                budgetRemainingText.textContent = `Sforato di: € ${Math.abs(mancante).toFixed(2)}`;
                budgetRemainingText.style.color = '#b91c1c';
                progressBar.style.backgroundColor = '#dc2626';
            }
        } else {
            progressBar.style.width = '0%';
            budgetRemainingText.textContent = 'Nessun budget impostato';
            budgetRemainingText.style.color = '#475569';
        }
    }

    let html = `
        <table class="table-container" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
                    <th style="padding: 10px;">Mese (${annoSelezionato})</th>
                    <th style="padding: 10px; text-align: center;">Show Effettuati</th>
                    <th style="padding: 10px; text-align: right;">Totale Speso</th>
                </tr>
            </thead>
            <tbody>
    `;

    mesi.forEach((nomeMese, idx) => {
        const isAttivo = (meseSelezionatoDettaglio === idx);
        const haShow = countMese[idx] > 0;
        const eMeseCorrente = (idx === meseCorrenteIdx && annoSelezionato === annoCorrenteNum);

        let bgColor = 'transparent';
        if (eMeseCorrente) {
            bgColor = '#fef9c3';
        } else if (isAttivo) {
            bgColor = 'rgba(42, 157, 143, 0.15)';
        }

        const stileTr = haShow 
            ? `cursor: pointer; background-color: ${bgColor}; color: ${eMeseCorrente ? '#1e293b' : 'inherit'}; border-bottom: 1px solid var(--border-color);`
            : `background-color: ${bgColor}; color: ${eMeseCorrente ? '#1e293b' : 'inherit'}; border-bottom: 1px solid var(--border-color); opacity: 0.6;`;

        html += `
            <tr style="${stileTr}" ${haShow ? `onclick="selezionaMeseDettaglio(${idx})"` : ''} title="${haShow ? 'Clicca per vedere/nascondere i dettagli degli show' : 'Nessuno show in questo mese'}">
                <td style="padding: 10px;">
                    <strong>${haShow ? (isAttivo ? '🔽 ' : '▶ ') : ''}${nomeMese} ${eMeseCorrente ? '📌 (Attuale)' : ''}</strong>
                </td>
                <td style="padding: 10px; text-align: center;">${countMese[idx]}</td>
                <td style="padding: 10px; text-align: right; color: ${eMeseCorrente ? '#1e293b' : 'var(--accent-color)'}; font-weight: bold;">€ ${spesaMese[idx].toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    if (meseSelezionatoDettaglio !== null && showPerMese[meseSelezionatoDettaglio]) {
        const elencoShowMese = showPerMese[meseSelezionatoDettaglio];
        elencoShowMese.sort((a, b) => new Date(b.dataOraISO || b.id) - new Date(a.dataOraISO || a.id));

        html += `
            <div style="margin-top: 20px; padding: 15px; border: 1px solid var(--border-color); border-radius: 8px; background-color: var(--bg-card, #fff);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 style="margin: 0;">Show Effettuati - ${mesi[meseSelezionatoDettaglio]} ${annoSelezionato} (${elencoShowMese.length})</h3>
                    <button onclick="selezionaMeseDettaglio(null)" style="padding: 4px 10px; cursor: pointer; border-radius: 4px; border: 1px solid var(--border-color);">✖ Chiudi Dettaglio</button>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
                            <th>Foto</th>
                            <th>Data</th>
                            <th>Modella</th>
                            <th>Piattaforma</th>
                            <th>Costo</th>
                            <th>Voto</th>
                            <th>Recensione</th>
                            <th>Note</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        elencoShowMese.forEach(item => {
            const fotoUrl = item.immagine || mappaImmaginiModelle[item.nome.trim().toLowerCase()] || '';
            const imgHtml = fotoUrl 
                ? `<img src="${escapeHtml(fotoUrl)}" class="thumb-img" style="cursor: pointer;" alt="foto" onclick="event.stopPropagation(); apriModalImmagine('${escapeHtml(fotoUrl)}')" onerror="this.outerHTML='<div class=\\'no-img\\'>No Foto</div>'">`
                : `<div class="no-img">No Foto</div>`;

            let votoTxt = '-';
            if (!item.isRegalo) {
                votoTxt = (item.punteggio === 'TBD' || !item.punteggio) ? 'TBD' : `${item.punteggio} / 5`;
            }

            html += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 6px;">${imgHtml}</td>
                    <td style="white-space: nowrap; padding: 6px;">${escapeHtml(item.dataFormattata || item.data)}</td>
                    <td style="padding: 6px;"><strong style="cursor: pointer; color: #000000;" onclick="apriModalModella('${escapeHtml(item.nome)}')">${escapeHtml(item.nome)}</strong></td>
                    <td style="padding: 6px;">${getPiattaformaFormatted(item)}</td>
                    <td style="white-space: nowrap; padding: 6px;">€ ${item.costo ? item.costo.toFixed(2) : '0.00'}</td>
                    <td style="padding: 6px;">${votoTxt}</td>
                    <td style="text-align: center; padding: 6px;">${item.recensione ? '✅' : '❌'}</td>
                    <td style="padding: 6px;" title="${escapeHtml(item.note)}">${escapeHtml(item.note)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    sezioneStatistiche.innerHTML = html;
}

/* ==========================================================================
   CLASSIFICA MODELLE E MEDIE
   ========================================================================== */
function caricaMedieEStoricizzazione(shows) {
    const listaMedie = document.getElementById('listaMedie');
    if (!listaMedie) return;

    const mappaModelle = {};

    const showsOrdinati = [...shows].sort((a, b) => new Date(b.dataOraISO || b.id) - new Date(a.dataOraISO || a.id));

    showsOrdinati.forEach(show => {
        if (!show.nome) return;
        const nomeNorm = show.nome.trim();
        const chiave = nomeNorm.toLowerCase();

        if (!mappaModelle[chiave]) {
            mappaModelle[chiave] = {
                nome: nomeNorm,
                totaleShow: 0,
                spesaTotale: 0,
                sommaVoti: 0,
                conteggioVoti: 0,
                foto: show.immagine || mappaImmaginiModelle[chiave] || '',
                urlProfilo: show.urlProfilo || show.url || mappaUrlModelle[chiave] || '',
                piattaformaPrevalente: show.piattaforma || '',
                nicknamePrevalente: show.nickname || ''
            };
        }

        mappaModelle[chiave].totaleShow += 1;
        mappaModelle[chiave].spesaTotale += (parseFloat(show.costo) || 0);

        if (!show.isRegalo && show.punteggio && show.punteggio !== 'TBD') {
            const v = parseFloat(show.punteggio);
            if (!isNaN(v)) {
                mappaModelle[chiave].sommaVoti += v;
                mappaModelle[chiave].conteggioVoti += 1;
            }
        }
    });

    classificaCompletaCache = Object.values(mappaModelle).map(m => {
        const media = m.conteggioVoti > 0 ? (m.sommaVoti / m.conteggioVoti).toFixed(2) : 'N/D';
        return { ...m, mediaValore: media === 'N/D' ? -1 : parseFloat(media), mediaTxt: media };
    });

    classificaCompletaCache.sort((a, b) => {
    if (b.mediaValore !== a.mediaValore) return b.mediaValore - a.mediaValore;
    return b.totaleShow - a.totaleShow;
    });

    // ADD QUESTA PARTE: assegna la posizione REALE in classifica a ciascuna modella
    classificaCompletaCache.forEach((item, index) => {
        item.posizioneOriginale = index + 1;
    });

    mostraClassifica(classificaCompletaCache);

    mostraClassifica(classificaCompletaCache);
}

function mostraClassifica(lista) {
    const listaMedie = document.getElementById('listaMedie');
    if (!listaMedie) return;
    listaMedie.innerHTML = '';

    const fragment = document.createDocumentFragment();

    lista.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => apriModalModella(item.nome);

        const imgHtml = item.foto 
            ? `<img src="${escapeHtml(item.foto)}" class="thumb-img" alt="foto" onclick="event.stopPropagation(); apriModalImmagine('${escapeHtml(item.foto)}')" onerror="this.outerHTML='<div class=\\'no-img\\'>No Foto</div>'">`
            : `<div class="no-img">No Foto</div>`;

        const linkWebHtml = item.urlProfilo 
            ? `<a href="#" class="link-web" onclick="apriLinkEsterno(event, '${escapeHtml(item.urlProfilo)}')">🌐 Profilo Web</a>`
            : `-`;

        let piattaformaHtml = '-';
        if (item.piattaformaPrevalente) {
            const iconaHtml = iconePiattaformaHTML[item.piattaformaPrevalente] || `<i class="fa-solid fa-globe"></i> ${escapeHtml(item.piattaformaPrevalente)}`;
            if (item.nicknamePrevalente) {
                const urlChat = generaLinkChat(item.piattaformaPrevalente, item.nicknamePrevalente);
                if (urlChat) {
                    piattaformaHtml = `
                        <a href="#" class="link-web" style="font-size: 0.85rem; font-weight: bold;" onclick="apriLinkEsterno(event, '${escapeHtml(urlChat)}')">
                            ${iconaHtml} (${escapeHtml(item.nicknamePrevalente)})
                        </a>
                    `;
                } else {
                    piattaformaHtml = `${iconaHtml} <small>(${escapeHtml(item.nicknamePrevalente)})</small>`;
                }
            } else {
                piattaformaHtml = iconaHtml;
            }
        }

        tr.innerHTML = `
            <td style="text-align: center; font-weight: bold;">#${item.posizioneOriginale || (index + 1)}</td>
            <td>${imgHtml}</td>
            <td><strong>${escapeHtml(item.nome)}</strong></td>
            <td>${linkWebHtml}</td>
            <td>${piattaformaHtml}</td>
            <td style="text-align: center;">${item.totaleShow}</td>
            <td style="white-space: nowrap; font-weight: bold; color: #e76f51;">€ ${item.spesaTotale.toFixed(2)}</td>
            <td style="font-weight: bold; color: var(--accent-color);">${item.mediaTxt}</td>
        `;
        fragment.appendChild(tr);
    });

    listaMedie.appendChild(fragment);
}

function filtraClassificaModelle() {
    const input = document.getElementById('searchModellaClassifica');
    if (!input) return;
    const filtro = input.value.trim().toLowerCase();

    const filtrati = classificaCompletaCache.filter(m => m.nome.toLowerCase().includes(filtro));
    mostraClassifica(filtrati);
}

function filtraCronologiaPerNome() {
    paginaCorrente = 1;
    const input = document.getElementById('searchModellaCronologia');
    if (!input) return;
    const filtro = input.value.trim().toLowerCase();

    const filtrati = tuttiGliShow.filter(s => s.nome && s.nome.toLowerCase().includes(filtro));
    caricaCronologia(filtrati);
}

/* ==========================================================================
   MODALE DETTAGLIO MODELLA E FOTO DINAMICHE
   ========================================================================== */
async function apriModalModella(nomeModella) {
    const modal = document.getElementById('modalModella');
    const header = document.getElementById('modalHeader');
    const listaBody = document.getElementById('modalListaShow');

    if (!modal || !header || !listaBody) return;

    const showsModella = tuttiGliShow.filter(s => s.nome && s.nome.trim().toLowerCase() === nomeModella.trim().toLowerCase());
    showsModella.sort((a, b) => new Date(b.dataOraISO || b.id) - new Date(a.dataOraISO || a.id));

    const totaleShow = showsModella.length;
    const spesaTotale = showsModella.reduce((acc, show) => acc + (parseFloat(show.costo) || 0), 0);
    
    const showConVoto = showsModella.filter(s => !s.isRegalo && s.punteggio && s.punteggio !== 'TBD');
    const sommaVoti = showConVoto.reduce((acc, s) => acc + parseFloat(s.punteggio), 0);
    const mediaVoti = showConVoto.length > 0 ? (sommaVoti / showConVoto.length).toFixed(2) : 'N/D';

    const chiaveModella = nomeModella.trim().toLowerCase();
    
    const fotoProfilo = mappaImmaginiModelle[chiaveModella] || (showsModella.find(s => s.immagine) || {}).immagine || '';
    const urlProfilo = mappaUrlModelle[chiaveModella] || (showsModella.find(s => s.urlProfilo || s.url) || {}).urlProfilo || '';

    const imgProfiloHtml = fotoProfilo 
        ? `<img src="${escapeHtml(fotoProfilo)}" alt="${escapeHtml(nomeModella)}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 50%; border: 2px solid var(--accent-color, #2a9d8f); cursor: pointer;" onclick="apriModalImmagine('${escapeHtml(fotoProfilo)}')">`
        : `<div style="width: 70px; height: 70px; border-radius: 50%; background-color: var(--border-color, #ccc); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">👤</div>`;

    header.innerHTML = `
        <div class="modella-header-card" style="display: flex; align-items: center; gap: 20px; padding: 15px; background: var(--bg-card-secondary, rgba(0,0,0,0.03)); border-radius: 8px; margin-bottom: 20px; border: 1px solid var(--border-color, #ccc);">
            <div class="modella-avatar-wrapper">
                ${imgProfiloHtml}
            </div>
            
            <div class="modella-info-main" style="flex-grow: 1;">
                <h2 style="margin: 0 0 5px 0;">${escapeHtml(nomeModella)}</h2>
                ${urlProfilo ? `
                    <p style="margin: 0; font-size: 0.9em;">
                        🌐 <a href="#" onclick="apriLinkEsterno(event, '${escapeHtml(urlProfilo)}')" style="color: #000000; text-decoration: none; font-weight: bold;">
                            ${escapeHtml(urlProfilo)}
                        </a>
                    </p>
                ` : '<p style="margin: 0; font-size: 0.85em; color: var(--text-muted, #888);">Nessun sito web collegato</p>'}
            </div>

            <div class="modella-stats-summary" style="display: flex; gap: 12px; text-align: center;">
                <div class="stat-box" style="padding: 8px 12px; background: var(--bg-card, #fff); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #ccc);">
                    <span style="display: block; font-size: 0.8em; color: var(--text-muted, #666);">Show Totali</span>
                    <strong style="font-size: 1.2em; color: var(--text-main, #333);">${totaleShow}</strong>
                </div>
                <div class="stat-box" style="padding: 8px 12px; background: var(--bg-card, #fff); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #ccc);">
                    <span style="display: block; font-size: 0.8em; color: var(--text-muted, #666);">Spesa Totale</span>
                    <strong style="font-size: 1.2em; color: #e76f51;">€ ${spesaTotale.toFixed(2)}</strong>
                </div>
                <div class="stat-box" style="padding: 8px 12px; background: var(--bg-card, #fff); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #ccc);">
                    <span style="display: block; font-size: 0.8em; color: var(--text-muted, #666);">Media Voti</span>
                    <strong style="font-size: 1.2em; color: var(--accent-color, #2a9d8f);">${mediaVoti !== 'N/D' ? mediaVoti + ' / 5' : 'N/D'}</strong>
                </div>
            </div>
        </div>
    `;

    caricaFotoDinamicheModella(nomeModella, mappaUrlModelle);

    listaBody.innerHTML = '';
    showsModella.forEach(item => {
        const tr = document.createElement('tr');
        const piattaformaTxt = getPiattaformaFormatted(item);
        
        let votoTxt = '-';
        if (!item.isRegalo) {
            votoTxt = (item.punteggio === 'TBD' || !item.punteggio) ? 'TBD' : `${item.punteggio} / 5`;
        }

        tr.innerHTML = `
            <td>${escapeHtml(item.dataFormattata || item.data)}</td>
            <td>${piattaformaTxt}</td>
            <td>€ ${item.costo ? item.costo.toFixed(2) : '0.00'}</td>
            <td>${votoTxt}</td>
            <td style="text-align: center;">${item.recensione ? '✅' : '❌'}</td>
            <td>${escapeHtml(item.note)}</td>
        `;
        listaBody.appendChild(tr);
    });

    modal.style.display = 'block';
}

function chiudiModalModella() {
    const modal = document.getElementById('modalModella');
    if (modal) modal.style.display = 'none';
}

async function caricaFotoDinamicheModella(nomeChiave, mappaUrl) {
    const contenitoreFoto = document.getElementById('contenitoreFotoDinamiche');
    if (!contenitoreFoto) return;

    contenitoreFoto.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">🔄 Caricamento foto da MondoCamGirls...</span>';

    const nomeSanitizzato = nomeChiave
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '');

    let rawUrl = mappaUrl[nomeChiave.toLowerCase()] || `https://${nomeSanitizzato}.mondocamgirls.com`;
    let profileUrl = rawUrl.replace(/\/+$/, '');
    let targetUrlFoto = `${profileUrl}/?pag=0#mp-foto`;

    if (window.electronAPI && window.electronAPI.fetchModellaFoto) {
        const result = await window.electronAPI.fetchModellaFoto(profileUrl);

        if (result.success && result.images && result.images.length > 0) {
            contenitoreFoto.innerHTML = '';
            result.images.forEach((imgUrl, index) => {
                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = "Foto modella";
                img.style.cssText = "height: 100px; width: 100px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); transition: transform 0.2s;";
                img.title = "Clicca per ingrandire";
                
                img.onmouseover = () => img.style.transform = 'scale(1.05)';
                img.onmouseout = () => img.style.transform = 'scale(1)';

                img.onclick = () => apriModalImmagine(imgUrl, result.images, index);

                contenitoreFoto.appendChild(img);
            });
        } else {
            const targetUrlHtml = `<a href="#" class="link-web" style="font-weight: bold; text-decoration: underline;" onclick="apriLinkEsterno(event, '${escapeHtml(targetUrlFoto)}')">${escapeHtml(targetUrlFoto)}</a>`;
            
            contenitoreFoto.innerHTML = `
                <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">
                    ⚠️ Nessuna foto trovata analizzando la pagina: <br>
                    ${targetUrlHtml}
                </div>
            `;
        }
    } else {
        contenitoreFoto.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Funzione recupero foto non disponibile.</span>';
    }
}

/* ==========================================================================
   SINCRONIZZAZIONE ED ESPORTAZIONE DATI
   ========================================================================== */
async function esportaDati() {
    try {
        if (window.electronAPI && window.electronAPI.exportData) {
            await window.electronAPI.exportData();
            logger.success("Dati esportati con successo.");
        }
    } catch (err) {
        logger.error("Errore durante l'esportazione dei dati", err);
    }
}

async function importaDati() {
    try {
        if (window.electronAPI && window.electronAPI.importData) {
            const esito = await window.electronAPI.importData();
            if (esito) {
                logger.success("Dati importati con successo.");
                aggiornaInterfaccia();
            }
        }
    } catch (err) {
        logger.error("Errore durante l'importazione dei dati", err);
    }
}

async function apriCartellaDati() {
    try {
        if (window.electronAPI && window.electronAPI.openDataFolder) {
            await window.electronAPI.openDataFolder();
        }
    } catch (err) {
        logger.error("Errore nell'apertura della cartella dati", err);
    }
}

async function sincronizzaTransazioniMondoCamGirls() {
    try {
        const syncApi = window.electronAPI && (window.electronAPI.syncMCG || window.electronAPI.fetchTransazioniHtml);
        
        if (!syncApi) {
            alert("Errore: Funzione di sincronizzazione non supportata.");
            return;
        }

        logger.info("Avvio sincronizzazione transazioni da MondoCamGirls...");
        
        const rawHtml = window.electronAPI.syncMCG 
            ? await window.electronAPI.syncMCG() 
            : await window.electronAPI.fetchTransazioniHtml();

        if (!rawHtml) {
            logger.warn("Sincronizzazione annullata o finestra chiusa.");
            return;
        }

        let htmlContent = (typeof rawHtml === 'string') ? rawHtml : (rawHtml.html || '');
        
        if (!htmlContent && typeof rawHtml === 'object' && rawHtml.importedCount !== undefined) {
            alert(`✅ Sincronizzazione completata!\nShow importati: ${rawHtml.importedCount}`);
            aggiornaInterfaccia();
            return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const righeTabella = doc.querySelectorAll('table tbody tr, table tr');

        if (!righeTabella || righeTabella.length === 0) {
            alert("⚠️ Nessuna tabella di transazioni trovata nella pagina scaricata.");
            return;
        }

        let showsEsistenti = await window.electronAPI.readData();
        aggiornaMappeModelle(showsEsistenti);
        
        let nuoviShowImportati = 0;

        const nomiMesi = [
            "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
            "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"
        ];

        // FUNZIONE CHIAVE: Converte qualsiasi data in una stringa pulita "GG/MM/YYYY HH:MM"
        // IGNORA FUSI ORARI ED EVITA GLI ERRORI DEI TIMESTAMP
        const estraiChiaveCanonico = (strDataOra) => {
            if (!strDataOra) return '';
            
            let dataStr = String(strDataOra).trim();
            
            // Se è un formato ISO tipo "2026-09-11T21:02:00.000Z"
            if (dataStr.includes('T')) {
                const partiIso = dataStr.split('T');
                const ymd = partiIso[0].split('-');
                const hms = partiIso[1].split(':');
                if (ymd.length === 3) {
                    return `${ymd[2].padStart(2, '0')}/${ymd[1].padStart(2, '0')}/${ymd[0]} ${hms[0]}:${hms[1]}`;
                }
            }

            // Se è formato testo GG/MM/YY HH:MM o GG/MM/YYYY HH:MM
            const parti = dataStr.split(' ');
            const dataParti = parti[0] ? parti[0].split('/') : [];
            const oraParti = parti[1] ? parti[1].split(':') : ['00', '00'];

            if (dataParti.length === 3) {
                const gg = dataParti[0].padStart(2, '0');
                const mm = dataParti[1].padStart(2, '0');
                let aa = parseInt(dataParti[2], 10);
                if (aa < 100) aa += 2000;

                const hh = oraParti[0].padStart(2, '0');
                const min = oraParti[1].padStart(2, '0');

                return `${gg}/${mm}/${aa} ${hh}:${min}`;
            }

            return dataStr;
        };

        const estraiDettagliData = (strDataOra) => {
            if (!strDataOra) return { dataISO: new Date().toISOString(), meseAnnoStr: '' };
            
            const parti = strDataOra.trim().split(' ');
            const dataParti = parti[0] ? parti[0].split('/') : [];
            const oraParti = parti[1] ? parti[1].split(':') : ['00', '00'];

            if (dataParti.length === 3) {
                const giorno = parseInt(dataParti[0], 10);
                const meseIdx = parseInt(dataParti[1], 10) - 1;
                let anno = parseInt(dataParti[2], 10);
                if (anno < 100) anno += 2000;

                const ore = parseInt(oraParti[0], 10) || 0;
                const minuti = parseInt(oraParti[1], 10) || 0;

                const dataISO = new Date(anno, meseIdx, giorno, ore, minuti).toISOString();
                const meseAnnoStr = `${nomiMesi[meseIdx]} ${anno}`;

                return { dataISO, meseAnnoStr };
            }

            return { dataISO: new Date().toISOString(), meseAnnoStr: '' };
        };

        righeTabella.forEach(riga => {
            const celle = riga.querySelectorAll('td');
            
            if (celle.length >= 5) {
                const testoData = celle[0]?.textContent.trim() || '';
                const testoCosto = celle[2]?.textContent.trim().replace('€', '').replace(',', '.').replace(/\s+/g, '') || '0';
                const testoNome = celle[4]?.textContent.trim() || '';
                
                const costoNum = Math.abs(parseFloat(testoCosto) || 0);

                if (testoNome && testoData && isNaN(testoNome)) {
                    
                    const nomeNormalizzato = testoNome.toLowerCase().trim();
                    const chiaveImportata = estraiChiaveCanonico(testoData);

                    // VERIFICA ANTI-DUPLICATO
                    const giaEsistente = showsEsistenti.some(s => {
                        const sNome = (s.nome || '').toLowerCase().trim();
                        if (sNome !== nomeNormalizzato) return false;

                        // Controlla tutte le possibili fonti della data nell'oggetto esistente
                        const chiaveEsistenteDataFormattata = estraiChiaveCanonico(s.dataFormattata);
                        const chiaveEsistenteData = estraiChiaveCanonico(s.data);
                        const chiaveEsistenteISO = estraiChiaveCanonico(s.dataOraISO);

                        // Match se la data/ora coincide con UNA QUALSIASI delle rappresentazioni salvate
                        const matchDataOra = (chiaveImportata === chiaveEsistenteDataFormattata) || 
                                             (chiaveImportata === chiaveEsistenteData) || 
                                             (chiaveImportata === chiaveEsistenteISO);

                        return matchDataOra;
                    });

                    if (!giaEsistente) {
                        const { dataISO, meseAnnoStr } = estraiDettagliData(testoData);

                        const nuovoShow = {
                            id: Date.now() + Math.floor(Math.random() * 1000),
                            dataOraISO: dataISO,
                            dataFormattata: testoData,
                            meseAnno: meseAnnoStr,
                            nome: testoNome,
                            isRegalo: false,
                            piattaforma: 'Teams',
                            punteggio: 'TBD',
                            costo: costoNum,
                            immagine: mappaImmaginiModelle[nomeNormalizzato] || '',
                            urlProfilo: mappaUrlModelle[nomeNormalizzato] || `https://${nomeNormalizzato.replace(/[^a-z0-9]/g, '')}.mondocamgirls.com`,
                            recensione: false,
                            note: '',
                            isAutoImport: true
                        };

                        const modellaMemory = elencoModelleUniche.find(m => m.nome.toLowerCase() === nomeNormalizzato);
                        if (modellaMemory && modellaMemory.nickname) {
                            nuovoShow.nickname = modellaMemory.nickname;
                        }

                        showsEsistenti.push(nuovoShow);
                        nuoviShowImportati++;
                    } else {
                        console.log(`[DUPLICATO BLOCATO] Modella: ${nomeNormalizzato} - Data: ${chiaveImportata}`);
                    }
                }
            }
        });

        if (nuoviShowImportati > 0) {
            await window.electronAPI.saveData(showsEsistenti);
            logger.success(`Sincronizzazione completata: ${nuoviShowImportati} nuovi show trovati e salvati.`);
            alert(`✅ Sincronizzazione completata con successo!\n\nNuovi show importati: ${nuoviShowImportati}`);
            aggiornaInterfaccia();
        } else {
            logger.info("Sincronizzazione completata: nessun nuovo show da importare.");
            alert("ℹ️ Tutti gli show presenti nella pagina risultano già salvati.");
        }

    } catch (err) {
        logger.error("Errore durante la sincronizzazione MondoCamGirls", err);
        alert("❌ Errore durante l'elaborazione dei dati della sincronizzazione.");
    }
}

/* ==========================================================================
   CHANGELOG E MODALE NOVITÀ
   ========================================================================== */
function inizializzaListenerChangelogMenu() {
    if (window.electronAPI && window.electronAPI.onOpenChangelog) {
        window.electronAPI.onOpenChangelog(() => {
            apriModalChangelog();
        });
    }
}

async function apriModalChangelog() {
    const modal = document.getElementById('changelogModal');
    const content = document.getElementById('changelogContent');

    if (!modal) {
        logger.warn("Elemento 'changelogModal' non trovato nel DOM.");
        return;
    }

    modal.style.display = 'block';
    modal.style.zIndex = '3000';
    logger.info("Modale Changelog aperto.");

    if (!content) return;

    try {
        if (window.electronAPI && window.electronAPI.getChangelog) {
            const changelogText = await window.electronAPI.getChangelog();
            if (changelogText) {
                content.innerHTML = changelogText;
                return;
            }
        }
    } catch (err) {
        logger.error("Errore nel recupero del Changelog via IPC", err);
    }

    if (content.innerHTML.includes('Caricamento') || content.innerHTML.trim() === '') {
        content.innerHTML = `
            <div style="font-family: inherit; line-height: 1.5; color: var(--text-main, #333);">
                <h3 style="margin-top: 0; color: var(--accent-color, #2a9d8f);">Novità della versione attuale</h3>
                <ul style="padding-left: 20px; margin-bottom: 10px;">
                    <li><strong>Integrazione Changelog:</strong> Corretto il sistema di apertura modale dal menu Electron e via Web.</li>
                    <li><strong>Gestione Budget:</strong> Migliorato il tracciamento delle spese e le barre di avanzamento mensili.</li>
                    <li><strong>Statistiche Mesi:</strong> Ottimizzata la visualizzazione degli show filtrati e il selettore anno.</li>
                    <li><strong>Stabilità generale:</strong> Piccole correzioni sull'importazione automatica dei dati.</li>
                </ul>
            </div>
        `;
    }
}

function chiudiModalChangelog() {
    const modal = document.getElementById('changelogModal');
    if (modal) {
        modal.style.display = 'none';
    }
}