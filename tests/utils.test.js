// Test delle funzioni pure dell'interfaccia: date, normalizzazione dei record,
// costi e €/min, formattazione di voti e durate, importi e tipi delle transazioni MCG.
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const { caricaModuli } = require('./carica-script');

let f;
before(async () => {
    f = await caricaModuli(['stato.js', 'i18n.js', 'utils.js', 'connettore-mcg.js', 'sincronizzazione.js']);
    f.impostaTraduzioni({ units: { min: 'm', hour: 'h' }, table: { cost_per_minute_compare: 'Media: {media}' } });
});

test('parseDataItaliana legge gg/mm/aa e gg/mm/aaaa con e senza ora', () => {
    const d = f.parseDataItaliana('11/09/26 19:02');
    assert.deepEqual([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()], [2026, 8, 11, 19, 2]);
    const s = f.parseDataItaliana('1/2/2025');
    assert.deepEqual([s.getFullYear(), s.getMonth(), s.getDate()], [2025, 1, 1]);
    assert.equal(f.parseDataItaliana('5/3/2026, 10:30').getMinutes(), 30);
    assert.equal(f.parseDataItaliana('Totale'), null);
    assert.equal(f.parseDataItaliana(''), null);
});

test('dataDelloShow usa dataOraISO e in mancanza dataFormattata', () => {
    assert.equal(f.dataDelloShow({ dataOraISO: '2026-03-05T10:00:00.000Z' }).toISOString(), '2026-03-05T10:00:00.000Z');
    assert.equal(f.dataDelloShow({ dataFormattata: '25/12/2024 21:00' }).getFullYear(), 2024);
    assert.equal(f.dataDelloShow({}), null);
    assert.equal(f.timestampShow({ id: 123 }), 123);
});

test('normalizzaShow converte i campi delle versioni precedenti', () => {
    const vecchio = { id: 1, nome: 'A', data: '25/12/2024 21:30', tempoShow: '45', url: 'https://a.mondocamgirls.com', voto: 4, costo: '30.50' };
    const n = f.normalizzaShow(vecchio);
    assert.equal(n.durata, 45);
    assert.equal(n.urlProfilo, 'https://a.mondocamgirls.com');
    assert.equal(n.punteggio, 4);
    assert.equal(n.costo, 30.5);
    assert.equal(n.dataFormattata, '25/12/2024 21:30');
    assert.equal(new Date(n.dataOraISO).getHours(), 21);
    for (const campo of ['tempoShow', 'url', 'voto', 'data', 'dataOra']) assert.ok(!(campo in n), `${campo} rimosso`);
    assert.ok('tempoShow' in vecchio, "l'originale non viene modificato");
});

test('normalizzaShow: il testo della recensione manca o non è una stringa -> vuoto, altrimenti resta', () => {
    assert.equal(f.normalizzaShow({ costo: 1 }).testoRecensione, '');
    assert.equal(f.normalizzaShow({ costo: 1, testoRecensione: 42 }).testoRecensione, '');
    assert.equal(f.normalizzaShow({ costo: 1, testoRecensione: 'Ottima' }).testoRecensione, 'Ottima');
});

test('normalizzaShow lascia invariati i record già nel formato attuale', () => {
    const attuale = { id: 2, nome: 'B', dataOraISO: '2026-01-10T20:00:00.000Z', dataFormattata: '10/01/2026 21:00', urlProfilo: 'https://b.mondocamgirls.com', punteggio: 'TBD', costo: 40, durata: 30, sito: 'stripchat', importatoDa: null, testoRecensione: '' };
    assert.deepEqual(f.normalizzaShow(attuale), attuale);
    // durata assente resta assente (non viene aggiunto 0 a ogni record)
    assert.ok(!('durata' in f.normalizzaShow({ costo: 10, dataOraISO: attuale.dataOraISO })));
    // i campi vecchi non sovrascrivono quelli nuovi
    assert.equal(f.normalizzaShow({ urlProfilo: 'nuovo', url: 'vecchio' }).urlProfilo, 'nuovo');
    assert.equal(f.normalizzaShow({ punteggio: 5, voto: 1 }).punteggio, 5);
    // i regali non ricevono un voto dal campo vecchio
    assert.equal(f.normalizzaShow({ isRegalo: true, punteggio: null, voto: 3 }).punteggio, null);
});

