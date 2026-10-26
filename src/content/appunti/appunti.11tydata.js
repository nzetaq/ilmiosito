import { sintesi } from '../../../strumenti/sintesi.mjs';

/* Gli appunti sono fuori dal sito dal 26 ottobre 2026, come il
   giornale: restano in questa cartella per poterli riprendere, ma non
   generano più pagine.

   Quando la sezione c'era, ogni appunto aveva un indirizzo proprio,
   restando dov'era dentro la sezione. Le ragioni per esteso — perché
   una funzione e non una stringa, e cosa succede a due titoli uguali —
   stanno in giornale.11tydata.js. */
export default {
  tags: 'appunti',
  layout: 'layouts/pezzo.njk',
  sezione: 'appunti',
  radice: '/',
  // Per rimettere le pagine: (data) => `/appunti/${data.page.fileSlug}/index.html`
  permalink: false,
  tipoOg: 'article',
  eleventyComputed: {
    descrizione: (data) => sintesi(data.page.rawInput),
    // Il nome del sito nella scheda del browser, non nell'anteprima.
    titoloPagina: (data) => `${data.titolo} — ${data.site.titolo}`
  }
};
