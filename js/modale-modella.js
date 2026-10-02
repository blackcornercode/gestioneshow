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
    
    const showConVoto = showsModella.filter(s => !s.isRegalo && s.punteggio && s.punteggio !== 'TBD');
    const sommaVoti = showConVoto.reduce((acc, s) => acc + parseFloat(s.punteggio), 0);
    const mediaVoti = showConVoto.length > 0 ? (sommaVoti / showConVoto.length).toFixed(2) : 'N/D';

    const chiaveModella = nomeModella.trim().toLowerCase();
    
    const fotoProfilo = mappaImmaginiModelle[chiaveModella] || (showsModella.find(s => s.immagine) || {}).immagine || '';
    const showConUrl = showsModella.find(s => s.urlProfilo || s.url) || {};
    const urlProfilo = mappaUrlModelle[chiaveModella] || showConUrl.urlProfilo || showConUrl.url || '';

    const imgProfiloHtml = fotoProfilo 
        ? `<img src="${escapeHtml(fotoProfilo)}" alt="${escapeHtml(nomeModella)}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 50%; border: 2px solid var(--accent-color, #2a9d8f); cursor: pointer;" onclick="apriModalImmagine(${argJs(fotoProfilo)})">`
        : `<div style="width: 70px; height: 70px; border-radius: 50%; background-color: var(--border-color, #ccc); display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">👤</div>`;

    header.innerHTML = `
        <div class="modella-header-card" style="display: flex; align-items: center; gap: 20px; padding: 15px; background: var(--bg-card-secondary, rgba(0,0,0,0.03)); border-radius: 8px; margin-bottom: 20px; border: 1px solid var(--border-color, #ccc);">
            <div class="modella-avatar-wrapper">
                ${imgProfiloHtml}
            </div>
            
            <div class="modella-info-main" style="flex-grow: 1;">
                <h2 style="margin: 0 0 5px 0;">${escapeHtml(nomeModella)}</h2>
                ${urlProfilo ? `
                    <p style="margin: 0; font-size: 0.9em;">
                        🌐 <a href="#" onclick="apriLinkEsterno(event, ${argJs(urlProfilo)})" style="color: var(--text-color); text-decoration: none; font-weight: bold;">
                            ${escapeHtml(urlProfilo)}
                        </a>
                    </p>
                ` : '<p style="margin: 0; font-size: 0.85em; color: var(--text-muted, #888);">Nessun sito web collegato</p>'}
            </div>

            <div class="modella-stats-summary" style="display: flex; gap: 12px; text-align: center;">
                <div class="stat-box" style="padding: 8px 12px; background: var(--bg-card, #fff); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #ccc);">
                    <span style="display: block; font-size: 0.8em; color: var(--text-muted, #666);">Show Totali</span>
                    <strong style="font-size: 1.2em; color: var(--text-color, #333);">${totaleShow}</strong>
                </div>
                <div class="stat-box" style="padding: 8px 12px; background: var(--bg-card, #fff); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #ccc);">
                    <span style="display: block; font-size: 0.8em; color: var(--text-muted, #666);">Durata Totale</span>
                    <strong style="font-size: 1.2em; color: var(--text-color);">${formattaTempo(tempoTotale)}</strong>
                </div>
                <div class="stat-box" style="padding: 8px 12px; background: var(--bg-card, #fff); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #ccc);">
                    <span style="display: block; font-size: 0.8em; color: var(--text-muted, #666);">Spesa Totale</span>
                    <strong style="font-size: 1.2em; color: var(--text-color);">€ ${spesaTotale.toFixed(2)}</strong>
                </div>
                <div class="stat-box" style="padding: 8px 12px; background: var(--bg-card, #fff); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid var(--border-color, #ccc);">
                    <span style="display: block; font-size: 0.8em; color: var(--text-muted, #666);">Media Voti</span>
                    <strong style="font-size: 1.2em; color: var(--accent-color, #f59e0b);">${mediaVoti !== 'N/D' ? mediaVoti + ' / 5' : 'N/D'}</strong>
                </div>
            </div>
        </div>
    `;

    caricaFotoDinamicheModella(nomeModella, mappaUrlModelle);

    listaBody.innerHTML = '';
    showsModella.forEach(item => {
        const tr = document.createElement('tr');
        const piattaformaTxt = getPiattaformaFormatted(item);
        
        let votoTxt = '-';
        if (!item.isRegalo) {
            votoTxt = (item.punteggio === 'TBD' || !item.punteggio) ? 'TBD' : `${item.punteggio} / 5`;
        }

        const durataSingola = formattaTempo(item.durata || item.tempoShow || 0);

        tr.innerHTML = `
            <td>${escapeHtml(item.dataFormattata || item.data)}</td>
            <td>${piattaformaTxt}</td>
            <td style="text-align: center; font-weight: bold; color: var(--text-color);">${durataSingola}</td>
            <td>${formattaEuro(item.costo)}</td>
            <td>${votoTxt}</td>
            <td style="text-align: center;">${item.recensione ? '✅' : '❌'}</td>
            <td>${escapeHtml(item.note)}</td>
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
