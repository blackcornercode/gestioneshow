import { stato } from './stato.js';
import { dataDelloShow, annoDelloShow, timestampShow, minutiDelloShow, costoMedioAlMinuto, costoAlMinuto } from './utils.js';

/* ==========================================================================
   CALCOLI SUGLI SHOW (funzioni pure)
   ==========================================================================
   Ricevono gli show (già normalizzati) e restituiscono risultati: non leggono
   né modificano la pagina, lo stato globale o localStorage. Le viste usano
   questi risultati per disegnare; i test in tests/calcoli.test.js li verificano. */

export const chiaveModella = (nome) => String(nome || '').trim().toLowerCase();

// Copia degli show ordinata per data ('desc' = dal più recente, 'asc' = dal più vecchio).
// Il timestamp si calcola una volta per show e non a ogni confronto (ogni volta
// rileggeva la data); a parità di data resta l'ordine ricevuto.
export function ordinaPerData(shows, verso = 'desc') {
    const segno = verso === 'asc' ? 1 : -1;
    return shows.map(show => ({ show, ts: timestampShow(show) }))
        .sort((a, b) => segno * (a.ts - b.ts))
        .map(({ show }) => show);
}

// Ultima foto e ultimo profilo noti per ogni modella (in ordine di data, vince il più recente).
// urlPerSito: ultimo profilo della modella su ogni sito { chiave: { mcg: url, stripchat: url } },
// per le funzioni che valgono solo per un sito (stato online, profili sospesi, foto)
export function calcolaMappeModelle(shows) {
    const immagini = {};
    const url = {};
    const urlPerSito = {};
    ordinaPerData(shows, 'asc').forEach(show => {
        if (!show.nome) return;
        const chiave = chiaveModella(show.nome);
        if (show.immagine) immagini[chiave] = show.immagine;
        if (show.urlProfilo) {
            url[chiave] = show.urlProfilo;
            if (show.sito) (urlPerSito[chiave] ??= {})[show.sito] = show.urlProfilo;
        }
    });
    return { immagini, url, urlPerSito };
}

// Indirizzi dei profili di tutte le modelle su un sito { chiave: url }
export function urlDelSito(urlPerSito, sito) {
    const risultato = {};
    Object.entries(urlPerSito).forEach(([chiave, perSito]) => { if (perSito[sito]) risultato[chiave] = perSito[sito]; });
    return risultato;
}

// Profili della modella sui vari siti, dal sito con più show: ultimo indirizzo
// del profilo, nomi con cui compare sul sito (nomeOriginale degli show uniti) e totali
export function profiliPerSito(shows, nome) {
    const perSito = new Map();
    showsDiModella(shows, nome).forEach(show => {   // dal più recente
        const sito = show.sito || '';
        if (!perSito.has(sito)) perSito.set(sito, { sito, urlProfilo: '', nomi: new Set(), elenco: [] });
        const voce = perSito.get(sito);
        if (!voce.urlProfilo && show.urlProfilo) voce.urlProfilo = show.urlProfilo;
        voce.nomi.add(String(show.nomeOriginale || show.nome).trim());
        voce.elenco.push(show);
    });
    return [...perSito.values()]
        .map(({ elenco, nomi, ...voce }) => ({ ...voce, nomi: [...nomi], ...riepilogoShow(elenco) }))
        .sort((a, b) => b.totaleShow - a.totaleShow);
}

// Unisci / separa modelle: gli show di "daNome" (solo quelli del sito indicato,
// se c'è) passano a "aNome". Ogni show ricorda il nome con cui è stato acquistato
// (nomeOriginale): la sincronizzazione MCG lo usa per riconoscere gli show già
// importati e dare il nome giusto a quelli nuovi. Restituisce { shows, modificati }.
export function rinominaModella(shows, daNome, aNome, sito = null) {
    const da = chiaveModella(daNome);
    const nuovo = String(aNome || '').trim();
    let modificati = 0;
    if (!da || !nuovo) return { shows, modificati };
    const risultato = shows.map(show => {
        if (!show.nome || chiaveModella(show.nome) !== da || (sito && show.sito !== sito) || show.nome === nuovo) return show;
        modificati++;
        const copia = { ...show, nome: nuovo };
        const originale = show.nomeOriginale || show.nome;
        if (chiaveModella(originale) === chiaveModella(nuovo)) delete copia.nomeOriginale;
        else copia.nomeOriginale = originale;
        return copia;
    });
    return { shows: risultato, modificati };
}

