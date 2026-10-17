import { t } from './i18n.js';
import { logger } from './logger.js';
import { stato } from './stato.js';
import { SITO_MCG } from './siti.js';

/* ==========================================================================
   UTILITIES ED HELPER
   ========================================================================== */
// Link che apre direttamente la chat con la modella, o null se la piattaforma non lo
// permette. Teams apre una chat solo con l'email dell'account (non con lo username:
// per quello c'è copiaEApriTeams); Skype è stato chiuso, Zoom non ha link alle chat.
export function generaLinkChat(piattaforma, nickname) {
    if (!nickname) return null;
    const nick = nickname.trim().replace(/^@/, '');

    switch (piattaforma) {
        case 'Telegram':
            return `https://t.me/${nick}`;
        case 'Teams':
            return eEmailTeams(nick) ? `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(nick)}` : null;
        default:
            return null;
    }
}

const eEmailTeams = (nick) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nick);

// Nickname di Teams che non è un'email: il clic non può aprire la chat, solo
// copiare il nome e aprire Teams (form-assistito.js suggerisce di usare l'email)
export function eUsernameTeams(piattaforma, nickname) {
    const nick = String(nickname || '').trim();
    return piattaforma === 'Teams' && Boolean(nick) && !eEmailTeams(nick.replace(/^@/, ''));
}

// Copia lo username negli appunti e apre Teams sulla nuova chat, dove va cercato
export async function copiaEApriTeams(nickname) {
    const nick = String(nickname || '').trim().replace(/^@/, '');
    if (!nick) return;
    let copiato = true;
    try {
        await navigator.clipboard.writeText(nick);
    } catch (err) {
        copiato = false;
        logger.warn('Nickname non copiato negli appunti', err?.message);
    }
    apriLinkEsterno('https://teams.microsoft.com/l/chat/0/0');
    alert(t(copiato ? 'chat.teams_copied' : 'chat.teams_not_copied').replace('{nick}', nick));
}

export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// ID univoco anche quando se ne creano molti nello stesso millisecondo
// (la sincronizzazione usava Date.now() + random(1000): con decine di righe
// importate insieme due show potevano ricevere lo stesso ID, e "Elimina"
// cancellava entrambi)
export function generaIdUnico() {
    stato.ultimoIdGenerato = Math.max(Date.now(), stato.ultimoIdGenerato + 1);
    return stato.ultimoIdGenerato;
}

// Converte un testo italiano "GG/MM/AA[AA] [HH:MM]" in Date (ora locale).
// new Date("11/09/2026") lo leggerebbe come 9 novembre (formato USA mm/gg).
export function parseDataItaliana(testo) {
    const m = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[\s,]+(\d{1,2}):(\d{2}))?/.exec(String(testo || '').trim());
    if (!m) return null;
    let anno = parseInt(m[3], 10);
    if (anno < 100) anno += 2000;
    const d = new Date(anno, parseInt(m[2], 10) - 1, parseInt(m[1], 10),
        parseInt(m[4] || '0', 10), parseInt(m[5] || '0', 10));
    return isNaN(d) ? null : d;
}

// Parametri facoltativi dello show (non dei regali): qualità di video e audio e
// inquadratura della camera. Negli show: campi "qualita" e "camera", null se non indicati.
export const QUALITA_SHOW = ['alta', 'media', 'bassa'];
export const CAMERE_SHOW = ['orizzontale', 'verticale'];

