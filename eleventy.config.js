const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

/**
 * Scompone una data testuale "AAAA-MM" oppure "AAAA-MM-GG".
 * Le date restano stringhe (mai oggetti Date) per non incorrere
 * negli slittamenti di fuso orario in fase di formattazione.
 */
function scomponi(data) {
  const [anno, mese, giorno] = String(data).split('-');
  return {
    anno,
    mese: MESI[Number(mese) - 1] || '',
    giorno: giorno ? String(Number(giorno)) : null
  };
}

export default function (eleventyConfig) {
  // ── Copia diretta degli asset statici ──
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'src/CNAME': 'CNAME' });

  eleventyConfig.addWatchTarget('src/assets/');

  // ── Filtri per le date ──
  eleventyConfig.addFilter('mese', (data) => scomponi(data).mese);
  eleventyConfig.addFilter('anno', (data) => scomponi(data).anno);

  eleventyConfig.addFilter('dataEstesa', (data) => {
    const { anno, mese, giorno } = scomponi(data);
    return giorno ? `${giorno} ${mese} ${anno}` : `${mese} ${anno}`;
  });

  // ── Ordinamento ──
  // `campo` è una chiave del front matter; `decrescente` inverte l'ordine.
  eleventyConfig.addFilter('ordina', (voci, campo, decrescente = false) => {
    const ordinate = [...(voci || [])].sort((a, b) => {
      const x = a.data[campo];
      const y = b.data[campo];
      if (x === y) return 0;
      return x < y ? -1 : 1;
    });
    return decrescente ? ordinate.reverse() : ordinate;
  });

  // ── Raggruppamenti ──
  // Raggruppa gli articoli per anno, preservando l'ordine ricevuto.
  eleventyConfig.addFilter('perAnno', (voci) => {
    const gruppi = [];
    for (const voce of voci || []) {
      const anno = scomponi(voce.data.data).anno;
      let gruppo = gruppi.find((g) => g.anno === anno);
      if (!gruppo) {
        gruppo = { anno, voci: [] };
        gruppi.push(gruppo);
      }
      gruppo.voci.push(voce);
    }
    return gruppi;
  });

  // Raggruppa per il campo `gruppo` (premi letterari, tipo di tesi…).
  // Titolo e link del gruppo vengono dalla prima voce che lo apre.
  eleventyConfig.addFilter('perGruppo', (voci) => {
    const gruppi = [];
    for (const voce of voci || []) {
      const nome = voce.data.gruppo;
      let gruppo = gruppi.find((g) => g.nome === nome);
      if (!gruppo) {
        gruppo = {
          nome,
          url: voce.data.gruppoUrl,
          linkTesto: voce.data.gruppoLinkTesto,
          voci: []
        };
        gruppi.push(gruppo);
      }
      gruppo.voci.push(voce);
    }
    return gruppi;
  });

  // Elenco delle fonti presenti, senza ripetizioni: alimenta i pulsanti
  // di filtro, che così restano allineati agli articoli pubblicati.
  eleventyConfig.addFilter('fonti', (voci) => {
    const fonti = [];
    for (const voce of voci || []) {
      const { fonteId, fonte } = voce.data;
      if (!fonti.some((f) => f.id === fonteId)) fonti.push({ id: fonteId, nome: fonte });
    }
    return fonti;
  });

  // ── Collezioni ──
  // Le tre voci più recenti mostrate in home: prima gli articoli
  // (dal più recente), poi gli scritti, infine la tesi.
  eleventyConfig.addCollection('recenti', (api) => {
    const perOrdine = (a, b) => b.data.ordine - a.data.ordine;
    return [
      ...api.getFilteredByTag('articoli').sort(perOrdine),
      ...api.getFilteredByTag('scritti').sort((a, b) => a.data.ordine - b.data.ordine),
      ...api.getFilteredByTag('tesi')
    ].slice(0, 3);
  });

  return {
    dir: {
      input: 'src',
      output: 'dist',
      includes: '_includes',
      data: '_data'
    },
    htmlTemplateEngine: 'njk',
    // I contenuti sono Markdown puro: nessun motore di template li
    // attraversa, così parentesi graffe e simboli restano letterali.
    markdownTemplateEngine: false
  };
}