// Una voce per modella con gli ultimi dati noti (autocompletamento del form,
// piattaforma e nickname dei nuovi show importati da MCG)
export function calcolaModelleUniche(shows) {
    const mappa = new Map();
    ordinaPerData(shows, 'asc').forEach(show => {
        if (!show.nome || show.nome.trim() === '') return;
        const chiave = chiaveModella(show.nome);
        const esistente = mappa.get(chiave) || {};
        mappa.set(chiave, {
            nome: show.nome.trim(),
            urlProfilo: show.urlProfilo || esistente.urlProfilo || '',
            immagine: show.immagine || esistente.immagine || '',
            piattaforma: show.piattaforma || esistente.piattaforma || 'Teams',
            nickname: show.nickname || esistente.nickname || ''
        });
    });
    return Array.from(mappa.values());
}

// Show di una modella, dal più recente
export function showsDiModella(shows, nome) {
    const chiave = chiaveModella(nome);
    return ordinaPerData(shows.filter(s => s.nome && chiaveModella(s.nome) === chiave));
}

// Totali di un gruppo di show: numero, spesa, minuti, voti e €/min medio.
// La media voti esclude regali e show da valutare (TBD).
export function riepilogoShow(shows) {
    let spesaTotale = 0, totaleDurata = 0, sommaVoti = 0, conteggioVoti = 0;
    shows.forEach(show => {
        spesaTotale += parseFloat(show.costo) || 0;
        totaleDurata += minutiDelloShow(show);
        if (!show.isRegalo && show.punteggio && show.punteggio !== 'TBD') {
            const v = parseFloat(show.punteggio);
            if (!isNaN(v)) { sommaVoti += v; conteggioVoti += 1; }
        }
    });
    const mediaTxt = conteggioVoti > 0 ? (sommaVoti / conteggioVoti).toFixed(2) : 'N/D';
    return {
        totaleShow: shows.length,
        spesaTotale,
        totaleDurata,
        sommaVoti,
        conteggioVoti,
        mediaTxt,
        mediaValore: mediaTxt === 'N/D' ? -1 : parseFloat(mediaTxt),
        costoMedioMinuto: costoMedioAlMinuto(shows)
    };
}

// Mini-scheda della modella nel form: totali, ultimo show vero (non regalo) per
// "Ripeti ultimo show" e il costo suggerito, tag usati più spesso (al massimo 5),
// sito dello show più recente (regali compresi) da proporre nel form.
// null se la modella non ha show registrati.
export function schedaRapidaModella(shows, nome) {
    const elenco = showsDiModella(shows, nome);
    if (elenco.length === 0) return null;
    const riepilogo = riepilogoShow(elenco);
    return {
        totaleShow: riepilogo.totaleShow,
        mediaTxt: riepilogo.mediaTxt,
        ultimoShow: elenco.find(s => !s.isRegalo) || null,
        tagFrequenti: conteggioTag(elenco).slice(0, 5).map(({ id }) => id),
        sitoUltimo: elenco.find(s => s.sito)?.sito || null
    };
}

// Classifica delle modelle: 1° media voti, 2° numero di show (entrambi decrescenti);
// a pari merito viene prima la modella con lo show più recente (ordine dei gruppi,
// mantenuto dall'ordinamento stabile).
// mappe = { immagini, url } da calcolaMappeModelle, per foto e profilo di ripiego.
export function calcolaClassifica(shows, mappe = { immagini: {}, url: {} }) {
    const gruppi = new Map();
    ordinaPerData(shows).forEach(show => {
        if (!show.nome) return;
        const chiave = chiaveModella(show.nome);
        if (!gruppi.has(chiave)) {
            // I dati "prevalenti" vengono dallo show più recente
            gruppi.set(chiave, {
                nome: show.nome.trim(),
                foto: show.immagine || mappe.immagini[chiave] || '',
                urlProfilo: show.urlProfilo || mappe.url[chiave] || '',
                piattaformaPrevalente: '',
                nicknamePrevalente: '',
                elencoShow: []
            });
        }
        const gruppo = gruppi.get(chiave);
        // Piattaforma e nickname: dallo show più recente che li ha. I regali non
        // hanno piattaforma: se l'ultimo show è un regalo vale quello precedente
        if (!gruppo.piattaformaPrevalente && !show.isRegalo && show.piattaforma) gruppo.piattaformaPrevalente = show.piattaforma;
        if (!gruppo.nicknamePrevalente && show.nickname) gruppo.nicknamePrevalente = show.nickname;
        gruppo.elencoShow.push(show);
    });

    const classifica = [...gruppi.values()].map(({ elencoShow, ...modella }) => ({ ...modella, ...riepilogoShow(elencoShow) }));
    classifica.sort((a, b) => (b.mediaValore - a.mediaValore) || (b.totaleShow - a.totaleShow));
    classifica.forEach((m, i) => { m.posizioneOriginale = i + 1; });
    return classifica;
}