// Porta uno show salvato da una versione precedente al formato attuale.
// Va applicata a ogni record letto dall'archivio (vedi leggiArchivio in dati.js),
// così il resto del codice usa solo i campi correnti:
//   tempoShow -> durata        url -> urlProfilo        voto -> punteggio
//   dataOra / data -> dataOraISO (e data -> dataFormattata per la visualizzazione)
// Restituisce una copia: l'oggetto originale non viene modificato.
export function normalizzaShow(originale) {
    const s = { ...originale };

    if ((s.durata === undefined || s.durata === null || s.durata === '') && s.tempoShow !== undefined) s.durata = s.tempoShow;
    if (s.durata !== undefined) s.durata = parseInt(s.durata, 10) || 0;
    delete s.tempoShow;

    if (!s.urlProfilo && s.url) s.urlProfilo = s.url;
    delete s.url;

    if ((s.punteggio === undefined || s.punteggio === null || s.punteggio === '') && s.voto !== undefined && !s.isRegalo) s.punteggio = s.voto;
    delete s.voto;

    if (!s.dataOraISO || isNaN(new Date(s.dataOraISO))) {
        const daIso = s.dataOra && !isNaN(new Date(s.dataOra)) ? new Date(s.dataOra) : null;
        const d = daIso || parseDataItaliana(s.data) || parseDataItaliana(s.dataFormattata);
        if (d) s.dataOraISO = d.toISOString();
    }
    if (!s.dataFormattata && s.data) s.dataFormattata = s.data;
    delete s.dataOra;
    delete s.data;

    if (typeof s.costo !== 'number') s.costo = parseFloat(s.costo) || 0;

    // Sito di provenienza (roadmap multi-sito, fase 1): gli show salvati prima
    // vengono tutti da Mondo Cam Girls. "isAutoImport" diventa "importatoDa",
    // l'ID del sito da cui lo show è stato importato (null se inserito a mano).
    if (!s.sito) s.sito = SITO_MCG;
    if (s.importatoDa === undefined) s.importatoDa = s.isAutoImport ? SITO_MCG : null;
    delete s.isAutoImport;

    // Qualità e inquadratura: valori sconosciuti (es. file modificati a mano) ignorati
    if (s.qualita !== undefined && !QUALITA_SHOW.includes(s.qualita)) s.qualita = null;
    if (s.camera !== undefined && !CAMERE_SHOW.includes(s.camera)) s.camera = null;

    // Testo della recensione scritta a mano (facoltativo, resta anche con l'interruttore spento)
    s.testoRecensione = typeof s.testoRecensione === 'string' ? s.testoRecensione : '';
    return s;
}

// Data di uno show come Date, o null se assente/illeggibile.
// I record passano da normalizzaShow, quindi dataOraISO è il campo di riferimento.
export function dataDelloShow(show) {
    if (!show) return null;
    if (show.dataOraISO) {
        const d = new Date(show.dataOraISO);
        if (!isNaN(d)) return d;
    }
    return parseDataItaliana(show.dataFormattata);
}

export function annoDelloShow(show) {
    const d = dataDelloShow(show);
    return d ? d.getFullYear() : null;
}

// Timestamp per ordinare gli show; in mancanza di data si usa l'ID (creato da Date.now())
export function timestampShow(show) {
    const d = dataDelloShow(show);
    return d ? d.getTime() : (Number(show.id) || 0);
}

// Salva l'archivio e, se il processo principale segnala un errore, lo mostra
// invece di proseguire come se il salvataggio fosse riuscito
export async function salvaOAvvisa(shows) {
    const esito = await window.electronAPI.saveData(shows);
    if (!esito || !esito.success) {
        const msg = (esito && esito.error) || 'errore sconosciuto';
        alert(`❌ Salvataggio non riuscito: ${msg}`);
        throw new Error(msg);
    }
    return esito;
}

// Importo in euro sempre a 2 decimali, anche se nel JSON il costo è una stringa
export function formattaEuro(valore) {
    const n = parseFloat(valore);
    return `€ ${(isNaN(n) ? 0 : n).toFixed(2)}`;
}

