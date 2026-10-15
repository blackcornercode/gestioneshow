// Test del registro (main/log.js): livelli, ripulitura delle righe, scrittura e rotazione
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

// main/percorsi.js richiede electron: nei test i percorsi puntano a una cartella temporanea
const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'log-test-'));
const percorsiFinti = { log: path.join(cartella, 'app.log'), logPrecedente: path.join(cartella, 'app.log.1') };
const modulo = require.resolve('../main/percorsi');
require.cache[modulo] = { id: modulo, filename: modulo, loaded: true, exports: percorsiFinti };
const log = require('../main/log');

test('soglia dei livelli', () => {
    assert.ok(log.eAmmesso('ERROR', 'error'));
    assert.ok(!log.eAmmesso('WARN', 'error'));
    assert.ok(log.eAmmesso('WARN', 'warn'));
    assert.ok(!log.eAmmesso('INFO', 'warn'));
    assert.ok(log.eAmmesso('SUCCESS', 'info'));
    assert.ok(!log.eAmmesso('ERROR', 'off'));
    // la riga d'avvio con la versione si scrive a ogni livello tranne «Niente»
    assert.ok(log.eAmmesso('AVVIO', 'error'));
    assert.ok(!log.eAmmesso('AVVIO', 'off'));
    // livello sconosciuto = INFO
    assert.ok(!log.eAmmesso('boh', 'warn'));
    assert.ok(log.eAmmesso('boh', 'info'));
});

test('livelli validi e predefinito', () => {
    assert.ok(log.livelloValido('info'));
    assert.ok(!log.livelloValido('debug'));
    assert.ok(log.LIVELLI_LOG.includes(log.LIVELLO_PREDEFINITO));
});

test('le righe non possono contenere a capo né essere enormi', () => {
    const riga = log.formattaRiga('error', 'uno\n[2000-01-01] [INFO] falso', 'a\r\nb', new Date('2026-01-02T03:04:05Z'));
    assert.equal(riga, '[2026-01-02T03:04:05.000Z] [ERROR] uno [2000-01-01] [INFO] falso - a b\n');
    assert.equal(riga.trimEnd().split('\n').length, 1);
    assert.ok(log.sanifica('x'.repeat(5000), 100).length <= 101);
});

test('scrittura filtrata dal livello e cancellazione', async () => {
    log.impostaLivello('warn');
    await log.logToFile('INFO', 'ignorato');
    await log.logToFile('WARN', 'avviso', 'dettaglio');
    await log.logToFile('ERROR', 'errore');
    const righe = fs.readFileSync(percorsiFinti.log, 'utf8').trim().split('\n');
    assert.equal(righe.length, 2);
    assert.match(righe[0], /\[WARN\] avviso - dettaglio$/);
    assert.match(righe[1], /\[ERROR\] errore$/);

    log.impostaLivello('off');
    await log.logToFile('ERROR', 'non scritto');
    assert.equal(fs.readFileSync(percorsiFinti.log, 'utf8').trim().split('\n').length, 2);

    await log.cancellaLog();
    assert.ok(!fs.existsSync(percorsiFinti.log));
    await log.cancellaLog(); // senza file non deve fallire
});

test('oltre 1 MB il file diventa app.log.1', async () => {
    log.impostaLivello('info');
    const blocco = 'x'.repeat(900);
    for (let i = 0; i < 1200; i++) await log.logToFile('INFO', blocco);
    assert.ok(fs.existsSync(percorsiFinti.logPrecedente));
    assert.ok(fs.statSync(percorsiFinti.log).size < 1024 * 1024 + 2000);
    await log.cancellaLog();
    fs.rmSync(cartella, { recursive: true, force: true });
});
