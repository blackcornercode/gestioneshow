/* ==========================================================================
   INIZIALIZZAZIONE
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
    logger.info("Inizializzazione applicazione...");
    await caricaLingua(linguaCorrente);
    
    mostraVersioneApp();
    impostaDataOraAttuale();
    inizializzaFiltriCronologia();
    aggiornaInterfaccia();
    inizializzaTema();
    inizializzaFont();
    inizializzaGestioneBudget();
    inizializzaMenuHeader();
    aggiornaPulsanteForm();

    const customTrigger = document.querySelector('.custom-select-trigger');
    const customDropdown = document.getElementById('customPiattaformaDropdown');
    const selectPiattaforma = document.getElementById('piattaforma');

    if (customTrigger && customDropdown) {
        customTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isRegalo = document.getElementById('isRegalo')?.checked;
            if (!isRegalo) {
                customDropdown.classList.toggle('open');
            }
        });

        document.querySelectorAll('.custom-option').forEach(option => {
            option.addEventListener('click', () => {
                const val = option.getAttribute('data-value');
                if (selectPiattaforma) selectPiattaforma.value = val;
                
                const selectedSpan = document.getElementById('customSelectSelected');
                if (selectedSpan) selectedSpan.innerHTML = option.innerHTML;

                customDropdown.classList.remove('open');
            });
        });

        window.addEventListener('click', () => {
            customDropdown.classList.remove('open');
        });
    }

    const closeBtn = document.getElementById('closeChangelogBtn');
    const confirmBtn = document.getElementById('confirmChangelogBtn');
    
    if (closeBtn) closeBtn.addEventListener('click', chiudiModalChangelog);
    if (confirmBtn) confirmBtn.addEventListener('click', chiudiModalChangelog);

    const openChangelogBtn = document.getElementById('openChangelogBtn');
    if (openChangelogBtn) {
        openChangelogBtn.addEventListener('click', (e) => {
            e.preventDefault();
            apriModalChangelog();
        });
    }

    inizializzaListenerChangelogMenu();

    const inputNome = document.getElementById('nome');
    if (inputNome) {
        inputNome.addEventListener('input', autocompilaDatiModella);
    }

    const limiteSelect = document.getElementById('limiteRisultati');
    if (limiteSelect) {
        limiteSelect.addEventListener('change', (e) => {
            localStorage.setItem('limiteRisultati', e.target.value);
            paginaCorrente = 1;
            caricaCronologia(tuttiGliShow);
        });
    }

    const ordineSelect = document.getElementById('ordineData');
    if (ordineSelect) {
        ordineSelect.addEventListener('change', () => {
            paginaCorrente = 1;
            caricaCronologia(tuttiGliShow);
        });
    }

    window.addEventListener('click', (event) => {
        const modal = document.getElementById('modalModella');
        if (event.target === modal) {
            chiudiModalModella();
        }
    });

    // Mostra automaticamente le novità al primo avvio dopo un aggiornamento
    // (prima veniva cercata una funzione initChangelogCheck mai definita)
    initChangelogCheck();
    
    // Indicatore stato MCG: verifica subito, poi ogni 60 secondi o al clic.
    // Parte dopo caricaLingua, così i testi sono già tradotti.
    verificaStatoMCG();
    setInterval(verificaStatoMCG, 60000);
    const mcgContainer = document.getElementById('mcgStatusContainer');
    if (mcgContainer) {
        mcgContainer.addEventListener('click', verificaStatoMCG);
        mcgContainer.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                verificaStatoMCG();
            }
        });
    }

    logger.success("Applicazione inizializzata con successo.");
});
