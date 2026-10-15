import { aggiornaShows, rimuoviShows } from './archivio.js';
import { t } from './i18n.js';
import { logger } from './logger.js';
import { stato } from './stato.js';
import { disegnaTagModificaMultipla } from './tag.js';

/* ==========================================================================
   SELEZIONE MULTIPLA DELLA CRONOLOGIA
   ==========================================================================
   Le caselle della colonna "selezione" (righe-show.js) aggiungono o tolgono
   l'ID dello show da stato.selezioneCronologia. La selezione resta valida
   cambiando pagina, filtri o ordine; la barra sopra la tabella permette di
   eliminare o modificare in un colpo solo gli show selezionati (un solo
   salvataggio su disco). Cambiare la selezione non ridisegna la tabella:
   caselle e righe evidenziate vengono allineate qui. */

const elemento = (id) => document.getElementById(id);
const testo = (chiave, valori = {}) =>
    Object.entries(valori).reduce((s, [k, v]) => s.replace(`{${k}}`, v), t(chiave));

// Allinea barra, caselle e righe evidenziate alla selezione. Chiamata da
// caricaCronologia a ogni disegno: toglie anche gli ID non più in archivio.
export function aggiornaBarraSelezione() {
    const selezione = stato.selezioneCronologia;
    const esistenti = new Set(stato.tuttiGliShow.map(s => String(s.id)));
    [...selezione].forEach(id => { if (!esistenti.has(id)) selezione.delete(id); });

    document.querySelectorAll('#listaShow .casella-selezione').forEach(casella => {
        const scelta = selezione.has(casella.dataset.id);
        casella.checked = scelta;
        casella.closest('tr')?.classList.toggle('riga-selezionata', scelta);
    });

    const pagina = stato.idPaginaCronologia;
    const sceltiInPagina = pagina.filter(id => selezione.has(id)).length;
    const casellaPagina = elemento('selezionaPaginaCronologia');
    if (casellaPagina) {
        casellaPagina.checked = pagina.length > 0 && sceltiInPagina === pagina.length;
        casellaPagina.indeterminate = sceltiInPagina > 0 && sceltiInPagina < pagina.length;
    }

    const barra = elemento('barraSelezione');
    if (!barra) return;
    barra.classList.toggle('visibile', selezione.size > 0);

    const conteggio = elemento('conteggioSelezione');
    if (conteggio) conteggio.textContent = testo('selection.count', { n: selezione.size });

    const filtrati = stato.idFiltratiCronologia;
    const sceltiFiltrati = filtrati.filter(id => selezione.has(id)).length;
    const nascosti = selezione.size - sceltiFiltrati;
    const avviso = elemento('avvisoSelezioneNascosti');
    if (avviso) avviso.textContent = nascosti > 0 ? testo('selection.hidden', { n: nascosti }) : '';

    const btnTutti = elemento('btnSelezionaFiltrati');
    if (btnTutti) {
        btnTutti.hidden = sceltiFiltrati >= filtrati.length;
        btnTutti.textContent = testo('selection.select_all_filtered', { n: filtrati.length });
    }
}

export function selezionaShow(casella) {
    if (casella.checked) stato.selezioneCronologia.add(casella.dataset.id);
    else stato.selezioneCronologia.delete(casella.dataset.id);
    aggiornaBarraSelezione();
}

// Casella dell'intestazione: seleziona o deseleziona gli show della pagina visibile
export function selezionaPagina(casella) {
    stato.idPaginaCronologia.forEach(id => {
        if (casella.checked) stato.selezioneCronologia.add(id);
        else stato.selezioneCronologia.delete(id);
    });
    aggiornaBarraSelezione();
}

// Tutti gli show che passano i filtri attuali, anche nelle altre pagine
export function selezionaTuttiFiltrati() {
    stato.idFiltratiCronologia.forEach(id => stato.selezioneCronologia.add(id));
    aggiornaBarraSelezione();
}

export function deselezionaTutti() {
    stato.selezioneCronologia.clear();
    aggiornaBarraSelezione();
}

