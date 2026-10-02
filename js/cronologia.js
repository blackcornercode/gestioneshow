/* ==========================================================================
   CRONOLOGIA: FILTRI PER ANNO E NOME
   ========================================================================== */
function inizializzaFiltriCronologia() {
    const limiteSalvato = localStorage.getItem('limiteRisultati');
    const limiteSelect = document.getElementById('limiteRisultati');
    if (limiteSelect && limiteSalvato) {
        limiteSelect.value = limiteSalvato;
    }
}

function inizializzaFiltroAnni(shows) {
    const container = document.getElementById('container-filtri-anni');
    if (!container) return;

    container.innerHTML = '';

    const salvati = localStorage.getItem('anniSelezionatiFiltro');
    if (salvati) {
        try {
            const arrAnni = JSON.parse(salvati);
            anniSelezionati = new Set(arrAnni);
        } catch (e) {
            console.error("Errore nel ripristino degli anni dal localStorage", e);
        }
    }

    const anniDisponibili = Array.from(new Set(
        shows.map(annoDelloShow).filter(Boolean)
    )).sort((a, b) => b - a);

    if (anniDisponibili.length === 0) {
        container.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">Nessun anno disponibile</span>';
        return;
    }

    anniDisponibili.forEach(anno => {
        const wrapper = document.createElement('label');
        wrapper.style.display = 'inline-flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '4px';
        wrapper.style.fontSize = '0.85rem';
        wrapper.style.cursor = 'pointer';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = anno;
        checkbox.checked = anniSelezionati.has(anno);

        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                anniSelezionati.add(anno);
            } else {
                anniSelezionati.delete(anno);
            }
            
            localStorage.setItem('anniSelezionatiFiltro', JSON.stringify(Array.from(anniSelezionati)));

            paginaCorrente = 1;
            caricaCronologia(tuttiGliShow);
        });

        wrapper.appendChild(checkbox);
        wrapper.appendChild(document.createTextNode(anno));
        container.appendChild(wrapper);
    });
}

function filtraShowPerAnni(shows) {
    if (anniSelezionati.size === 0) {
        return shows;
    }

    return shows.filter(s => anniSelezionati.has(annoDelloShow(s)));
}

function getPiattaformaFormatted(show) {
    if (show.isRegalo) {
        return `<span class="badge-regalo">${escapeHtml(t('form.gift'))}</span>`;
    }
    
    const nomePiattaforma = show.piattaforma || 'Teams';
    const iconaHtml = iconePiattaformaHTML[nomePiattaforma] || `<i class="fa-solid fa-globe"></i> ${escapeHtml(nomePiattaforma)}`;
    
    if (show.nickname) {
        // I nickname sono spesso email lunghe: troncati con "…", completi nel tooltip
        const nick = escapeHtml(show.nickname);
        const urlChat = generaLinkChat(nomePiattaforma, show.nickname);
        const nickHtml = urlChat
            ? `<a href="#" class="link-web nick-troncato" style="font-size: 0.82rem;" title="${nick}" onclick="apriLinkEsterno(event, ${argJs(urlChat)})">💬 ${nick}</a>`
            : `<small class="nick-troncato" title="${nick}">${nick}</small>`;
        return `
            <div style="display: flex; flex-direction: column; gap: 2px;">
                <span>${iconaHtml}</span>
                ${nickHtml}
            </div>
        `;
    }

    return iconaHtml;
}

/* ==========================================================================
   CRONOLOGIA E PAGINAZIONE
   ========================================================================== */
