// Test delle funzioni pure del processo principale (main/)
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { urlMcgValido, slugProfiloMcg } = require('../main/connettori/mcg/indirizzi');
const { urlPagina } = require('../main/connettori/mcg/pagine');

test('solo URL di mondocamgirls.com sono accettati', () => {
    assert.ok(urlMcgValido('https://www.mondocamgirls.com/it/areacliente_transazioni.html'));
    assert.ok(urlMcgValido('https://anna.mondocamgirls.com'));
    assert.ok(!urlMcgValido('https://mondocamgirls.com.esempio.it'));
    assert.ok(!urlMcgValido('file:///C:/Windows'));
    assert.ok(!urlMcgValido('non un url'));
});

test('sottodominio del profilo', () => {
    assert.equal(slugProfiloMcg('https://Anna.mondocamgirls.com/en'), 'anna');
    assert.equal(slugProfiloMcg('https://www.mondocamgirls.com'), null);
    assert.equal(slugProfiloMcg(''), null);
});

test('indirizzo delle pagine della cronologia', () => {
    assert.equal(urlPagina('https://www.mondocamgirls.com/it/x.html?pagina_vis=0', 3), 'https://www.mondocamgirls.com/it/x.html?pagina_vis=3');
    assert.equal(urlPagina('https://www.mondocamgirls.com/it/x.html', 100), 'https://www.mondocamgirls.com/it/x.html?pagina_vis=100');
});

test('catalogo dei tag: voci non valide scartate, colori sconosciuti in grigio', () => {
    const { validaCatalogoTag, TAG_PREDEFINITI } = require('../main/catalogo-tag');
    assert.deepEqual(validaCatalogoTag([
        { id: 'a', nome: '  Anal ', colore: 'rosso' },
        { id: 'a', nome: 'Doppione', colore: 'blu' },
        { id: 'b', nome: '', colore: 'blu' },
        { id: 'c', nome: 'Lush', colore: 'fucsia' },
        null, 'testo', { nome: 'senza id' }
    ]), [{ id: 'a', nome: 'Anal', colore: 'rosso' }, { id: 'c', nome: 'Lush', colore: 'grigio' }]);
    assert.equal(validaCatalogoTag([{ id: 'x', nome: 'n'.repeat(60) }])[0].nome.length, 40);
    assert.throws(() => validaCatalogoTag({}), /array/);
    assert.deepEqual(validaCatalogoTag(TAG_PREDEFINITI), TAG_PREDEFINITI);
});

test('profilo sospeso riconosciuto dall\'avviso della pagina MCG', () => {
    const { profiloSospeso } = require('../main/connettori/mcg/indirizzi');
    // Estratti delle pagine reali (deabunnyrose sospesa, profilo attivo)
    const testata = '<a class="mp-btn mp-btn--primary mp-top__fav js-mp-tab-link" href="#mp-servizi">Pay for a show</a></h1>';
    assert.equal(profiloSospeso(testata + `<p class="mp-badge mp-badge--warn">WARNING! PROFILE TEMPORARYLY SUSPENDED!! IT'S NOT POSSIBLE TO PURCHASE ANY TYPE OF SHOW</p>`), true);
    assert.equal(profiloSospeso(testata + '<p class="mp-badge mp-badge--warn">ATTENZIONE! PROFILO TEMPORANEAMENTE SOSPESO</p>'), true);
    assert.equal(profiloSospeso(testata + '<p class="mp-badge mp-badge--warn">Nuovi video in arrivo</p>'), false, 'altri avvisi non contano');
    assert.equal(profiloSospeso(testata), false);
    assert.equal(profiloSospeso(''), null);
    assert.equal(profiloSospeso('<html>pagina di errore</html>'), null, 'pagina non riconosciuta');
});

