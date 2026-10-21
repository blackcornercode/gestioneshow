import { t } from './i18n.js';
import { logger } from './logger.js';

/* ==========================================================================
   PRIVACY
   ==========================================================================
   - Sfocatura delle foto: classe "modalita-discreta" sul body (style.css), le foto
     tornano nitide solo al passaggio del mouse. Preferenza in localStorage.
   - Nome e icona neutri: titolo "Agenda" e icona generica della finestra; li
     applica il processo principale (main/ipc-privacy.js), anche all'avvio.
   - PIN di sblocco: schermata di blocco all'avvio, dopo N minuti di inattività
     e con il tasto rapido personalizzabile (predefinito Ctrl+Shift+H, che riduce
     anche a icona). Il PIN viene verificato dal
     processo principale: qui non se ne conosce né il valore né l'hash.
   Il blocco impedisce di usare l'app aperta; i file dei dati non sono cifrati. */

const CHIAVE_SFOCATURA = 'sfocaFoto';
const CONTROLLO_INATTIVITA_MS = 15 * 1000;

let preferenze = { aspettoNeutro: false, pinImpostato: false, bloccoMinuti: 0 };
let ultimaAttivita = Date.now();
let bloccata = false;
let modoFinestraPin = 'imposta';

const elemento = (id) => document.getElementById(id);
const api = () => window.electronAPI || {};
const secondi = (ms) => Math.ceil(ms / 1000);

/* --------------------------------------------------------------------------
   SFOCATURA DELLE FOTO
   -------------------------------------------------------------------------- */
export function sfocaturaAttiva() {
    try {
        return localStorage.getItem(CHIAVE_SFOCATURA) === '1';
    } catch {
        return false;
    }
}

function applicaSfocatura(attiva) {
    document.body.classList.toggle('modalita-discreta', attiva);
    const casella = elemento('opzSfocatura');
    if (casella) casella.checked = attiva;
}

export function cambiaSfocatura(casella) {
    try {
        localStorage.setItem(CHIAVE_SFOCATURA, casella.checked ? '1' : '0');
    } catch { /* preferenza valida solo per questa sessione */ }
    applicaSfocatura(casella.checked);
    logger.info(`Sfocatura delle foto ${casella.checked ? 'attivata' : 'disattivata'}`);
}

/* --------------------------------------------------------------------------
   OPZIONI DEL MENU IMPOSTAZIONI
   -------------------------------------------------------------------------- */
function aggiornaControlliPrivacy() {
    const neutro = elemento('opzAspettoNeutro');
    if (neutro) neutro.checked = preferenze.aspettoNeutro;
    const btnPin = elemento('btnPin');
    if (btnPin) btnPin.textContent = t(preferenze.pinImpostato ? 'privacy.pin_change' : 'privacy.pin_set');
    const btnRimuovi = elemento('btnRimuoviPin');
    if (btnRimuovi) btnRimuovi.hidden = !preferenze.pinImpostato;
    const blocco = elemento('selectBloccoMinuti');
    if (blocco) {
        blocco.value = String(preferenze.bloccoMinuti);
        // Senza PIN non c'è nulla con cui sbloccare
        blocco.disabled = !preferenze.pinImpostato;
        blocco.title = preferenze.pinImpostato ? '' : t('privacy.autolock_needs_pin');
    }
}

async function salvaPreferenza(chiave, valore) {
    const esito = await api().salvaPreferenza?.(chiave, valore);
    if (!esito || !esito.success) {
        alert(`❌ ${t('privacy.save_error')}${esito?.error ? `: ${esito.error}` : ''}`);
        aggiornaControlliPrivacy();
        return false;
    }
    preferenze = esito.preferenze;
    aggiornaControlliPrivacy();
    return true;
}

export async function cambiaAspettoNeutro(casella) {
    if (await salvaPreferenza('aspettoNeutro', casella.checked)) {
        logger.info(`Nome e icona neutri ${casella.checked ? 'attivati' : 'disattivati'}`);
    }
}

export async function cambiaBloccoMinuti(select) {
    if (await salvaPreferenza('bloccoMinuti', Number(select.value))) {
        logger.info(`Blocco automatico: ${select.value === '0' ? 'mai' : `dopo ${select.value} minuti`}`);
    }
}

/* --------------------------------------------------------------------------
   FINESTRA DEL PIN (imposta, cambia, rimuovi)
   -------------------------------------------------------------------------- */
export function apriFinestraPin(pulsante) {
    modoFinestraPin = pulsante.dataset.modo === 'rimuovi' ? 'rimuovi' : 'imposta';
    const modale = elemento('modalPin');
    if (!modale) return;
    ['pinAttuale', 'pinNuovo', 'pinConferma'].forEach(id => { const campo = elemento(id); if (campo) campo.value = ''; });
    elemento('errorePin').textContent = '';
    elemento('gruppoPinAttuale').hidden = !preferenze.pinImpostato;
    modale.querySelectorAll('.gruppo-pin-nuovo').forEach(g => { g.hidden = modoFinestraPin === 'rimuovi'; });
    elemento('titoloFinestraPin').textContent = t(modoFinestraPin === 'rimuovi' ? 'privacy.pin_remove'
        : preferenze.pinImpostato ? 'privacy.pin_change' : 'privacy.pin_set');
    modale.style.display = 'block';
    (preferenze.pinImpostato ? elemento('pinAttuale') : elemento('pinNuovo'))?.focus();
}

