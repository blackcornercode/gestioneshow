import { calcolaClassifica } from './calcoli.js';
import { t } from './i18n.js';
import { getPiattaformaFormatted } from './righe-show.js';
import { badgeSospesa } from './profili-sospesi.js';
import { eModellaOnline, badgeOnline } from './stato-online.js';
import { stato } from './stato.js';
import { escapeHtml, formattaCostoAlMinuto, formattaDurata } from './utils.js';
import { SITO_MCG } from './siti.js';
import { funzioneDisponibile, FUNZIONI } from './connettori.js';

/* ==========================================================================
   CLASSIFICA MODELLE E MEDIE
   ========================================================================== */
export function caricaMedieEStoricizzazione(shows) {
    if (!document.getElementById('listaMedie')) return;

    // Ordinamento: 1° media voti, 2° numero di show (vedi calcolaClassifica in calcoli.js)
    stato.classificaCompletaCache = calcolaClassifica(shows, { immagini: stato.mappaImmaginiModelle, url: stato.mappaUrlModelle });

    // Un solo disegno, che mantiene l'eventuale ricerca e i filtri della classifica
    filtraClassificaModelle();
    aggiornaLegendaMediaMinuto();
}

// Nella legenda dei colori mostra il valore attuale della media €/min di riferimento
export function aggiornaLegendaMediaMinuto() {
    const elem = document.getElementById('legendaMediaMinuto');
    if (!elem) return;
    elem.textContent = stato.costoMinutoRiferimento
        ? t('ranking.colors_your_avg').replace('{media}', `€ ${stato.costoMinutoRiferimento.toFixed(2)}`)
        : '';
}

// ② Stelle visive per la media voti: ★★★★½ 4.50
function stelleVoto(mediaValore, mediaTxt) {
    if (mediaValore < 0) return `<span class="dato-mancante">${escapeHtml(mediaTxt)}</span>`;
    const intero = Math.floor(mediaValore);
    const resto = mediaValore - intero;
    let stelle = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= intero) stelle += '<span class="piena">★</span>';
        else if (i === intero + 1 && resto >= 0.25) stelle += '<span class="meta"></span>';
        else stelle += '<span class="vuota">★</span>';
    }
    return `<span class="stelle-voto"><span class="stelle">${stelle}</span><span class="voto-num">${escapeHtml(mediaTxt)}</span></span>`;
}

// ① Badge posizione con medaglia per i top 3
function badgePosizione(pos) {
    if (pos === 1) return `<span class="badge-medaglia badge-medaglia-1">🥇</span>`;
    if (pos === 2) return `<span class="badge-medaglia badge-medaglia-2">🥈</span>`;
    if (pos === 3) return `<span class="badge-medaglia badge-medaglia-3">🥉</span>`;
    return `<span class="badge-pos-n">#${pos}</span>`;
}

export function mostraClassifica(lista) {
    const listaMedie = document.getElementById('listaMedie');
    if (!listaMedie) return;
    listaMedie.innerHTML = '';

    // ③ Massimo degli show per scalare le barre proporzionalmente
    const maxShow = lista.reduce((m, i) => Math.max(m, i.totaleShow), 1);

    const fragment = document.createDocumentFragment();

    lista.forEach((item, index) => {
        const pos = item.posizioneOriginale || (index + 1);
        const tr = document.createElement('tr');
        // ① classe rank-N per sfondo e bordo del podio
        tr.className = pos <= 3 ? `cliccabile rank-${pos}` : 'cliccabile';
        tr.dataset.azione = 'apri-scheda-modella';
        tr.dataset.nome = item.nome;

        const imgHtml = item.foto
            ? `<img src="${escapeHtml(item.foto)}" class="thumb-img" alt="foto" data-azione="ingrandisci-foto" data-url="${escapeHtml(item.foto)}" data-sostituto="${escapeHtml(t('table.no_photo'))}">`
            : `<div class="no-img">${escapeHtml(t('table.no_photo'))}</div>`;

        const linkWebHtml = item.urlProfilo
            ? `<a href="#" class="link-web link-profilo" title="${escapeHtml(t('table.website'))}" aria-label="${escapeHtml(t('table.website'))}" data-azione="apri-link" data-url="${escapeHtml(item.urlProfilo)}">🌐</a>`
            : `-`;

        // Stesso formato della cronologia: piattaforma e, sotto, il nickname
        // (su una sola riga le email lunghe allargavano la tabella oltre lo schermo)
        const piattaformaHtml = item.piattaformaPrevalente
            ? getPiattaformaFormatted({ piattaforma: item.piattaformaPrevalente, nickname: item.nicknamePrevalente })
            : '-';

        const tempoTotaleTxt = formattaDurata(item.totaleDurata);

        // ③ Barra proporzionale show totali
        const pctShow = Math.round((item.totaleShow / maxShow) * 100);
        const barraShow = `<div class="barra-show">
            <div class="barra-show-track"><div class="barra-show-fill"></div></div>
            <span class="barra-show-num">${item.totaleShow}</span>
        </div>`;

        tr.innerHTML = `
            <td class="col-centro">${badgePosizione(pos)}</td>
            <td>${imgHtml}</td>
            <td><strong>${escapeHtml(item.nome)}</strong>${badgeOnline(item.nome)}${badgeSospesa(item.nome)}</td>
            <td class="col-centro">${linkWebHtml}</td>
            <td>${piattaformaHtml}</td>
            <td class="col-centro">${barraShow}</td>
            <td class="col-nowrap col-centro col-grassetto">${tempoTotaleTxt}</td>
            <td class="col-nowrap col-centro col-grassetto">€ ${item.spesaTotale.toFixed(2)}</td>
            <td class="col-nowrap col-centro" title="${escapeHtml(t('table.cost_per_minute_hint'))}">${formattaCostoAlMinuto(item.costoMedioMinuto)}</td>
            <td class="voto-medio">${stelleVoto(item.mediaValore, item.mediaTxt)}</td>
            <td class="col-centro"><span class="nav-arrow">›</span></td>
        `;
        // Larghezza della barra dal codice (niente stili inline nei template)
        tr.querySelector('.barra-show-fill').style.width = `${pctShow}%`;
        fragment.appendChild(tr);
    });

    listaMedie.appendChild(fragment);
}

export function filtraClassificaModelle() {
    const input = document.getElementById('searchModellaClassifica');
    if (!input) return;
    const filtro = input.value.trim().toLowerCase();
    // Lo stato online viene da Mondo Cam Girls: senza il sito in uso il filtro non vale
    const soloOnline = funzioneDisponibile(SITO_MCG, FUNZIONI.ONLINE) && Boolean(document.getElementById('filtroSoloOnline')?.checked);
    // Con un sito scelto la classifica si ricalcola sui soli show di quel sito
    const sito = document.getElementById('filtroSitoClassifica')?.value || '';
    const classifica = sito
        ? calcolaClassifica(stato.tuttiGliShow.filter(s => s.sito === sito), { immagini: stato.mappaImmaginiModelle, url: stato.mappaUrlModelle })
        : stato.classificaCompletaCache;

    const filtrati = classifica.filter(m =>
        m.nome.toLowerCase().includes(filtro) && (!soloOnline || eModellaOnline(m.nome) === true));
    mostraClassifica(filtrati);
}
