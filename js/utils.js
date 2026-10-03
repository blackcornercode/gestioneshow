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
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Converte un valore in un argomento JavaScript sicuro da inserire in un
// attributo onclick="...". escapeHtml da solo NON basta: il browser decodifica
// &#039; in ' prima di eseguire il codice, quindi un nome come "D'Angelo"
// spezzava la stringa (e un nome costruito ad arte poteva eseguire codice).
function argJs(valore) {
    return escapeHtml(JSON.stringify(valore === null || valore === undefined ? '' : String(valore)));
}

// ID univoco anche quando se ne creano molti nello stesso millisecondo
// (la sincronizzazione usava Date.now() + random(1000): con decine di righe
// importate insieme due show potevano ricevere lo stesso ID, e "Elimina"
// cancellava entrambi)
let ultimoIdGenerato = 0;
function generaIdUnico() {
    ultimoIdGenerato = Math.max(Date.now(), ultimoIdGenerato + 1);
    return ultimoIdGenerato;
}

// Converte un testo italiano "GG/MM/AA[AA] [HH:MM]" in Date (ora locale).
// new Date("11/09/2026") lo leggerebbe come 9 novembre (formato USA mm/gg).
function parseDataItaliana(testo) {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[\s,]+(\d{1,2}):(\d{2}))?/.exec(String(testo || '').trim());
    if (!m) return null;
    let anno = parseInt(m[3], 10);
    if (anno < 100) anno += 2000;
    const d = new Date(anno, parseInt(m[2], 10) - 1, parseInt(m[1], 10),
        parseInt(m[4] || '0', 10), parseInt(m[5] || '0', 10));
    return isNaN(d) ? null : d;
}

// Data di uno show come Date, o null se assente/illeggibile. I record vecchi
// hanno solo "data"/"dataFormattata" in formato italiano.
function dataDelloShow(show) {
    if (!show) return null;
    const iso = show.dataOraISO || show.dataOra;
    if (iso) {
        const d = new Date(iso);
        if (!isNaN(d)) return d;
    }
    return parseDataItaliana(show.data) || parseDataItaliana(show.dataFormattata);
}

function annoDelloShow(show) {
    const d = dataDelloShow(show);
    return d ? d.getFullYear() : null;
}

// Timestamp per ordinare gli show; in mancanza di data si usa l'ID (creato da Date.now())
function timestampShow(show) {
    const d = dataDelloShow(show);
    return d ? d.getTime() : (Number(show.id) || 0);
}

