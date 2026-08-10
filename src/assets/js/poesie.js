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

  // Fra la cornice e il testo c'è la vista: è lei a scorrere, mentre
  // la cornice resta ferma e tiene le sfumature ai bordi.
  const vista = document.createElement('div');
  vista.className = 'au-versi-vista';

  const corpo = document.createElement('div');
  corpo.className = 'au-versi-corpo';
  vista.appendChild(corpo);
  finestra.appendChild(vista);

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

    /**
     * Larghezza naturale di una colonna, misurata a `max-content`.
     *
     * Si arrotonda per eccesso per prudenza: la misura è frazionaria e
     * riassegnarla come `width` potrebbe ritrovarsi corta di un
     * centesimo di pixel, mandando a capo ogni verso. Un pixel in più
     * non si vede e toglie il dubbio.
     */
    function misuraColonna() {
      return Math.min(Math.ceil(corpo.getBoundingClientRect().width) + 1, spazioX);
    }

    for (const misura of CORPI) {
      corpo.style.fontSize = misura + 'px';

      // Larghezza naturale di una colonna sola: la detta il verso più
      // lungo. Va misurata a colonna singola, prima di distribuire.
      corpo.style.columnCount = '1';
      corpo.style.width = 'max-content';
      const larga = misuraColonna();
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

      // Prima si tenta tenendo intere le strofe, poi — solo se non
      // basta — lasciando che si spezzino. Una poesia scritta senza
      // righe vuote è una strofa sola: `break-inside: avoid` la
      // renderebbe indivisibile, le colonne in più resterebbero vuote
      // e l'altezza non calerebbe di un pixel, col risultato di
      // rimpicciolire il testo credendo che le colonne non servano.
      for (const spezza of [false, true]) {
        corpo.classList.toggle('si-spezza', spezza);
        for (let n = 2; n <= quante; n++) {
          corpo.style.columnCount = String(n);
          corpo.style.width = Math.min(spazioX, larga * n + distanza * (n - 1)) + 'px';
          if (!troppoAlto()) return;
        }
      }
      corpo.classList.remove('si-spezza');
    }

    // Non c'è modo di farcela stare: da qui in poi si scorre. Allora si
    // torna al corpo pieno e a una colonna sola.
    //
    // Una colonna, e non le quattro più capienti: scorrendo, le colonne
    // diventano un supplizio. Si arriva in fondo alla prima e bisogna
    // risalire tutto per cominciare la seconda. Una colonna sola si
    // legge dall'alto in basso una volta, come si legge una poesia.
    // E dovendo comunque scorrere, non ha senso farlo strizzando gli
    // occhi su un corpo da 12px.
    corpo.classList.remove('si-spezza');
    corpo.style.fontSize = CORPI[0] + 'px';
    corpo.style.columnCount = '1';
    corpo.style.width = 'max-content';
    corpo.style.width = misuraColonna() + 'px';
  }

  /** Accende le sfumature dal lato in cui il testo continua. */
  function segnala() {
    const scorrevole = vista.scrollHeight > vista.clientHeight + 1;
    finestra.classList.toggle('ha-sopra', scorrevole && vista.scrollTop > 1);
    finestra.classList.toggle(
      'ha-sotto',
      scorrevole && vista.scrollTop + vista.clientHeight < vista.scrollHeight - 1);
    return scorrevole;
  }

  /**
   * Scorre la vista di una quantità, se c'è dove scorrere.
   * Restituisce `true` quando il movimento è stato assorbito, cioè
   * quando la pagina sotto non deve muoversi.
   */
  function scorri(quanto) {
    if (vista.scrollHeight <= vista.clientHeight + 1) return false;
    vista.scrollTop += quanto;
    segnala();
    return true;
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
    vista.scrollTop = 0;
    segnala();
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
    finestra.classList.remove('ha-sopra', 'ha-sotto');
    corpo.textContent = '';
    aperta = null;
  }

  /* ── Il dito ──
     Su un telefono non esiste posare il puntatore: esiste tenere fermo
     il dito. La finestra si apre dopo mezzo secondo di immobilità sul
     titolo, resta finché il dito resta, e si chiude quando si stacca —
     che è esattamente la stessa promessa fatta al mouse, tradotta.

     Un dito che scivola prima del mezzo secondo è la pagina che scorre,
     e l'attesa si annulla: chi sta solo passando oltre non deve vedersi
     comparire una poesia in faccia. */
  const ATTESA_DITO = 500;
  const SCARTO = 10;
  let dito = null;
  // Un tocco produce anche fuoco e passaggio del puntatore, che
  // aprirebbero la finestra all'istante scavalcando l'attesa.
  let daTocco = false;

  const conMouse = (azione) => () => { if (!daTocco) azione(); };

  for (const titolo of titoli) {
    titolo.addEventListener('mouseenter', conMouse(() => apri(titolo)));
    titolo.addEventListener('mouseleave', chiudi);
    // Chi naviga con la tastiera non ha un puntatore da posare: senza
    // questo la poesia sarebbe raggiungibile solo col mouse.
    titolo.addEventListener('focus', conMouse(() => apri(titolo)));
    titolo.addEventListener('blur', chiudi);

    titolo.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      daTocco = true;
      const t = e.touches[0];
      dito = { x: t.clientX, y: t.clientY, aperta: false, attesa: 0 };
      dito.attesa = setTimeout(() => {
        dito.aperta = true;
        apri(titolo);
      }, ATTESA_DITO);
    }, { passive: true });

    /* Prima dell'apertura il movimento annulla; dopo, muove i versi.
       `passive: false` è la condizione per poter fermare la pagina:
       senza, il browser tratta l'ascoltatore come una promessa di non
       interferire e ignora `preventDefault`. */
    titolo.addEventListener('touchmove', (e) => {
      if (!dito) return;
      const t = e.touches[0];

      if (!dito.aperta) {
        if (Math.abs(t.clientY - dito.y) > SCARTO || Math.abs(t.clientX - dito.x) > SCARTO) {
          clearTimeout(dito.attesa);
          dito = null;
        }
        return;
      }

      // Il verso segue il dito: si trascina il testo, non la finestra.
      const spostamento = dito.y - t.clientY;
      dito.y = t.clientY;
      if (scorri(spostamento)) e.preventDefault();
    }, { passive: false });

    const stacca = () => {
      if (!dito) return;
      clearTimeout(dito.attesa);
      if (dito.aperta) chiudi();
      dito = null;
      // Il fuoco e il finto passaggio del puntatore arrivano subito
      // dopo il distacco: si lascia passare quel momento prima di
      // riaprire la porta al mouse.
      setTimeout(() => { daTocco = false; }, 400);
    };

    titolo.addEventListener('touchend', stacca);
    titolo.addEventListener('touchcancel', stacca);

    // Il menù contestuale del tocco prolungato — «Copia», «Cerca» —
    // arriverebbe proprio nell'istante in cui la poesia si apre.
    titolo.addEventListener('contextmenu', (e) => { if (dito) e.preventDefault(); });
  }

  /* La rotella, mentre una poesia è aperta, muove i versi e non la
     pagina. Serve un ascoltatore esplicito perché la finestra è
     `pointer-events: none` e il puntatore sta comunque sul titolo:
     nessuno dei due riceverebbe mai l'evento per conto proprio.
     `passive: false` è la condizione per poter fermare la pagina —
     senza, il browser considera l'ascoltatore una promessa di non
     interferire e ignora `preventDefault`. */
  window.addEventListener('wheel', (e) => {
    if (!aperta) return;
    // Il browser può misurare in pixel, in righe o in schermate.
    const unita = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vista.clientHeight : 1;
    if (scorri(e.deltaY * unita)) e.preventDefault();
  }, { passive: false });

  /* Chi ha aperto la poesia con la tastiera deve poterla scorrere
     allo stesso modo: il titolo ha il fuoco, e i tasti di scorrimento
     muoverebbero la pagina dietro invece dei versi. */
  const PASSI = {
    ArrowDown: () => 60, ArrowUp: () => -60,
    PageDown: () => vista.clientHeight * 0.9, PageUp: () => -vista.clientHeight * 0.9,
    Home: () => -vista.scrollHeight, End: () => vista.scrollHeight
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { chiudi(); return; }
    if (!aperta || !PASSI[e.key]) return;
    if (scorri(PASSI[e.key]())) e.preventDefault();
  });

  // Cambiando le dimensioni dello schermo l'adattamento non vale più.
  window.addEventListener('resize', () => {
    if (!aperta) return;
    adatta();
    segnala();
  });
}
