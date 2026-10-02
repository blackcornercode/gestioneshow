/* ==========================================================================
   TRADUZIONI (i18n)
   ========================================================================== */
let traduzioniCorrenti = {};
let linguaCorrente = localStorage.getItem('appLang') || 'it';

// Carica il file JSON della lingua
async function caricaLingua(lang) {
    try {
        const response = await fetch(`./locales/${lang}.json`);
        traduzioniCorrenti = await response.json();
        linguaCorrente = lang;
        localStorage.setItem('appLang', lang);

        aggiornaTestiDOM();

        // Allinea il selettore nell'header se presente
        const select = document.getElementById('selectLingua');
        if (select) select.value = lang;
    } catch (err) {
        console.error(`Errore nel caricamento della lingua ${lang}:`, err);
    }
}

// Funzione helper per recuperare chiavi annidate (es. t('form.title'))
function t(key) {
    return key.split('.').reduce((obj, i) => (obj ? obj[i] : null), traduzioniCorrenti) || key;
}

// Aggiorna tutti gli elementi con data-i18n e data-i18n-ph
function aggiornaTestiDOM() {
    // Testi generici
    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.getAttribute('data-i18n');
        elem.textContent = t(key);
    });

    // Placeholder degli input
    document.querySelectorAll('[data-i18n-ph]').forEach(elem => {
        const key = elem.getAttribute('data-i18n-ph');
        elem.placeholder = t(key);
    });
}

// Handler richiamato dall'onchange del selettore nell'HTML
async function cambiaLingua(nuovaLingua) {
    if (!nuovaLingua) return;
    try {
        logger.info(`Cambio lingua richiesto: ${nuovaLingua}`);
        // caricaLingua salva già la preferenza in localStorage ('appLang')
        await caricaLingua(nuovaLingua);
        // Ricarica le viste che generano HTML dinamicamente tramite JS
        await aggiornaInterfaccia();
        aggiornaTestoStatoMCG();
        aggiornaPulsanteForm();
        logger.success(`Lingua aggiornata a: ${nuovaLingua}`);
    } catch (err) {
        logger.error(`Errore durante il cambio lingua a "${nuovaLingua}"`, err);
    }
}
