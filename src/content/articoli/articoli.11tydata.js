import { sintesi } from '../../../strumenti/sintesi.mjs';

/**
 * Gli articoli, usciti altrove o usciti qui.
 *
 * Di solito un articolo è uscito su una rivista, e in questa cartella
 * ne resta la scheda: titolo, testata, due righe di sommario nel corpo
 * del file, e il collegamento che porta dove si legge. Il testo non
 * sta qui perché non è qui che abita.
 *
 * Ma non deve per forza essere uscito altrove. Quando `url` manca,
 * l'articolo è di casa: ottiene una pagina propria — come un appunto o
 * un pezzo del giornale — e il corpo del file non è più il sommario
 * ma il testo. La scheda in elenco allora si riassume da sé, e il
 * «Leggi →» porta qui invece che fuori.
 *
 * Anche la testata è facoltativa: senza `fonte` la scheda non porta
 * l'insegna di nessuno e la barra dei filtri non guadagna un pulsante
 * vuoto. Dove un articolo è uscito non cambia né il suo posto
 * nell'elenco né la sua comparsa in home: quello lo decide `ordine`, e
 * nient'altro.
 */
export default {
  tags: 'articoli',
  tipoScheda: 'articolo',
  layout: 'layouts/pezzo.njk',
  sezione: 'articoli',
  radice: '/',
  tipoOg: 'article',

  /* `false` — nessuna pagina — per chi ha un indirizzo suo altrove:
     dargliene una qui significherebbe avere due indirizzi per lo
     stesso testo, e un motore di ricerca dovrebbe scegliere. Chi non
     ce l'ha la ottiene, perché altrimenti il «Leggi →» non avrebbe
     dove portare.

     `data.url` qui è l'indirizzo scritto nel front matter, non quello
     della pagina: quello si chiama `page.url` ed è ciò che questa
     funzione sta decidendo. */
  permalink: (data) => (data.url ? false : `/articoli/${data.page.fileSlug}/index.html`),

  eleventyComputed: {
    descrizione: (data) => sintesi(data.page.rawInput),
    // Il nome del sito nella scheda del browser, non nell'anteprima.
    titoloPagina: (data) => `${data.titolo} — ${data.site.titolo}`
  }
};