test('normalizzaShow: sito di provenienza e origine (roadmap multi-sito, fase 1)', () => {
    // Show salvati prima dei siti: tutti di Mondo Cam Girls, isAutoImport diventa importatoDa
    const importato = f.normalizzaShow({ id: 1, costo: 10, isAutoImport: true });
    assert.equal(importato.sito, 'mcg');
    assert.equal(importato.importatoDa, 'mcg');
    assert.ok(!('isAutoImport' in importato));
    const manuale = f.normalizzaShow({ id: 2, costo: 10, isAutoImport: false });
    assert.equal(manuale.sito, 'mcg');
    assert.equal(manuale.importatoDa, null);
    assert.equal(f.normalizzaShow({ id: 3, costo: 10 }).importatoDa, null);
    // Sito e origine già presenti restano invariati
    const nuovo = f.normalizzaShow({ id: 4, costo: 10, sito: 'chaturbate', importatoDa: null });
    assert.equal(nuovo.sito, 'chaturbate');
    assert.equal(nuovo.importatoDa, null);
    // Una seconda normalizzazione non cambia nulla
    assert.deepEqual(f.normalizzaShow(importato), importato);
});

test('costo al minuto: singolo show e media ponderata', () => {
    assert.equal(f.costoAlMinuto({ costo: 50, durata: 25 }), 2);
    assert.equal(f.costoAlMinuto({ costo: 30, durata: 0 }), null);
    assert.equal(f.costoAlMinuto({ costo: 0, durata: 10, isRegalo: true }), null);
    assert.equal(f.costoAlMinuto({ costo: 0, durata: 10, rimborsato: true }), null);
    const shows = [{ costo: 50, durata: 25 }, { costo: 50 }, { costo: 0, durata: 30, isRegalo: true }, { costo: 30, durata: 5 }];
    assert.ok(Math.abs(f.costoMedioAlMinuto(shows) - 80 / 30) < 1e-9);
    assert.equal(f.costoMedioAlMinuto([{ costo: 10 }]), null);
});

test('€/min colorato rispetto alla media (fascia neutra ±10%)', () => {
    f.stato.costoMinutoRiferimento = 2;
    assert.match(f.formattaCostoAlMinuto(1.5), /costo-min-conveniente/);
    assert.match(f.formattaCostoAlMinuto(2.1), /class=""/);
    assert.match(f.formattaCostoAlMinuto(3), /costo-min-caro/);
    assert.match(f.formattaCostoAlMinuto(null), /dato-mancante/);
    assert.equal(f.formattaCostoAlMinuto(3, null), '€ 3.00');
});

test('voti come badge colorati e durate', () => {
    assert.match(f.formattaVoto({ punteggio: 5 }), /voto-5/);
    assert.match(f.formattaVoto({ punteggio: '4' }), /voto-4/);
    assert.match(f.formattaVoto({ punteggio: 3 }), /voto-3/);
    assert.match(f.formattaVoto({ punteggio: 1 }), /voto-basso/);
    assert.match(f.formattaVoto({ punteggio: 'TBD' }), /badge-tbd/);
    assert.match(f.formattaVoto({ isRegalo: true }), /dato-mancante/);
    assert.equal(f.formattaDurata(90), '1h 30m');
    assert.match(f.formattaDurata(0), /dato-mancante/);
    assert.match(f.formattaDurata(undefined), /dato-mancante/);
});

test('URL del profilo predefinito senza accenti e maiuscole', () => {
    assert.equal(f.urlProfiloPredefinito('Giulìa Rossi'), 'https://giuliarossi.mondocamgirls.com');
    assert.equal(f.urlProfiloPredefinito('Jenny_'), 'https://jenny.mondocamgirls.com');
});

test('escape HTML negli attributi e nel testo', () => {
    assert.equal(f.escapeHtml(`<a href="x">D'Angelo</a>`), '&lt;a href=&quot;x&quot;&gt;D&#039;Angelo&lt;/a&gt;');
});

test('importi e tipi delle transazioni MCG', () => {
    assert.equal(f.convertiImportoItaliano('-60.00 €'), '-60.00');
    assert.equal(f.convertiImportoItaliano('1.234,56 €'), '1234.56');
    assert.equal(f.tipoTransazione('Pagamento da conto ricaricabile'), 'pagamento');
    assert.equal(f.tipoTransazione('Rimborso su conto ricaricabile'), 'rimborso');
    assert.equal(f.tipoTransazione('Ricarica con carta di credito'), 'ricarica');
    assert.equal(f.tipoTransazione('Altro'), 'altro');
});

