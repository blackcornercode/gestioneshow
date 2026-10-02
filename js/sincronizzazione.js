/* ==========================================================================
   SINCRONIZZAZIONE TRANSAZIONI MONDO CAM GIRLS
   ========================================================================== */
// "1.234,56 €" -> "1234.56". Prima veniva sostituita solo la prima virgola e i
// punti delle migliaia restavano, quindi 1.234,56 diventava 1,234.
function convertiImportoItaliano(testo) {
    const pulito = String(testo).replace(/[€\s\u00a0]/g, '');
    return pulito.includes(',')
        ? pulito.replace(/\./g, '').replace(',', '.')
        : pulito;
}

async function sincronizzaTransazioniMondoCamGirls() {
    try {
        if (!window.electronAPI || !window.electronAPI.fetchTransazioniHtml) {
            alert("Errore: Funzione di sincronizzazione non supportata.");
            return;
        }

        logger.info("Avvio sincronizzazione transazioni da MondoCamGirls...");
        
        const htmlContent = await window.electronAPI.fetchTransazioniHtml();

        if (!htmlContent || typeof htmlContent !== 'string') {
            logger.warn("Sincronizzazione annullata o finestra chiusa.");
            return;
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        const righeTabella = doc.querySelectorAll('table tbody tr, table tr');

        if (!righeTabella || righeTabella.length === 0) {
            alert("⚠️ Nessuna tabella di transazioni trovata nella pagina scaricata.");
            return;
        }

        let showsEsistenti = await window.electronAPI.readData();
        aggiornaMappeModelle(showsEsistenti);
        
        let nuoviShowImportati = 0;

        // Chiave anti-duplicato: nome + data/ora al minuto, in ora locale
        const p2 = (n) => String(n).padStart(2, '0');
        const chiaveShow = (nome, d) =>
            `${nome}|${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;

        // Quanti show già salvati ci sono per ogni chiave. Ogni rappresentazione
        // della data salvata nel record (ISO, dataFormattata, data) conta come match.
        const giaSalvati = new Map();
        showsEsistenti.forEach(s => {
            const nome = (s.nome || '').toLowerCase().trim();
            if (!nome) return;
            const date = [dataDelloShow(s), parseDataItaliana(s.dataFormattata), parseDataItaliana(s.data)].filter(Boolean);
            new Set(date.map(d => chiaveShow(nome, d)))
                .forEach(k => giaSalvati.set(k, (giaSalvati.get(k) || 0) + 1));
        });

        // Occorrenze di ogni chiave nella pagina: due show reali con la stessa
        // modella nello stesso minuto prima venivano fusi in uno solo
        const trovatiNellaPagina = new Map();

        righeTabella.forEach(riga => {
            const celle = riga.querySelectorAll('td');
            if (celle.length < 5) return;

            const testoData = celle[0]?.textContent.trim() || '';
            const testoNome = celle[4]?.textContent.trim() || '';
            const costoNum = Math.abs(parseFloat(convertiImportoItaliano(celle[2]?.textContent || '0')) || 0);

            // Righe senza una data leggibile (intestazioni, totali...) non sono
            // transazioni: prima venivano importate con la data di oggi
            const dataShow = parseDataItaliana(testoData);
            if (!dataShow || !testoNome || !isNaN(testoNome)) return;

            const nomeNormalizzato = testoNome.toLowerCase();
            const chiave = chiaveShow(nomeNormalizzato, dataShow);
            const occorrenza = (trovatiNellaPagina.get(chiave) || 0) + 1;
            trovatiNellaPagina.set(chiave, occorrenza);

            if (occorrenza <= (giaSalvati.get(chiave) || 0)) {
                console.log(`[DUPLICATO BLOCCATO] ${chiave}`);
                return;
            }

            const nuovoShow = {
                id: generaIdUnico(),
                dataOraISO: dataShow.toISOString(),
                dataFormattata: testoData,
                meseAnno: dataShow.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' }),
                nome: testoNome,
                isRegalo: false,
                piattaforma: 'Teams',
                punteggio: 'TBD',
                costo: costoNum,
                immagine: mappaImmaginiModelle[nomeNormalizzato] || '',
                urlProfilo: mappaUrlModelle[nomeNormalizzato] || urlProfiloPredefinito(testoNome),
                recensione: false,
                note: '',
                isAutoImport: true
            };

            const modellaMemory = elencoModelleUniche.find(m => m.nome.toLowerCase() === nomeNormalizzato);
            if (modellaMemory && modellaMemory.nickname) {
                nuovoShow.nickname = modellaMemory.nickname;
            }

            showsEsistenti.push(nuovoShow);
            nuoviShowImportati++;
        });

        if (nuoviShowImportati > 0) {
            await salvaOAvvisa(showsEsistenti);
            logger.success(`Sincronizzazione completata: ${nuoviShowImportati} nuovi show trovati e salvati.`);
            alert(`✅ Sincronizzazione completata con successo!\n\nNuovi show importati: ${nuoviShowImportati}`);
            aggiornaInterfaccia();
        } else {
            logger.info("Sincronizzazione completata: nessun nuovo show da importare.");
            alert("ℹ️ Tutti gli show presenti nella pagina risultano già salvati.");
        }

    } catch (err) {
        logger.error("Errore durante la sincronizzazione MondoCamGirls", err);
        alert("❌ Errore durante l'elaborazione dei dati della sincronizzazione.");
    }
}
