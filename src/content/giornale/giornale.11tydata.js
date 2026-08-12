import { sintesi } from '../../../strumenti/sintesi.mjs';

/**
 * Ogni pezzo del Diavolo veste Pravda ha ora un indirizzo proprio.
 *
 * Il file resta uno solo: compare dentro la sezione della home, come
 * sempre, e in più a `/giornale/<nome-del-file>/`. Quell'indirizzo è
 * ciò che si può mandare a qualcuno, citare in nota, o mostrare
 * anteprimato quando viene condiviso.
 *
 * `fileSlug` toglie da sé la data che apre il nome del file, così
 * l'indirizzo resta il titolo e nient'altro: si legge, si detta al
 * telefono, si mette in nota a piè di pagina.
 *
 * Il prezzo è che due pezzi con lo stesso titolo — a distanza di anni,
 * poniamo — chiederebbero lo stesso indirizzo. Eleventy in quel caso
 * si ferma e lo dice, la pubblicazione fallisce e GitHub manda una
 * mail: è un guasto rumoroso, non silenzioso. Si rimedia cambiando il
 * titolo del secondo, che è quello che si vorrebbe fare comunque.
 *
 * Il permalink è una funzione e non una stringa perché il Markdown di
 * questo sito non passa da alcun motore di template: le parentesi
 * graffe resterebbero lettere morte.
 */
export default {
  tags: 'giornale',
  layout: 'layouts/pezzo.njk',
  sezione: 'il-diavolo-veste-pravda',
  radice: '/',
  permalink: (data) => `/giornale/${data.page.fileSlug}/index.html`,
  tipoOg: 'article',
  eleventyComputed: {
    // La descrizione per i motori di ricerca e per le anteprime, presa
    // dalle prime righe del pezzo: un campo in meno da compilare a mano
    // a ogni pubblicazione, e uno in meno da dimenticare.
    descrizione: (data) => sintesi(data.page.rawInput),
    // Il nome del sito nella scheda del browser, non nell'anteprima.
    titoloPagina: (data) => `${data.titolo} — ${data.site.titolo}`
  }
};
