// Filtri delle tabelle ricordati alla riapertura (js/filtri-salvati.js)
const test = require('node:test');
const assert = require('node:assert/strict');
const { caricaModuli } = require('./carica-script');

// localStorage in memoria, al posto del sostituto vuoto di carica-script.js
const memoria = new Map();
globalThis.localStorage = {
    getItem: (k) => (memoria.has(k) ? memoria.get(k) : null),
    setItem: (k, v) => memoria.set(k, String(v)),
    removeItem: (k) => memoria.delete(k)
};

test('filtri salvati: solo i filtri previsti, e il reset li dimentica', async () => {
    const f = await caricaModuli(['filtri-salvati.js']);
    memoria.set('filtroSitoCronologia', 'stripchat');
    memoria.set('filtroOrdineCronologia', 'asc');
    assert.equal(f.filtroSalvato('filtroSitoCronologia'), 'stripchat');
    assert.equal(f.filtroSalvato('ordineData'), 'asc');
    assert.equal(f.filtroSalvato('filtroTagCronologia'), '', 'nessun valore salvato');
    assert.equal(f.filtroSalvato('mmSito'), '', 'la modifica multipla non è un filtro ricordato');
    assert.equal(f.filtroSalvato('searchModellaCronologia'), '', 'la ricerca per nome non si ricorda');
    memoria.set('filtroSoloOnlinePreventivo', '1');
    assert.equal(f.filtroSalvato('filtroSoloOnlinePreventivo'), '1', '"Solo online" del Preventivo');

    f.dimenticaFiltri(['ordineData', 'filtroSitoCronologia']);
    assert.equal(f.filtroSalvato('ordineData'), '');
    assert.equal(f.filtroSalvato('filtroSitoCronologia'), '');
});