export async function eliminaSelezionati() {
    const ids = [...stato.selezioneCronologia];
    if (ids.length === 0) return;

    const filtrati = new Set(stato.idFiltratiCronologia);
    const nascosti = ids.filter(id => !filtrati.has(id)).length;
    let messaggio = testo('selection.confirm_delete', { n: ids.length });
    if (nascosti > 0) messaggio += '\n\n' + testo('selection.confirm_hidden', { n: nascosti });
    if (!confirm(messaggio)) return;

    try {
        await rimuoviShows(ids);
        stato.selezioneCronologia.clear();
        aggiornaBarraSelezione();
        logger.success(`Eliminati ${ids.length} show selezionati`);
    } catch (err) {
        // salvaOAvvisa ha già mostrato l'errore: archivio e selezione restano invariati
        logger.error('Eliminazione multipla non riuscita', err);
    }
}

/* --------------------------------------------------------------------------
   MODIFICA MULTIPLA (finestra #modalModificaMultipla)
   -------------------------------------------------------------------------- */
const CAMPI_MODIFICA = ['mmSito', 'mmPiattaforma', 'mmPunteggio', 'mmQualita', 'mmCamera', 'mmRecensione', 'mmDurata', 'mmNickname'];

export function apriModificaMultipla() {
    const n = stato.selezioneCronologia.size;
    if (n === 0) return;
    CAMPI_MODIFICA.forEach(id => { const campo = elemento(id); if (campo) campo.value = ''; });
    stato.tagModificaMultipla.clear();
    disegnaTagModificaMultipla();
    const info = elemento('infoModificaMultipla');
    if (info) info.textContent = testo('selection.edit_info', { n });
    const modale = elemento('modalModificaMultipla');
    if (modale) modale.style.display = 'block';
}

export function chiudiModificaMultipla() {
    const modale = elemento('modalModificaMultipla');
    if (modale) modale.style.display = 'none';
}

// Campi da applicare: quelli lasciati su "non modificare" (vuoti) non compaiono.
// Restituisce null se la durata non è un numero valido.
function leggiCampiModifica() {
    const valore = (id) => (elemento(id)?.value ?? '').trim();
    const campi = {};

    if (valore('mmPiattaforma')) campi.piattaforma = valore('mmPiattaforma');

    const voto = valore('mmPunteggio');
    if (voto) campi.punteggio = voto === 'TBD' ? 'TBD' : parseInt(voto, 10);

    // Qualità e inquadratura: "-" = non indicata (toglie il valore)
    const qualita = valore('mmQualita');
    if (qualita) campi.qualita = qualita === '-' ? null : qualita;
    const camera = valore('mmCamera');
    if (camera) campi.camera = camera === '-' ? null : camera;

    const recensione = valore('mmRecensione');
    if (recensione) campi.recensione = recensione === 'si';

    const durata = valore('mmDurata');
    if (durata) {
        const minuti = Number(durata);
        if (!Number.isInteger(minuti) || minuti < 0) return null;
        campi.durata = minuti;
    }

    if (valore('mmNickname')) campi.nickname = valore('mmNickname');
    if (valore('mmSito')) campi.sito = valore('mmSito');

    const sceltaTag = [...stato.tagModificaMultipla];
    if (sceltaTag.length) {
        campi.tagAggiungi = sceltaTag.filter(([, s]) => s === '+').map(([id]) => id);
        campi.tagTogli = sceltaTag.filter(([, s]) => s === '-').map(([id]) => id);
    }
    return campi;
}

export async function applicaModificaMultipla() {
    const campi = leggiCampiModifica();
    if (campi === null) {
        alert(t('selection.invalid_duration'));
        return;
    }
    if (Object.keys(campi).length === 0) {
        alert(t('selection.nothing_to_change'));
        return;
    }

    const ids = [...stato.selezioneCronologia];
    try {
        const { modificati, regaliSaltati } = await aggiornaShows(ids, campi);
        chiudiModificaMultipla();
        logger.success(`Modifica multipla: ${modificati} show aggiornati su ${ids.length} (campi: ${Object.keys(campi).join(', ')})`);
        // La selezione resta: si possono applicare altre modifiche agli stessi show
        if (regaliSaltati > 0) alert(testo('selection.edit_done_gifts', { n: modificati, regali: regaliSaltati }));
        else if (modificati === 0) alert(t('selection.edit_none'));
    } catch (err) {
        logger.error('Modifica multipla non riuscita', err);
    }
}