export function chiudiFinestraPin() {
    const modale = elemento('modalPin');
    if (modale) modale.style.display = 'none';
}

export async function salvaPin() {
    const errore = elemento('errorePin');
    const attuale = elemento('pinAttuale').value;
    const nuovo = modoFinestraPin === 'rimuovi' ? '' : elemento('pinNuovo').value;
    if (modoFinestraPin !== 'rimuovi') {
        if (!/^\d{4,8}$/.test(nuovo)) { errore.textContent = t('privacy.pin_invalid'); return; }
        if (nuovo !== elemento('pinConferma').value) { errore.textContent = t('privacy.pin_mismatch'); return; }
    }
    const esito = await api().impostaPin?.({ attuale, nuovo });
    if (!esito || !esito.success) {
        errore.textContent = esito?.attesaMs > 0 ? t('privacy.wait').replace('{s}', secondi(esito.attesaMs))
            : esito?.error === 'pin_errato' ? t('privacy.pin_wrong')
            : t('privacy.save_error');
        return;
    }
    preferenze = esito.preferenze;
    aggiornaControlliPrivacy();
    chiudiFinestraPin();
    logger.success(nuovo ? 'PIN di sblocco impostato' : 'PIN di sblocco rimosso');
}

/* --------------------------------------------------------------------------
   SCHERMATA DI BLOCCO
   -------------------------------------------------------------------------- */
// Durante il blocco tutto il resto della pagina è "inert": niente clic né Tab
function impostaPaginaInerte(inerte) {
    [...document.body.children].forEach(figlio => {
        if (figlio.id !== 'schermataBlocco' && figlio.tagName !== 'SCRIPT') figlio.inert = inerte;
    });
}

// true mentre è visibile la schermata di blocco (i controlli periodici restano fermi, timer.js)
export const appBloccata = () => bloccata;

export function blocca() {
    if (!preferenze.pinImpostato || bloccata) return;
    bloccata = true;
    impostaPaginaInerte(true);
    const schermata = elemento('schermataBlocco');
    schermata.hidden = false;
    elemento('pinSblocco').value = '';
    elemento('erroreSblocco').textContent = '';
    elemento('pinSblocco').focus();
}

export async function sblocca() {
    const campo = elemento('pinSblocco');
    const errore = elemento('erroreSblocco');
    const esito = await api().verificaPin?.(campo.value);
    if (!esito || !esito.success) {
        errore.textContent = esito?.attesaMs > 0 ? t('privacy.wait').replace('{s}', secondi(esito.attesaMs)) : t('privacy.pin_wrong');
        campo.value = '';
        campo.focus();
        return;
    }
    bloccata = false;
    ultimaAttivita = Date.now();
    elemento('schermataBlocco').hidden = true;
    impostaPaginaInerte(false);
    // I controlli periodici saltati durante il blocco ripartono (timer.js)
    document.dispatchEvent(new CustomEvent('app-sbloccata'));
}

// Tasto rapido: blocca (se c'è un PIN) e riduce subito a icona
export async function nascondiApp() {
    blocca();
    await api().riduciFinestra?.();
}

/* --------------------------------------------------------------------------
   TASTO RAPIDO PER NASCONDERE L'APP (personalizzabile, in localStorage)
   -------------------------------------------------------------------------- */
const CHIAVE_TASTO_RAPIDO = 'tastoRapidoNascondi';
export const TASTO_RAPIDO_PREDEFINITO = 'Ctrl+Shift+H';
// Già usate dall'app (Ctrl+Invio salva il form) o dal sistema
const COMBINAZIONI_RISERVATE = ['Ctrl+A', 'Ctrl+C', 'Ctrl+V', 'Ctrl+X', 'Ctrl+Y', 'Ctrl+Z', 'Ctrl+Shift+Z', 'Alt+F4', 'Ctrl+F4', 'Ctrl+W', 'Ctrl+R', 'Ctrl+Shift+I', 'F5'];

