import { chiaveModella } from './calcoli.js';
import { t, formattaData } from './i18n.js';
import { badgeSitoShow } from './gestione-siti.js';
import { stato, iconePiattaformaHTML } from './stato.js';
import { pallinoOnline } from './stato-online.js';
import { tagDelloShow, etichettaTag } from './tag.js';
import { generaLinkChat, eUsernameTeams, escapeHtml, cellaCosto, costoAlMinuto, cellaNote, formattaCostoAlMinuto, formattaVoto, formattaDurata, DATO_MANCANTE } from './utils.js';

/* ==========================================================================
   RIGHE DEGLI SHOW (disegnatore unico)
   ==========================================================================
   Ogni colonna è definita una volta sola (intestazione + cella). Cronologia,
   dettaglio del mese e scheda modella sono elenchi di colonne: per aggiungere
   o cambiare una colonna basta intervenire qui. */

// Piattaforma con icona e, sotto, il nickname (link alla chat se disponibile).
// Usata anche dalla classifica.
export function getPiattaformaFormatted(show) {
    if (show.isRegalo) {
        return `<span class="badge-regalo">${escapeHtml(t('form.gift'))}</span>`;
    }

    const nomePiattaforma = show.piattaforma || 'Teams';
    const iconaHtml = iconePiattaformaHTML[nomePiattaforma] || `<i class="fa-solid fa-globe"></i> ${escapeHtml(nomePiattaforma)}`;

    if (show.nickname) {
        // I nickname sono spesso email lunghe: troncati con "…", completi nel tooltip
        const nick = escapeHtml(show.nickname);
        const urlChat = generaLinkChat(nomePiattaforma, show.nickname);
        // 💬 apre la chat; 📋 (username di Teams) copia il nome e apre Teams, dove va cercato
        const nickHtml = urlChat
            ? `<a href="#" class="link-web nick-troncato nick-chat" title="${escapeHtml(t('chat.open').replace('{nick}', show.nickname))}" data-azione="apri-link" data-url="${escapeHtml(urlChat)}">💬 ${nick}</a>`
            : eUsernameTeams(nomePiattaforma, show.nickname)
                ? `<a href="#" class="link-web nick-troncato nick-chat" title="${escapeHtml(t('chat.teams_copy_hint').replace('{nick}', show.nickname))}" data-azione="copia-apri-teams" data-nick="${nick}">📋 ${nick}</a>`
                : `<small class="nick-troncato" title="${nick}">${nick}</small>`;
        return `<div class="piattaforma-con-nick">
            <span>${iconaHtml}</span>
            ${nickHtml}
        </div>`;
    }

    return iconaHtml;
}

// Foto tonda della modella: il clic apre la sua scheda
export function cellaFoto(show) {
    const fotoUrl = show.immagine || stato.mappaImmaginiModelle[chiaveModella(show.nome)] || '';
    const testoSenzaFoto = escapeHtml(t('table.no_photo'));
    const titolo = escapeHtml(t('table.open_model'));
    const nome = escapeHtml(show.nome);
    if (!fotoUrl) return `<td><div class="no-img cliccabile" title="${titolo}" data-azione="apri-scheda-modella" data-nome="${nome}">${testoSenzaFoto}</div></td>`;
    // data-sostituto: se l'immagine non si carica viene sostituita dal riquadro "No Foto" (azioni.js)
    return `<td><img src="${escapeHtml(fotoUrl)}" class="thumb-img cliccabile" alt="foto" title="${titolo}"
        data-azione="apri-scheda-modella" data-nome="${nome}" data-sostituto="${testoSenzaFoto}"></td>`;
}

// Tag e note nella stessa colonna, per non allargare la tabella: in alto fino a
// TAG_VISIBILI etichette (poi "+N"), sotto la nota troncata. Il clic sulla cella
// (espandi-nota) mostra tutti i tag e la nota completa.
const TAG_VISIBILI = 3;
export function cellaTagNote(show) {
    const tags = tagDelloShow(show);
    if (tags.length === 0) return cellaNote(show.note);
    const nota = escapeHtml(show.note);
    const altri = tags.length - TAG_VISIBILI;
    const etichette = tags.map((tag, i) => etichettaTag(tag, i >= TAG_VISIBILI ? 'tag-extra' : '')).join('') +
        (altri > 0 ? `<span class="etichetta-tag tag-altri">+${altri}</span>` : '');
    const titolo = escapeHtml(tags.map(tag => tag.nome).join(', ')) + (nota ? ` — ${nota}` : '');
    const espandibile = nota || altri > 0;
    return `<td class="col-note${espandibile ? ' espandibile' : ''}" title="${titolo}"${espandibile ? ' tabindex="0" aria-expanded="false" data-azione="espandi-nota" data-tastiera' : ''}>
        <div class="tag-show">${etichette}</div>${nota ? `<div class="testo-note">${nota}</div>` : ''}</td>`;
}

