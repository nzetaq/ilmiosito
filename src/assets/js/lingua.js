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

/** Quale lingua è in vigore. La verità sta su <html>, come per la veste. */
export function lingua() {
  return document.documentElement.getAttribute('data-lingua') === 'en' ? 'en' : 'it';
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
export function applicaLingua(scelta) {
  if (typeof window.nzqTraduci === 'function') window.nzqTraduci(scelta);
  document.dispatchEvent(new window.CustomEvent('nzq:lingua', { detail: { lingua: scelta } }));
}

/** Da fare quando la lingua cambia. Il nome dell'evento sta scritto qui e basta. */
export function alCambioLingua(fare) {
  document.addEventListener('nzq:lingua', fare);
}
