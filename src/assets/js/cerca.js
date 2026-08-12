import { caricaIndice, interroga, passo } from './ricerca.js';

/**
 * La ricerca per chi legge.
 *
 * Il macchinario è quello che già serve all'Intelligenza Artificiosa —
 * lo stesso indice, lo stesso ritrovamento per BM25 — ma il tono è
 * l'opposto: lì l'oracolo scherza, qui si risponde e basta.
 *
 * Il pannello si apre sopra la pagina e non è una sezione: la barra
 * delle sezioni ne ha già otto, e chi cerca vuole tornare dov'era.
 *
 * Dei versi delle poesie l'indice non contiene nulla — solo titolo e
 * nota — e quindi nemmeno questa ricerca può rivelarli: la lente
 * resta l'unico modo di leggerli.
 */

const QUANTI = 8;
const ATTESA = 160;

export function avviaCerca() {
  /* Due inneschi, uno per larghezza di schermo: la parola dentro i
     comandi e la lente nella fascia. Aprono la stessa cosa, quindi si
     legano tutti insieme invece di cercarne uno per identificativo. */
  const inneschi = [...document.querySelectorAll('.au-cerca-apri')];
  const scena = document.getElementById('au-cerca-scena');
  if (!inneschi.length || !scena || typeof scena.showModal !== 'function') return;

  const campo = document.getElementById('au-cerca-campo');
  const esiti = document.getElementById('au-cerca-esiti');
  const stato = document.getElementById('au-cerca-stato');
  const modulo = document.getElementById('au-cerca-form');

  let indice = null;
  let attesa = 0;

  const svuota = () => {
    while (esiti.firstChild) esiti.removeChild(esiti.firstChild);
  };

  const el = (tag, classe, testo) => {
    const n = document.createElement(tag);
    if (classe) n.className = classe;
    if (testo) n.textContent = testo;
    return n;
  };

  /* Una voce trovata. Si costruisce a nodi e mai da stringa di HTML:
     il testo viene dall'indice, e l'indice viene dai file — ma la
     regola del sito è che nessun testo diventi mai marcatura. */
  const mostra = (voce, domanda) => {
    /* Dove porta. Un articolo uscito su una rivista abita là, e
       l'indice lo dichiara con `x`. Tutto il resto sta qui: la pagina
       propria se il pezzo ce l'ha, altrimenti la sezione che lo
       contiene — e questo vale anche per le poesie, il cui unico
       indirizzo esterno porta alla pagina di un premio e non ai versi. */
    const esterno = !!(voce.x && voce.u);
    const dove = esterno ? voce.u : (voce.p || ('#' + voce.z));

    const a = el('a', 'au-cerca-esito');
    a.href = dove;
    if (esterno) {
      a.target = '_blank';
      a.rel = 'noopener';
    }

    const capo = el('p', 'au-cerca-esito-dove');
    capo.appendChild(el('span', 'au-cerca-esito-sezione', voce.e || ''));
    if (voce.f) capo.appendChild(el('span', 'au-cerca-esito-fonte', voce.f));
    if (voce.d) capo.appendChild(el('span', 'au-cerca-esito-data', voce.d));
    a.appendChild(capo);

    a.appendChild(el('h3', 'au-cerca-esito-titolo', voce.t || '(senza titolo)'));

    const brano = passo(voce, domanda, 220);
    if (brano) a.appendChild(el('p', 'au-cerca-esito-brano', brano));

    esiti.appendChild(a);
  };

  const cerca = () => {
    const domanda = campo.value.trim();
    svuota();

    if (!domanda) {
      stato.textContent = '';
      return;
    }
    if (!indice) {
      stato.textContent = 'Sto aprendo l’indice…';
      return;
    }

    const trovati = interroga(indice, domanda, QUANTI);
    if (!trovati.length) {
      stato.textContent = 'Niente che corrisponda. Forse con un’altra parola.';
      return;
    }

    stato.textContent = trovati.length === 1
      ? 'Un risultato.'
      : trovati.length + ' risultati.';
    // `interroga` restituisce l'esito con il suo punteggio; qui
    // interessa solo la voce che ci sta dentro.
    for (const esito of trovati) mostra(esito.voce, domanda);
  };

  const rimanda = () => {
    clearTimeout(attesa);
    // Si aspetta un attimo fra un tasto e l'altro: cercare a ogni
    // lettera farebbe lampeggiare l'elenco sotto le dita.
    attesa = setTimeout(cerca, ATTESA);
  };

  const apriPannello = () => {
    scena.showModal();
    campo.focus();
    campo.select();
    if (!indice) {
      caricaIndice().then((i) => {
        indice = i;
        if (!i) stato.textContent = 'L’indice non si è aperto: la ricerca non può funzionare.';
        else if (campo.value.trim()) cerca();
      });
    }
  };

  for (const innesco of inneschi) innesco.addEventListener('click', apriPannello);

  // Il tasto «/» apre la ricerca, come in mezzo mondo — ma non mentre
  // si sta scrivendo da qualche altra parte, dove una barra è una barra.
  document.addEventListener('keydown', (e) => {
    if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
    const dove = document.activeElement;
    if (dove && (dove.tagName === 'INPUT' || dove.tagName === 'TEXTAREA' || dove.isContentEditable)) return;
    if (scena.open) return;
    e.preventDefault();
    apriPannello();
  });

  modulo.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(attesa);
    cerca();
  });

  campo.addEventListener('input', rimanda);

  // Un clic sullo sfondo chiude: il pannello è la cosa chiara, tutto
  // il resto è la via d'uscita.
  scena.addEventListener('click', (e) => {
    if (!e.target.closest('.au-cerca-pannello')) scena.close();
  });

  // Scelto un risultato che porta dentro questa stessa pagina, il
  // pannello ha finito: resterebbe aperto sopra la sezione appena
  // raggiunta.
  esiti.addEventListener('click', (e) => {
    const a = e.target.closest('.au-cerca-esito');
    if (a && a.target !== '_blank') scena.close();
  });
}
