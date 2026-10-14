import { anniDisponibili, filtraOrdinaShows, paginaDi } from './calcoli.js';
import { dimenticaFiltri } from './filtri-salvati.js';
import { t } from './i18n.js';
import { logger } from './logger.js';
import { COLONNE_CRONOLOGIA, intestazioneShow, righeShow } from './righe-show.js';
import { aggiornaBarraSelezione } from './selezione.js';
import { stato } from './stato.js';
import { costoMedioAlMinuto, minutiDelloShow, formattaTempo, formattaEuro } from './utils.js';

/* ==========================================================================
   CRONOLOGIA: FILTRI PER ANNO E NOME
   ========================================================================== */
export function inizializzaFiltriCronologia() {
    const limiteSalvato = localStorage.getItem('limiteRisultati');
    const limiteSelect = document.getElementById('limiteRisultati');
    if (limiteSelect && limiteSalvato) {
        limiteSelect.value = limiteSalvato;
    }
}

export function inizializzaFiltroAnni(shows) {
    const container = document.getElementById('container-filtri-anni');
    if (!container) return;

    container.innerHTML = '';

    const salvati = localStorage.getItem('anniSelezionatiFiltro');
    if (salvati) {
        try {
            stato.anniSelezionati = new Set(JSON.parse(salvati));
        } catch (e) {
            console.error("Errore nel ripristino degli anni dal localStorage", e);
        }
    }

    const anni = anniDisponibili(shows);
    // Un anno scelto che non ha più show (es. eliminati tutti) resterebbe nel filtro
    // senza una casella da togliere, e la cronologia sembrerebbe vuota
    const sceltiValidi = [...stato.anniSelezionati].filter(anno => anni.includes(anno));
    if (sceltiValidi.length !== stato.anniSelezionati.size) {
        stato.anniSelezionati = new Set(sceltiValidi);
        localStorage.setItem('anniSelezionatiFiltro', JSON.stringify(sceltiValidi));
    }
    if (anni.length === 0) {
        container.innerHTML = `<span class="filtro-anni-vuoto">${t('history.no_years')}</span>`;
        return;
    }

    const applicaFiltro = () => {
        localStorage.setItem('anniSelezionatiFiltro', JSON.stringify(Array.from(stato.anniSelezionati)));
        stato.paginaCorrente = 1;
        caricaCronologia(stato.tuttiGliShow);
    };
    const creaCasella = (testo, classe, alCambio) => {
        const wrapper = document.createElement('label');
        wrapper.className = classe;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.addEventListener('change', (e) => alCambio(e.target.checked));
        wrapper.appendChild(checkbox);
        wrapper.appendChild(document.createTextNode(testo));
        container.appendChild(wrapper);
        return checkbox;
    };

    // "Seleziona tutti": spunta o toglie tutti gli anni; parzialmente spuntata
    // se solo alcuni anni sono scelti (nessun anno scelto = nessun filtro)
    const caselleAnni = [];
    const casellaTutti = creaCasella(t('history.select_all_years'), 'filtro-anno filtro-anno-tutti', (spuntata) => {
        stato.anniSelezionati = new Set(spuntata ? anni : []);
        caselleAnni.forEach(c => { c.checked = spuntata; });
        aggiornaTutti();
        applicaFiltro();
    });
    const aggiornaTutti = () => {
        const scelti = anni.filter(anno => stato.anniSelezionati.has(anno)).length;
        casellaTutti.checked = scelti === anni.length;
        casellaTutti.indeterminate = scelti > 0 && scelti < anni.length;
    };

    anni.forEach(anno => {
        const checkbox = creaCasella(anno, 'filtro-anno', (spuntata) => {
            if (spuntata) stato.anniSelezionati.add(anno);
            else stato.anniSelezionati.delete(anno);
            aggiornaTutti();
            applicaFiltro();
        });
        checkbox.value = anno;
        checkbox.checked = stato.anniSelezionati.has(anno);
        caselleAnni.push(checkbox);
    });
    aggiornaTutti();
}

/* ==========================================================================
   CRONOLOGIA E PAGINAZIONE
   ========================================================================== */