test('credito disponibile letto dall\'area clienti MCG', () => {
    const { creditoDisponibile, richiedeLogin } = require('../main/connettori/mcg/indirizzi');
    assert.equal(creditoDisponibile('<p><b>Credito disponibile:</b> 16.51 €</p>'), 16.51);
    assert.equal(creditoDisponibile('<div>Credito disponibile: 16.51&nbsp;&euro;</div>'), 16.51);
    assert.equal(creditoDisponibile('Credito disponibile: 1.234,56 €'), 1234.56);
    assert.equal(creditoDisponibile('Credito disponibile: 0.00 €'), 0);
    assert.equal(creditoDisponibile('<h1>Area cliente</h1><input type="password" name="pwd">'), null, 'login non fatto');
    assert.equal(creditoDisponibile(''), null);
    assert.equal(richiedeLogin('<form><input type="password" name="pwd"></form>'), true);
    assert.equal(richiedeLogin('<p>Credito disponibile: 16.51 €</p>'), false);
});

test('privacy: PIN di 4-8 cifre, verificato senza conservarlo in chiaro', () => {
    const p = require('../main/privacy');
    assert.ok(p.pinValido('1234') && p.pinValido('12345678'));
    assert.ok(!p.pinValido('123') && !p.pinValido('123456789') && !p.pinValido('12a4') && !p.pinValido(1234));
    const salvato = p.calcolaHashPin('2468');
    assert.ok(!JSON.stringify(salvato).includes('2468'));
    assert.ok(p.pinCorretto('2468', salvato));
    assert.ok(!p.pinCorretto('2469', salvato));
    assert.ok(!p.pinCorretto('2468', null));
    assert.notEqual(p.calcolaHashPin('2468').hash, salvato.hash, 'sale diverso ogni volta');
});

test('privacy: preferenze normalizzate, e l\'interfaccia non riceve mai il PIN', () => {
    const p = require('../main/privacy');
    assert.deepEqual(p.normalizzaPreferenze(null), { aspettoNeutro: false, pin: null, bloccoMinuti: 0, livelloLog: 'warn' });
    const pin = p.calcolaHashPin('1357');
    assert.deepEqual(p.normalizzaPreferenze({ aspettoNeutro: true, pin, bloccoMinuti: 15, livelloLog: 'info' }), { aspettoNeutro: true, pin, bloccoMinuti: 15, livelloLog: 'info' });
    assert.equal(p.normalizzaPreferenze({ livelloLog: 'debug' }).livelloLog, 'warn');
    // minuti non previsti o blocco senza PIN -> 0; hash malformato -> nessun PIN
    assert.equal(p.normalizzaPreferenze({ pin, bloccoMinuti: 7 }).bloccoMinuti, 0);
    assert.equal(p.normalizzaPreferenze({ bloccoMinuti: 15 }).bloccoMinuti, 0);
    assert.equal(p.normalizzaPreferenze({ pin: { sale: 'x', hash: 'corto' } }).pin, null);
    const pubbliche = p.preferenzePubbliche(p.normalizzaPreferenze({ pin, bloccoMinuti: 5 }));
    assert.deepEqual(pubbliche, { aspettoNeutro: false, pinImpostato: true, bloccoMinuti: 5, livelloLog: 'warn' });
});

test('privacy: dopo 5 PIN errati si attende 30 secondi', () => {
    const p = require('../main/privacy');
    const c = p.contatoreTentativi();
    const t0 = 1_000_000;
    for (let i = 0; i < p.MAX_TENTATIVI - 1; i++) c.registraErrore(t0);
    assert.equal(c.attesaResidua(t0), 0);
    c.registraErrore(t0);
    assert.equal(c.attesaResidua(t0), p.ATTESA_MS);
    assert.equal(c.attesaResidua(t0 + p.ATTESA_MS), 0);
    c.registraSuccesso();
    assert.equal(c.attesaResidua(t0), 0);
});

