import { chiaveModella, showsDiModella, riepilogoShow, conteggioTag, profiliPerSito } from './calcoli.js';
import { badgeSito } from './gestione-siti.js';
import { apriModalImmagine } from './galleria.js';
import { t } from './i18n.js';
import { COLONNE_SCHEDA, intestazioneShow, righeShow } from './righe-show.js';
import { htmlPreventivoScheda } from './preventivo.js';
import { badgeSospesa } from './profili-sospesi.js';
import { badgeOnline } from './stato-online.js';
import { stato } from './stato.js';
import { tagDaId, etichettaTag } from './tag.js';
import { escapeHtml, formattaCostoAlMinuto, formattaDurata } from './utils.js';
import { SITO_MCG, sitoDaId } from './siti.js';
import { funzioneDisponibile, urlModelleDelSito, FUNZIONI } from './connettori.js';
import { urlProfiloPredefinito } from './connettore-mcg.js';

/* ==========================================================================
   MODALE DETTAGLIO MODELLA E FOTO DINAMICHE
   ========================================================================== */
const testoModelle = (chiave, valori = {}) =>
    Object.entries(valori).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), t(chiave));

// Cinque stelle per una media da 0 a 5 (mezza stella da .25 in su)
function stelleHtml(valore) {
    const intero = Math.floor(valore);
    const resto = valore - intero;
    let stelle = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= intero) stelle += '<span class="piena">★</span>';
        else if (i === intero + 1 && resto >= 0.25) stelle += '<span class="meta"></span>';
        else stelle += '<span class="vuota">★</span>';
    }
    return stelle;
}

