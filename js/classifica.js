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
                nicknamePrevalente: show.nickname || '',
                elencoShow: []
            };
        }

        mappaModelle[chiave].elencoShow.push(show);
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

    classificaCompletaCache = Object.values(mappaModelle).map(({ elencoShow, ...m }) => {
        const media = m.conteggioVoti > 0 ? (m.sommaVoti / m.conteggioVoti).toFixed(2) : 'N/D';
        return {
            ...m,
            mediaValore: media === 'N/D' ? -1 : parseFloat(media),
            mediaTxt: media,
            costoMedioMinuto: costoMedioAlMinuto(elencoShow)
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
            ? `<a href="#" class="link-web link-profilo" title="Profilo Web" aria-label="Profilo Web" onclick="apriLinkEsterno(event, ${argJs(item.urlProfilo)})">🌐</a>`
            : `-`;

        // Stesso formato della cronologia: piattaforma e, sotto, il nickname
        // (su una sola riga le email lunghe allargavano la tabella oltre lo schermo)
        const piattaformaHtml = item.piattaformaPrevalente
            ? getPiattaformaFormatted({ piattaforma: item.piattaformaPrevalente, nickname: item.nicknamePrevalente })
            : '-';

        // Calcolo/Formattazione del tempo totale accumulato
        const tempoTotaleTxt = formattaTempo(item.tempoTotale || item.totaleDurata || 0);

        tr.innerHTML = `
            <td class="col-centro" style="font-weight: bold;">#${item.posizioneOriginale || (index + 1)}</td>
            <td>${imgHtml}</td>
            <td><strong>${escapeHtml(item.nome)}</strong></td>
            <td class="col-centro">${linkWebHtml}</td>
            <td>${piattaformaHtml}</td>
            <td class="col-centro">${item.totaleShow}</td>
            <td class="col-nowrap col-centro" style="font-weight: bold;">${tempoTotaleTxt}</td>
            <td class="col-nowrap col-centro" style="font-weight: bold;">€ ${item.spesaTotale.toFixed(2)}</td>
            <td class="col-nowrap col-centro" title="${escapeHtml(t('table.cost_per_minute_hint'))}">${formattaCostoAlMinuto(item.costoMedioMinuto)}</td>
            <td class="voto-medio">${item.mediaTxt}</td>
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
