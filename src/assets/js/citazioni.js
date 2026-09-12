import { lingua } from './lingua.js';

/* Le sei frasi, in italiano e in inglese.

   Nessuna delle tre teste che parlano qui ha scritto in una di queste
   due lingue: Marx e Wittgenstein in tedesco, Vološinov in russo. Le
   righe italiane sono già traduzioni, e quelle inglesi sono le
   traduzioni canoniche da cui quelle italiane vengono — non una
   traduzione della traduzione. Per questo stanno l'una accanto
   all'altra e non l'una dentro l'altra: sono due versioni dello stesso
   originale, che qui non c'è.

   Le virgolette cambiano con la lingua, perché sono un segno di quella
   lingua: sergenti in italiano, alte in inglese. */
const CITAZIONI = [
  {
    it: "«Il rapporto dell'operaio col lavoro pone in essere il rapporto del capitalista col lavoro.»",
    en: '“The relation of the worker to labour engenders the relation to it of the capitalist.”',
    autore: 'Karl Marx'
  },
  {
    it: '«Il linguaggio è uno strumento. I suoi concetti sono strumenti.»',
    en: '“Language is an instrument. Its concepts are instruments.”',
    autore: 'Ludwig Wittgenstein'
  },
  {
    it: "«Le relazioni di produzione e l'ordine sociopolitico plasmato da quelle relazioni " +
        "determinano l'intera gamma dei contatti verbali tra le persone, tutte le forme e i " +
        'mezzi delle loro comunicazioni verbali - al lavoro, la vita politica, nella ' +
        'creatività ideologica.»',
    en: '“Production relations and the sociopolitical order shaped by those relations ' +
        'determine the full range of verbal contacts between people, all the forms and means ' +
        'of their verbal communication — at work, in political life, in ideological ' +
        'creativity.”',
    autore: 'Valentin Vološinov'
  },
  {
    it: '«E se il denaro è il vincolo che mi unisce alla vita umana, che unisce me alla ' +
        'società, che mi collega con la natura e gli uomini, non è il denaro forse il ' +
        'vincolo di tutti i vincoli?.»',
    en: '“And if money is the bond binding me to human life, binding society to me, ' +
        'connecting me with nature and man, is not money the bond of all bonds?”',
    autore: 'Karl Marx'
  },
  {
    it: "«L'etica è trascendentale.»",
    en: '“Ethics is transcendental.”',
    autore: 'Ludwig Wittgenstein'
  },
  {
    it: '«Una volta che tu sappia che cosa la parola designa, la comprendi, ne conosci ' +
        "l'intiera applicazione.»",
    en: '“Once you know what the word stands for, you understand it, you know its whole use.”',
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
    const quale = lingua();
    testo.textContent = citazione[quale] || citazione.it;
    // La frase cambia lingua, e il nodo che la porta lo dichiara: è la
    // sola riga del sito che possa parlare l'una o l'altra da un
    // momento all'altro, e chi legge con una voce deve sentirla
    // pronunciata come è scritta.
    testo.lang = citazione[quale] ? quale : 'it';
    autore.textContent = `— ${citazione.autore}`;
    finestra.showModal();
  });

  finestra.addEventListener('click', () => finestra.close());
}