export async function apriModalModella(nomeModella) {
    const modal = document.getElementById('modalModella');
    const header = document.getElementById('modalHeader');
    const listaBody = document.getElementById('modalListaShow');

    if (!modal || !header || !listaBody) return;

    // Serve all'aggiornamento periodico del badge "Online" a scheda aperta
    modal.dataset.nomeModella = nomeModella;

    // Stessi totali della classifica (riepilogoShow in calcoli.js)
    const showsModella = showsDiModella(stato.tuttiGliShow, nomeModella);
    const riepilogo = riepilogoShow(showsModella);

    const chiave = chiaveModella(nomeModella);
    const fotoProfilo = stato.mappaImmaginiModelle[chiave] || (showsModella.find(s => s.immagine) || {}).immagine || '';
    const urlProfilo = stato.mappaUrlModelle[chiave] || (showsModella.find(s => s.urlProfilo) || {}).urlProfilo || '';

    const imgProfiloHtml = fotoProfilo
        ? `<img src="${escapeHtml(fotoProfilo)}" alt="${escapeHtml(nomeModella)}" class="modella-avatar" data-azione="ingrandisci-foto" data-url="${escapeHtml(fotoProfilo)}">`
        : `<div class="modella-avatar modella-avatar-vuoto">👤</div>`;

    // Riquadro statistico: etichetta sopra, valore sotto, entrambi senza andare a capo
    const statBox = (etichetta, valore, extra = '', classe = '') =>
        `<div class="stat-box${classe ? ' ' + classe : ''}"${extra}><span class="stat-box-etichetta">${escapeHtml(etichetta)}</span><strong class="stat-box-valore">${valore}</strong></div>`;

    // €/min rispetto alla media personale: stessa fascia neutra del ±10% della tabella
    const rif = stato.costoMinutoRiferimento;
    const cpm = riepilogo.costoMedioMinuto;
    const classeCosto = !rif || cpm === null ? ''
        : cpm < rif * 0.9 ? 'stat-box-conv'
        : cpm > rif * 1.1 ? 'stat-box-caro' : '';

    const votoHtml = riepilogo.mediaTxt === 'N/D' || riepilogo.mediaValore < 0
        ? 'N/D'
        : `<span class="stelle-stat"><span class="stelle">${stelleHtml(riepilogo.mediaValore)}</span><span class="voto-n">${escapeHtml(riepilogo.mediaTxt)}</span></span>`;

    // Profili della modella sui vari siti (fase 4): con un solo sito resta il solo indirizzo
    const profili = profiliPerSito(stato.tuttiGliShow, nomeModella);
    const piuSiti = profili.length > 1;
    const linkProfilo = (url, sito) =>
        `<a href="#" class="modella-url" title="${escapeHtml(url)}" data-azione="apri-link" data-url="${escapeHtml(url)}">${sito ? badgeSito(sito) + ' ' : '🌐 '}${escapeHtml(url)}</a>`;
    const urlHtml = piuSiti && profili.some(p => p.urlProfilo)
        ? `<div class="modella-profili">${profili.filter(p => p.urlProfilo).map(p => linkProfilo(p.urlProfilo, p.sito)).join('')}</div>`
        : urlProfilo
            ? linkProfilo(urlProfilo)
            : `<span class="modella-url modella-url-vuoto">${escapeHtml(t('modal.no_website'))}</span>`;

    // Totali per sito, solo se la modella ha show su più siti
    const nomeCorrente = chiave;
    // Una scheda per sito: badge e nome, quota degli show della modella in barra, statistiche
    const cellaSito = (etichetta, valore) =>
        `<div class="sito-stat"><span class="sito-stat-etichetta">${escapeHtml(etichetta)}</span><strong>${valore}</strong></div>`;
    const perSitoHtml = piuSiti ? `
        <div class="modella-per-sito">
            <span class="modella-tipi-etichetta">${escapeHtml(t('models.per_site'))}</span>
            <div class="schede-per-sito">${profili.map(p => {
                // Nomi diversi da quello attuale con cui la modella compare sul sito (show uniti)
                const altriNomi = p.nomi.filter(n => chiaveModella(n) !== nomeCorrente);
                const comeNome = altriNomi.length ? `<small class="modella-altri-nomi">${escapeHtml(testoModelle('models.as_name', { nomi: altriNomi.join(', ') }))}</small>` : '';
                const quota = riepilogo.totaleShow ? Math.round((p.totaleShow / riepilogo.totaleShow) * 100) : 0;
                return `<div class="scheda-sito">
                    <div class="scheda-sito-testa">
                        <span class="scheda-sito-badge">${badgeSito(p.sito)}</span>
                        <div class="scheda-sito-nome"><strong>${escapeHtml(sitoDaId(p.sito)?.nome || p.sito)}</strong>${comeNome}</div>
                    </div>
                    <div class="scheda-sito-quota" title="${quota}%"><div class="scheda-sito-quota-barra" style="width:${quota}%"></div></div>
                    <div class="scheda-sito-stat">
                        ${cellaSito(t('table.total_shows'), `${p.totaleShow} <small>(${quota}%)</small>`)}
                        ${cellaSito(t('table.total_duration'), formattaDurata(p.totaleDurata))}
                        ${cellaSito(t('table.total_spent'), `€ ${p.spesaTotale.toFixed(2)}`)}
                        ${cellaSito(t('table.avg_cost_per_minute'), formattaCostoAlMinuto(p.costoMedioMinuto))}
                        ${cellaSito(t('table.avg_rating'), p.mediaTxt !== 'N/D' ? `<span class="voto-medio">${p.mediaTxt} / 5</span>` : 'N/D')}
                    </div>
                </div>`;
            }).join('')}</div>
        </div>` : '';

    // Unione di dati: show acquistati con un nome diverso da quello attuale (Unisci/Separa)
    const nomiUniti = new Map();
    showsModella.forEach(s => {
        if (!s.nomeOriginale || chiaveModella(s.nomeOriginale) === chiave) return;
        const voce = nomiUniti.get(chiaveModella(s.nomeOriginale)) || { nome: s.nomeOriginale.trim(), n: 0 };
        voce.n++;
        nomiUniti.set(chiaveModella(s.nomeOriginale), voce);
    });
    const unitiHtml = nomiUniti.size
        ? `<div class="modella-uniti"><span class="modella-tipi-etichetta">${escapeHtml(t('models.merged_from'))}</span>
            ${[...nomiUniti.values()].map(v => `<span class="modella-unita">${escapeHtml(v.nome)} <small>${escapeHtml(testoModelle('models.merged_count', { n: v.n }))}</small></span>`).join('')}</div>`
        : '';

    // Unisci con un'altra modella; separa solo se ci sono show su più siti
    const azioniHtml = `
        <div class="modella-azioni">
            <button type="button" class="btn-data btn-compatto" title="${escapeHtml(t('models.merge_tip'))}" data-azione="apri-unisci-modella" data-modo="unisci" data-nome="${escapeHtml(nomeModella)}">${escapeHtml(t('models.merge'))}</button>
            ${piuSiti ? `<button type="button" class="btn-data btn-compatto" title="${escapeHtml(t('models.split_tip'))}" data-azione="apri-unisci-modella" data-modo="separa" data-nome="${escapeHtml(nomeModella)}">${escapeHtml(t('models.split'))}</button>` : ''}
        </div>`;

    // Tipi di show proposti dalla modella: i suoi tag, dal più usato
    const tipiShow = conteggioTag(showsModella)
        .map(({ id, conteggio }) => ({ tag: tagDaId(id), conteggio }))
        .filter(({ tag }) => tag);
    const tipiShowHtml = tipiShow.length
        ? `<div class="modella-tipi-show"><span class="modella-tipi-etichetta">${escapeHtml(t('tags.show_types'))}</span>
            ${tipiShow.map(({ tag, conteggio }) => etichettaTag(tag, '', ` ×${conteggio}`)).join('')}</div>`
        : '';

    // Tutto su una riga: avatar | nome e sito (troncati con "…" se serve) | statistiche
    header.innerHTML = `
        <div class="modella-header-card">
            ${imgProfiloHtml}
            <div class="modella-info-main">
                <h2 class="modella-nome" title="${escapeHtml(nomeModella)}">${escapeHtml(nomeModella)}<span id="badgeOnlineScheda">${badgeOnline(nomeModella)}${badgeSospesa(nomeModella)}</span></h2>
                ${urlHtml}
            </div>
            <div class="modella-stats-summary">
                ${statBox(t('table.total_shows'), riepilogo.totaleShow)}
                ${statBox(t('table.total_duration'), formattaDurata(riepilogo.totaleDurata))}
                ${statBox(t('table.total_spent'), `€ ${riepilogo.spesaTotale.toFixed(2)}`)}
                ${statBox(t('table.avg_cost_per_minute'), formattaCostoAlMinuto(riepilogo.costoMedioMinuto), ` title="${escapeHtml(t('table.cost_per_minute_hint'))}"`, classeCosto)}
                ${statBox(t('table.avg_rating'), votoHtml, '', 'stat-box-rating')}
            </div>
        </div>
        ${tipiShowHtml}
        ${unitiHtml}
        ${perSitoHtml}
        ${azioniHtml}
        ${htmlPreventivoScheda(nomeModella)}
    `;

    // Galleria dal profilo: solo se la modella ha show su un sito in uso il cui connettore offre le foto
    const sitoGalleria = [...new Set(showsModella.map(s => s.sito))].find(id => funzioneDisponibile(id, FUNZIONI.FOTO));
    const sezioneGalleria = document.getElementById('sezioneGalleriaModella');
    if (sezioneGalleria) sezioneGalleria.hidden = !sitoGalleria;
    if (sitoGalleria) caricaFotoDinamicheModella(nomeModella, urlModelleDelSito(sitoGalleria), sitoGalleria);
    else richiestaFoto++;   // le foto ancora in arrivo per la scheda precedente non servono più

    const intestazione = document.getElementById('intestazioneScheda');
    if (intestazione) intestazione.innerHTML = intestazioneShow(COLONNE_SCHEDA);
    listaBody.innerHTML = righeShow(showsModella, COLONNE_SCHEDA);

    // Riavvia l'animazione di apertura a ogni apertura della scheda
    const contenuto = modal.querySelector('.modal-content');
    if (contenuto) {
        contenuto.style.animation = 'none';
        void contenuto.offsetWidth;
        contenuto.style.animation = '';
    }
    modal.style.display = 'block';
}

