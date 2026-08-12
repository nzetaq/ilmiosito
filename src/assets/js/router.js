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

  // Gli elementi che si compongono a scalare, nell'ordine in cui
  // compaiono nel documento.
  const COMPONIBILI =
    '.au-filters, .au-year, .au-home-card, .au-article, .au-poem, .au-giornale-entry';

  // Oltre una certa fila il ritardo non cresce più: gli elementi sotto
  // la piega arriverebbero con un'attesa che nessuno sta guardando.
  const FILA_MASSIMA = 9;

  /** Assegna a ogni elemento il proprio posto nella fila. */
  function componi(sezione) {
    const elementi = sezione.querySelectorAll(COMPONIBILI);
    elementi.forEach((elemento, indice) => {
      elemento.style.setProperty('--i', Math.min(indice, FILA_MASSIMA));
    });
    // Rimozione e reflow: senza, la composizione non ripartirebbe
    // tornando su una sezione già visitata.
    sezione.classList.remove('is-componendo');
    void sezione.offsetHeight;
    sezione.classList.add('is-componendo');
  }

  const sezione = (id) => (id ? document.getElementById(`sec-${id}`) : null);

  /* Gli identificativi di ieri, tradotti in quelli di oggi. Lo script
     del <head> fa lo stesso al primo disegno; questo serve a chi
     arriva qui dopo — un collegamento vecchio premuto dentro la
     pagina, o il tasto indietro su una cronologia che li contiene. */
  const RINOMINATE = { giornale: 'il-diavolo-veste-pravda' };

  function daIndirizzo() {
    let id = '';
    try {
      id = decodeURIComponent(location.hash.replace(/^#/, ''));
    } catch (e) {
      // Indirizzo malformato: si ricade sulla home.
    }
    if (RINOMINATE[id]) {
      id = RINOMINATE[id];
      if (history.replaceState) history.replaceState(null, '', '#' + id);
    }
    return sezione(id) ? id : 'home';
  }

  function segnalaNav(id) {
    for (const collegamento of collegamenti) {
      if (collegamento.dataset.sez === id) collegamento.setAttribute('aria-current', 'page');
      else collegamento.removeAttribute('aria-current');
    }
  }

  /** Congeda la sezione uscente al termine della sua dissolvenza. */
  function congeda(el) {
    el.classList.add('is-leaving');
    const alTermine = (evento) => {
      // animationend risale anche dagli elementi che si stanno
      // ancora componendo dentro la sezione: vanno ignorati.
      if (evento && evento.target !== el) return;
      el.classList.remove('is-leaving');
      el.removeEventListener('animationend', alTermine);
      uscite.delete(el);
    };
    uscite.set(el, alTermine);
    el.addEventListener('animationend', alTermine);
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
    trattieni(nuova); // poteva essere lei stessa in uscita
    componi(nuova);

    // Il router non sa nulla di chi lo ascolta: si limita ad annunciare
    // il cambio. Chi conta le visite si iscrive a questo evento.
    document.dispatchEvent(new window.CustomEvent('nzq:sezione', { detail: { id } }));
  }

  window.addEventListener('hashchange', () => mostra(daIndirizzo()));
}
