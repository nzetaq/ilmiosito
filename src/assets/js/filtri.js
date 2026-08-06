/**
 * Filtro degli articoli per fonte.
 *
 * Un solo ascoltatore sulla barra intercetta i clic di tutti i
 * pulsanti; le annate rimaste senza articoli visibili spariscono.
 */
export function avviaFiltri() {
  const barra = document.getElementById('au-filters');
  const sezione = document.getElementById('sec-articoli');
  if (!barra || !sezione) return;

  const pulsanti = [...barra.querySelectorAll('.au-filter-btn')];
  const articoli = [...sezione.querySelectorAll('.au-article')];
  const annate = [...sezione.querySelectorAll('.au-anno-gruppo')];

  barra.addEventListener('click', (evento) => {
    const scelto = evento.target.closest('.au-filter-btn');
    if (!scelto) return;

    const fonte = scelto.dataset.fonte;

    for (const pulsante of pulsanti) {
      const attivo = pulsante === scelto;
      pulsante.classList.toggle('active', attivo);
      pulsante.setAttribute('aria-pressed', String(attivo));
    }

    for (const articolo of articoli) {
      articolo.hidden = fonte !== 'tutti' && articolo.dataset.source !== fonte;
    }

    for (const annata of annate) {
      annata.hidden = !annata.querySelector('.au-article:not([hidden])');
    }
  });
}
