/**
 * La lingua dell'impalcatura.
 *
 * Il sito si può leggere in italiano o in inglese, ma solo per la
 * parte che serve a muoversi: i nomi delle sezioni, i comandi, le
 * etichette dei moduli, le righe del piede. I testi — Il Diavolo veste
 * Pravda, gli appunti, le poesie, gli articoli, le risposte
 * dell'oracolo — restano nella lingua in cui sono stati scritti.
 * Tradurli non sarebbe tradurli: sarebbe riscriverli.
 *
 * Quasi tutte le parole dell'impalcatura stanno nel documento, ognuna
 * col proprio inglese nell'attributo `data-en` accanto: a cambiarle è
 * il blocco in fondo al corpo della pagina, che gira prima del primo
 * disegno e lascia dietro di sé `window.nzqTraduci`. Fare il giro dei
 * nodi anche qui significherebbe scrivere due volte lo stesso
 * passaggio, e vederli divergere alla prima correzione.
 *
 * Qui stanno solo le parole che il JavaScript scrive da sé — quelle
 * che nel documento non compaiono mai, perché nascono da un esito:
 * «tre risultati», «Invio…», «il messaggio non è partito». Sono poche
 * e stanno tutte in un elenco, ciascuna accanto alla propria gemella.
 */

const CHIAVE = 'au-lingua';
const LINGUE = ['it', 'en'];

/** Quale lingua è in vigore. La verità sta su <html>, come per la veste. */
export function lingua() {
  return document.documentElement.getAttribute('data-lingua') === 'en' ? 'en' : 'it';
}

/**
 * Se la lingua in vigore sia stata scelta o soltanto supposta.
 *
 * La scelta — dal pannello, o da un indirizzo che la portava scritta —
 * viene ricordata; la supposizione che lo script del <head> ricava dal
 * browser no, apposta. Quel che c'è in memoria è quindi la domanda e la
 * risposta insieme: se c'è, qualcuno ha scelto.
 */
function scelta() {
  try {
    return LINGUE.indexOf(localStorage.getItem(CHIAVE)) !== -1;
  } catch (e) {
    // Archiviazione non disponibile: nessuna scelta può essere stata
    // ricordata, e quindi non ce n'è nessuna da dichiarare.
    return false;
  }
}

/**
 * Scrive nell'indirizzo la lingua in cui si sta leggendo.
 *
 * Serve a una cosa sola, ed è la ragione per cui esiste: il
 * collegamento che si copia dalla barra porta con sé la lingua, e chi
 * lo riceve vede quel che ha visto chi glielo ha mandato — anche se il
 * suo browser ne chiederebbe un'altra. Senza questo, un indirizzo
 * copiato dalla barra è muto sulla lingua, e la lingua torna a
 * deciderla il browser di chi apre.
 *
 * Si scrive solo quando la lingua è stata scelta. La supposizione del
 * browser non si scrive: non è una scelta, e un indirizzo che la
 * contenesse la imporrebbe a chiunque lo aprisse — al tedesco che
 * l'inglese lo vuole, ma anche all'italiano che non lo vuole.
 *
 * `replaceState` e non un secondo passo nella cronologia: la lingua non
 * è un posto in cui si va, e il tasto indietro deve riportare da dove
 * si veniva, non alla stessa pagina in un'altra lingua.
 *
 * Le altre domande dell'indirizzo restano dov'erano, e `lang` — la
 * forma che si accetta in entrata — si normalizza in `lingua`: di
 * scritture ne basta una, ed è quella che poi si legge nel README.
 */
function segnalaNellIndirizzo(quale) {
  if (!window.history || !window.history.replaceState) return;
  try {
    const dove = new URL(window.location.href);
    if (dove.searchParams.get('lingua') === quale && !dove.searchParams.has('lang')) return;
    dove.searchParams.delete('lang');
    dove.searchParams.set('lingua', quale);
    window.history.replaceState(null, '', dove.pathname + dove.search + dove.hash);
  } catch (e) {
    // Indirizzo che non si lascia ricomporre: la pagina resta quella
    // che è, e la lingua pure. Non vale un errore in console.
  }
}

/* Dove il testo dipende da un valore — quanti risultati, quale
   motivo — la voce è una funzione invece che una stringa: comporre
   frasi per concatenazione fuori di qui vorrebbe dire spezzarle in
   pezzi che nell'altra lingua vanno in un altro ordine. */
