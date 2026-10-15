/* ==========================================================================
   SISTEMA DI LOGGING
   ==========================================================================
   Ogni messaggio va alla console e al processo principale (main/log.js), che lo
   scrive in app.log se il suo livello rientra in quello scelto nelle impostazioni.
   Nei messaggi non vanno nomi di modelle, tag o file dell'utente: il log non è
   protetto dal PIN. */

// Gli Error non si serializzano con JSON.stringify (darebbe "{}"): si scrivono messaggio e stack
export function descriviDettagli(dettagli) {
    if (dettagli === null || dettagli === undefined || dettagli === '') return '';
    if (dettagli instanceof Error) return dettagli.stack || `${dettagli.name}: ${dettagli.message}`;
    if (typeof dettagli === 'string') return dettagli;
    try {
        return JSON.stringify(dettagli);
    } catch {
        return String(dettagli);
    }
}

export const logger = {
    write(level, message, details = null) {
        const testoDettagli = descriviDettagli(details);

        if (level === 'ERROR') {
            console.error(`[${level}] ${message}`, details || '');
        } else if (level === 'WARN') {
            console.warn(`[${level}] ${message}`, details || '');
        } else {
            console.log(`[${level}] ${message}`, details || '');
        }

        // Il processo principale aggiunge l'ora e decide se scrivere su file
        if (window.electronAPI && window.electronAPI.appendLog) {
            window.electronAPI.appendLog({ level, message, details: testoDettagli }).catch(() => {});
        }
    },

    info(msg, details) { this.write('INFO', msg, details); },
    success(msg, details) { this.write('SUCCESS', msg, details); },
    warn(msg, details) { this.write('WARN', msg, details); },
    error(msg, details) { this.write('ERROR', msg, details); }
};

// Errori e promise rifiutate che nessun try/catch ha intercettato
export function registraErroriGlobali() {
    window.addEventListener('error', (e) => {
        // Le immagini che non si caricano sono gestite da data-sostituto (azioni.js)
        if (e.target && e.target !== window) return;
        logger.error('Errore JavaScript non gestito', e.error || `${e.message} (${e.filename}:${e.lineno})`);
    });
    window.addEventListener('unhandledrejection', (e) => {
        logger.error('Promise rifiutata e non gestita', e.reason);
    });
}