// Cella del costo: attenuata per regali e show rimborsati; per questi ultimi il
// tooltip riporta l'importo pagato prima del rimborso
export function cellaCosto(show) {
    if (show.rimborsato) {
        const titolo = `Rimborsato: pagato ${formattaEuro(show.costoOriginale)}`;
        return `<td class="col-nowrap testo-attenuato" title="${escapeHtml(titolo)}">${formattaEuro(show.costo)} ↩</td>`;
    }
    // Pagato in un'altra valuta (token, dollari...): l'importo originale nel tooltip
    const originale = show.importoOriginale ? ` title="${escapeHtml(`${show.importoOriginale.valore} ${show.importoOriginale.valuta}`)}"` : '';
    return `<td class="col-nowrap${show.isRegalo ? ' testo-attenuato' : ''}"${originale}>${formattaEuro(show.costo)}${show.importoOriginale ? ' <span class="segno-valuta">¤</span>' : ''}</td>`;
}

export function minutiDelloShow(show) {
    return parseInt(show.durata, 10) || 0;
}

// Costo al minuto di un singolo show; null se manca la durata (show registrati
// prima della 1.11.0), se è un regalo o se è stato rimborsato
export function costoAlMinuto(show) {
    const minuti = minutiDelloShow(show);
    if (minuti <= 0 || show.isRegalo || show.rimborsato) return null;
    return (parseFloat(show.costo) || 0) / minuti;
}

// Media ponderata per un gruppo di show: spesa / minuti dei soli show con durata.
// Dividere la spesa totale per la durata totale gonfierebbe il risultato,
// perché conterebbe la spesa degli show senza durata ma non i loro minuti.
export function costoMedioAlMinuto(shows) {
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
export function cellaNote(note) {
    const testo = escapeHtml(note);
    if (!testo) return '<td class="col-note"></td>';
    // Clic (o Invio/Spazio da tastiera) mostra la nota completa, un secondo clic la richiude
    return `<td class="col-note espandibile" title="${testo}" tabindex="0" aria-expanded="false"
        data-azione="espandi-nota" data-tastiera><div class="testo-note">${testo}</div></td>`;
}

export function espandiNota(cella) {
    const espansa = cella.classList.toggle('espansa');
    cella.setAttribute('aria-expanded', String(espansa));
}

export const DATO_MANCANTE = '<span class="dato-mancante">–</span>';

// €/min colorato rispetto alla media personale: verde se più basso, rosso se più alto.
// Entro ±10% dalla media resta neutro, per non colorare differenze irrilevanti.
export function formattaCostoAlMinuto(valore, riferimento = stato.costoMinutoRiferimento) {
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
export function formattaVoto(show) {
    if (show.isRegalo) return DATO_MANCANTE;
    const voto = parseInt(show.punteggio, 10);
    if (show.punteggio === 'TBD' || !voto) return '<span class="badge-tbd">TBD</span>';
    const classe = voto >= 5 ? 'voto-5' : voto === 4 ? 'voto-4' : voto === 3 ? 'voto-3' : 'voto-basso';
    return `<span class="badge-voto ${classe}">${voto} / 5</span>`;
}

// Durata: "–" in grigio quando non è registrata (prima compariva "0m" in grassetto)
export function formattaDurata(minuti) {
    const m = parseInt(minuti, 10) || 0;
    return m > 0 ? formattaTempo(m) : DATO_MANCANTE;
}

// Apre un link nel browser di sistema (o in Teams/Telegram). Il preventDefault del
// clic su href="#" lo fa l'azione "apri-link" registrata in app.js.
export function apriLinkEsterno(url) {
    if (!url) return;
    if (window.electronAPI && window.electronAPI.openExternal) {
        window.electronAPI.openExternal(url);
    } else {
        window.open(url, '_blank');
    }
}

// --- FUNZIONE UTILITY PER FORMATTARE IL TEMPO (Minuti -> Ore e Minuti) ---
export function formattaTempo(minuti) {
    if (!minuti || isNaN(minuti) || minuti <= 0) return `0${t('units.min')}`;
    const ore = Math.floor(minuti / 60);
    const mins = minuti % 60;
    if (ore > 0) {
        return `${ore}${t('units.hour')} ${mins > 0 ? mins + t('units.min') : ''}`;
    }
    return `${mins}${t('units.min')}`;
}