const VOCI = {
  // Il menù delle sezioni, sugli schermi stretti.
  sezioni: { it: 'Sezioni', en: 'Sections' },

  // La ricerca.
  indiceInArrivo: { it: 'Sto aprendo l’indice…', en: 'Opening the index…' },
  indiceGuasto: {
    it: 'L’indice non si è aperto: la ricerca non può funzionare.',
    en: 'The index would not open: search cannot work.'
  },
  nessunEsito: {
    it: 'Niente che corrisponda. Forse con un’altra parola.',
    en: 'Nothing matches. Perhaps with another word.'
  },
  esiti: {
    it: (quanti) => (quanti === 1 ? 'Un risultato.' : quanti + ' risultati.'),
    en: (quanti) => (quanti === 1 ? 'One result.' : quanti + ' results.')
  },
  senzaTitolo: { it: '(senza titolo)', en: '(untitled)' },

  // L'oracolo: la cornice attorno alle risposte, non le risposte.
  leggi: { it: 'Leggi →', en: 'Read →' },
  nessunaDomanda: { it: '(nessuna domanda)', en: '(no question)' },

  // Il modulo dei contatti.
  inVolo: { it: 'Invio…', en: 'Sending…' },
  inviato: {
    it: 'Messaggio inviato. Rispondo appena posso.',
    en: 'Message sent. I reply as soon as I can.'
  },
  rifiutato: {
    it: 'Il servizio ha rifiutato il messaggio.',
    en: 'The service refused the message.'
  },
  motivoIgnoto: { it: 'motivo ignoto', en: 'reason unknown' },
  nonPartito: {
    it: (motivo) =>
      'Il messaggio non è partito: ' + motivo + '. Il testo è rimasto qui, si può riprovare.',
    en: (motivo) =>
      'The message did not go: ' + motivo + '. The text is still here, you can try again.'
  },

  // Il cursore del movimento.
  fermo: { it: 'fermo', en: 'still' },
  motoImposto: {
    it: 'Il movimento è disattivato nelle impostazioni del sistema.',
    en: 'Motion is switched off in the system settings.'
  },
  motoVoce: {
    it: (p) => (p === 0 ? 'nessun movimento, passaggi netti' : 'velocità al ' + p + ' per cento'),
    en: (p) => (p === 0 ? 'no motion, clean cuts' : 'speed at ' + p + ' per cent')
  }
};

/**
 * La parola nella lingua in vigore.
 *
 * Se manca l'inglese si ricade sull'italiano: meglio una parola nella
 * lingua sbagliata che un buco nella pagina.
 */
export function t(chiave, ...resto) {
  const voce = VOCI[chiave];
  if (!voce) return '';
  const scelta = voce[lingua()] || voce.it;
  return typeof scelta === 'function' ? scelta(...resto) : scelta;
}

/**
 * Cambia lingua: le parole del documento e poi l'annuncio.
 *
 * L'annuncio serve a chi ha scritto del testo per conto proprio —
 * il nome della sezione sul pulsante del menù, il valore del cursore
 * del movimento — e deve riscriverlo nella lingua nuova. Arriva a
 * traduzione avvenuta, così chi lo riceve rilegge un documento già
 * cambiato.
 */
export function applicaLingua(quale) {
  if (typeof window.nzqTraduci === 'function') window.nzqTraduci(quale);
  // Chi sceglie dal pannello sta anche dichiarando: da qui in avanti
  // l'indirizzo lo dice.
  segnalaNellIndirizzo(quale);
  document.dispatchEvent(new window.CustomEvent('nzq:lingua', { detail: { lingua: quale } }));
}

/**
 * All'apertura della pagina: se la lingua è una scelta, l'indirizzo la
 * dichiara anche qui.
 *
 * Non basta scriverla nel momento in cui si sceglie: da lì si cammina —
 * una sezione, la pagina di un pezzo — e i collegamenti interni non si
 * portano dietro le domande. Senza questo, l'indirizzo direbbe la
 * lingua solo sulla pagina in cui la si è scelta, e proprio quello di
 * un singolo pezzo — che è poi quello che si manda a qualcuno —
 * resterebbe muto.
 */
export function avviaLingua() {
  if (scelta()) segnalaNellIndirizzo(lingua());
}

/** Da fare quando la lingua cambia. Il nome dell'evento sta scritto qui e basta. */
export function alCambioLingua(fare) {
  document.addEventListener('nzq:lingua', fare);
}
