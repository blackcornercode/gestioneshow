/* ==========================================================================
   SCHEDE, PREFERENZE UTENTE E VERSIONE
   ========================================================================== */
function apriTab(tabId, event) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const tabTarget = document.getElementById(tabId);
    if (tabTarget) tabTarget.classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    
    logger.info(`Cambiato scheda attiva: ${tabId}`);
}

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
            
            // --- AGGIORNAMENTO ISTANTANEO DEGLI INDICATORI E STATISTICHE ---
            caricaStatisticheMensili(tuttiGliShow);
            aggiornaIndicatoreBudgetHomepage(tuttiGliShow);
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
