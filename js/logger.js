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
            else row.style.color = 'var(--text-color, #333)';

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
