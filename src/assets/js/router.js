/**
 * Navigazione fra le sezioni.
 *
 * I collegamenti della barra sono ancore vere (`href="#articoli"`):
 * il browser aggiorna l'indirizzo da sé e qui ci si limita ad
 * ascoltare `hashchange`. Ne consegue che ricaricare la pagina
 * mantiene la sezione, e i tasti avanti/indietro funzionano.
 */
export function avviaRouter() {
  const nav = document.getElementById('au-nav');
  const layout = document.getElementById('au-layout');
  const centro = document.getElementById('au-center');
  const colonna = document.getElementById('au-giornale-col');
  if (!nav || !layout || !centro) return;

  const collegamenti = [...nav.querySelectorAll('.au-nav-btn')];
  const uscite = new Map();
  let corrente = null;

  const sezione = (id) => (id ? document.getElementById(`sec-${id}`) : null);

  function daIndirizzo() {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    return sezione(id) ? id : 'home';
  }

  /** Congeda la sezione uscente al termine dell'animazione. */
  function congeda(el) {
    el.classList.remove('is-active');
    el.classList.add('is-leaving');
    const alTermine = () => {
      el.classList.remove('is-leaving');
      el.style.display = 'none';
      uscite.delete(el);
    };
    uscite.set(el, alTermine);
    el.addEventListener('animationend', alTermine, { once: true });
  }

  /** Annulla un congedo in corso: serve se si torna subito indietro. */
  function trattieni(el) {
    const alTermine = uscite.get(el);
    if (!alTermine) return;
    el.removeEventListener('animationend', alTermine);
    uscite.delete(el);
    el.classList.remove('is-leaving');
  }

  function mostra(id) {
    if (!sezione(id)) id = 'home';
    if (id === corrente) return;

    for (const link of collegamenti) {
      const attivo = link.dataset.sez === id;
      link.classList.toggle('active', attivo);
      if (attivo) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }

    const vecchia = sezione(corrente);
    if (vecchia) congeda(vecchia);

    corrente = id;

    // La colonna del giornale accompagna soltanto la home.
    const inHome = id === 'home';
    layout.classList.toggle('no-sidebar', !inHome);
    centro.classList.toggle('au-center--home', inHome);
    if (colonna) colonna.classList.toggle('is-hidden', !inHome);

    const nuova = sezione(id);
    trattieni(nuova);
    nuova.style.display = 'block';
    void nuova.offsetHeight; // forza il reflow, così l'animazione riparte
    nuova.classList.add('is-active');
  }

  mostra(daIndirizzo());
  window.addEventListener('hashchange', () => mostra(daIndirizzo()));
}
