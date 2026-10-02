/* ==========================================================================
   CLASSIFICA MODELLE E MEDIE
   ========================================================================== */
function caricaMedieEStoricizzazione(shows) {
    const listaMedie = document.getElementById('listaMedie');
    if (!listaMedie) return;

    const mappaModelle = {};

    const showsOrdinati = [...shows].sort((a, b) => timestampShow(b) - timestampShow(a));

    showsOrdinati.forEach(show => {
        if (!show.nome) return;
        const nomeNorm = show.nome.trim();
        const chiave = nomeNorm.toLowerCase();

        if (!mappaModelle[chiave]) {
            mappaModelle[chiave] = {
                nome: nomeNorm,
                totaleShow: 0,
                spesaTotale: 0,
                totaleDurata: 0,
                sommaVoti: 0,
                conteggioVoti: 0,
                foto: show.immagine || mappaImmaginiModelle[chiave] || '',
                urlProfilo: show.urlProfilo || show.url || mappaUrlModelle[chiave] || '',
                piattaformaPrevalente: show.piattaforma || '',
                nicknamePrevalente: show.nickname || ''
            };
        }

        mappaModelle[chiave].totaleShow += 1;
        mappaModelle[chiave].spesaTotale += (parseFloat(show.costo) || 0);
        mappaModelle[chiave].totaleDurata += (parseInt(show.durata || show.tempoShow, 10) || 0);

        if (!show.isRegalo && show.punteggio && show.punteggio !== 'TBD') {
            const v = parseFloat(show.punteggio);
            if (!isNaN(v)) {
                mappaModelle[chiave].sommaVoti += v;
                mappaModelle[chiave].conteggioVoti += 1;
            }
        }
    });

    classificaCompletaCache = Object.values(mappaModelle).map(m => {
        const media = m.conteggioVoti > 0 ? (m.sommaVoti / m.conteggioVoti).toFixed(2) : 'N/D';
        return { 
            ...m, 
            mediaValore: media === 'N/D' ? -1 : parseFloat(media), 
            mediaTxt: media 
        };
    });

    // --- CRITERI DI ORDINAMENTO (1° Media Voti, 2° Numero di Show) ---
    classificaCompletaCache.sort((a, b) => {
        // 1° Criterio: Media Voti (Decrescente)
        if (b.mediaValore !== a.mediaValore) {
            return b.mediaValore - a.mediaValore;
        }
        // 2° Criterio (A parità di media voti): Numero di Show (Decrescente)
        return b.totaleShow - a.totaleShow;
    });

    classificaCompletaCache.forEach((item, index) => {
        item.posizioneOriginale = index + 1;
    });

    mostraClassifica(classificaCompletaCache);
}

function mostraClassifica(lista) {
    const listaMedie = document.getElementById('listaMedie');
    if (!listaMedie) return;
    listaMedie.innerHTML = '';

    const fragment = document.createDocumentFragment();

    lista.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.style.cursor = 'pointer';
        tr.onclick = () => apriModalModella(item.nome);

        const imgHtml = item.foto 
            ? `<img src="${escapeHtml(item.foto)}" class="thumb-img" alt="foto" onclick="event.stopPropagation(); apriModalImmagine(${argJs(item.foto)})" onerror="this.outerHTML='<div class=\\'no-img\\'>No Foto</div>'">`
            : `<div class="no-img">No Foto</div>`;

        const linkWebHtml = item.urlProfilo 
            ? `<a href="#" class="link-web" onclick="apriLinkEsterno(event, ${argJs(item.urlProfilo)})">🌐 Profilo Web</a>`
            : `-`;

        let piattaformaHtml = '-';
        if (item.piattaformaPrevalente) {
            const iconaHtml = iconePiattaformaHTML[item.piattaformaPrevalente] || `<i class="fa-solid fa-globe"></i> ${escapeHtml(item.piattaformaPrevalente)}`;
            if (item.nicknamePrevalente) {
                const urlChat = generaLinkChat(item.piattaformaPrevalente, item.nicknamePrevalente);
                if (urlChat) {
                    piattaformaHtml = `
                        <a href="#" class="link-web" style="font-size: 0.85rem; font-weight: bold;" onclick="apriLinkEsterno(event, ${argJs(urlChat)})">
                            ${iconaHtml} (${escapeHtml(item.nicknamePrevalente)})
                        </a>
                    `;
                } else {
                    piattaformaHtml = `${iconaHtml} <small>(${escapeHtml(item.nicknamePrevalente)})</small>`;
                }
            } else {
                piattaformaHtml = iconaHtml;
            }
        }

        // Calcolo/Formattazione del tempo totale accumulato
        const tempoTotaleTxt = formattaTempo(item.tempoTotale || item.totaleDurata || 0);

        tr.innerHTML = `
            <td style="text-align: center; font-weight: bold;">#${item.posizioneOriginale || (index + 1)}</td>
            <td>${imgHtml}</td>
            <td><strong>${escapeHtml(item.nome)}</strong></td>
            <td>${linkWebHtml}</td>
            <td>${piattaformaHtml}</td>
            <td style="text-align: center;">${item.totaleShow}</td>
            <td style="text-align: center; font-weight: bold; color: var(--text-color);">${tempoTotaleTxt}</td>
            <td style="white-space: nowrap; font-weight: bold; color: var(--text-color);">€ ${item.spesaTotale.toFixed(2)}</td>
            <td style="text-align: center; font-weight: bold; color: #f59e0b;">${item.mediaTxt}</td>
        `;
        fragment.appendChild(tr);
    });

    listaMedie.appendChild(fragment);
}

function filtraClassificaModelle() {
    const input = document.getElementById('searchModellaClassifica');
    if (!input) return;
    const filtro = input.value.trim().toLowerCase();

    const filtrati = classificaCompletaCache.filter(m => m.nome.toLowerCase().includes(filtro));
    mostraClassifica(filtrati);
}
