/* ==========================================================================
   AZIONI DELL'INTERFACCIA (al posto degli onclick/onchange scritti nell'HTML)
   ==========================================================================
   La Content-Security-Policy di index.html vieta il codice JavaScript dentro
   l'HTML. Gli elementi dichiarano invece cosa fanno con attributi data-*:

     data-azione="nome"      clic (anche Invio/Spazio se l'elemento ha data-tastiera)
     data-al-cambio="nome"   evento change (select, checkbox)
     data-al-input="nome"    evento input (campi di ricerca)

   e un solo ascoltatore sul documento esegue la funzione registrata con quel
   nome, passandole l'elemento e l'evento. Se più elementi annidati hanno
   un'azione vince il più interno (es. la foto dentro una riga cliccabile).

   Le immagini con data-sostituto, se non si caricano, vengono sostituite dal
   riquadro "No Foto" (al posto di onerror="..."). */

const azioni = {};

export function registraAzioni(mappa) {
    Object.assign(azioni, mappa);
}

function esegui(nome, elemento, evento) {
    const azione = azioni[nome];
    if (!azione) {
        console.warn(`Azione non registrata: ${nome}`);
        return;
    }
    azione(elemento, evento);
}

export function inizializzaAzioni() {
    document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-azione]');
        if (el) esegui(el.dataset.azione, el, e);
    });

    // Elementi attivabili da tastiera (es. le note espandibili)
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        const el = e.target.closest('[data-azione][data-tastiera]');
        if (el && el === e.target) {
            e.preventDefault();
            esegui(el.dataset.azione, el, e);
        }
    });

    document.addEventListener('change', (e) => {
        const el = e.target.closest('[data-al-cambio]');
        if (el) esegui(el.dataset.alCambio, el, e);
    });

    document.addEventListener('input', (e) => {
        const el = e.target.closest('[data-al-input]');
        if (el) esegui(el.dataset.alInput, el, e);
    });

    // L'evento "error" delle immagini non risale il DOM: va intercettato in fase di cattura
    document.addEventListener('error', (e) => {
        const img = e.target;
        if (img.tagName === 'IMG' && img.dataset.sostituto !== undefined) {
            const riquadro = document.createElement('div');
            // Il riquadro eredita il clic sulla modella e il bordo "online" della foto
            riquadro.className = ['no-img', ...['cliccabile', 'foto-online'].filter(c => img.classList.contains(c))].join(' ');
            for (const chiave of ['azione', 'nome']) if (img.dataset[chiave] !== undefined) riquadro.dataset[chiave] = img.dataset[chiave];
            if (img.title) riquadro.title = img.title;
            riquadro.textContent = img.dataset.sostituto;
            img.replaceWith(riquadro);
        }
    }, true);
}
