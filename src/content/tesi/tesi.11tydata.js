import { sintesi } from '../../../strumenti/sintesi.mjs';

/* Le tesi non hanno data nel nome del file: sono poche, non escono a
   cadenza, e il titolo basta a distinguerle. Il testo per esteso vive
   altrove — su Academia — e qui c'è l'abstract: è quello che serve a
   chi cerca l'opera e vuole sapere se è la sua. */
export default {
  tags: 'tesi',
  tipoScheda: 'poesia',
  layout: 'layouts/pezzo.njk',
  sezione: 'tesi',
  radice: '/',
  permalink: (data) => `/tesi/${data.page.fileSlug}/index.html`,
  tipoOg: 'article',
  eleventyComputed: {
    descrizione: (data) => sintesi(data.page.rawInput),
    // Il nome del sito nella scheda del browser, non nell'anteprima.
    titoloPagina: (data) => `${data.titolo} — ${data.site.titolo}`
  }
};
