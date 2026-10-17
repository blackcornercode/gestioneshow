// Test del motore CSV (js/csv.js): lettura del file, abbinamento delle colonne,
// lettura di importi, durate e date, importazione ed esportazione
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { caricaModuli } = require('./carica-script');

let f;
before(async () => {
    f = await caricaModuli(['stato.js', 'i18n.js', 'utils.js', 'calcoli.js', 'csv.js']);
});

test('lettura: separatore riconosciuto, virgolette, a capo nei campi, BOM e righe vuote', () => {
    const conPuntoEVirgola = f.leggiCsv('﻿Data;Modella;Note\r\n02/10/2026;Ana;"Ciao; ""bella"""\r\n\r\n03/10/2026;Bea;"riga 1\nriga 2"\r\n');
    assert.equal(conPuntoEVirgola.separatore, ';');
    assert.deepEqual(conPuntoEVirgola.intestazioni, ['Data', 'Modella', 'Note']);
    assert.deepEqual(conPuntoEVirgola.righe, [['02/10/2026', 'Ana', 'Ciao; "bella"'], ['03/10/2026', 'Bea', 'riga 1\nriga 2']]);
    assert.equal(f.leggiCsv('date,model,amount\n2026-10-02,Ana,"1,234.50"').righe[0][2], '1,234.50');
    assert.equal(f.leggiCsv('a\tb\n1\t2').separatore, '\t');
    assert.deepEqual(f.leggiCsv('').righe, []);
});

test('colonne indovinate dalle intestazioni, in italiano e in inglese', () => {
    assert.deepEqual(f.indovinaColonne(['Data', 'Ora', 'Modella', 'Costo (€)', 'Durata (min)', 'Note', 'Nickname']),
        { data: 0, ora: 1, modella: 2, importo: 3, durata: 4, note: 5, nickname: 6 });
    const inglese = f.indovinaColonne(['Date', 'Broadcaster', 'Tokens', 'Comment']);
    assert.deepEqual([inglese.data, inglese.modella, inglese.importo, inglese.note, inglese.durata], [0, 1, 2, 3, -1]);
});

test('importi, durate e date nei formati più comuni', () => {
    assert.equal(f.leggiImporto('1.234,56 €'), 1234.56);
    assert.equal(f.leggiImporto('1,234.56'), 1234.56);
    assert.equal(f.leggiImporto('-60.00'), 60);
    assert.equal(f.leggiImporto('$12.50'), 12.5);
    assert.equal(f.leggiImporto('750 tk'), 750);
    assert.equal(f.leggiImporto('12,5'), 12.5);
    assert.equal(f.leggiImporto('1,500'), 1500);
    assert.equal(f.leggiImporto('gratis'), null);

    assert.equal(f.leggiDurata('30'), 30);
    assert.equal(f.leggiDurata('30 min'), 30);
    assert.equal(f.leggiDurata('1:30'), 90);
    assert.equal(f.leggiDurata('01:30:00'), 90);
    assert.equal(f.leggiDurata('1h 15m'), 75);
    assert.equal(f.leggiDurata(''), null);

    const parti = (d) => d && [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()];
    assert.deepEqual(parti(f.leggiDataOra('2026-10-02T21:30:00')), [2026, 10, 2, 21, 30]);
    assert.deepEqual(parti(f.leggiDataOra('02/10/2026 21:30')), [2026, 10, 2, 21, 30]);
    assert.deepEqual(parti(f.leggiDataOra('02.10.26', '9:05 pm')), [2026, 10, 2, 21, 5]);
    assert.deepEqual(parti(f.leggiDataOra('10/02/2026', '', 'usa')), [2026, 10, 2, 0, 0]);
    assert.equal(f.leggiDataOra('31/02/2026'), null, 'data impossibile');
    assert.equal(f.leggiDataOra('ieri'), null);
});

