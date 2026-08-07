/**
 * La lente sulle poesie.
 *
 * Il titolo di una poesia, al passaggio del puntatore, apre una
 * finestra che ne mostra i versi. Allontanando il puntatore la
 * finestra si chiude.
 *
 * Lo scopo è che i versi si leggano ma non si prendano con un gesto
 * solo. Vale la pena dire fin qui che cosa questo *non* è: il testo
 * viaggia comunque nel documento e chi lo cerca nel sorgente lo
 * trova. Su un sito statico non c'è modo di mostrare qualcosa senza
 * mandarlo, e ogni tentativo di nasconderlo davvero finirebbe per
 * nasconderlo anche a chi legge con la tastiera o con la voce. È un
 * attrito contro la copia distratta, non una serratura.
 *
 * Due accorgimenti fanno il grosso del lavoro:
 *  - `user-select: none`, che toglie la selezione;
 *  - `pointer-events: none` sulla finestra, che la rende inafferrabile:
 *    non riceve clic, non riceve trascinamenti, non si può cliccarci
 *    dentro col tasto destro. Il puntatore la attraversa come se non
 *    ci fosse, e resta sul titolo che l'ha aperta.
 */

const MARGINE = 12;   // distanza fra il titolo e la finestra
const BORDO = 16;     // distanza minima dai bordi della finestra del browser

export function avviaPoesie() {
  const titoli = document.querySelectorAll('.au-poem-title--lente');
  if (!titoli.length) return;

  // Una sola finestra riusata da tutti i titoli, appesa al corpo del
  // documento: fuori da ogni contesto di impilamento, così non finisce
  // mai sotto a un altro elemento della pagina.
  const finestra = document.createElement('div');
  finestra.className = 'au-versi-finestra';
  finestra.setAttribute('role', 'presentation');
  finestra.hidden = true;
  document.body.appendChild(finestra);

  let aperta = null;

  function colloca(titolo) {
    const t = titolo.getBoundingClientRect();
    const f = finestra.getBoundingClientRect();

    // Sotto al titolo se c'è spazio, sopra altrimenti.
    const sotto = t.bottom + MARGINE;
    const sopra = t.top - MARGINE - f.height;
    const y = sotto + f.height + BORDO <= window.innerHeight || sopra < BORDO ? sotto : sopra;

    // Allineata al titolo, ma rientrata se sborderebbe.
    const massimo = window.innerWidth - f.width - BORDO;
    const x = Math.max(BORDO, Math.min(t.left, massimo));

    finestra.style.left = Math.round(x) + 'px';
    finestra.style.top = Math.round(Math.max(BORDO, y)) + 'px';
  }

  function apri(titolo) {
    const versi = document.getElementById(titolo.getAttribute('aria-describedby'));
    if (!versi) return;

    finestra.textContent = versi.textContent;
    finestra.hidden = false;
    // Va collocata dopo essere stata mostrata: da nascosta non ha
    // dimensioni, e senza dimensioni non si sa dove ci sta.
    colloca(titolo);
    finestra.classList.add('is-aperta');
    aperta = titolo;
  }

  function chiudi() {
    if (!aperta) return;
    finestra.classList.remove('is-aperta');
    finestra.hidden = true;
    finestra.textContent = '';
    aperta = null;
  }

  for (const titolo of titoli) {
    titolo.addEventListener('mouseenter', () => apri(titolo));
    titolo.addEventListener('mouseleave', chiudi);
    // Chi naviga con la tastiera non ha un puntatore da posare: senza
    // questo la poesia sarebbe raggiungibile solo col mouse.
    titolo.addEventListener('focus', () => apri(titolo));
    titolo.addEventListener('blur', chiudi);
  }

  // Se la pagina si muove sotto una finestra aperta, la finestra
  // resterebbe puntata al vuoto: meglio richiuderla.
  window.addEventListener('scroll', chiudi, { passive: true });
  window.addEventListener('resize', chiudi);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') chiudi();
  });
}
