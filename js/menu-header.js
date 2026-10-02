/* ==========================================================================
   MENU A TENDINA DELL'HEADER (Dati / Impostazioni)
   ========================================================================== */
function chiudiMenuHeader(eccetto = null) {
    document.querySelectorAll('.menu-header.open').forEach(menu => {
        if (menu === eccetto) return;
        menu.classList.remove('open');
        menu.querySelector('.menu-header-toggle')?.setAttribute('aria-expanded', 'false');
    });
}

function inizializzaMenuHeader() {
    document.querySelectorAll('.menu-header').forEach(menu => {
        const toggle = menu.querySelector('.menu-header-toggle');
        if (!toggle) return;

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            chiudiMenuHeader(menu);
            const aperto = menu.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(aperto));
        });

        // I clic dentro il pannello (select, A+/A-) non devono chiuderlo...
        menu.querySelector('.menu-header-pannello')?.addEventListener('click', (e) => {
            e.stopPropagation();
            // ...tranne le azioni del menu Dati, che aprono una finestra di dialogo
            if (e.target.closest('[role="menuitem"]')) chiudiMenuHeader();
        });
    });

    document.addEventListener('click', () => chiudiMenuHeader());
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') chiudiMenuHeader();
    });
}