test('importazione: nuovi, doppioni (archivio e file), errori e conversione dei token in euro', () => {
    const esistenti = [{ id: 1, nome: 'Ana', dataOraISO: new Date(2026, 9, 2, 21, 30).toISOString(), costo: 50 }];
    const righe = [
        ['02/10/2026', '21:30', 'ana', '600', '', ''],          // doppione dell'archivio (maiuscole a parte)
        ['03/10/2026', '22:00', 'Bea', '750', '20', 'ottima'],  // nuovo
        ['03/10/2026', '22:00', 'Bea', '750', '20', ''],        // doppione di una riga precedente
        ['xx', '', 'Cleo', '10', '', ''],                        // errore: data
        ['04/10/2026', '', '', '10', '', ''],                    // errore: modella
        ['04/10/2026', '', 'Dana', 'n/d', '', '']                // errore: importo
    ];
    const mappatura = { data: 0, ora: 1, modella: 2, importo: 3, durata: 4, note: 5, nickname: -1 };
    const esito = f.preparaImportazione(righe, mappatura,
        { sito: 'stripchat', valuta: 'token', tasso: 0.08, modelle: { bea: { piattaforma: 'Telegram', nickname: '@bea' } } }, esistenti);
    assert.deepEqual([esito.nuovi, esito.doppioni, esito.errori], [1, 2, 3]);
    assert.deepEqual(esito.voci.map(v => v.motivo || v.stato), ['doppione', 'nuovo', 'doppione', 'data', 'modella', 'importo']);
    assert.deepEqual(esito.voci.map(v => v.riga), [2, 3, 4, 5, 6, 7], 'numeri di riga del file');
    const show = esito.voci[1].show;
    assert.equal(show.costo, 60, '750 token × 0,08 €');
    assert.deepEqual(show.importoOriginale, { valore: 750, valuta: 'token' });
    assert.deepEqual([show.sito, show.importatoDa, show.durata, show.note, show.piattaforma, show.nickname, show.punteggio],
        ['stripchat', 'stripchat', 20, 'ottima', 'Telegram', '@bea', 'TBD']);
    // In euro non c'è importo originale
    const inEuro = f.preparaImportazione([['05/10/2026', '', 'Eva', '45,50', '', '']], mappatura, { sito: 'mcg' }).voci[0].show;
    assert.equal(inEuro.costo, 45.5);
    assert.ok(!('importoOriginale' in inEuro));
});

test('esportazione leggibile da Excel e reimportabile senza perdite', () => {
    const shows = [
        { id: 2, nome: 'Bea', dataOraISO: new Date(2026, 9, 3, 22, 0).toISOString(), costo: 60, durata: 20, punteggio: 5, sito: 'stripchat',
          importatoDa: 'stripchat', importoOriginale: { valore: 750, valuta: 'token' }, tag: ['lush'], note: 'Ciao; "top"', piattaforma: 'Teams',
          qualita: 'alta', camera: 'verticale', recensione: true, testoRecensione: 'Bella; "show"\nrisposta rapida' },
        { id: 1, nome: 'Ana', dataOraISO: new Date(2026, 9, 2, 21, 30).toISOString(), costo: 0, isRegalo: true, sito: 'mcg', importatoDa: null }
    ];
    const csv = f.esportaCsv(shows, { siti: [{ id: 'stripchat', nome: 'Stripchat' }, { id: 'mcg', nome: 'Mondo Cam Girls' }], tag: [{ id: 'lush', nome: 'Lush' }] });
    assert.ok(csv.startsWith('﻿Data;Ora;Modella;Sito;'));
    const letto = f.leggiCsv(csv);
    assert.equal(letto.righe.length, 2);
    assert.deepEqual(letto.righe[0].slice(0, 4), ['02/10/2026', '21:30', 'Ana', 'Mondo Cam Girls'], 'ordine cronologico');
    const bea = letto.righe[1];
    assert.deepEqual([bea[6], bea[7], bea[11], bea[12], bea[15], bea[16]], ['60', '3', 'Lush', 'Ciao; "top"', '750', 'token']);
    assert.deepEqual([bea[17], bea[18]], ['alta', 'verticale'], 'qualità e inquadratura in fondo');
    assert.deepEqual(letto.righe[0].slice(17), ['', '', ''], 'un regalo non le ha');
    assert.equal(bea[19], 'Bella; "show"\nrisposta rapida', 'testo della recensione in fondo, con virgolette e a capo');
    // Reimportando il file tutti gli show risultano già presenti
    const esito = f.preparaImportazione(letto.righe, f.indovinaColonne(letto.intestazioni), { sito: 'mcg' }, shows);
    assert.equal(esito.doppioni, 2);
});
