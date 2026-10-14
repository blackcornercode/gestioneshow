/* ==========================================================================
   TRADUZIONI (i18n)
   ========================================================================== */
export let traduzioniCorrenti = {};
// Lingue disponibili (un file locales/<codice>.json per ognuna) con il formato
// usato per date e giorni della settimana. I nomi compaiono nei selettori di index.html.
export const LINGUE = {
    it: { nome: 'Italiano', locale: 'it-IT' },
    en: { nome: 'English', locale: 'en-GB' },
    es: { nome: 'Español', locale: 'es-ES' },
    fr: { nome: 'Français', locale: 'fr-FR' },
    de: { nome: 'Deutsch', locale: 'de-DE' },
    pt: { nome: 'Português', locale: 'pt-BR' },
    ro: { nome: 'Română', locale: 'ro-RO' },
    ru: { nome: 'Русский', locale: 'ru-RU' }
};

// Senza una scelta salvata (primissimo avvio) si parte dalla lingua del sistema,
// se è tra quelle tradotte, altrimenti dall'inglese
export const linguaDiSistema = () => {
    const codice = String(globalThis.navigator?.language || '').toLowerCase().split('-')[0];
    return Object.hasOwn(LINGUE, codice) ? codice : 'en';
};
const linguaSalvata = localStorage.getItem('appLang');
export let linguaCorrente = Object.hasOwn(LINGUE, linguaSalvata || '') ? linguaSalvata : linguaDiSistema();

// Formato di date e giorni della settimana mostrati nell'interfaccia (es. "lun" / "Mon")
export const localeCorrente = () => LINGUE[linguaCorrente]?.locale || 'en-GB';

// Carica il file JSON della lingua
export async function caricaLingua(lang) {
    if (!Object.hasOwn(LINGUE, lang)) lang = 'en';
    try {
        const response = await fetch(`./locales/${lang}.json`);
        traduzioniCorrenti = await response.json();
        linguaCorrente = lang;
        localStorage.setItem('appLang', lang);
        // Lingua della pagina: lettori di schermo e sillabazione (hyphens: auto in style.css)
        document.documentElement.lang = lang;

        aggiornaTestiDOM();

        // Allinea i selettori della lingua (Impostazioni e benvenuto al primo avvio)
        for (const id of ['selectLingua', 'linguaBenvenuto']) {
            const select = document.getElementById(id);
            if (select) select.value = lang;
        }
    } catch (err) {
        console.error(`Errore nel caricamento della lingua ${lang}:`, err);
    }
}

// Funzione helper per recuperare chiavi annidate (es. t('form.title'))
export function t(key) {
    return key.split('.').reduce((obj, i) => (obj ? obj[i] : null), traduzioniCorrenti) || key;
}

// Aggiorna tutti gli elementi con data-i18n, data-i18n-ph e data-i18n-title
export function aggiornaTestiDOM() {
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

    // Tooltip (attributo title)
    document.querySelectorAll('[data-i18n-title]').forEach(elem => {
        elem.title = t(elem.getAttribute('data-i18n-title'));
    });
}

// Imposta direttamente le traduzioni (usata dai test, senza leggere i file JSON)
export function impostaTraduzioni(traduzioni) {
    traduzioniCorrenti = traduzioni;
}
