import { logger } from './logger.js';
import { caricaStatisticheMensili, aggiornaIndicatoreBudgetHomepage } from './statistiche.js';
import { stato } from './stato.js';

/* ==========================================================================
   SCHEDE, PREFERENZE UTENTE E VERSIONE
   ========================================================================== */
// bottone: il pulsante della scheda cliccato, da evidenziare come attivo
export function apriTab(tabId, bottone) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    const tabTarget = document.getElementById(tabId);
    if (tabTarget) tabTarget.classList.add('active');
    if (bottone) bottone.classList.add('active');
    
    logger.info(`Cambiato scheda attiva: ${tabId}`);
}

/* ==========================================================================
   GESTIONE BUDGET E FONT
   ========================================================================== */
export function inizializzaGestioneBudget() {
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
            caricaStatisticheMensili(stato.tuttiGliShow);
            aggiornaIndicatoreBudgetHomepage(stato.tuttiGliShow);
        });
    }
}

/* ==========================================================================
   NOTE PER INTERO
   ==========================================================================
   Con l'opzione attiva la classe "note-complete" sul body (style.css) mostra
   note e tag completi in tutte le tabelle degli show, senza cliccare. */
const CHIAVE_NOTE_COMPLETE = 'noteComplete';

function applicaNoteComplete(attiva) {
    document.body.classList.toggle('note-complete', attiva);
    const casella = document.getElementById('opzNoteComplete');
    if (casella) casella.checked = attiva;
}

export function inizializzaNoteComplete() {
    let attiva = false;
    try {
        attiva = localStorage.getItem(CHIAVE_NOTE_COMPLETE) === '1';
    } catch { /* localStorage non disponibile: note troncate */ }
    applicaNoteComplete(attiva);
}

export function cambiaNoteComplete(casella) {
    try {
        localStorage.setItem(CHIAVE_NOTE_COMPLETE, casella.checked ? '1' : '0');
    } catch { /* preferenza valida solo per questa sessione */ }
    applicaNoteComplete(casella.checked);
    logger.info(`Note per intero ${casella.checked ? 'attivate' : 'disattivate'}`);
}

export function inizializzaFont() {
    const fontSalvato = localStorage.getItem('appFontSize');
    if (fontSalvato) {
        stato.currentFontSize = parseInt(fontSalvato, 10);
    }
    aggiornaDimensioneFont();
}

export function aumentaFont() {
    if (stato.currentFontSize < 26) {
        stato.currentFontSize += 1;
        logger.info(`Font aumentato a: ${stato.currentFontSize}px`);
        aggiornaDimensioneFont();
    }
}

export function riduciFont() {
    if (stato.currentFontSize > 12) {
        stato.currentFontSize -= 1;
        logger.info(`Font ridotto a: ${stato.currentFontSize}px`);
        aggiornaDimensioneFont();
    }
}

export function aggiornaDimensioneFont() {
    document.documentElement.style.setProperty('font-size', `${stato.currentFontSize}px`, 'important');
    localStorage.setItem('appFontSize', stato.currentFontSize);
    
    const badge = document.getElementById('fontBadge');
    if (badge) {
        badge.textContent = `${stato.currentFontSize}px`;
    }
}

/* ==========================================================================
   GESTIONE TEMA E VERSIONE
   ========================================================================== */
export function inizializzaTema() {
    const temaSalvato = localStorage.getItem('theme') || 'grey';
    const selectTema = document.getElementById('selectTema');
    
    if (selectTema) {
        selectTema.value = temaSalvato;
    }
    applicatema(temaSalvato);
}

export function cambiaTema(nomeTema) {
    localStorage.setItem('theme', nomeTema);
    logger.info(`Tema cambiato in: ${nomeTema}`);
    applicatema(nomeTema);
}

export function applicatema(nomeTema) {
    document.body.classList.remove('theme-grey', 'theme-dark', 'theme-mcg');
    // "light" è il tema di base (:root), gli altri aggiungono una classe al body
    if (['grey', 'dark', 'mcg'].includes(nomeTema)) document.body.classList.add(`theme-${nomeTema}`);
}

export async function mostraVersioneApp() {
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
