/* ==========================================================================
   LIGHTBOX E GALLERIA FOTO
   ========================================================================== */
function apriModalImmagine(urlFoto, listaFoto = null, indice = 0) {
    if (!urlFoto) return;
    
    const modalImg = document.getElementById('modalImmagineIngrandita');
    const imgTarget = document.getElementById('imgIngrandita');
    const btnNavigazione = document.querySelectorAll('.nav-btn-lightbox');
    
    if (listaFoto && Array.isArray(listaFoto) && listaFoto.length > 1) {
        galleriaCorrente = listaFoto;
        indiceFotoCorrente = indice;
        btnNavigazione.forEach(btn => btn.style.display = 'block');
    } else {
        galleriaCorrente = [urlFoto];
        indiceFotoCorrente = 0;
        btnNavigazione.forEach(btn => btn.style.display = 'none');
    }

    if (modalImg && imgTarget) {
        imgTarget.src = galleriaCorrente[indiceFotoCorrente];
        modalImg.style.display = 'block';
        modalImg.style.zIndex = '2000';
    }
}

function navigaGalleria(direzione) {
    if (galleriaCorrente.length <= 1) return;

    indiceFotoCorrente += direzione;

    if (indiceFotoCorrente < 0) {
        indiceFotoCorrente = galleriaCorrente.length - 1;
    } else if (indiceFotoCorrente >= galleriaCorrente.length) {
        indiceFotoCorrente = 0;
    }

    const imgTarget = document.getElementById('imgIngrandita');
    if (imgTarget) {
        imgTarget.src = galleriaCorrente[indiceFotoCorrente];
    }
}

function chiudiModalImmagine() {
    const modalImg = document.getElementById('modalImmagineIngrandita');
    if (modalImg) {
        modalImg.style.display = 'none';
    }
}

document.addEventListener('keydown', (e) => {
    const modalImg = document.getElementById('modalImmagineIngrandita');
    if (modalImg && modalImg.style.display === 'block') {
        if (e.key === 'ArrowLeft') navigaGalleria(-1);
        if (e.key === 'ArrowRight') navigaGalleria(1);
        if (e.key === 'Escape') chiudiModalImmagine();
    }
});
