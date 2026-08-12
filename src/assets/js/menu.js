/**
 * Il menù delle sezioni sugli schermi stretti.
 *
 * Il pulsante e il pannello esistono in ogni pagina; è il foglio di
 * stile a decidere che si vedano solo sotto i 700px. Qui non si guarda
 * la larghezza: aprire un menù che nessuno vede non fa danno, e una
 * soglia scritta in due posti prima o poi diverge da sé stessa.
 *
 * Lo stato sta su <html> come `data-menu`, dove il CSS può leggerlo.
 */

const APERTO = 'aperto';

/* Due pannelli sotto la stessa fascia: le sezioni e la veste. Aprirne
   uno chiude l'altro — insieme coprirebbero mezzo schermo, e nessuno
   dei due si consulta mentre si consulta l'altro. */
function avviaPannello({ pulsante, attributo, valore, prima, dopo }) {
  const radice = document.documentElement;
  const aperto = () => radice.getAttribute(attributo) === valore;

  const disponi = (apri) => {
    if (apri) radice.setAttribute(attributo, valore);
    else radice.removeAttribute(attributo);
    pulsante.setAttribute('aria-expanded', String(apri));
    if (dopo) dopo(apri);
  };

  disponi(false);

  pulsante.addEventListener('click', () => {
    const apri = !aperto();
    if (apri && prima) prima();
    disponi(apri);
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape' || !aperto()) return;
    disponi(false);
    pulsante.focus();
  });

  // Un tocco fuori chiude: il pannello copre buona parte della pagina,
  // e tornare a cercare il pulsante per richiuderlo non se lo aspetta
  // nessuno.
  document.addEventListener('click', (evento) => {
    if (!aperto()) return;
    if (evento.target.closest('.au-nav-fascia') || evento.target.closest('.au-comandi')) return;
    disponi(false);
  });

  return { chiudi: () => disponi(false), aperto };
}

export function avviaMenu() {
  const pulsante = document.getElementById('au-nav-apri');
  const pannello = document.getElementById('au-nav');
  if (!pulsante || !pannello) return;

  const radice = document.documentElement;
  const voce = document.getElementById('au-nav-apri-voce');

  const aperto = () => radice.getAttribute('data-menu') === APERTO;

  /* Il pannello della veste: stesso gesto, altro contenuto. Vive qui
     e non in un modulo suo perché i due si escludono a vicenda, e per
     saperlo devono conoscersi. */
  const vestePulsante = document.getElementById('au-veste-apri');
  const vestePannello = document.getElementById('au-comandi');
  let veste = null;

  /* Chiuso, il pulsante dice dove siamo: è l'unica traccia della
     sezione corrente quando l'elenco non si vede. Aperto dice cosa
     sta mostrando — ripetere il nome della sezione lì sotto, dove
     compare già acceso in cima all'elenco, sarebbe dirlo due volte. */
  const nomina = () => {
    if (!voce) return;
    if (aperto()) {
      voce.textContent = 'Sezioni';
      return;
    }
    const corrente = pannello.querySelector(
      '.au-nav-btn[data-sez="' + (radice.getAttribute('data-sez') || 'home') + '"]'
    );
    if (!corrente) {
      voce.textContent = 'Sezioni';
      return;
    }

    /* Una scala di ripieghi, e si scende un gradino per volta solo
       finché il nome non ci sta. Il CSS non sa confrontare la
       lunghezza di un testo con quella del suo riquadro; il browser
       sì, ma solo dopo averlo scritto. Quindi si scrive, si guarda, e
       semmai si scende.

         1. nome per esteso, fascia in due metà uguali;
         2. `larga`   — la veste si ritira in un quadrato e cede
                        all'hamburger i punti della propria parola;
         3. `stretta` — si toglie spaziatura al maiuscoletto;
         4. `minuta`  — si scende anche di corpo;
         5. e solo qui, se ancora non basta, il nome breve.

       Il nome per esteso vale i primi quattro gradini: è la sezione in
       cui ci si trova, e una sigla non la dice. Per sei sezioni su
       otto ci si ferma comunque al primo. */
    const sfora = () => voce.scrollWidth > voce.clientWidth + 1;

    /* Scrive un nome e scende i gradini che servono a farlo entrare,
       partendo sempre dal primo: chiamandola col nome breve dopo
       averla chiamata con quello intero, la fascia si rilassa invece
       di restare stretta attorno a una parola corta. */
    const adatta = (testo) => {
      radice.removeAttribute('data-fascia');
      voce.textContent = testo;
      for (const gradino of ['larga', 'stretta', 'minuta']) {
        if (!sfora()) return true;
        radice.setAttribute('data-fascia', gradino);
      }
      return !sfora();
    };

    const breve = corrente.dataset.breve;
    if (!adatta(corrente.textContent.trim()) && breve) adatta(breve);
  };

  const disponi = (apri) => {
    if (apri) radice.setAttribute('data-menu', APERTO);
    else radice.removeAttribute('data-menu');
    pulsante.setAttribute('aria-expanded', String(apri));
    nomina();
  };

  disponi(false);

  if (vestePulsante && vestePannello) {
    veste = avviaPannello({
      pulsante: vestePulsante,
      attributo: 'data-veste',
      // Femminile, come la cosa che nomina: è il valore che il foglio
      // di stile va a cercare, e i due devono dire la stessa parola.
      valore: 'aperta',
      prima: () => disponi(false)
    });
  }

  pulsante.addEventListener('click', () => {
    const apri = !aperto();
    if (apri && veste) veste.chiudi();
    disponi(apri);
  });

  // Scelta una sezione, il menù ha finito il suo compito.
  pannello.addEventListener('click', (evento) => {
    if (evento.target.closest('.au-nav-btn')) disponi(false);
  });

  // Il nome sul pulsante segue la sezione comunque ci si arrivi: dal
  // menù, dal tasto indietro, o da un indirizzo scritto a mano.
  window.addEventListener('hashchange', nomina);

  document.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape' || !aperto()) return;
    disponi(false);
    // Chi ha aperto col tasto non deve ritrovarsi il fuoco nel nulla.
    pulsante.focus();
  });

  // Un tocco fuori chiude: sugli schermi stretti il pannello copre
  // buona parte della pagina, e cercare di nuovo il pulsante per
  // richiuderlo è un passaggio che nessuno si aspetta di dover fare.
  document.addEventListener('click', (evento) => {
    if (!aperto()) return;
    if (evento.target.closest('.au-nav-fascia')) return;
    disponi(false);
  });
}
