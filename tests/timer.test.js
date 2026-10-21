// Controlli periodici (js/timer.js): fermi con l'app nascosta, recuperati una
// volta sola quando torna visibile
const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { caricaModuli } = require('./carica-script');

test('controlli periodici: saltati con la finestra nascosta, poi eseguiti una volta', async () => {
    // Documento minimo che ricorda gli ascoltatori, per simulare visibilitychange
    const ascoltatori = {};
    globalThis.document = {
        hidden: false,
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: (tipo, funzione) => { (ascoltatori[tipo] ??= []).push(funzione); },
        dispatchEvent: (evento) => { (ascoltatori[evento.type] || []).forEach(funzione => funzione(evento)); }
    };
    mock.timers.enable({ apis: ['setInterval'] });
    try {
        const f = await caricaModuli(['timer.js']);
        let chiamate = 0;
        f.ripetiOgni(() => { chiamate++; }, 1000);

        mock.timers.tick(1000);
        assert.equal(chiamate, 1, 'app visibile: il controllo parte');

        document.hidden = true;
        mock.timers.tick(3000);
        assert.equal(chiamate, 1, 'app nascosta: nessun controllo');

        document.hidden = false;
        ascoltatori.visibilitychange.forEach(funzione => funzione());
        assert.equal(chiamate, 2, 'di nuovo visibile: i controlli saltati diventano uno solo');
        ascoltatori.visibilitychange.forEach(funzione => funzione());
        assert.equal(chiamate, 2, 'niente da recuperare');
    } finally {
        mock.timers.reset();
    }
});