// URL MCG dedotto dal nome quando non ne è stato salvato uno: "Giulìa Rossi" -> giuliarossi.mondocamgirls.com.
// Il minuscolo va fatto prima del filtro, altrimenti le maiuscole venivano scartate ("Giulia" -> "iulia").
function urlProfiloPredefinito(nome) {
    const sottodominio = String(nome || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');
    return `https://${sottodominio}.mondocamgirls.com`;
}

// Salva l'archivio e, se il processo principale segnala un errore, lo mostra
// invece di proseguire come se il salvataggio fosse riuscito
async function salvaOAvvisa(shows) {
    const esito = await window.electronAPI.saveData(shows);
    if (!esito || !esito.success) {
        const msg = (esito && esito.error) || 'errore sconosciuto';
        alert(`❌ Salvataggio non riuscito: ${msg}`);
        throw new Error(msg);
    }
    return esito;
}

// Importo in euro sempre a 2 decimali, anche se nel JSON il costo è una stringa
function formattaEuro(valore) {
    const n = parseFloat(valore);
    return `€ ${(isNaN(n) ? 0 : n).toFixed(2)}`;
}

function minutiDelloShow(show) {
    return parseInt(show.durata || show.tempoShow, 10) || 0;
}

// Costo al minuto di un singolo show; null se manca la durata (show registrati
// prima della 1.11.0) o se è un regalo, che non rappresenta un costo reale
function costoAlMinuto(show) {
    const minuti = minutiDelloShow(show);
    if (minuti <= 0 || show.isRegalo) return null;
    return (parseFloat(show.costo) || 0) / minuti;
}

// Media ponderata per un gruppo di show: spesa / minuti dei soli show con durata.
// Dividere la spesa totale per la durata totale gonfierebbe il risultato,
// perché conterebbe la spesa degli show senza durata ma non i loro minuti.
function costoMedioAlMinuto(shows) {
    let spesa = 0;
    let minuti = 0;
    shows.forEach(s => {
        if (costoAlMinuto(s) === null) return;
        spesa += parseFloat(s.costo) || 0;
        minuti += minutiDelloShow(s);
    });
    return minuti > 0 ? spesa / minuti : null;
}

// Cella delle note troncata con "…" e testo completo nel tooltip. Il limite di
// larghezza sta su un div interno: sulle celle di tabella max-width non è affidabile.
function cellaNote(note) {
    const testo = escapeHtml(note);
    if (!testo) return '<td class="col-note"></td>';
    // Clic (o Invio/Spazio da tastiera) mostra la nota completa, un secondo clic la richiude
    return `<td class="col-note espandibile" title="${testo}" tabindex="0" aria-expanded="false"
        onclick="espandiNota(event, this)" onkeydown="if (event.key === 'Enter' || event.key === ' ') espandiNota(event, this)"><div class="testo-note">${testo}</div></td>`;
}

function espandiNota(event, cella) {
    event.preventDefault();
    // Non deve attivare il clic sulla riga (es. apertura della scheda modella)
    event.stopPropagation();
    const espansa = cella.classList.toggle('espansa');
    cella.setAttribute('aria-expanded', String(espansa));
}

const DATO_MANCANTE = '<span class="dato-mancante">–</span>';

// €/min colorato rispetto alla media personale: verde se più basso, rosso se più alto.
// Entro ±10% dalla media resta neutro, per non colorare differenze irrilevanti.
function formattaCostoAlMinuto(valore, riferimento = costoMinutoRiferimento) {
    if (valore === null) return DATO_MANCANTE;
    const testo = `€ ${valore.toFixed(2)}`;
    if (!riferimento) return testo;
    let classe = '';
    if (valore < riferimento * 0.9) classe = 'costo-min-conveniente';
    else if (valore > riferimento * 1.1) classe = 'costo-min-caro';
    const titolo = t('table.cost_per_minute_compare').replace('{media}', `€ ${riferimento.toFixed(2)}`);
    return `<span class="${classe}" title="${escapeHtml(titolo)}">${testo}</span>`;
}

// Voto del singolo show come badge colorato (5 verde … 1-2 rosso)
function formattaVoto(show) {
    if (show.isRegalo) return DATO_MANCANTE;
    const voto = parseInt(show.punteggio, 10);
    if (show.punteggio === 'TBD' || !voto) return '<span class="badge-tbd">TBD</span>';
    const classe = voto >= 5 ? 'voto-5' : voto === 4 ? 'voto-4' : voto === 3 ? 'voto-3' : 'voto-basso';
    return `<span class="badge-voto ${classe}">${voto} / 5</span>`;
}

// Durata: "–" in grigio quando non è registrata (prima compariva "0m" in grassetto)
function formattaDurata(minuti) {
    const m = parseInt(minuti, 10) || 0;
    return m > 0 ? formattaTempo(m) : DATO_MANCANTE;
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

// --- FUNZIONE UTILITY PER FORMATTARE IL TEMPO (Minuti -> Ore e Minuti) ---
function formattaTempo(minuti) {
    if (!minuti || isNaN(minuti) || minuti <= 0) return `0${t('units.min')}`;
    const ore = Math.floor(minuti / 60);
    const mins = minuti % 60;
    if (ore > 0) {
        return `${ore}${t('units.hour')} ${mins > 0 ? mins + t('units.min') : ''}`;
    }
    return `${mins}${t('units.min')}`;
}