// Anni presenti negli show, dal più recente
export function anniDisponibili(shows) {
    return Array.from(new Set(shows.map(annoDelloShow).filter(Boolean))).sort((a, b) => b - a);
}

// Statistiche di un anno: spesa e numero di show per mese, e gli show di ogni
// mese ordinati dal più recente
export function calcolaStatisticheAnno(shows, anno) {
    const spesa = Array(12).fill(0);
    const conteggio = Array(12).fill(0);
    const showPerMese = Array.from({ length: 12 }, () => []);
    shows.forEach(show => {
        const d = dataDelloShow(show);
        if (!d || d.getFullYear() !== anno) return;
        const m = d.getMonth();
        spesa[m] += parseFloat(show.costo) || 0;
        conteggio[m] += 1;
        showPerMese[m].push(show);
    });
    return { spesa, conteggio, showPerMese: showPerMese.map(elenco => ordinaPerData(elenco)) };
}

// Spesa e numero di show per anno, dal più vecchio (per il grafico della spesa).
// Gli anni senza show tra il primo e l'ultimo compaiono con spesa 0.
export function spesaPerAnno(shows) {
    const perAnno = new Map();
    shows.forEach(show => {
        const anno = annoDelloShow(show);
        if (!anno) return;
        const voce = perAnno.get(anno) || { anno, spesa: 0, conteggio: 0 };
        voce.spesa += parseFloat(show.costo) || 0;
        voce.conteggio += 1;
        perAnno.set(anno, voce);
    });
    if (perAnno.size === 0) return [];
    const anni = [...perAnno.keys()];
    const risultato = [];
    for (let anno = Math.min(...anni); anno <= Math.max(...anni); anno++) {
        risultato.push(perAnno.get(anno) || { anno, spesa: 0, conteggio: 0 });
    }
    return risultato;
}

// Numero di show per sito (ID -> conteggio), per la gestione del catalogo
export function conteggioPerSito(shows) {
    const conteggi = new Map();
    shows.forEach(s => { if (s.sito) conteggi.set(s.sito, (conteggi.get(s.sito) || 0) + 1); });
    return conteggi;
}

// Spesa, numero di show e €/min medio per sito, dal sito con più spesa.
// I siti senza show non compaiono; gli show senza sito vanno sotto "".
export function spesaPerSito(shows) {
    const gruppi = new Map();
    shows.forEach(show => {
        const sito = show.sito || '';
        if (!gruppi.has(sito)) gruppi.set(sito, []);
        gruppi.get(sito).push(show);
    });
    return [...gruppi].map(([sito, elenco]) => ({
        sito,
        spesa: elenco.reduce((totale, s) => totale + (parseFloat(s.costo) || 0), 0),
        conteggio: elenco.length,
        costoMedioMinuto: costoMedioAlMinuto(elenco)
    })).sort((a, b) => b.spesa - a.spesa);
}

// Spesa del mese di calendario di "oggi"
export function spesaMeseCorrente(shows, oggi = new Date()) {
    return shows.reduce((totale, show) => {
        const d = dataDelloShow(show);
        const delMese = d && d.getFullYear() === oggi.getFullYear() && d.getMonth() === oggi.getMonth();
        return delMese ? totale + (parseFloat(show.costo) || 0) : totale;
    }, 0);
}