function caricaCronologia(shows) {
    const listaShow = document.getElementById('listaShow');
    if (!listaShow) return;
    listaShow.innerHTML = '';
    
    const limiteSelect = document.getElementById('limiteRisultati');
    const ordineSelect = document.getElementById('ordineData');
    
    const limiteValore = limiteSelect ? limiteSelect.value : '5';
    const ordine = ordineSelect ? ordineSelect.value : 'desc';
    
    // Il filtro per nome viene applicato qui, così resta attivo anche quando si
    // cambia pagina, ordine, numero di risultati o anno (prima andava perso)
    const inputRicerca = document.getElementById('searchModellaCronologia');
    const filtroNome = inputRicerca ? inputRicerca.value.trim().toLowerCase() : '';
    const showsPerNome = filtroNome
        ? shows.filter(s => s.nome && s.nome.toLowerCase().includes(filtroNome))
        : shows;

    const showsFiltrati = filtraShowPerAnni(showsPerNome);

    let showsOrdinati = [...showsFiltrati];
    showsOrdinati.sort((a, b) => {
        const diff = timestampShow(a) - timestampShow(b);
        return ordine === 'asc' ? diff : -diff;
    });

    let showsDaMostrare = showsOrdinati;
    let totalePagine = 1;

    if (limiteValore !== 'all') {
        const limitePerPagina = parseInt(limiteValore, 10);
        totalePagine = Math.ceil(showsOrdinati.length / limitePerPagina) || 1;

        if (paginaCorrente > totalePagine) paginaCorrente = totalePagine;
        if (paginaCorrente < 1) paginaCorrente = 1;

        const inizio = (paginaCorrente - 1) * limitePerPagina;
        const fine = inizio + limitePerPagina;
        showsDaMostrare = showsOrdinati.slice(inizio, fine);
    }

    const fragment = document.createDocumentFragment();

    showsDaMostrare.forEach(function(item) {
        const tr = document.createElement('tr');
        
        const fotoUrl = item.immagine || mappaImmaginiModelle[(item.nome || '').trim().toLowerCase()] || '';
        const imgHtml = fotoUrl 
            ? `<img src="${escapeHtml(fotoUrl)}" class="thumb-img" style="cursor: pointer;" alt="foto" title="Clicca per ingrandire" onclick="event.stopPropagation(); apriModalImmagine(${argJs(fotoUrl)})" onerror="this.outerHTML='<div class=\\'no-img\\'>No Foto</div>'">`
            : `<div class="no-img">No Foto</div>`;

        const piattaformaTxt = getPiattaformaFormatted(item);
        
        let votoTxt = '-';
        if (!item.isRegalo) {
            if (item.punteggio === 'TBD' || !item.punteggio) {
                votoTxt = `<span class="badge-tbd">TBD</span>`;
            } else {
                votoTxt = `${item.punteggio} / 5`;
            }
        }

        const origineBadge = item.isAutoImport 
            ? `<span class="badge-origine auto" title="Auto MCG">🤖 MCG</span>`
            : `<span class="badge-origine manuale" title="Manuale">👤</span>`;

        // Calcolo e formattazione durata dello show
        const durataTxt = formattaTempo(item.durata || item.tempoShow || 0);

        tr.innerHTML = `
            <td>${imgHtml}</td>
            <td class="col-nowrap">${escapeHtml(item.dataFormattata || item.data)}</td>
            <td><strong>${escapeHtml(item.nome)}</strong></td>
            <td>${piattaformaTxt}</td>
            <td class="col-nowrap col-centro" style="font-weight: bold;">${durataTxt}</td>
            <td class="col-nowrap">${formattaEuro(item.costo)}</td>
            <td class="col-nowrap col-centro">${formattaCostoAlMinuto(costoAlMinuto(item))}</td>
            <td class="col-nowrap">${votoTxt}</td>
            <td>${origineBadge}</td>
            <td class="col-centro">${item.recensione ? '✅' : '❌'}</td>
            ${cellaNote(item.note)}
            <td class="col-azioni">
                <button class="btn-edit" title="Modifica" aria-label="Modifica" onclick="modificaShow(${argJs(item.id)})"><i class="fa-solid fa-pen"></i></button>
                <button class="btn-delete" title="Elimina" aria-label="Elimina" onclick="eliminaShow(${argJs(item.id)})"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        fragment.appendChild(tr);
    });

    listaShow.appendChild(fragment);
    aggiornaControlliPaginazione(totalePagine, limiteValore === 'all');
}

function cambiaPagina(direzione) {
    paginaCorrente += direzione;
    logger.info(`Navigazione pagina cronologia: ${paginaCorrente}`);
    caricaCronologia(tuttiGliShow);
}

function aggiornaControlliPaginazione(totalePagine, mostraTutti) {
    const btnIndietro = document.getElementById('btnPrevPagina');
    const btnAvanti = document.getElementById('btnNextPagina');
    const infoPagina = document.getElementById('infoPagina');
    const contenitorePaginazione = document.getElementById('controlliPaginazione');

    if (!contenitorePaginazione) return;

    if (mostraTutti || totalePagine <= 1) {
        contenitorePaginazione.style.display = 'none';
        return;
    }

    contenitorePaginazione.style.display = 'flex';
    
    if (btnIndietro) btnIndietro.disabled = (paginaCorrente <= 1);
    if (btnAvanti) btnAvanti.disabled = (paginaCorrente >= totalePagine);
    if (infoPagina) {
        infoPagina.textContent = t('pagination.page_of')
            .replace('{page}', paginaCorrente)
            .replace('{total}', totalePagine);
    }
}

function resetFiltriCronologia() {
    logger.info("Reset dei filtri cronologia richiesto.");
    const ordine = document.getElementById('ordineData');
    const limite = document.getElementById('limiteRisultati');
    if (ordine) ordine.value = 'desc';
    if (limite) limite.value = '5';
    
    const searchInput = document.getElementById('searchModellaCronologia');
    if (searchInput) searchInput.value = '';

    anniSelezionati.clear();
    localStorage.removeItem('anniSelezionatiFiltro');

    inizializzaFiltroAnni(tuttiGliShow);

    localStorage.removeItem('limiteRisultati');
    paginaCorrente = 1;
    caricaCronologia(tuttiGliShow);
}

function filtraCronologiaPerNome() {
    paginaCorrente = 1;
    caricaCronologia(tuttiGliShow);
}