test('tasto rapido per nascondere l\'app: combinazione dal tasto premuto e combinazioni non ammesse', async () => {
    const p = await import('../js/privacy.js');
    const ev = (code, mod = {}) => ({ code, ctrlKey: false, altKey: false, shiftKey: false, ...mod });
    assert.equal(p.combinazioneDaEvento(ev('KeyH', { ctrlKey: true, shiftKey: true })), 'Ctrl+Shift+H');
    assert.equal(p.combinazioneDaEvento(ev('Digit5', { altKey: true })), 'Alt+5');
    assert.equal(p.combinazioneDaEvento(ev('Numpad7', { ctrlKey: true })), 'Ctrl+7');
    assert.equal(p.combinazioneDaEvento(ev('F9')), 'F9');
    assert.equal(p.combinazioneDaEvento(ev('ShiftLeft', { shiftKey: true })), null, 'solo modificatore');
    assert.equal(p.combinazioneDaEvento(ev('Space', { ctrlKey: true })), null);
    assert.equal(p.problemaCombinazione('Ctrl+Shift+H'), null);
    assert.equal(p.problemaCombinazione('Alt+5'), null);
    assert.equal(p.problemaCombinazione('F9'), null);
    assert.equal(p.problemaCombinazione('H'), 'modificatore');
    assert.equal(p.problemaCombinazione('Shift+H'), 'modificatore', 'con il solo Shift scatterebbe scrivendo una maiuscola');
    assert.equal(p.problemaCombinazione('Shift+F2'), null);
    assert.equal(p.problemaCombinazione('Ctrl+C'), 'riservata');
    assert.equal(p.problemaCombinazione('Ctrl+Invio'), 'riservata', 'Ctrl+Invio salva il form');
    assert.equal(p.problemaCombinazione('F5'), 'riservata');
    assert.equal(p.tastoRapido(), p.TASTO_RAPIDO_PREDEFINITO);
});

test('lingua del primo avvio: quella del sistema se tradotta, altrimenti inglese', async () => {
    const { linguaDiSistema } = await import('../js/i18n.js');
    const originale = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    const prova = (lingua) => { Object.defineProperty(globalThis, 'navigator', { value: { language: lingua }, configurable: true }); return linguaDiSistema(); };
    try {
        assert.equal(prova('it-IT'), 'it');
        assert.equal(prova('it'), 'it');
        assert.equal(prova('en-US'), 'en');
        assert.equal(prova('de-DE'), 'de');
        assert.equal(prova('pt-BR'), 'pt');
        assert.equal(prova('pt-PT'), 'pt');
        assert.equal(prova('ro'), 'ro');
        assert.equal(prova('ru-RU'), 'ru');
        assert.equal(prova('es-419'), 'es');
        assert.equal(prova('fr-CA'), 'fr');
        assert.equal(prova('ja-JP'), 'en', 'lingue non tradotte: inglese');
        assert.equal(prova(undefined), 'en');
    } finally {
        if (originale) Object.defineProperty(globalThis, 'navigator', originale);
    }
});

test('link della chat: Teams apre la chat solo con l\'email, lo username si copia', () => {
    assert.equal(f.generaLinkChat('Teams', 'anna@example.com'), 'https://teams.microsoft.com/l/chat/0/0?users=anna%40example.com');
    assert.equal(f.generaLinkChat('Teams', 'AnnaRossi'), null);
    assert.equal(f.generaLinkChat('Teams', '@AnnaRossi'), null);
    assert.equal(f.generaLinkChat('Telegram', '@anna_r'), 'https://t.me/anna_r');
    assert.equal(f.generaLinkChat('Skype', 'anna'), null);
    assert.equal(f.generaLinkChat('Teams', ''), null);

    assert.equal(f.eUsernameTeams('Teams', 'AnnaRossi'), true);
    assert.equal(f.eUsernameTeams('Teams', '@AnnaRossi'), true);
    assert.equal(f.eUsernameTeams('Teams', 'anna@example.com'), false);
    assert.equal(f.eUsernameTeams('Teams', '  '), false);
    assert.equal(f.eUsernameTeams('Telegram', 'AnnaRossi'), false);
});
