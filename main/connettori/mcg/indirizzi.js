// Indirizzi e pagine dei profili di Mondo Cam Girls: funzioni pure, senza
// accesso alla rete (verificate da tests/main.test.js).

const DOMINIO_MCG = 'mondocamgirls.com';

// Accetta solo URL https/http su mondocamgirls.com o suoi sottodomini
function urlMcgValido(targetUrl) {
    try {
        const u = new URL(targetUrl);
        const host = u.hostname.toLowerCase();
        return ['http:', 'https:'].includes(u.protocol) &&
            (host === DOMINIO_MCG || host.endsWith(`.${DOMINIO_MCG}`));
    } catch {
        return false;
    }
}

// Sottodominio del profilo MCG ("https://anna.mondocamgirls.com/it" -> "anna")
function slugProfiloMcg(url) {
    const m = /^https?:\/\/([a-z0-9_-]+)\.mondocamgirls\.com/i.exec(String(url || ''));
    return m && m[1].toLowerCase() !== 'www' ? m[1].toLowerCase() : null;
}

// Profilo sospeso su MCG: la pagina mostra un avviso come
//   <p class="mp-badge mp-badge--warn">WARNING! PROFILE TEMPORARYLY SUSPENDED!! ...</p>
// (in italiano "sospeso"). Restituisce true/false, oppure null se la pagina
// non sembra un profilo (scaricamento fallito o struttura cambiata).
function profiloSospeso(html) {
    if (!html) return null;
    const avvisi = [...html.matchAll(/class="[^"]*\bmp-badge--warn\b[^"]*"[^>]*>([^<]*)</gi)].map(m => m[1]);
    if (avvisi.some(testo => /suspend|sospes/i.test(testo))) return true;
    return /class="[^"]*\bmp-top__/.test(html) ? false : null;
}

// Credito dell'area clienti (https://www.mondocamgirls.com/it/areacliente.html), che
// mostra "Credito disponibile: 16.51 €". Restituisce il numero in euro, oppure null
// se la pagina non lo contiene (login non fatto o struttura cambiata).
function creditoDisponibile(html) {
    const testo = String(html || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&euro;/g, '€');
    const m = /credito\s+disponibile\s*:?\s*(?:€\s*)?(-?[\d.,]+)/i.exec(testo);
    if (!m) return null;
    // "1.234,56" all'italiana oppure "16.51" con il punto decimale (come nelle transazioni)
    const numero = m[1].includes(',') ? m[1].replace(/\./g, '').replace(',', '.') : m[1];
    const valore = parseFloat(numero);
    return Number.isFinite(valore) ? valore : null;
}

// La pagina chiede di accedere (modulo con la password)
const richiedeLogin = (html) => /<input[^>]+type\s*=\s*["']?password/i.test(String(html || ''));

module.exports = { DOMINIO_MCG, urlMcgValido, slugProfiloMcg, profiloSospeso, creditoDisponibile, richiedeLogin };
