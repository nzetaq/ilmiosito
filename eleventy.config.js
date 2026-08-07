import { createHash } from 'node:crypto';

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

/** "2026-03" → "Marzo 2026"; "2026-05-01" → "1 Maggio 2026". */
function esteso(data) {
  const { anno, mese, giorno } = scomponi(data);
  return giorno ? `${giorno} ${mese} ${anno}` : `${mese} ${anno}`;
}

export default function (eleventyConfig) {
  // ── Copia diretta degli asset statici ──
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });

  // Il CNAME resta nella radice del repository: è da lì che GitHub
  // legge il dominio personalizzato. Di qui viene solo copiato nel
  // sito compilato, perché serve anche dentro l'artefatto pubblicato.
  eleventyConfig.addPassthroughCopy({ CNAME: 'CNAME' });

  eleventyConfig.addWatchTarget('src/assets/');

  // ── Impronta per la Content Security Policy ──
  // I due blocchi inline della pagina — lo script che decide tema e
  // sezione, e lo stile di riserva senza JavaScript — sono dichiarati
  // nella policy per impronta invece che con 'unsafe-inline'. Così il
  // browser esegue esattamente quei due, e nient'altro che venisse
  // iniettato nella pagina. L'impronta si ricalcola a ogni
  // compilazione, quindi resta valida anche cambiando quel codice.
  eleventyConfig.addFilter('impronta', (testo) => {
    const somma = createHash('sha256').update(String(testo), 'utf8').digest('base64');
    return `'sha256-${somma}'`;
  });

  // ── Filtri per le date ──
  eleventyConfig.addFilter('mese', (data) => scomponi(data).mese);
  eleventyConfig.addFilter('anno', (data) => scomponi(data).anno);

  eleventyConfig.addFilter('dataEstesa', esteso);

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

  // ── Testo di una poesia ──
  // Si legge il Markdown sorgente e non l'HTML reso, perché in una
  // poesia l'andare a capo è parte del testo: il Markdown unirebbe le
  // righe di una stessa strofa in un unico paragrafo. Il testo esce di
  // qui grezzo e viene mostrato con `white-space: pre-line`, così le
  // interruzioni restano quelle scritte nel file.
  eleventyConfig.addFilter('versi', (voce) => {
    return String((voce && voce.rawInput) || '')
      .replace(/<!--[\s\S]*?-->/g, '')  // le istruzioni per chi scrive
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  });

  // ── Indice per il ritrovamento ──
  // L'Intelligenza Artificiosa non genera le risposte: le ritrova fra i
  // testi di questo sito. L'indice si costruisce qui, una volta per
  // compilazione, e viene servito come file a parte: chi non interroga
  // l'oracolo non lo scarica nemmeno.

  // Il segnaposto non va indicizzato. Ritrovare Lorem ipsum sarebbe
  // peggio che non ritrovare nulla: l'oracolo risponderebbe in latino
  // finto a chi ha chiesto in italiano. Finché giornale e appunti sono
  // riempitivo restano fuori da soli, senza doverlo scrivere altrove.
  const SEGNAPOSTO = /lorem ipsum|dolor sit amet|consectetur adipiscing/i;

  // Le sezioni da cui pescare, con l'ancora a cui rimandare il lettore.
  const INDICIZZATE = [
    { tag: 'articoli', sezione: 'articoli', etichetta: 'Articoli' },
    // Delle poesie si indicizzano titolo e nota, mai i versi: l'indice
    // è un file pubblico e leggibile: metterceli dentro vanificherebbe
    // la finestra che li mostra solo al passaggio del puntatore.
    { tag: 'scritti', sezione: 'scritti', etichetta: 'Poesie & Testi', riservato: true },
    { tag: 'tesi', sezione: 'tesi', etichetta: 'Tesi' },
    { tag: 'giornale', sezione: 'giornale', etichetta: 'Giornale' },
    { tag: 'appunti', sezione: 'appunti', etichetta: 'Appunti' }
  ];

  // Si legge `rawInput` — il Markdown sorgente, senza front matter — e
  // non `templateContent`. Quest'ultimo è l'HTML reso, e in questo punto
  // della compilazione non esiste ancora: Eleventy solleva «Tried to use
  // templateContent too early» per le voci non ancora attraversate,
  // e quali lo siano dipende dall'ordine in cui le incontra. L'indice
  // sarebbe risultato pieno per certe sezioni e vuoto per altre.
  function corpo(voce) {
    return String(voce.rawInput || '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')  // immagini
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // collegamenti: resta il testo
      .replace(/^[>#\s-]+/gm, ' ')             // citazioni, titoli, elenchi
      .replace(/[*_`]/g, '')                   // enfasi
      .replace(/\s+/g, ' ')
      .trim();
  }

  eleventyConfig.addFilter('indice', (collezioni) => {
    const voci = [];
    for (const { tag, sezione, etichetta, riservato } of INDICIZZATE) {
      for (const voce of collezioni[tag] || []) {
        const d = voce.data;
        const testo = riservato ? String(d.nota || '') : corpo(voce);
        if (SEGNAPOSTO.test(testo)) continue;

        voci.push({
          t: d.titolo || '',
          s: testo,
          // La provenienza è la testata per gli articoli, il premio per
          // le poesie: campi diversi, stesso ruolo per chi legge.
          f: d.fonte || d.gruppo || '',
          // La data si formatta qui: il ritrovamento gira nel browser e
          // non ha ragione di portarsi dietro i nomi dei mesi.
          d: d.data ? esteso(d.data) : '',
          u: d.url || d.gruppoUrl || '',
          z: sezione,
          e: etichetta,
          // Come si chiama la cosa. Senza questo «hai scritto poesie?»
          // non trova nulla: la parola «poesia» non compare in nessuno
          // dei testi, sta solo nel nome della sezione che li raccoglie.
          k: [d.tipo, etichetta].filter(Boolean).join(' ')
        });
      }
    }
    return voci;
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
