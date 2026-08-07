/**
 * Navigazione fra le sezioni.
 *
 * La sezione corrente vive in un solo posto: l'attributo `data-sez`
 * su <html>. Lo scrive già lo script nel <head>, prima del primo
 * disegno, e da quell'attributo il foglio di stile ricava tutto —
 * quale sezione è visibile, quale linguetta è accesa, se la colonna
 * del giornale c'è. Qui si aggiunge solo ciò che il CSS non sa fare:
 * segnalare la sezione corrente alle tecnologie assistive e animare
 * il passaggio da una sezione all'altra.
 *
 * I collegamenti della barra sono ancore vere (`href="#articoli"`):
 * l'indirizzo lo aggiorna il browser, e qui si ascolta `hashchange`.
 */
export function avviaRouter() {
  const radice = document.documentElement;
  const nav = document.getElementById('au-nav');
  if (!nav) return;

  const collegamenti = [...nav.querySelectorAll('.au-nav-btn')];
  const uscite = new Map();

  const sezione = (id) => (id ? document.getElementById(`sec-${id}`) : null);

  function daIndirizzo() {
    let id = '';
    try {
      id = decodeURIComponent(location.hash.replace(/^#/, ''));
    } catch (e) {
      // Indirizzo malformato: si ricade sulla home.
    }
    return sezione(id) ? id : 'home';
  }

  function segnalaNav(id) {
    for (const collegamento of collegamenti) {
      if (collegamento.dataset.sez === id) collegamento.setAttribute('aria-current', 'page');
      else collegamento.removeAttribute('aria-current');
    }
  }

  /** Congeda la sezione uscente al termine dell'animazione. */
  function congeda(el) {
    el.classList.remove('is-active');
    el.classList.add('is-leaving');
    const alTermine = () => {
      el.classList.remove('is-leaving');
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

  let corrente = daIndirizzo();

  // Allineamento iniziale. Nessuna animazione: la sezione è già
  // dipinta al posto giusto, e farla entrare ora sarebbe proprio
  // quel guizzo che si vuole evitare.
  radice.setAttribute('data-sez', corrente);
  segnalaNav(corrente);

  function mostra(id) {
    if (id === corrente) return;

    const vecchia = sezione(corrente);
    corrente = id;

    radice.setAttribute('data-sez', id);
    segnalaNav(id);

    if (vecchia) congeda(vecchia);

    const nuova = sezione(id);
    trattieni(nuova);
    nuova.classList.remove('is-active');
    void nuova.offsetHeight; // forza il reflow, così l'animazione riparte
    nuova.classList.add('is-active');
  }

  window.addEventListener('hashchange', () => mostra(daIndirizzo()));
}
