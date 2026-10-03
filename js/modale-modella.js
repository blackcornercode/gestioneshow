/* ==========================================================================
   MODALE DETTAGLIO MODELLA E FOTO DINAMICHE
   ========================================================================== */
async function apriModalModella(nomeModella) {
    const modal = document.getElementById('modalModella');
    const header = document.getElementById('modalHeader');
    const listaBody = document.getElementById('modalListaShow');

    if (!modal || !header || !listaBody) return;

    const showsModella = tuttiGliShow.filter(s => s.nome && s.nome.trim().toLowerCase() === nomeModella.trim().toLowerCase());
    showsModella.sort((a, b) => timestampShow(b) - timestampShow(a));

    const totaleShow = showsModella.length;
    const spesaTotale = showsModella.reduce((acc, show) => acc + (parseFloat(show.costo) || 0), 0);
    const tempoTotale = showsModella.reduce((acc, show) => acc + (parseInt(show.durata || show.tempoShow, 10) || 0), 0);
    const costoMedioMinuto = costoMedioAlMinuto(showsModella);

    const showConVoto = showsModella.filter(s => !s.isRegalo && s.punteggio && s.punteggio !== 'TBD');
    const sommaVoti = showConVoto.reduce((acc, s) => acc + parseFloat(s.punteggio), 0);
    const mediaVoti = showConVoto.length > 0 ? (sommaVoti / showConVoto.length).toFixed(2) : 'N/D';

    const chiaveModella = nomeModella.trim().toLowerCase();
    
    const fotoProfilo = mappaImmaginiModelle[chiaveModella] || (showsModella.find(s => s.immagine) || {}).immagine || '';
    const showConUrl = showsModella.find(s => s.urlProfilo || s.url) || {};
    const urlProfilo = mappaUrlModelle[chiaveModella] || showConUrl.urlProfilo || showConUrl.url || '';

    const imgProfiloHtml = fotoProfilo
        ? `<img src="${escapeHtml(fotoProfilo)}" alt="${escapeHtml(nomeModella)}" class="modella-avatar" onclick="apriModalImmagine(${argJs(fotoProfilo)})">`
        : `<div class="modella-avatar modella-avatar-vuoto">👤</div>`;

    // Riquadro statistico: etichetta sopra, valore sotto, entrambi senza andare a capo
    const statBox = (etichetta, valore, extra = '') =>
        `<div class="stat-box"${extra}><span class="stat-box-etichetta">${escapeHtml(etichetta)}</span><strong class="stat-box-valore">${valore}</strong></div>`;

    const urlHtml = urlProfilo
        ? `<a href="#" class="modella-url" title="${escapeHtml(urlProfilo)}" onclick="apriLinkEsterno(event, ${argJs(urlProfilo)})">🌐 ${escapeHtml(urlProfilo)}</a>`
        : `<span class="modella-url modella-url-vuoto">Nessun sito web collegato</span>`;

    // Tutto su una riga: avatar | nome e sito (troncati con "…" se serve) | statistiche
    header.innerHTML = `
        <div class="modella-header-card">
            ${imgProfiloHtml}
            <div class="modella-info-main">
                <h2 class="modella-nome" title="${escapeHtml(nomeModella)}">${escapeHtml(nomeModella)}</h2>
                ${urlHtml}
            </div>
            <div class="modella-stats-summary">
                ${statBox(t('table.total_shows'), totaleShow)}
                ${statBox(t('table.total_duration'), formattaDurata(tempoTotale))}
                ${statBox(t('table.total_spent'), `€ ${spesaTotale.toFixed(2)}`)}
                ${statBox(t('table.avg_cost_per_minute'), formattaCostoAlMinuto(costoMedioMinuto), ` title="${escapeHtml(t('table.cost_per_minute_hint'))}"`)}
                ${statBox(t('table.avg_rating'), `<span class="voto-medio">${mediaVoti !== 'N/D' ? mediaVoti + ' / 5' : 'N/D'}</span>`)}
            </div>
        </div>
    `;

    caricaFotoDinamicheModella(nomeModella, mappaUrlModelle);

    listaBody.innerHTML = '';
    showsModella.forEach(item => {
        const tr = document.createElement('tr');
        const piattaformaTxt = getPiattaformaFormatted(item);
        
        const votoTxt = formattaVoto(item);

        const durataSingola = formattaDurata(item.durata || item.tempoShow);

        tr.innerHTML = `
            <td class="col-nowrap">${escapeHtml(item.dataFormattata || item.data)}</td>
            <td>${piattaformaTxt}</td>
            <td class="col-nowrap col-centro" style="font-weight: bold;">${durataSingola}</td>
            <td class="col-nowrap${item.isRegalo ? ' testo-attenuato' : ''}">${formattaEuro(item.costo)}</td>
            <td class="col-nowrap col-centro">${formattaCostoAlMinuto(costoAlMinuto(item))}</td>
            <td class="col-nowrap">${votoTxt}</td>
            <td class="col-centro">${item.recensione ? '✅' : '❌'}</td>
            ${cellaNote(item.note)}
        `;
        listaBody.appendChild(tr);
    });

    modal.style.display = 'block';
}

function chiudiModalModella() {
    const modal = document.getElementById('modalModella');
    if (modal) modal.style.display = 'none';
}

async function caricaFotoDinamicheModella(nomeChiave, mappaUrl) {
    const contenitoreFoto = document.getElementById('contenitoreFotoDinamiche');
    if (!contenitoreFoto) return;

    contenitoreFoto.innerHTML = '<span style="color: var(--text-muted); font-size: 0.9rem;">🔄 Caricamento foto da MondoCamGirls...</span>';

    let rawUrl = mappaUrl[nomeChiave.trim().toLowerCase()] || urlProfiloPredefinito(nomeChiave);
    let profileUrl = rawUrl.replace(/\/+$/, '');
    let targetUrlFoto = `${profileUrl}/?pag=0#mp-foto`;

    if (window.electronAPI && window.electronAPI.fetchModellaFoto) {
        const result = await window.electronAPI.fetchModellaFoto(profileUrl);

        if (result.success && result.images && result.images.length > 0) {
            contenitoreFoto.innerHTML = '';
            result.images.forEach((imgUrl, index) => {
                const img = document.createElement('img');
                img.src = imgUrl;
                img.alt = "Foto modella";
                img.style.cssText = "height: 100px; width: 100px; object-fit: cover; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); transition: transform 0.2s;";
                img.title = "Clicca per ingrandire";
                
                img.onmouseover = () => img.style.transform = 'scale(1.05)';
                img.onmouseout = () => img.style.transform = 'scale(1)';

                img.onclick = () => apriModalImmagine(imgUrl, result.images, index);

                contenitoreFoto.appendChild(img);
            });
        } else {
            const targetUrlHtml = `<a href="#" class="link-web" style="font-weight: bold; text-decoration: underline;" onclick="apriLinkEsterno(event, ${argJs(targetUrlFoto)})">${escapeHtml(targetUrlFoto)}</a>`;
            
            contenitoreFoto.innerHTML = `
                <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">
                    ⚠️ Nessuna foto trovata analizzando la pagina: <br>
                    ${targetUrlHtml}
                </div>
            `;
        }
    } else {
        contenitoreFoto.innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">Funzione recupero foto non disponibile.</span>';
    }
}
