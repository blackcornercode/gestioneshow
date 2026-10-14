// Caricato con NODE_OPTIONS=--require dentro Electron (vedi esegui.cjs): apre l'app
// sui dati dimostrativi, imposta lingua inglese e budget, e salva gli screenshot
// in docs/screenshot/. Non va incluso nella build.
setImmediate(() => {
    const { app } = require('electron');
    const fs = require('fs');
    const path = require('path');
    const USCITA = process.env.CATTURA_USCITA;
    let preparata = false;

    app.on('browser-window-created', (_, win) => {
        win.webContents.on('did-finish-load', async () => {
            if (!win.webContents.getURL().includes('index.html')) return;
            const js = (codice) => win.webContents.executeJavaScript(codice);
            const pausa = (ms) => new Promise(r => setTimeout(r, ms));
            try {
                // Primo caricamento: preferenze nel localStorage, poi si ricarica la pagina
                if (!preparata) {
                    preparata = true;
                    await js(`localStorage.setItem('appLang', 'en'); localStorage.setItem('monthly_budget', '250');
                        localStorage.setItem('limiteRisultati', '10'); localStorage.setItem('sfocaFoto', '0');
                        localStorage.removeItem('anniSelezionatiFiltro'); localStorage.setItem('graficoSpesaVista', 'mesi'); true`);
                    win.setContentSize(1400, 880);
                    win.webContents.reload();
                    return;
                }
                await pausa(2500);
                // Finestra in primo piano e attesa più lunga: altrimenti la cattura può
                // restituire un'immagine non ancora ridisegnata (es. a metà di una dissolvenza)
                const foto = async (nome) => {
                    win.show();
                    win.focus();
                    await pausa(1000);
                    fs.writeFileSync(path.join(USCITA, `${nome}.png`), (await win.webContents.capturePage()).toPNG());
                    console.log(`  ${nome}.png`);
                };
                const tema = (nome) => js(`(() => { const s = document.getElementById('selectTema'); s.value = '${nome}'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
                const scheda = (id) => js(`document.querySelector('[data-tab="${id}"]').click(); window.scrollTo(0, 0); true`);
                await js(`document.getElementById('confirmChangelogBtn')?.click(); true`);
                // Lascia il tempo alla verifica di raggiungibilità di MCG, alla lettura del credito e alla chiusura del popup
                await pausa(2500);
                // Inglese anche se il primo caricamento ha salvato la lingua di sistema dopo
                // l'impostazione qui sopra; credito dimostrativo (nessun login MCG nei dati inventati)
                await js(`(async () => {
                    const s = document.getElementById('selectLingua');
                    if (s.value !== 'en') { s.value = 'en'; s.dispatchEvent(new Event('change', { bubbles: true })); }
                    await new Promise(r => setTimeout(r, 800));
                    (await import('./js/credito-mcg.js')).registraCredito({ success: true, credito: 42.5 });
                    return true; })()`);

                // 1. Cronologia (tema Neve & Nebbia)
                await tema('grey');
                // La sezione della cronologia sotto l'intestazione fissa dell'app
                await js(`document.getElementById('container-filtri-anni').closest('section').scrollIntoView(); window.scrollBy(0, -140); true`);
                await foto('cronologia');

                // 2. Form assistito (tema chiaro)
                await tema('light');
                await js(`(async () => {
                    const q = (s) => document.querySelector(s);
                    q('[data-azione="toggle-form"]').click();
                    q('#nome').value = 'LunaVelvet'; q('#nome').dispatchEvent(new Event('input', { bubbles: true }));
                    q('[data-azione="durata-rapida"][data-minuti="30"]').click();
                    // Su un sito a token (LunaVelvet ha l'ultimo show su Stripchat) si scrive l'importo in token
                    if (!q('#convertitoreValuta').hidden) { q('#importoValuta').value = '812'; q('#importoValuta').dispatchEvent(new Event('input', { bubbles: true })); }
                    else { q('#costo').value = '65'; q('#costo').dispatchEvent(new Event('input', { bubbles: true })); }
                    q('[data-azione="voto-stelle"][data-voto="5"]').click();
                    q('#tagForm [data-id="lovense"]').click();
                    q('#note').value = 'Amazing as always.';
                    window.scrollTo(0, 0); return true; })()`);
                await foto('form');
                await js(`document.querySelector('[data-azione="svuota-form"]').click(); document.querySelector('[data-azione="toggle-form"]').click(); true`);

                // 3. Classifica (tema scuro)
                await tema('dark');
                await scheda('tabClassifica');
                await foto('classifica');

                // 4. Scheda modella (tema Bordeaux & Oro). La galleria cerca le foto sul sito
                //    di MCG, che per le modelle inventate non esistono: nello screenshot è nascosta
                await tema('mcg');
                await js(`import('./js/modale-modella.js').then(m => m.apriModalModella('LunaVelvet')).then(() => {
                    document.getElementById('sezioneGalleriaModella').style.display = 'none'; return true; })`);
                await foto('scheda-modella');
                await js(`import('./js/modale-modella.js').then(m => { m.chiudiModalModella(); return true; })`);

                // 5. Statistiche con grafico e budget (tema Neve & Nebbia)
                await tema('grey');
                await scheda('tabStatistiche');
                // Budget chiuso: il badge Budget OK basta e il grafico entra per intero
                await foto('statistiche');

                // 6. Privacy nel menu Impostazioni (tema scuro)
                await tema('dark');
                await scheda('tabDashboard');
                await js(`document.querySelector('#menuImpostazioni .menu-header-toggle').click(); true`);
                await foto('privacy');
            } catch (err) {
                console.error('Cattura non riuscita:', err);
                process.exitCode = 1;
            }
            app.quit();
        });
    });
});