// Stato del budget mensile: percentuale usata (0-100), differenza (positiva se
// avanza, negativa se sforato) e classe CSS del colore
export function statoBudget(spesa, budget) {
    if (!(budget > 0)) return { impostato: false, percentuale: 0, differenza: 0, stato: 'stato-neutro' };
    const differenza = budget - spesa;
    return {
        impostato: true,
        percentuale: Math.min(100, Math.max(0, (spesa / budget) * 100)),
        differenza,
        stato: differenza >= 0 ? 'stato-ok' : 'stato-ko'
    };
}

// Filtri e ordinamento della cronologia: nome (contiene, senza maiuscole),
// anni selezionati (nessuno = tutti), tag e sito (ID; vuoto = tutti) e ordine per data ('asc' o 'desc')
export function filtraOrdinaShows(shows, { nome = '', anni = [], ordine = 'desc', tag = '', sito = '' } = {}) {
    const filtroNome = nome.trim().toLowerCase();
    const anniScelti = new Set(anni);
    const risultato = shows.filter(s =>
        (!filtroNome || (s.nome && s.nome.toLowerCase().includes(filtroNome))) &&
        (anniScelti.size === 0 || anniScelti.has(annoDelloShow(s))) &&
        (!tag || (s.tag || []).includes(tag)) &&
        (!sito || s.sito === sito));
    return ordinaPerData(risultato, ordine);
}

// Modifica di più show insieme: applica a ogni show con ID in "ids" i campi
// presenti in "campi" (piattaforma, punteggio, qualita, camera, recensione, durata,
// nickname, sito; un campo assente resta invariato; qualita e camera null = non indicate)
// e aggiunge/toglie i tag di tagAggiungi/tagTogli. Piattaforma, voto, qualità e
// inquadratura non si applicano ai regali, come nel form. Restituisce un nuovo elenco
// (gli show non toccati restano gli stessi oggetti), quanti show sono cambiati e quanti
// regali sono stati esclusi da questi campi.
export function applicaModificheMultiple(shows, ids, campi) {
    const scelti = new Set(ids.map(String));
    const tocchiPiattaformaVoto = ['piattaforma', 'punteggio', 'qualita', 'camera'].some(campo => campi[campo] !== undefined);
    let modificati = 0;
    let regaliSaltati = 0;

    const risultato = shows.map(show => {
        if (!scelti.has(String(show.id))) return show;
        const nuovo = { ...show };
        let cambiato = false;
        const imposta = (campo, valore) => {
            // Un campo mancante e uno a null (qualità o inquadratura non indicate) sono uguali
            if ((nuovo[campo] ?? null) !== (valore ?? null)) { nuovo[campo] = valore; cambiato = true; }
        };

        if (show.isRegalo) {
            if (tocchiPiattaformaVoto) regaliSaltati++;
        } else {
            if (campi.piattaforma !== undefined) imposta('piattaforma', campi.piattaforma);
            if (campi.punteggio !== undefined) imposta('punteggio', campi.punteggio);
            if (campi.qualita !== undefined) imposta('qualita', campi.qualita);
            if (campi.camera !== undefined) imposta('camera', campi.camera);
        }
        if (campi.recensione !== undefined) imposta('recensione', campi.recensione);
        if (campi.durata !== undefined) imposta('durata', campi.durata);
        if (campi.nickname !== undefined) imposta('nickname', campi.nickname);
        // Il sito vale anche per i regali (anche un regalo si acquista su un sito)
        if (campi.sito !== undefined) imposta('sito', campi.sito);
        if (campi.tagAggiungi || campi.tagTogli) {
            const attuali = show.tag || [];
            const nuovi = aggiornaElencoTag(attuali, campi.tagAggiungi, campi.tagTogli);
            if (nuovi.length !== attuali.length || nuovi.some((id, i) => id !== attuali[i])) {
                nuovo.tag = nuovi;
                cambiato = true;
            }
        }

        if (!cambiato) return show;
        modificati++;
        return nuovo;
    });
    return { shows: risultato, modificati, regaliSaltati };
}

