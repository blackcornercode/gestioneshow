// Accesso alla rete del processo principale, comune a tutti i connettori
// (main/connettori/): download di pagine e verifica di raggiungibilità, con timeout.
const { net } = require('electron');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Scarica una pagina e ne restituisce il testo, o '' in caso di errore,
// risposta non 2xx o timeout
// conCookie: invia i cookie della sessione dell'app, cioè il login fatto nella
// finestra di sincronizzazione (pagine riservate come l'area clienti)
function downloadHtmlPage(targetUrl, timeoutMs = 15000, { conCookie = false } = {}) {
    return new Promise((resolve) => {
        let concluso = false;
        const fine = (valore) => {
            if (concluso) return;
            concluso = true;
            clearTimeout(timer);
            resolve(valore);
        };

        const request = net.request({
            method: 'GET',
            url: targetUrl,
            useSessionCookies: conCookie,
            headers: {
                'User-Agent': USER_AGENT,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        // Senza timeout una pagina che non risponde bloccava la galleria per sempre
        const timer = setTimeout(() => {
            request.abort();
            fine('');
        }, timeoutMs);

        request.on('response', (response) => {
            if (response.statusCode < 200 || response.statusCode >= 300) {
                response.on('data', () => {});
                response.on('end', () => fine(''));
                return;
            }
            // I chunk vanno uniti come Buffer prima della decodifica: convertirli
            // uno per uno spezza i caratteri accentati a cavallo di due chunk
            const chunks = [];
            response.on('data', (chunk) => chunks.push(chunk));
            response.on('end', () => fine(Buffer.concat(chunks).toString('utf8')));
            response.on('error', () => fine(''));
        });
        request.on('error', () => fine(''));
        request.end();
    });
}

// Il sito risponde? Richiesta HEAD: { online, status } oppure { online: false, error }.
// Il timeout è gestito a mano: net.request di Electron non ha un'opzione "timeout".
function ping(targetUrl, timeoutMs = 5000) {
    return new Promise((resolve) => {
        let concluso = false;
        const fine = (esito) => {
            if (concluso) return;
            concluso = true;
            clearTimeout(timer);
            resolve(esito);
        };

        const request = net.request({ method: 'HEAD', url: targetUrl });
        const timer = setTimeout(() => {
            request.abort();
            fine({ online: false, error: 'timeout' });
        }, timeoutMs);

        request.on('response', (response) => {
            const status = response.statusCode;
            response.on('data', () => {});
            fine({ online: status >= 200 && status < 400, status });
        });
        request.on('error', (error) => fine({ online: false, error: error.message }));
        request.end();
    });
}

module.exports = { downloadHtmlPage, ping, USER_AGENT };
