/* ==========================================================================
   STATISTICHE MENSILI PER ANNO E DETTAGLIO MESI CLICCABILI
   ========================================================================== */
function popolaSelettoreAnni(dati) {
    const selectAnno = document.getElementById('selezionaAnnoStatistiche');
    if (!selectAnno) return;

    const anniSet = new Set();
    dati.forEach(item => {
        const anno = annoDelloShow(item);
        if (anno) anniSet.add(anno);
    });

    if (anniSet.size === 0) {
        anniSet.add(new Date().getFullYear());
    }

    const anniOrdinati = Array.from(anniSet).sort((a, b) => b - a);
    const annoSelezionatoCorrente = selectAnno.value;

    selectAnno.innerHTML = '';
    anniOrdinati.forEach(anno => {
        const option = document.createElement('option');
        option.value = anno;
        option.textContent = anno;
        selectAnno.appendChild(option);
    });

    if (annoSelezionatoCorrente && anniOrdinati.includes(parseInt(annoSelezionatoCorrente))) {
        selectAnno.value = annoSelezionatoCorrente;
    } else {
        selectAnno.value = anniOrdinati[0];
    }
}

function aggiornaStatisticheMensili() {
    meseSelezionatoDettaglio = null;
    caricaStatisticheMensili(tuttiGliShow);
}

function selezionaMeseDettaglio(idxMese) {
    if (meseSelezionatoDettaglio === idxMese) {
        meseSelezionatoDettaglio = null;
    } else {
        meseSelezionatoDettaglio = idxMese;
    }
    caricaStatisticheMensili(tuttiGliShow);
}

