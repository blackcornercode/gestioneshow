// Il logger dell'interfaccia deve scrivere gli Error con messaggio e stack (JSON.stringify darebbe "{}")
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { caricaModuli } = require('./carica-script');

test('descrizione dei dettagli del log', async () => {
    const { descriviDettagli } = await caricaModuli(['logger.js']);
    assert.equal(descriviDettagli(null), '');
    assert.equal(descriviDettagli('testo'), 'testo');
    assert.equal(descriviDettagli({ a: 1 }), '{"a":1}');
    assert.match(descriviDettagli(new Error('guasto')), /guasto/);
    const circolare = {}; circolare.se = circolare;
    assert.equal(typeof descriviDettagli(circolare), 'string');
});