// Tag di uno show dopo aver tolto "togli" e aggiunto "aggiungi" (senza doppioni,
// l'ordine dei tag già presenti resta)
export function aggiornaElencoTag(attuali = [], aggiungi = [], togli = []) {
    const daTogliere = new Set(togli);
    const risultato = attuali.filter(id => !daTogliere.has(id));
    aggiungi.forEach(id => { if (!daTogliere.has(id) && !risultato.includes(id)) risultato.push(id); });
    return risultato;
}

// Quante volte compare ogni tag negli show, dal più usato; a parità vale
// l'ordine in cui i tag compaiono (gli show arrivano di solito dal più recente)
export function conteggioTag(shows) {
    const conteggi = new Map();
    shows.forEach(s => (s.tag || []).forEach(id => conteggi.set(id, (conteggi.get(id) || 0) + 1)));
    return [...conteggi].map(([id, conteggio]) => ({ id, conteggio })).sort((a, b) => b.conteggio - a.conteggio);
}

// Toglie un tag (eliminato dal catalogo) da tutti gli show che lo usano
export function togliTagDaShows(shows, id) {
    let modificati = 0;
    const risultato = shows.map(s => {
        if (!(s.tag || []).includes(id)) return s;
        modificati++;
        return { ...s, tag: s.tag.filter(altro => altro !== id) };
    });
    return { shows: risultato, modificati };
}

/* --------------------------------------------------------------------------
   PREVENTIVO: prezzo al minuto suggerito per una modella e confronto di un
   prezzo chiesto con la sua media e con la media generale (preventivo.js)
   -------------------------------------------------------------------------- */
export const SHOW_PER_SUGGERITO = 5;     // il suggerito è la media degli ultimi N show
export const MINIMO_SHOW_SITO = 2;       // show sul sito scelto per calcolare solo su quello
const SOGLIA_IN_LINEA = 10;              // ±10%, come i colori del €/min
const SOGLIA_TENDENZA = 5;               // ±5% tra ultimi show e media di sempre

// Show della modella che contano per il €/min (con durata, regali e rimborsi esclusi), dal più recente
function showConPrezzo(shows, nome) {
    return showsDiModella(shows, nome).filter(s => costoAlMinuto(s) !== null);
}

// €/min suggerito per la modella: media ponderata degli ultimi SHOW_PER_SUGGERITO show.
// Con un sito si usano solo gli show su quel sito, se sono almeno MINIMO_SHOW_SITO;
// altrimenti tutti i siti. null se la modella non ha show con durata.
// { costoMinuto, mediaTutti, showUsati, showConDurata, sito ('' = tutti i siti), tendenza: 'su'|'giu'|'stabile' }
export function prezzoSuggerito(shows, nome, { sito = '' } = {}) {
    return suggeritoDaShowConPrezzo(showConPrezzo(shows, nome), sito);
}

// prezzoSuggerito sugli show con prezzo della modella, già dal più recente
function suggeritoDaShowConPrezzo(tutti, sito = '') {
    const delSito = sito ? tutti.filter(s => s.sito === sito) : [];
    const suSito = Boolean(sito) && delSito.length >= MINIMO_SHOW_SITO;
    const base = suSito ? delSito : tutti;
    if (base.length === 0) return null;
    const recenti = base.slice(0, SHOW_PER_SUGGERITO);
    const costoMinuto = costoMedioAlMinuto(recenti);
    const mediaTutti = costoMedioAlMinuto(base);
    const scarto = mediaTutti ? (costoMinuto / mediaTutti - 1) * 100 : 0;
    return {
        costoMinuto,
        mediaTutti,
        showUsati: recenti.length,
        showConDurata: base.length,
        sito: suSito ? sito : '',
        tendenza: scarto > SOGLIA_TENDENZA ? 'su' : scarto < -SOGLIA_TENDENZA ? 'giu' : 'stabile'
    };
}

// Ultimo show della modella con esattamente quella durata (stesso criterio del sito
// di prezzoSuggerito), per chi ha un listino a pacchetti; null se non c'è
export function ultimoShowConDurata(shows, nome, minuti, { sito = '' } = {}) {
    const tutti = showConPrezzo(shows, nome);
    const delSito = sito ? tutti.filter(s => s.sito === sito) : [];
    const base = sito && delSito.length >= MINIMO_SHOW_SITO ? delSito : tutti;
    return base.find(s => minutiDelloShow(s) === Number(minuti)) || null;
}