// Combinazione di un evento keydown, es. "Ctrl+Shift+H", "Alt+5", "F9".
// Si usa e.code (posizione del tasto), così vale con qualsiasi layout di tastiera.
// null se il tasto premuto è solo un modificatore o non è previsto.
export function combinazioneDaEvento(e) {
    let tasto = null;
    let m;
    if ((m = /^Key([A-Z])$/.exec(e.code))) tasto = m[1];
    else if ((m = /^(?:Digit|Numpad)(\d)$/.exec(e.code))) tasto = m[1];
    else if (/^F([1-9]|1[0-2])$/.test(e.code)) tasto = e.code;
    else if (e.code === 'Enter' || e.code === 'NumpadEnter') tasto = 'Invio';
    if (!tasto) return null;
    return [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', tasto].filter(Boolean).join('+');
}

// null se la combinazione si può usare, altrimenti il motivo ('modificatore' o 'riservata')
// Lettere e numeri richiedono Ctrl o Alt: con il solo Shift (es. Shift+H) l'app
// si nasconderebbe scrivendo una maiuscola in un campo di testo.
export function problemaCombinazione(combinazione) {
    const parti = combinazione.split('+');
    const tasto = parti[parti.length - 1];
    const conCtrlOAlt = parti.includes('Ctrl') || parti.includes('Alt');
    if (!conCtrlOAlt && !/^F\d+$/.test(tasto)) return 'modificatore';
    if (COMBINAZIONI_RISERVATE.includes(combinazione) || tasto === 'Invio') return 'riservata';
    return null;
}

export function tastoRapido() {
    try {
        const salvato = localStorage.getItem(CHIAVE_TASTO_RAPIDO);
        return salvato && !problemaCombinazione(salvato) ? salvato : TASTO_RAPIDO_PREDEFINITO;
    } catch {
        return TASTO_RAPIDO_PREDEFINITO;
    }
}

function salvaTastoRapido(combinazione) {
    try {
        if (combinazione === TASTO_RAPIDO_PREDEFINITO) localStorage.removeItem(CHIAVE_TASTO_RAPIDO);
        else localStorage.setItem(CHIAVE_TASTO_RAPIDO, combinazione);
    } catch { /* vale solo per questa sessione */ }
    aggiornaTastoRapido();
    logger.info(`Tasto rapido per nascondere l'app: ${combinazione}`);
}

let registrazioneInCorso = false;

function aggiornaTastoRapido(messaggio = '') {
    const casella = elemento('tastoRapidoAttuale');
    if (casella) {
        casella.textContent = registrazioneInCorso ? t('privacy.hotkey_press') : tastoRapido();
        casella.classList.toggle('in-registrazione', registrazioneInCorso);
    }
    const ripristina = elemento('btnTastoRapidoPredefinito');
    if (ripristina) ripristina.hidden = tastoRapido() === TASTO_RAPIDO_PREDEFINITO;
    const avviso = elemento('avvisoTastoRapido');
    if (avviso) avviso.textContent = messaggio;
}

// "Cambia": la prossima combinazione premuta diventa il tasto rapido (Esc annulla)
export function registraTastoRapido() {
    registrazioneInCorso = true;
    aggiornaTastoRapido();
}

export function ripristinaTastoRapido() {
    registrazioneInCorso = false;
    salvaTastoRapido(TASTO_RAPIDO_PREDEFINITO);
}

// Ascoltatore in fase di cattura: durante la registrazione i tasti non devono
// arrivare al resto della pagina (es. Esc chiuderebbe il menu)
function gestisciTastoRapido(e) {
    if (registrazioneInCorso) {
        if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
        e.preventDefault();
        e.stopPropagation();
        if (e.key === 'Escape') {
            registrazioneInCorso = false;
            aggiornaTastoRapido();
            return;
        }
        const combinazione = combinazioneDaEvento(e);
        const problema = combinazione ? problemaCombinazione(combinazione) : 'non_valida';
        if (problema) {
            aggiornaTastoRapido(t(`privacy.hotkey_${problema}`).replace('{tasti}', combinazione || e.key));
            return;
        }
        registrazioneInCorso = false;
        salvaTastoRapido(combinazione);
        return;
    }
    if (combinazioneDaEvento(e) === tastoRapido()) {
        e.preventDefault();
        nascondiApp();
    }
}

/* --------------------------------------------------------------------------
   AVVIO
   -------------------------------------------------------------------------- */
const conInvio = (id, azione) => elemento(id)?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); azione(); }
});

// Va chiamata prima di caricare i dati: con un PIN l'app parte già bloccata
export async function inizializzaPrivacy() {
    applicaSfocatura(sfocaturaAttiva());
    try {
        if (api().leggiPreferenze) preferenze = await api().leggiPreferenze();
    } catch (err) {
        logger.error('Preferenze di privacy non lette', err);
    }
    aggiornaControlliPrivacy();
    if (preferenze.pinImpostato) blocca();

    ['mousemove', 'mousedown', 'keydown', 'wheel'].forEach(evento =>
        document.addEventListener(evento, () => { if (!bloccata) ultimaAttivita = Date.now(); }, { passive: true }));
    setInterval(() => {
        const limite = preferenze.bloccoMinuti * 60 * 1000;
        if (limite > 0 && !bloccata && Date.now() - ultimaAttivita > limite) blocca();
    }, CONTROLLO_INATTIVITA_MS);

    document.addEventListener('keydown', gestisciTastoRapido, true);
    aggiornaTastoRapido();
    conInvio('pinSblocco', sblocca);
    ['pinAttuale', 'pinNuovo', 'pinConferma'].forEach(id => conInvio(id, salvaPin));
}

// Testi generati da JS da riscrivere al cambio lingua
export function aggiornaTestiPrivacy() {
    aggiornaControlliPrivacy();
    aggiornaTastoRapido();
}
