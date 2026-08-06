const CITAZIONI = [
  {
    testo: "«Il rapporto dell'operaio col lavoro pone in essere il rapporto del capitalista col lavoro.»",
    autore: 'Karl Marx'
  },
  {
    testo: '«Il linguaggio è uno strumento. I suoi concetti sono strumenti.»',
    autore: 'Ludwig Wittgenstein'
  },
  {
    testo: "«Le relazioni di produzione e l'ordine sociopolitico plasmato da quelle relazioni " +
           "determinano l'intera gamma dei contatti verbali tra le persone, tutte le forme e i " +
           'mezzi delle loro comunicazioni verbali - al lavoro, la vita politica, nella ' +
           'creatività ideologica.»',
    autore: 'Valentin Vološinov'
  },
  {
    testo: '«E se il denaro è il vincolo che mi unisce alla vita umana, che unisce me alla ' +
           'società, che mi collega con la natura e gli uomini, non è il denaro forse il ' +
           'vincolo di tutti i vincoli?.»',
    autore: 'Karl Marx'
  },
  {
    testo: "«L'etica è trascendentale.»",
    autore: 'Ludwig Wittgenstein'
  },
  {
    testo: '«Una volta che tu sappia che cosa la parola designa, la comprendi, ne conosci ' +
           "l'intiera applicazione.»",
    autore: 'Ludwig Wittgenstein'
  }
];

/**
 * Citazione a sorpresa: doppio clic sul nome in cima alla pagina.
 *
 * Usa l'elemento <dialog>, che offre da sé la chiusura con Esc,
 * la gestione del fuoco e l'inerzia dello sfondo.
 */
export function avviaCitazioni() {
  const finestra = document.getElementById('au-filosofo-overlay');
  const nome = document.querySelector('.au-name');
  if (!finestra || !nome || typeof finestra.showModal !== 'function') return;

  const testo = document.getElementById('au-filosofo-quote');
  const autore = document.getElementById('au-filosofo-attr');

  nome.addEventListener('dblclick', () => {
    const citazione = CITAZIONI[Math.floor(Math.random() * CITAZIONI.length)];
    testo.textContent = citazione.testo;
    autore.textContent = `— ${citazione.autore}`;
    finestra.showModal();
  });

  finestra.addEventListener('click', () => finestra.close());
}