// Data sopra e, sotto, l'ora (e, nella scheda modella, il badge del sito):
// più stretta di "gg/mm/aaaa hh:mm" su una riga.
// ⑤ Prima della data mostra il giorno della settimana abbreviato (Lun, Mar…)
function cellaData(show, conSito = false) {
    const [giorno, ora = ''] = String(show.dataFormattata || '').split(' ');
    const d = show.dataOraISO ? new Date(show.dataOraISO) : null;
    const dow = d && !isNaN(d) ? formattaData(d, { weekday: 'short' }) : '';
    return `<td class="col-data">${dow ? `<span class="data-dow">${escapeHtml(dow)}</span>` : ''}<span class="data-giorno">${escapeHtml(giorno)}</span><span class="data-ora">${escapeHtml(ora)}${conSito ? ` ${badgeSitoShow(show)}` : ''}</span></td>`;
}

// Cella del nome: il badge del sito (sigla e 🤖 se importato) sopra il nome
// e, se la modella è online, il pallino verde. Il nome è già HTML pronto (con eventuale link)
const cellaNome = (show, nomeHtml) => `<td class="col-nowrap col-nome">${badgeSitoShow(show)}${nomeHtml}${pallinoOnline(show.nome)}</td>`;

const selezionato = (show) => stato.selezioneCronologia.has(String(show.id));

// Qualità (etichetta colorata) e inquadratura (icona dello smartphone ruotato o dritto,
// come nel form) di uno show: colonna accanto al voto. Per i regali e se non sono
// indicate c'è il trattino dei dati mancanti
const ICONE_CAMERA = {
    orizzontale: '<i class="fa-solid fa-mobile-screen fa-rotate-90" aria-hidden="true"></i>',
    verticale: '<i class="fa-solid fa-mobile-screen" aria-hidden="true"></i>'
};
export function parametriShow(show) {
    if (show.isRegalo || (!show.qualita && !show.camera)) return DATO_MANCANTE;
    const parti = [];
    if (show.qualita) {
        const titolo = `${t('form.quality')}: ${t(`quality.${show.qualita}`)}`;
        parti.push(`<span class="badge-qualita qualita-${escapeHtml(show.qualita)}" title="${escapeHtml(titolo)}">${escapeHtml(t(`quality.${show.qualita}`))}</span>`);
    }
    if (show.camera) {
        const titolo = `${t('form.camera')}: ${t(`camera.${show.camera}`)}`;
        parti.push(`<span class="icona-camera" title="${escapeHtml(titolo)}" aria-label="${escapeHtml(titolo)}">${ICONE_CAMERA[show.camera] || ''}</span>`);
    }
    return `<div class="parametri-show">${parti.join('')}</div>`;
}

// ✅ semplice; con il testo scritto (e la recensione fatta) è un pulsante che lo apre (recensione.js)
function cellaRecensione(s) {
    if (!s.recensione) return '<td class="col-centro">❌</td>';
    if (!s.testoRecensione) return '<td class="col-centro">✅</td>';
    const titolo = escapeHtml(t('review.show'));
    return `<td class="col-centro"><button type="button" class="btn-recensione-testo" title="${titolo}" aria-label="${titolo}" data-azione="apri-recensione" data-id="${escapeHtml(s.id)}"><i class="fa-solid fa-comment-dots" aria-hidden="true"></i></button></td>`;
}

