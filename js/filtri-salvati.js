/* ==========================================================================
   FILTRI DELLE TABELLE RICORDATI ALLA RIAPERTURA
   ==========================================================================
   Ordine e filtri Sito/Tag della cronologia, filtro Sito e "Solo online" della
   classifica, "Solo online" del Preventivo restano come li si è lasciati (localStorage). La ricerca per nome
   no: di solito serve una volta sola. "Mostra N risultati" e gli anni sono
   salvati da cronologia.js. Ordine e "Solo online" hanno valori fissi e si
   ripristinano all'avvio; i select di sito e tag, riempiti dopo aver letto i
   cataloghi, chiedono il valore salvato con filtroSalvato() (gestione-siti.js, tag.js). */

// ID del campo -> chiave in localStorage
const FILTRI = {
    ordineData: 'filtroOrdineCronologia',
    filtroSitoCronologia: 'filtroSitoCronologia',
    filtroTagCronologia: 'filtroTagCronologia',
    filtroSitoClassifica: 'filtroSitoClassifica',
    filtroSoloOnline: 'filtroSoloOnline',
    filtroSoloOnlinePreventivo: 'filtroSoloOnlinePreventivo'
};

// Valore salvato del filtro ('' se non c'è o se il campo non è tra quelli ricordati)
export function filtroSalvato(id) {
    if (!Object.hasOwn(FILTRI, id)) return '';
    try {
        return localStorage.getItem(FILTRI[id]) || '';
    } catch {
        return '';
    }
}

function salvaFiltro(campo) {
    try {
        localStorage.setItem(FILTRI[campo.id], campo.type === 'checkbox' ? (campo.checked ? '1' : '') : campo.value);
    } catch { /* il filtro vale solo per questa sessione */ }
}

// "Reset filtri" della cronologia: i valori tornano quelli predefiniti anche alla riapertura
export function dimenticaFiltri(ids) {
    ids.forEach(id => {
        try { localStorage.removeItem(FILTRI[id]); } catch { /* niente da togliere */ }
    });
}

// Da chiamare all'avvio, prima di disegnare cronologia e classifica
export function inizializzaFiltriSalvati() {
    const ordine = document.getElementById('ordineData');
    const ordineSalvato = filtroSalvato('ordineData');
    if (ordine && [...ordine.options].some(o => o.value === ordineSalvato)) ordine.value = ordineSalvato;
    // Caselle ("Solo online" di classifica e Preventivo)
    Object.keys(FILTRI).forEach(id => {
        const campo = document.getElementById(id);
        if (campo?.type === 'checkbox') campo.checked = filtroSalvato(id) === '1';
    });

    document.addEventListener('change', (e) => {
        if (Object.hasOwn(FILTRI, e.target.id)) salvaFiltro(e.target);
    });
}
