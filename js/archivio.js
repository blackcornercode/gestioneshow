import { calcolaMappeModelle, calcolaModelleUniche, applicaModificheMultiple, togliTagDaShows, rinominaModella } from './calcoli.js';
import { logger } from './logger.js';
import { stato } from './stato.js';
import { normalizzaShow, salvaOAvvisa, costoMedioAlMinuto } from './utils.js';

/* ==========================================================================
   ARCHIVIO DEGLI SHOW IN MEMORIA
   ==========================================================================
   L'archivio vive in memoria (stato.tuttiGliShow, in stato.js) ed è l'unica fonte
   di verità per l'interfaccia. Si legge dal disco solo all'avvio e dopo
   un'importazione (caricaArchivio). Ogni modifica passa da salvaArchivio:
   prima scrive su disco, poi aggiorna la memoria e ridisegna le viste
   (aggiornaViste), senza rileggere il file. */

// Lettura dal disco: ogni record viene portato al formato attuale (normalizzaShow),
// così il resto del codice non deve gestire i campi delle versioni precedenti.
export async function leggiArchivio() {
    const shows = await window.electronAPI.readData();
    return Array.isArray(shows) ? shows.map(normalizzaShow) : [];
}

// Copia indipendente dell'archivio, per elaborazioni che modificano i record
// (es. la sincronizzazione MCG) prima di decidere se salvarli
export function copiaArchivio() {
    return structuredClone(stato.tuttiGliShow);
}

// Salva un nuovo elenco completo di show. Se il salvataggio su disco fallisce
// (salvaOAvvisa mostra l'errore e lancia un'eccezione) la memoria resta invariata.
export async function salvaArchivio(nuoviShows) {
    await salvaOAvvisa(nuoviShows);
    stato.tuttiGliShow = nuoviShows;
    aggiornaViste();
}

// Catalogo dei tag: letto con l'archivio, salvato a parte (tags.json)
export async function leggiCatalogoTag() {
    const catalogo = await window.electronAPI.readTags();
    return Array.isArray(catalogo) ? catalogo : [];
}

// Catalogo dei siti: letto con l'archivio, salvato a parte (siti.json)
export async function leggiCatalogoSiti() {
    if (!window.electronAPI.readSites) return [];
    const catalogo = await window.electronAPI.readSites();
    return Array.isArray(catalogo) ? catalogo : [];
}

export async function salvaCatalogoSiti(nuovoCatalogo) {
    const esito = await window.electronAPI.saveSites(nuovoCatalogo);
    if (!esito || !esito.success) {
        const messaggio = esito?.error || 'errore sconosciuto';
        alert(`❌ Salvataggio dei siti non riuscito: ${messaggio}`);
        throw new Error(messaggio);
    }
    stato.catalogoSiti = nuovoCatalogo;
    aggiornaViste();
}

export async function salvaCatalogoTag(nuovoCatalogo) {
    const esito = await window.electronAPI.saveTags(nuovoCatalogo);
    if (!esito || !esito.success) {
        const messaggio = esito?.error || 'errore sconosciuto';
        alert(`❌ Salvataggio dei tag non riuscito: ${messaggio}`);
        throw new Error(messaggio);
    }
    stato.catalogoTag = nuovoCatalogo;
    aggiornaViste();
}

// Elimina un tag dal catalogo e dagli show che lo usano.
// Restituisce quanti show sono stati modificati.
export async function eliminaTagDalCatalogo(id) {
    const { shows, modificati } = togliTagDaShows(stato.tuttiGliShow, id);
    if (modificati > 0) await salvaArchivio(shows);
    await salvaCatalogoTag(stato.catalogoTag.filter(tag => tag.id !== id));
    return modificati;
}

export function aggiungiShow(show) {
    return salvaArchivio([...stato.tuttiGliShow, show]);
}

// Aggiorna i campi di uno show esistente mantenendo quelli che il form non
// gestisce (es. rimborsato, costoOriginale, dataRimborso): prima il record
// veniva sostituito per intero e queste informazioni andavano perse.
export async function aggiornaShow(id, campi) {
    if (!stato.tuttiGliShow.some(s => String(s.id) === String(id))) {
        throw new Error(`Show con ID ${id} non trovato`);
    }
    return salvaArchivio(stato.tuttiGliShow.map(s => String(s.id) === String(id) ? { ...s, ...campi } : s));
}

