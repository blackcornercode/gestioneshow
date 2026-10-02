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
        
        if (budgetPrefissato > 0) {
            const percentuale = Math.min(100, Math.max(0, (spesaMeseCorrente / budgetPrefissato) * 100));
            progressBar.style.width = `${percentuale}%`;
            
            if (mancante >= 0) {
                budgetRemainingText.textContent = `${t('budget.remaining')}: € ${mancante.toFixed(2)}`;
                budgetRemainingText.style.color = '#15803d';
                progressBar.style.backgroundColor = '#16a34a';
            } else {
                budgetRemainingText.textContent = `${t('budget.exceeded_by')}: € ${Math.abs(mancante).toFixed(2)}`;
                budgetRemainingText.style.color = '#b91c1c';
                progressBar.style.backgroundColor = '#dc2626';
            }
        } else {
            progressBar.style.width = '0%';
            budgetRemainingText.textContent = t('budget.not_set_badge');
            budgetRemainingText.style.color = '#475569';
        }
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

        let bgColor = 'transparent';
        if (eMeseCorrente) {
            bgColor = '#fef9c3';
        } else if (isAttivo) {
            bgColor = 'rgba(42, 157, 143, 0.15)';
        }

        const stileTr = haShow 
            ? `cursor: pointer; background-color: ${bgColor}; color: ${eMeseCorrente ? '#1e293b' : 'inherit'}; border-bottom: 1px solid var(--border-color);`
            : `background-color: ${bgColor}; color: ${eMeseCorrente ? '#1e293b' : 'inherit'}; border-bottom: 1px solid var(--border-color); opacity: 0.6;`;

        const tooltipText = haShow ? t('stats.click_details') : t('stats.no_shows_month');

        html += `
            <tr style="${stileTr}" ${haShow ? `onclick="selezionaMeseDettaglio(${idx})"` : ''} title="${tooltipText}">
                <td style="padding: 10px;">
                    <strong>${haShow ? (isAttivo ? '🔽 ' : '▶ ') : ''}${nomeMese} ${eMeseCorrente ? `📌 (${t('stats.current')})` : ''}</strong>
                </td>
                <td style="padding: 10px; text-align: center;">${countMese[idx]}</td>
                <td style="padding: 10px; text-align: right; color: ${eMeseCorrente ? '#1e293b' : 'var(--accent-color)'}; font-weight: bold;">€ ${spesaMese[idx].toFixed(2)}</td>
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
                            <th>${t('table.duration')}</th>
                            <th>${t('table.cost')}</th>
                            <th>${t('table.rating')}</th>
                            <th>${t('table.review')}</th>
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

            let votoTxt = '-';
            if (!item.isRegalo) {
                votoTxt = (item.punteggio === 'TBD' || !item.punteggio) ? 'TBD' : `${item.punteggio} / 5`;
            }

            const durataTxt = formattaTempo(item.durata || item.tempoShow || 0);

            html += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 6px;">${imgHtml}</td>
                    <td style="white-space: nowrap; padding: 6px;">${escapeHtml(item.dataFormattata || item.data)}</td>
                    <td style="padding: 6px;"><strong style="cursor: pointer; color: var(--text-color);" onclick="apriModalModella(${argJs(item.nome)})">${escapeHtml(item.nome)}</strong></td>
                    <td style="padding: 6px;">${getPiattaformaFormatted(item)}</td>
                    <td style="padding: 6px; text-align: center; font-weight: bold; color: var(--text-color); white-space: nowrap;">${durataTxt}</td>
                    <td style="white-space: nowrap; padding: 6px;">${formattaEuro(item.costo)}</td>
                    <td style="padding: 6px;">${votoTxt}</td>
                    <td style="text-align: center; padding: 6px;">${item.recensione ? '✅' : '❌'}</td>
                    <td style="padding: 6px;" title="${escapeHtml(item.note)}">${escapeHtml(item.note)}</td>
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

function aggiornaIndicatoreBudgetHomepage(shows) {
    const widget = document.getElementById('homepageBudgetWidget');
    const title = document.getElementById('budgetWidgetTitle');
    const subtitle = document.getElementById('budgetWidgetSubtitle');
    const amount = document.getElementById('budgetWidgetAmount');
    const badge = document.getElementById('budgetWidgetBadge');
    const icon = document.getElementById('budgetWidgetIcon');
    const progressBar = document.getElementById('homepageProgressBar');

    // Badge nel menu di navigazione
    const navBadge = document.getElementById('navBudgetBadge');

    const budgetPrefissato = parseFloat(localStorage.getItem('monthly_budget')) || 0;

    const spesaMeseCorrente = calcolaSpesaMeseCorrente(shows);

    if (amount) amount.textContent = `€ ${spesaMeseCorrente.toFixed(2)} / € ${budgetPrefissato.toFixed(2)}`;

    // Se non c'è budget impostato
    if (budgetPrefissato <= 0) {
        if (icon) icon.textContent = 'ℹ️';
        if (subtitle) subtitle.textContent = t('budget.not_set_sub');
        if (badge) {
            badge.textContent = t('budget.not_set_badge');
            badge.style.backgroundColor = '#e2e8f0';
            badge.style.color = '#475569';
        }
        if (widget) widget.style.borderLeft = '6px solid #94a3b8';
        if (progressBar) progressBar.style.width = '0%';

        // Nav Badge
        if (navBadge) {
            navBadge.style.display = 'none';
        }
        return;
    }

    const percentuale = Math.min(100, Math.max(0, (spesaMeseCorrente / budgetPrefissato) * 100));
    if (progressBar) progressBar.style.width = `${percentuale}%`;

    const differenza = budgetPrefissato - spesaMeseCorrente;

    if (differenza >= 0) {
        // BUDGET RISPETTATO
        if (icon) icon.textContent = '✅';
        if (subtitle) subtitle.textContent = `${t('budget.under_limit')} ${t('budget.remaining')}: € ${differenza.toFixed(2)}`;
        if (badge) {
            badge.textContent = t('budget.under_budget_badge');
            badge.style.backgroundColor = '#dcfce7';
            badge.style.color = '#15803d';
        }
        if (widget) widget.style.borderLeft = '6px solid #22c55e';
        if (progressBar) progressBar.style.backgroundColor = '#22c55e';

        // Nav Badge
        if (navBadge) {
            navBadge.style.display = 'inline-block';
            navBadge.textContent = 'Budget OK';
            navBadge.style.backgroundColor = '#22c55e';
            navBadge.style.color = '#ffffff';
        }
    } else {
        // BUDGET SUPERATO
        const sforamento = Math.abs(differenza);
        if (icon) icon.textContent = '⚠️';
        if (subtitle) subtitle.textContent = `${t('budget.exceeded_warning')} € ${sforamento.toFixed(2)}`;
        if (badge) {
            badge.textContent = t('budget.exceeded_badge');
            badge.style.backgroundColor = '#fee2e2';
            badge.style.color = '#b91c1c';
        }
        if (widget) widget.style.borderLeft = '6px solid #ef4444';
        if (progressBar) progressBar.style.backgroundColor = '#ef4444';

        // Nav Badge
        if (navBadge) {
            navBadge.style.display = 'inline-block';
            navBadge.textContent = 'Budget KO';
            navBadge.style.backgroundColor = '#ef4444';
            navBadge.style.color = '#ffffff';
        }
    }
}