// chiave: [chiave della traduzione dell'intestazione, classe dell'intestazione, cella,
//          intestazione personalizzata (facoltativa, al posto del testo tradotto)]
export const COLONNE_SHOW = {
    // Casella della selezione multipla (selezione.js); nell'intestazione seleziona la pagina
    selezione:     ['table.select', 'col-selezione', s => `<td class="col-selezione"><input type="checkbox" class="casella-selezione"
                        aria-label="${escapeHtml(t('table.select'))}" data-al-cambio="seleziona-show" data-id="${escapeHtml(s.id)}"${selezionato(s) ? ' checked' : ''}></td>`,
                    () => `<input type="checkbox" id="selezionaPaginaCronologia" class="casella-selezione"
                        title="${escapeHtml(t('selection.select_page'))}" aria-label="${escapeHtml(t('selection.select_page'))}" data-al-cambio="seleziona-pagina">`],
    foto:          ['table.photo', '', cellaFoto],
    data:          ['table.date', '', s => cellaData(s)],
    // Senza colonna del nome (scheda modella) il badge del sito resta sotto l'ora
    dataSito:      ['table.date', '', s => cellaData(s, true)],
    nome:          ['table.name', '', s => cellaNome(s, `<strong>${escapeHtml(s.nome)}</strong>`)],
    nomeCliccabile:['table.name', '', s => cellaNome(s, `<strong class="cliccabile" data-azione="apri-scheda-modella" data-nome="${escapeHtml(s.nome)}">${escapeHtml(s.nome)}</strong>`)],
    piattaforma:   ['table.platform', '', s => `<td>${getPiattaformaFormatted(s)}</td>`],
    durata:        ['table.duration', 'col-centro', s => `<td class="col-nowrap col-centro col-grassetto">${formattaDurata(s.durata)}</td>`],
    costo:         ['table.cost', '', s => cellaCosto(s)],
    costoMinuto:   ['table.cost_per_minute', 'col-centro', s => `<td class="col-nowrap col-centro">${formattaCostoAlMinuto(costoAlMinuto(s))}</td>`],
    // Sotto il voto: qualità e inquadratura, se indicate
    voto:          ['table.rating', '', s => `<td class="col-nowrap">${formattaVoto(s)}</td>`],
    // Qualità e inquadratura: intestazione abbreviata (nome completo nel tooltip)
    parametri:     ['table.quality_camera', '', s => `<td class="col-nowrap">${parametriShow(s)}</td>`,
                    () => `<span title="${escapeHtml(t('table.quality_camera'))}">${escapeHtml(t('table.quality_camera_short'))}</span>`],
    // Intestazione abbreviata (nome completo nel tooltip): la colonna contiene solo ✅/❌
    recensione:    ['table.review', 'col-centro', cellaRecensione,
                    () => `<span title="${escapeHtml(t('table.review'))}">${escapeHtml(t('table.review_short'))}</span>`],
    // col-note: la colonna prende tutto lo spazio che avanza (style.css)
    note:          ['table.tags_notes', 'col-note', cellaTagNote],
    azioni:        ['table.actions', '', s => `<td class="col-azioni">
                        <button class="btn-edit" title="${escapeHtml(t('table.edit'))}" aria-label="${escapeHtml(t('table.edit'))}" data-azione="modifica-show" data-id="${escapeHtml(s.id)}"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-delete" title="${escapeHtml(t('table.delete'))}" aria-label="${escapeHtml(t('table.delete'))}" data-azione="elimina-show" data-id="${escapeHtml(s.id)}"><i class="fa-solid fa-trash"></i></button>
                    </td>`]
};

export const COLONNE_CRONOLOGIA = ['selezione', 'foto', 'data', 'nome', 'piattaforma', 'durata', 'costo', 'costoMinuto', 'voto', 'parametri', 'recensione', 'note', 'azioni'];
export const COLONNE_DETTAGLIO_MESE = ['foto', 'data', 'nomeCliccabile', 'piattaforma', 'durata', 'costo', 'costoMinuto', 'voto', 'parametri', 'recensione', 'note'];
export const COLONNE_SCHEDA = ['dataSito', 'piattaforma', 'durata', 'costo', 'costoMinuto', 'voto', 'parametri', 'recensione', 'note'];

export function intestazioneShow(colonne) {
    return `<tr>${colonne.map(c => {
        const [chiave, classe, , personalizzata] = COLONNE_SHOW[c];
        return `<th${classe ? ` class="${classe}"` : ''}>${personalizzata ? personalizzata() : escapeHtml(t(chiave))}</th>`;
    }).join('')}</tr>`;
}

export function rigaShow(show, colonne) {
    const evidenziata = colonne.includes('selezione') && selezionato(show);
    return `<tr${evidenziata ? ' class="riga-selezionata"' : ''}>${colonne.map(c => COLONNE_SHOW[c][2](show)).join('')}</tr>`;
}

export function righeShow(shows, colonne) {
    return shows.map(s => rigaShow(s, colonne)).join('');
}