// Aggiunge più show con un solo salvataggio su disco (importazione CSV)
export function aggiungiShows(nuovi) {
    return salvaArchivio([...stato.tuttiGliShow, ...nuovi]);
}

// Elimina più show con un solo salvataggio su disco
export function rimuoviShows(ids) {
    const daTogliere = new Set(ids.map(String));
    return salvaArchivio(stato.tuttiGliShow.filter(s => !daTogliere.has(String(s.id))));
}

// Modifica più show insieme con un solo salvataggio (vedi applicaModificheMultiple).
// Restituisce { modificati, regaliSaltati }; se nessuno show cambia non salva.
export async function aggiornaShows(ids, campi) {
    const { shows, modificati, regaliSaltati } = applicaModificheMultiple(stato.tuttiGliShow, ids, campi);
    if (modificati > 0) await salvaArchivio(shows);
    return { modificati, regaliSaltati };
}

// Unisci / separa modelle (scheda della modella): un solo salvataggio
export async function rinominaShowsModella(daNome, aNome, sito = null) {
    const { shows, modificati } = rinominaModella(stato.tuttiGliShow, daNome, aNome, sito);
    if (modificati > 0) await salvaArchivio(shows);
    return modificati;
}

export function rimuoviShow(id) {
    return salvaArchivio(stato.tuttiGliShow.filter(s => String(s.id) !== String(id)));
}

export function trovaShow(id) {
    return stato.tuttiGliShow.find(s => String(s.id) === String(id)) || null;
}

// Funzioni da chiamare dopo ogni cambiamento dell'archivio (le viste, registrate
// da app.js): così l'archivio non dipende dai moduli che disegnano la pagina
export const ascoltatori = [];

export function alCambioArchivio(funzione) {
    ascoltatori.push(funzione);
}

// Ricalcola i dati derivati dall'archivio e avvisa le viste
export function aggiornaViste() {
    stato.costoMinutoRiferimento = costoMedioAlMinuto(stato.tuttiGliShow);
    stato.tuttiGliShow.forEach(s => {
        const idNum = Number(s.id);
        if (Number.isFinite(idNum) && idNum > stato.ultimoIdGenerato) stato.ultimoIdGenerato = idNum;
    });
    const mappe = calcolaMappeModelle(stato.tuttiGliShow);
    stato.mappaImmaginiModelle = mappe.immagini;
    stato.mappaUrlModelle = mappe.url;
    stato.mappaUrlPerSito = mappe.urlPerSito;
    stato.elencoModelleUniche = calcolaModelleUniche(stato.tuttiGliShow);

    avvisaViste();
}

// Ridisegna le viste senza ricalcolare i dati derivati (es. al cambio lingua,
// quando l'archivio non è cambiato)
export function avvisaViste() {
    ascoltatori.forEach(funzione => funzione());
}

// Rilegge l'archivio dal disco e ridisegna tutto: all'avvio e dopo un'importazione
export async function aggiornaInterfaccia() {
    // Un catalogo illeggibile non blocca l'app: si segnala e si parte da un catalogo vuoto
    const catalogoOVuoto = (descrizione) => (err) => {
        logger.error(`Catalogo ${descrizione} non caricato`, err);
        alert(`⚠️ ${err.message}`);
        return [];
    };
    try {
        // Archivio e cataloghi letti insieme (tre richieste indipendenti al processo principale).
        // Senza catalogo dei tag gli show restano utilizzabili, solo senza tag visibili;
        // senza catalogo dei siti i siti si mostrano con il loro ID.
        const [shows, catalogoTag, catalogoSiti] = await Promise.all([
            leggiArchivio(),
            leggiCatalogoTag().catch(catalogoOVuoto('dei tag')),
            leggiCatalogoSiti().catch(catalogoOVuoto('dei siti'))
        ]);
        stato.tuttiGliShow = shows;
        stato.catalogoTag = catalogoTag;
        stato.catalogoSiti = catalogoSiti;
        logger.info(`Dati letti. Totale show caricati: ${stato.tuttiGliShow.length}`);
        aggiornaViste();
    } catch (err) {
        logger.error("Errore durante l'aggiornamento dell'interfaccia", err);
        alert(`❌ Impossibile caricare i dati: ${err.message}`);
    }
}