export function chiudiModalModella() {
    const modal = document.getElementById('modalModella');
    if (modal) modal.style.display = 'none';
}

// Aggiorna i badge "Online" e "Sospesa" della scheda, se è aperta
export function aggiornaBadgeSchedaModella() {
    const modal = document.getElementById('modalModella');
    const span = document.getElementById('badgeOnlineScheda');
    if (!modal || !span || modal.style.display !== 'block') return;
    span.innerHTML = badgeOnline(modal.dataset.nomeModella) + badgeSospesa(modal.dataset.nomeModella);
}

// Numero dell'ultima richiesta di foto: aprendo in fretta due schede, le foto della
// prima (più lente) finivano nella galleria della seconda
let richiestaFoto = 0;

// L'indirizzo dedotto dal nome vale per MCG, l'unico connettore che offre le foto
export async function caricaFotoDinamicheModella(nomeChiave, mappaUrl, sito = SITO_MCG) {
    const contenitoreFoto = document.getElementById('contenitoreFotoDinamiche');
    if (!contenitoreFoto) return;
    const richiesta = ++richiestaFoto;

    contenitoreFoto.innerHTML = `<span class="galleria-messaggio">${escapeHtml(t('modal.loading_photos_mcg'))}</span>`;

    let rawUrl = mappaUrl[nomeChiave.trim().toLowerCase()] || urlProfiloPredefinito(nomeChiave);
    let profileUrl = rawUrl.replace(/\/+$/, '');
    let targetUrlFoto = `${profileUrl}/?pag=0#mp-foto`;

    if (window.electronAPI?.fotoModella) {
        let result;
        try {
            result = await window.electronAPI.fotoModella(sito, profileUrl);
        } catch {
            // Senza risposta la galleria restava su "Caricamento..." per sempre
            result = { success: false };
        }
        if (richiesta !== richiestaFoto) return;

        if (result?.success && result.images && result.images.length > 0) {
            contenitoreFoto.innerHTML = '';
            result.images.forEach((imgUrl, index) => {
                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = t('modal.photo_alt');
                img.className = 'galleria-miniatura';
                img.title = t('modal.click_to_enlarge');
                

                img.onclick = () => apriModalImmagine(imgUrl, result.images, index);

                contenitoreFoto.appendChild(img);
            });
        } else {
            const targetUrlHtml = `<a href="#" class="link-web link-sottolineato" data-azione="apri-link" data-url="${escapeHtml(targetUrlFoto)}">${escapeHtml(targetUrlFoto)}</a>`;
            
            contenitoreFoto.innerHTML = `
                <div class="galleria-messaggio">
                    ${escapeHtml(t('modal.no_photos'))} <br>
                    ${targetUrlHtml}
                </div>
            `;
        }
    } else {
        contenitoreFoto.innerHTML = `<span class="galleria-messaggio">${escapeHtml(t('modal.photos_unavailable'))}</span>`;
    }
}