// Prezzo chiesto per una durata rispetto a un €/min di riferimento:
// { costoMinuto, scarto (in %), esito: 'in-linea' | 'caro' | 'conveniente' }; null se mancano i dati
export function valutaPrezzo(prezzo, minuti, riferimento) {
    if (!(prezzo > 0) || !(minuti > 0) || !(riferimento > 0)) return null;
    const costoMinuto = prezzo / minuti;
    const scarto = (costoMinuto / riferimento - 1) * 100;
    // Stesso confronto di formattaCostoAlMinuto (utils.js): con lo scarto in % i decimali
    // facevano risultare "caro" un +10% esatto
    const limite = SOGLIA_IN_LINEA / 100;
    const esito = costoMinuto > riferimento * (1 + limite) ? 'caro' : costoMinuto < riferimento * (1 - limite) ? 'conveniente' : 'in-linea';
    return { costoMinuto, scarto, esito };
}

// Tabella dei prezzi suggeriti: una voce per modella con show di durata nota,
// dalla modella con più show con durata (a pari merito in ordine di nome).
// Gli show vengono divisi per modella in un solo passaggio: chiamare prezzoSuggerito
// per ogni modella riscorreva e riordinava tutto l'archivio ogni volta.
export function prezziSuggeriti(shows) {
    const gruppi = new Map();
    shows.forEach(s => {
        if (!s.nome) return;
        const chiave = chiaveModella(s.nome);
        if (!gruppi.has(chiave)) gruppi.set(chiave, { nome: s.nome.trim(), elenco: [] });
        if (costoAlMinuto(s) !== null) gruppi.get(chiave).elenco.push(s);
    });
    return [...gruppi.values()]
        .map(({ nome, elenco }) => ({ nome, ...suggeritoDaShowConPrezzo(ordinaPerData(elenco)) }))
        .filter(voce => voce.costoMinuto !== undefined && voce.costoMinuto !== null)
        .sort((a, b) => (b.showConDurata - a.showConDurata) || a.nome.localeCompare(b.nome));
}

// Ordinamento della tabella dei prezzi suggeriti per colonna ('asc' o 'desc').
// Le colonne dei prezzi (10, 15, 30, 60 min) sono proporzionali al €/min suggerito;
// a pari valore vale il nome. Una colonna sconosciuta lascia l'ordine ricevuto.
const VALORE_TENDENZA = { su: 1, stabile: 0, giu: -1 };
const CHIAVI_PREZZI = {
    nome: v => v.nome.toLowerCase(),
    show: v => v.showConDurata,
    media: v => v.mediaTutti,
    suggerito: v => v.costoMinuto,
    tendenza: v => VALORE_TENDENZA[v.tendenza] ?? 0,
    p10: v => v.costoMinuto, p15: v => v.costoMinuto, p30: v => v.costoMinuto, p60: v => v.costoMinuto
};
export const COLONNE_PREZZI = Object.keys(CHIAVI_PREZZI);

export function ordinaPrezziSuggeriti(voci, colonna, verso = 'desc') {
    const chiave = CHIAVI_PREZZI[colonna];
    if (!chiave) return [...voci];
    const segno = verso === 'asc' ? 1 : -1;
    return [...voci].sort((a, b) => {
        const va = chiave(a), vb = chiave(b);
        const diff = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
        return segno * diff || a.nome.localeCompare(b.nome);
    });
}

// Due Set con gli stessi elementi? (null o undefined: mai uguali, es. lo stato
// delle modelle online non ancora letto)
export function stessoInsieme(a, b) {
    return Boolean(a && b) && a.size === b.size && [...a].every(x => b.has(x));
}

// Una pagina di un elenco. limite 'all' = tutto in una pagina; la pagina
// richiesta viene riportata nell'intervallo valido.
export function paginaDi(elenco, limite, pagina) {
    if (limite === 'all') return { elementi: elenco, pagina: 1, totalePagine: 1 };
    const perPagina = parseInt(limite, 10) || elenco.length || 1;
    const totalePagine = Math.ceil(elenco.length / perPagina) || 1;
    const p = Math.min(Math.max(1, pagina), totalePagine);
    return { elementi: elenco.slice((p - 1) * perPagina, p * perPagina), pagina: p, totalePagine };
}