test('catalogo dei siti: voci valide, sigla, indirizzo del profilo e Mondo Cam Girls sempre presente', () => {
    const { validaCatalogoSiti, SITI_PREDEFINITI, SITO_MCG } = require('../main/catalogo-siti');
    assert.deepEqual(validaCatalogoSiti(SITI_PREDEFINITI), SITI_PREDEFINITI.map(s => ({ ...s, attivo: true })));
    const risultato = validaCatalogoSiti([
        { id: 'cam4', nome: '  Cam4 ', colore: 'blu', valuta: 'token', tasso: '0.1', urlProfilo: 'https://www.cam4.com/{nome}' },
        { id: 'cam4', nome: 'Doppione' },
        { id: 'x', nome: 'Sito con nome lungo', colore: 'fucsia', sigla: 'abcdefghij', valuta: 'EUR', tasso: 5, urlProfilo: 'http://non-sicuro/{nome}' },
        { id: 'y', nome: 'Valuta strana', valuta: 'dogecoin', tasso: -3 },
        { id: '', nome: 'senza id' }, null
    ]);
    // Mondo Cam Girls mancava: viene aggiunto in testa
    assert.equal(risultato[0].id, SITO_MCG);
    assert.deepEqual(risultato[1], { id: 'cam4', nome: 'Cam4', sigla: 'CAM4', colore: 'blu', valuta: 'token', tasso: 0.1, attivo: true, urlProfilo: 'https://www.cam4.com/{nome}' });
    assert.deepEqual(risultato[2], { id: 'x', nome: 'Sito con nome lungo', sigla: 'ABCDEF', colore: 'grigio', valuta: 'EUR', tasso: 1, attivo: true }, 'sigla corta, colore sconosciuto in grigio, euro a 1, niente http');
    assert.deepEqual([risultato[3].valuta, risultato[3].tasso], ['EUR', 1], 'valuta sconosciuta in euro');
    assert.equal(risultato.length, 4);
    assert.throws(() => validaCatalogoSiti({}), /array/);
});

test('testo dei file CSV: UTF-8 (anche con BOM) oppure Windows-1252 di Excel', () => {
    const { decodificaTesto } = require('../main/file');
    assert.equal(decodificaTesto(Buffer.from('\uFEFFModella;Città\nAnà;Bari', 'utf8')), 'Modella;Città\nAnà;Bari');
    assert.equal(decodificaTesto(Buffer.from([0x43, 0x69, 0x74, 0x74, 0xe0, 0x3b, 0x80])), 'Città;€', 'Windows-1252: à e €');
});

test('conversione al formato 2.0: riconosce gli archivi delle versioni precedenti', () => {
    const { richiedeConversione } = require('../main/conversione');
    assert.ok(richiedeConversione([{ id: 1, nome: 'A', isAutoImport: true }]));
    assert.ok(richiedeConversione([{ id: 1, sito: 'mcg', importatoDa: null }, { id: 2, nome: 'B' }]), 'basta un record senza sito');
    assert.ok(!richiedeConversione([{ id: 1, sito: 'mcg', importatoDa: 'mcg' }]));
    assert.ok(!richiedeConversione([]));
});

test('catalogo dei siti: "attivo" vale true se manca, false solo se indicato', () => {
    const { validaCatalogoSiti } = require('../main/catalogo-siti');
    const [mcg, cb, sc] = validaCatalogoSiti([{ id: 'mcg', nome: 'MCG' }, { id: 'cb', nome: 'CB', attivo: false }, { id: 'sc', nome: 'SC', attivo: 'sì' }]);
    assert.deepEqual([mcg.attivo, cb.attivo, sc.attivo], [true, false, true]);
});

test('connettori: elenco con le capacità, siti senza connettore o senza la funzione', async () => {
    // percorsi.js legge la cartella dati da Electron al caricamento: qui basta uno stub
    require.cache[require.resolve('electron')] = { exports: { app: { getPath: () => require('os').tmpdir() }, ipcMain: { handle() {} }, net: {}, BrowserWindow: class {} } };
    const { elencoConnettori, gestore } = require('../main/connettori');
    const { esegui } = require('../main/ipc-connettori');
    assert.deepEqual(elencoConnettori(), [{ id: 'mcg', capacita: ['transazioni', 'copia', 'online', 'profilo', 'foto', 'ping', 'credito'] }]);
    assert.equal(typeof gestore('mcg', 'online'), 'function');
    assert.equal(gestore('stripchat', 'online'), null, 'sito senza connettore');
    assert.equal(gestore('mcg', 'toString'), null, 'solo le capacità dichiarate');
    assert.equal(gestore('__proto__', 'online'), null);
    assert.equal((await esegui('chaturbate', 'ping')).success, false);
    assert.deepEqual(await esegui('mcg', 'profilo', 'https://example.com/anna'),
        { success: false, sospeso: null, rimosso: false, error: 'URL profilo non appartenente a MondoCamGirls' }, 'il connettore rifiuta URL di altri domini');
});
