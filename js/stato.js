/* ==========================================================================
   STATO APPLICAZIONE E VARIABILI GLOBALI
   ========================================================================== */
let mappaImmaginiModelle = {};
let mappaUrlModelle = {};
let tuttiGliShow = [];
let anniSelezionati = new Set();
let elencoModelleUniche = [];

let paginaCorrente = 1;
let currentFontSize = 18;
let classificaCompletaCache = [];

let galleriaCorrente = [];
let indiceFotoCorrente = 0;

let meseSelezionatoDettaglio = null;

// Costo medio al minuto di tutti gli show: riferimento per colorare i €/min
let costoMinutoRiferimento = null;

const iconePiattaformaHTML = {
    'Teams': '<i class="fa-solid fa-users-rectangle" style="color: #6264A7;"></i> Teams',
    'Telegram': '<i class="fa-brands fa-telegram" style="color: #2AABEE;"></i> Telegram',
    'Skype': '<i class="fa-brands fa-skype" style="color: #00AFF0;"></i> Skype',
    'Zoom': '<i class="fa-solid fa-video" style="color: #2D8CFF;"></i> Zoom',
    'Altro': '<i class="fa-solid fa-globe" style="color: #6c757d;"></i> Altro'
};