function caricaStatisticheMensili(shows) {
    const sezioneStatistiche = document.getElementById('sezioneStatistiche');
    const selectAnno = document.getElementById('selezionaAnnoStatistiche');
    if (!sezioneStatistiche) return;

    if (selectAnno && selectAnno.options.length === 0) {
        popolaSelettoreAnni(shows);
    }

    const annoSelezionato = selectAnno ? (parseInt(selectAnno.value) || new Date().getFullYear()) : new Date().getFullYear();
    sezioneStatistiche.innerHTML = '';

    const mesi = [
        t('months.jan'), t('months.feb'), t('months.mar'), t('months.apr'),
        t('months.may'), t('months.jun'), t('months.jul'), t('months.aug'),
        t('months.sep'), t('months.oct'), t('months.nov'), t('months.dec')
    ];

    const spesaMese = Array(12).fill(0);
    const countMese = Array(12).fill(0);
    const showPerMese = Array.from({ length: 12 }, () => []);

    const meseCorrenteIdx = new Date().getMonth();
    const annoCorrenteNum = new Date().getFullYear();
    const spesaMeseCorrente = calcolaSpesaMeseCorrente(shows);

    shows.forEach(show => {
        const d = dataDelloShow(show);
        if (d && d.getFullYear() === annoSelezionato) {
            const meseIdx = d.getMonth();
            spesaMese[meseIdx] += parseFloat(show.costo) || 0;
            countMese[meseIdx] += 1;
            showPerMese[meseIdx].push(show);
        }
    });

    const budgetPrefissato = parseFloat(localStorage.getItem('monthly_budget')) || 0;
    const mancante = budgetPrefissato - spesaMeseCorrente;

    const budgetStatusText = document.getElementById('budgetStatusText');
    const budgetRemainingText = document.getElementById('budgetRemainingText');
    const progressBar = document.getElementById('progressBar');

    if (budgetStatusText && budgetRemainingText && progressBar) {
        budgetStatusText.textContent = `${t('stats.current_month_spent')}: € ${spesaMeseCorrente.toFixed(2)} / € ${budgetPrefissato.toFixed(2)}`;
        
        // I colori vengono dalle classi stato-* (definite per ogni tema in style.css)
        let stato = 'stato-neutro';
        if (budgetPrefissato > 0) {
            const percentuale = Math.min(100, Math.max(0, (spesaMeseCorrente / budgetPrefissato) * 100));
            progressBar.style.width = `${percentuale}%`;

            if (mancante >= 0) {
                budgetRemainingText.textContent = `${t('budget.remaining')}: € ${mancante.toFixed(2)}`;
                stato = 'stato-ok';
            } else {
                budgetRemainingText.textContent = `${t('budget.exceeded_by')}: € ${Math.abs(mancante).toFixed(2)}`;
                stato = 'stato-ko';
            }
        } else {
            progressBar.style.width = '0%';
            budgetRemainingText.textContent = t('budget.not_set_badge');
        }
        budgetRemainingText.className = stato;
        progressBar.className = stato;
    }

    let html = `
        <table class="table-container" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
                    <th style="padding: 10px;">${t('stats.month')} (${annoSelezionato})</th>
                    <th style="padding: 10px; text-align: center;">${t('stats.shows_done')}</th>
                    <th style="padding: 10px; text-align: right;">${t('stats.total_spent')}</th>
                </tr>
            </thead>
            <tbody>
    `;

    mesi.forEach((nomeMese, idx) => {
        const isAttivo = (meseSelezionatoDettaglio === idx);
        const haShow = countMese[idx] > 0;
        const eMeseCorrente = (idx === meseCorrenteIdx && annoSelezionato === annoCorrenteNum);

        const classiTr = [
            haShow ? 'riga-mese-cliccabile' : 'riga-mese-vuota',
            eMeseCorrente ? 'riga-mese-corrente' : (isAttivo ? 'riga-mese-attiva' : '')
        ].filter(Boolean).join(' ');

        const tooltipText = haShow ? t('stats.click_details') : t('stats.no_shows_month');

        html += `
            <tr class="${classiTr}" ${haShow ? `onclick="selezionaMeseDettaglio(${idx})"` : ''} title="${tooltipText}">
                <td style="padding: 10px;">
                    <strong>${haShow ? (isAttivo ? '🔽 ' : '▶ ') : ''}${nomeMese} ${eMeseCorrente ? `📌 (${t('stats.current')})` : ''}</strong>
                </td>
                <td style="padding: 10px; text-align: center;">${countMese[idx]}</td>
                <td class="spesa-mese" style="padding: 10px; text-align: right; font-weight: bold;">€ ${spesaMese[idx].toFixed(2)}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    if (meseSelezionatoDettaglio !== null && showPerMese[meseSelezionatoDettaglio]) {
        const elencoShowMese = showPerMese[meseSelezionatoDettaglio];
        elencoShowMese.sort((a, b) => timestampShow(b) - timestampShow(a));

        html += `
            <div style="margin-top: 20px; padding: 15px; border: 1px solid var(--border-color); border-radius: 8px; background-color: var(--bg-card, #fff);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <h3 style="margin: 0;">${t('stats.shows_done')} - ${mesi[meseSelezionatoDettaglio]} ${annoSelezionato} (${elencoShowMese.length})</h3>
                    <button onclick="selezionaMeseDettaglio(null)" style="padding: 4px 10px; cursor: pointer; border-radius: 4px; border: 1px solid var(--border-color);">✖ ${t('actions.close_details')}</button>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="border-bottom: 2px solid var(--border-color); text-align: left;">
                            <th>${t('table.photo')}</th>
                            <th>${t('table.date')}</th>
                            <th>${t('table.name')}</th>
                            <th>${t('table.platform')}</th>
                            <th class="col-centro">${t('table.duration')}</th>
                            <th>${t('table.cost')}</th>
                            <th class="col-centro">${t('table.cost_per_minute')}</th>
                            <th>${t('table.rating')}</th>
                            <th class="col-centro">${t('table.review')}</th>
                            <th>${t('table.notes')}</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        elencoShowMese.forEach(item => {
            const fotoUrl = item.immagine || mappaImmaginiModelle[(item.nome || '').trim().toLowerCase()] || '';
            const imgHtml = fotoUrl 
                ? `<img src="${escapeHtml(fotoUrl)}" class="thumb-img" style="cursor: pointer;" alt="foto" onclick="event.stopPropagation(); apriModalImmagine(${argJs(fotoUrl)})" onerror="this.outerHTML='<div class=\\'no-img\\'>${t('table.no_photo')}</div>'">`
                : `<div class="no-img">${t('table.no_photo')}</div>`;

            const votoTxt = formattaVoto(item);

            const durataTxt = formattaDurata(item.durata || item.tempoShow);

            html += `
                <tr>
                    <td>${imgHtml}</td>
                    <td class="col-nowrap">${escapeHtml(item.dataFormattata || item.data)}</td>
                    <td><strong style="cursor: pointer;" onclick="apriModalModella(${argJs(item.nome)})">${escapeHtml(item.nome)}</strong></td>
                    <td>${getPiattaformaFormatted(item)}</td>
                    <td class="col-nowrap col-centro" style="font-weight: bold;">${durataTxt}</td>
                    <td class="col-nowrap${item.isRegalo ? ' testo-attenuato' : ''}">${formattaEuro(item.costo)}</td>
                    <td class="col-nowrap col-centro">${formattaCostoAlMinuto(costoAlMinuto(item))}</td>
                    <td class="col-nowrap">${votoTxt}</td>
                    <td class="col-centro">${item.recensione ? '✅' : '❌'}</td>
                    ${cellaNote(item.note)}
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    }

    sezioneStatistiche.innerHTML = html;
}

// Somma dei costi degli show del mese di calendario in corso
function calcolaSpesaMeseCorrente(shows) {
    const ora = new Date();
    return shows.reduce((totale, show) => {
        const d = dataDelloShow(show);
        const delMese = d && d.getFullYear() === ora.getFullYear() && d.getMonth() === ora.getMonth();
        return delMese ? totale + (parseFloat(show.costo) || 0) : totale;
    }, 0);
}

// Badge "Budget OK/KO" accanto alla scheda Statistiche
function aggiornaIndicatoreBudgetHomepage(shows) {
    const navBadge = document.getElementById('navBudgetBadge');
    if (!navBadge) return;

    const budgetPrefissato = parseFloat(localStorage.getItem('monthly_budget')) || 0;
    if (budgetPrefissato <= 0) {
        navBadge.style.display = 'none';
        return;
    }

    const rispettato = calcolaSpesaMeseCorrente(shows) <= budgetPrefissato;
    navBadge.style.display = 'inline-block';
    navBadge.textContent = rispettato ? 'Budget OK' : 'Budget KO';
    navBadge.className = `nav-badge ${rispettato ? 'stato-ok' : 'stato-ko'}`;
}
