import { sintesi } from '../../../strumenti/sintesi.mjs';

/* Come per il giornale: ogni appunto ottiene un indirizzo proprio,
   restando dov'era dentro la sezione. Le ragioni per esteso — perché
   una funzione e non una stringa, e cosa succede a due titoli uguali —
   stanno in giornale.11tydata.js. */
export default {
  tags: 'appunti',
  layout: 'layouts/pezzo.njk',
  sezione: 'appunti',
  radice: '/',
  permalink: (data) => `/appunti/${data.page.fileSlug}/index.html`,
  tipoOg: 'article',
  eleventyComputed: {
    descrizione: (data) => sintesi(data.page.rawInput),
    // Il nome del sito nella scheda del browser, non nell'anteprima.
    titoloPagina: (data) => `${data.titolo} — ${data.site.titolo}`
  }
};
