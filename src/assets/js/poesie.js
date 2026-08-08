/**
 * La lente sulle poesie.
 *
 * Il titolo di una poesia, al passaggio del puntatore, apre al centro
 * dello schermo una finestra che ne mostra i versi. Allontanando il
 * puntatore la finestra si chiude.
 *
 * La finestra sta al centro e non accanto al titolo. Ancorarla al
 * titolo sembrava naturale, ma un titolo in fondo alla pagina non
 * lascia spazio né sotto né sopra, e la poesia finiva tagliata dal
 * bordo dello schermo — illeggibile, e senza modo di spostarla. Il
 * centro è l'unico punto che non dipende da dove si trova il titolo.
 *
 * Le dimensioni le detta il testo: la finestra è larga quanto il verso
 * più lungo e alta quanto la poesia, finché ci sta. Quando non ci sta,
 * `adatta()` la fa entrare — prima dividendo i versi in colonne, poi,
 * solo se non basta, rimpicciolendo il corpo. Mai tagliando.
 *
 * Vale la pena dire che cosa questo *non* è: il testo viaggia comunque
 * nel documento e chi lo cerca nel sorgente lo trova. Su un sito
 * statico non c'è modo di mostrare qualcosa senza mandarlo, e ogni
 * tentativo di nasconderlo davvero finirebbe per nasconderlo anche a
 * chi legge con la tastiera o con la voce. È un attrito contro la
 * copia distratta, non una serratura.
 *
 * Due accorgimenti fanno il grosso del lavoro:
 *  - `user-select: none`, che toglie la selezione;
 *  - `pointer-events: none` sulla finestra, che la rende inafferrabile:
 *    non riceve clic, non riceve trascinamenti, non si può cliccarci
 *    dentro col tasto destro. Il puntatore la attraversa come se non
 *    ci fosse e resta sul titolo — necessario, ora che la finestra
 *    centrata può coprire il titolo che l'ha aperta.
 */

const BORDO = 16;              // margine minimo dai bordi dello schermo
// Oltre le quattro, le colonne diventano nastri e la poesia si legge
// peggio di come si leggerebbe rimpicciolita.
const COLONNE_MAX = 4;
const CORPI = [15, 14, 13, 12]; // in pixel, dal preferito al minimo

export function avviaPoesie() {
  const titoli = document.querySelectorAll('.au-poem-title--lente');
  if (!titoli.length) return;

  // Un velo e una finestra, riusati da tutti i titoli e appesi al
  // corpo del documento: fuori da ogni contesto di impilamento, così
  // non finiscono mai sotto a un altro elemento della pagina.
  const scena = document.createElement('div');
  scena.className = 'au-versi-scena';
  scena.hidden = true;

  const finestra = document.createElement('div');
  finestra.className = 'au-versi-finestra';
  finestra.setAttribute('role', 'presentation');
  finestra.hidden = true;

  const corpo = document.createElement('div');
  corpo.className = 'au-versi-corpo';
  finestra.appendChild(corpo);

  document.body.appendChild(scena);
  document.body.appendChild(finestra);

  let aperta = null;

  /** Ogni strofa un elemento, così le colonne non le spezzano a metà. */
  function componi(testo) {
    corpo.textContent = '';
    for (const strofa of testo.split(/\n\s*\n/)) {
      const blocco = document.createElement('div');
      blocco.className = 'au-versi-strofa';
      blocco.textContent = strofa.trim();
      corpo.appendChild(blocco);
    }
  }

  /**
   * Fa entrare la poesia nello schermo senza tagliarne un verso.
   *
   * Si prova prima ad allargare in orizzontale — dividere in colonne
   * costa molto meno, alla leggibilità, che rimpicciolire il testo — e
   * solo dopo si scende di corpo. Ogni tentativo viene misurato per
   * davvero invece che calcolato: il carattere ha le sue metriche e la
   * sbagliano tutte le formule.
   */
  function adatta() {
    const stile = getComputedStyle(finestra);
    const num = (v) => parseFloat(v) || 0;
    // Quanto della finestra è cornice e non testo.
    const corniceX = num(stile.paddingLeft) + num(stile.paddingRight) +
                     num(stile.borderLeftWidth) + num(stile.borderRightWidth);
    const corniceY = num(stile.paddingTop) + num(stile.paddingBottom) +
                     num(stile.borderTopWidth) + num(stile.borderBottomWidth);

    const spazioX = window.innerWidth - 2 * BORDO - corniceX;
    const spazioY = window.innerHeight - 2 * BORDO - corniceY;

    // Si misura il testo, non la finestra. La finestra ha un tetto di
    // altezza, quindi da lì non risulterebbe mai troppo alta: il
    // controllo passerebbe sempre mentre i versi traboccano fuori.
    // Il corpo interno invece non è vincolato e dice la verità.
    const troppoAlto = () => corpo.getBoundingClientRect().height > spazioY + 1;

    for (const misura of CORPI) {
      corpo.style.fontSize = misura + 'px';

      // Larghezza naturale di una colonna sola: la detta il verso più
      // lungo. Va misurata a colonna singola, prima di distribuire.
      corpo.style.columnCount = '1';
      corpo.style.width = 'max-content';
      const larga = Math.min(corpo.getBoundingClientRect().width, spazioX);
      const distanza = num(getComputedStyle(corpo).columnGap);

      corpo.style.width = larga + 'px';
      if (!troppoAlto()) return;

      // Non ci sta in altezza: si allarga in orizzontale. Dividere in
      // colonne costa molto meno, alla leggibilità, che rimpicciolire
      // il testo — quindi si esauriscono le colonne prima di scendere
      // di corpo. Quante ce ne stiano lo decide la larghezza dello
      // schermo, non il desiderio.
      const quante = Math.max(1, Math.min(
        COLONNE_MAX, Math.floor((spazioX + distanza) / (larga + distanza))));

      for (let n = 2; n <= quante; n++) {
        corpo.style.columnCount = String(n);
        corpo.style.width = Math.min(spazioX, larga * n + distanza * (n - 1)) + 'px';
        if (!troppoAlto()) return;
      }
    }
    // Esaurite le combinazioni resta l'ultima provata, la più capiente.
    // Ci vuole una poesia di oltre centoventi versi per arrivare qui.
  }

  function apri(titolo) {
    const versi = document.getElementById(titolo.getAttribute('aria-describedby'));
    if (!versi) return;

    componi(versi.textContent);
    scena.hidden = false;
    finestra.hidden = false;
    // Va adattata da visibile: da nascosta non ha dimensioni, e senza
    // dimensioni non si sa se ci sta.
    adatta();
    scena.classList.add('is-aperta');
    finestra.classList.add('is-aperta');
    aperta = titolo;
  }

  function chiudi() {
    if (!aperta) return;
    scena.classList.remove('is-aperta');
    finestra.classList.remove('is-aperta');
    scena.hidden = true;
    finestra.hidden = true;
    corpo.textContent = '';
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

  // Cambiando le dimensioni dello schermo l'adattamento non vale più.
  window.addEventListener('resize', () => {
    if (aperta) adatta();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') chiudi();
  });
}