export function caricaCronologia(shows) {
    const listaShow = document.getElementById('listaShow');
    if (!listaShow) return;

    const limite = document.getElementById('limiteRisultati')?.value || '5';

    // Il filtro per nome resta attivo anche cambiando pagina, ordine, numero di risultati o anno
    const filtrati = filtraOrdinaShows(shows, {
        nome: document.getElementById('searchModellaCronologia')?.value || '',
        anni: [...stato.anniSelezionati],
        ordine: document.getElementById('ordineData')?.value || 'desc',
        tag: document.getElementById('filtroTagCronologia')?.value || '',
        sito: document.getElementById('filtroSitoCronologia')?.value || ''
    });
    const { elementi, pagina, totalePagine } = paginaDi(filtrati, limite, stato.paginaCorrente);
    stato.paginaCorrente = pagina;

    const intestazione = document.getElementById('intestazioneCronologia');
    if (intestazione) intestazione.innerHTML = intestazioneShow(COLONNE_CRONOLOGIA);
    // Per la selezione multipla: show della pagina e show che passano i filtri
    stato.idPaginaCronologia = elementi.map(s => String(s.id));
    stato.idFiltratiCronologia = filtrati.map(s => String(s.id));
    listaShow.innerHTML = righeShow(elementi, COLONNE_CRONOLOGIA);
    aggiornaPiedeCronologia(elementi, filtrati.length, totalePagine, limite === 'all');
    aggiornaBarraSelezione();
    aggiornaControlliPaginazione(totalePagine, limite === 'all');
}

export function cambiaPagina(direzione) {
    stato.paginaCorrente += direzione;
    logger.info(`Navigazione pagina cronologia: ${stato.paginaCorrente}`);
    caricaCronologia(stato.tuttiGliShow);
}

export function aggiornaControlliPaginazione(totalePagine, mostraTutti) {
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

    if (btnIndietro) btnIndietro.disabled = (stato.paginaCorrente <= 1);
    if (btnAvanti) btnAvanti.disabled = (stato.paginaCorrente >= totalePagine);
    if (infoPagina) {
        infoPagina.textContent = t('pagination.page_of')
            .replace('{page}', stato.paginaCorrente)
            .replace('{total}', totalePagine);
    }
}

export function resetFiltriCronologia() {
    logger.info("Reset dei filtri cronologia richiesto.");
    const ordine = document.getElementById('ordineData');
    const limite = document.getElementById('limiteRisultati');
    if (ordine) ordine.value = 'desc';
    if (limite) limite.value = '5';

    const searchInput = document.getElementById('searchModellaCronologia');
    if (searchInput) searchInput.value = '';
    const filtroTag = document.getElementById('filtroTagCronologia');
    if (filtroTag) filtroTag.value = '';
    const filtroSito = document.getElementById('filtroSitoCronologia');
    if (filtroSito) filtroSito.value = '';

    stato.anniSelezionati.clear();
    localStorage.removeItem('anniSelezionatiFiltro');

    inizializzaFiltroAnni(stato.tuttiGliShow);

    localStorage.removeItem('limiteRisultati');
    dimenticaFiltri(['ordineData', 'filtroSitoCronologia', 'filtroTagCronologia']);
    stato.paginaCorrente = 1;
    caricaCronologia(stato.tuttiGliShow);
}

export function filtraCronologiaPerNome() {
    stato.paginaCorrente = 1;
    caricaCronologia(stato.tuttiGliShow);
}

/* ⑦ Riga dei totali sotto la tabella: durata e costo della pagina corrente */
function aggiornaPiedeCronologia(elementi, totFiltrati, totalePagine, mostraTutti) {
    const piede = document.getElementById('piedeCronologia');
    if (!piede) return;
    if (elementi.length === 0) { piede.innerHTML = ''; return; }

    const minutiTot = elementi.reduce((s, show) => s + (minutiDelloShow(show) || 0), 0);
    const costoTot  = elementi.reduce((s, show) => s + (parseFloat(show.costo) || 0), 0);
    const mediaMin  = costoMedioAlMinuto(elementi);

    const conteggio = t('history.footer_count').replace('{n}', totFiltrati);
    const labelPagina = mostraTutti
        ? conteggio
        : `${t('pagination.page_of').replace('{page}', stato.paginaCorrente).replace('{total}', totalePagine)} · ${conteggio}`;

    const colSpanSx = COLONNE_CRONOLOGIA.indexOf('durata');   // celle prima di durata
    const durHTML   = minutiTot > 0 ? `<strong>${formattaTempo(minutiTot)}</strong>` : '–';
    const costoHTML = `<strong>${formattaEuro(costoTot)}</strong>`;
    const medHTML   = mediaMin !== null ? `<strong>€ ${mediaMin.toFixed(2)}</strong>` : '–';

    // Le colonne a destra di €/min (voto, recensione, note, azioni) riempiono il resto
    const colSpanDx = COLONNE_CRONOLOGIA.length - COLONNE_CRONOLOGIA.indexOf('costoMinuto') - 1;

    piede.innerHTML = `<tr>
        <td colspan="${colSpanSx}" class="piede-etichetta">${labelPagina}</td>
        <td class="col-centro">${durHTML}</td>
        <td>${costoHTML}</td>
        <td class="col-centro">${medHTML}</td>
        <td colspan="${colSpanDx}" class="piede-etichetta">${t('history.footer_totals')}</td>
    </tr>`;
}
