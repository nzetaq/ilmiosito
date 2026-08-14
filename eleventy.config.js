import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { sintesi } from './strumenti/sintesi.mjs';
import { senzaExif } from './strumenti/foto.mjs';

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
  eleventyConfig.addWatchTarget('foto/');

  /* ── Le fotografie ──
     Non passano dalla copia diretta come gli altri file statici,
     perché fra il prendere e il posare c'è da fare una cosa: togliere
     i dati che si portano dietro. Una fotografia scattata col
     telefono dichiara il luogo, l'ora e l'apparecchio, e pubblicarla
     così com'è significa pubblicare anche quelli.

     La rimozione non ricomprime nulla: quei dati stanno in segmenti a
     parte del file, e si riscrive saltandoli. I pixel restano
     identici. */
  const SOGLIA_PESO = 512 * 1024;

  eleventyConfig.on('eleventy.after', ({ dir }) => {
    const origine = path.join(process.cwd(), 'foto');
    if (!existsSync(origine)) return;

    const destinazione = path.join(dir.output, 'assets', 'foto');
    const estensioni = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
    let copiate = 0;
    let alleggerite = 0;
    const pesanti = [];

    for (const nome of readdirSync(origine)) {
      if (!estensioni.has(path.extname(nome).toLowerCase())) continue;
      const dati = readFileSync(path.join(origine, nome));
      const esito = senzaExif(dati);
      const puliti = esito.dati || dati;

      mkdirSync(destinazione, { recursive: true });
      writeFileSync(path.join(destinazione, nome), puliti);
      copiate++;
      if (esito.tolti) alleggerite++;
      if (puliti.length > SOGLIA_PESO) {
        pesanti.push(`${nome} (${Math.round(puliti.length / 1024)} KB)`);
      }
    }

    if (copiate) {
      console.log(`[galleria] ${copiate} fotografie copiate, ${alleggerite} ripulite dei dati nascosti`);
    }
    for (const p of pesanti) {
      console.warn(`[galleria] pesante: ${p} — ridimensionala prima di pubblicarla`);
    }
  });

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

  // ── Impronta di un file, da mettere nel suo indirizzo ──
  //
  // GitHub Pages dichiara `max-age=600` e non permette di cambiarlo: per
  // dieci minuti un browser può tenersi un file e chiederne un altro. È
  // successo davvero — rinominate le classi dell'intestazione, chi aveva
  // il foglio di stile vecchio in cache lo ha accoppiato all'HTML nuovo,
  // e le regole che nascondono le intestazioni alternative non
  // combaciavano più con i nomi usati nella pagina: comparivano tutte
  // insieme, su ogni sezione.
  //
  // Con l'impronta nell'indirizzo il problema non è più possibile: se il
  // foglio cambia cambia il suo indirizzo, e nessuna copia vecchia può
  // rispondere per la nuova. Non si tratta di svuotare la cache, ma di
  // rendere impossibile che due file in disaccordo si incontrino.
  eleventyConfig.addFilter('versione', (percorso) => {
    // Volutamente senza rete di protezione: se il percorso è sbagliato è
    // meglio che la compilazione si fermi, invece di pubblicare pagine
    // che tornano silenziosamente a essere fragili.
    return createHash('sha256').update(readFileSync(percorso)).digest('hex').slice(0, 8);
  });

  // ── Filtri per le date ──
  eleventyConfig.addFilter('mese', (data) => scomponi(data).mese);
  eleventyConfig.addFilter('anno', (data) => scomponi(data).anno);

  eleventyConfig.addFilter('dataEstesa', esteso);

  /* Le prime righe di un testo, spogliate dei segni del Markdown.
     Serve al feed e alle descrizioni delle pagine singole; la
     lunghezza cambia secondo il posto in cui finiscono. */
  eleventyConfig.addFilter('sintesi', (testo, limite) => sintesi(testo, limite));

  /* Il momento di una voce, in millisecondi, per ordinarla fra le
     altre. `istante` quando c'è — porta l'ora e il fuso di chi ha
     scritto — altrimenti `data`, che è il giorno soltanto, o il mese
     soltanto negli articoli. Quel che non si sa datare va in fondo. */
  const quando = (voce) => {
    const momento = Date.parse((voce && voce.data && (voce.data.istante || voce.data.data)) || '');
    return Number.isNaN(momento) ? 0 : momento;
  };

  /* La data nella forma che i lettori di feed sanno leggere: RFC 822.
     `toUTCString` la produce già esatta, con GMT al posto del fuso —
     che lo standard ammette. */
  eleventyConfig.addFilter('dataRss', (valore) => {
    const momento = Date.parse(valore || '');
    return Number.isNaN(momento) ? '' : new Date(momento).toUTCString();
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

  // ── Ordine cronologico ──
  // Per le sezioni che si leggono dall'ultimo scritto in giù. Non basta
  // ordinare per `data`, che è il giorno soltanto: due pezzi dello
  // stesso giorno risulterebbero pari, e l'ultimo arrivato finirebbe
  // sotto al precedente per puro caso. Dove c'è, `istante` scioglie il
  // pareggio — porta con sé l'ora e il fuso di chi ha scritto.
  eleventyConfig.addFilter('cronologia', (voci) => {
    return [...(voci || [])].sort((a, b) => quando(b) - quando(a));
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

  // La sezione a cui un pezzo appartiene, cercata per identificativo:
  // serve alle pagine singole per intitolare il collegamento di
  // ritorno con il nome giusto — «Il Diavolo veste Pravda» e non
  // «giornale». Il nome resta scritto in un posto solo, site.json.
  eleventyConfig.addFilter('trovaSezione', (sezioni, id) => {
    return (sezioni || []).find((s) => s.id === id) || {};
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
  // `fuori` dice che il testo vero abita altrove: un articolo uscito
  // su una rivista sta là, e mandare chi cerca alla sezione che lo
  // elenca sarebbe un passaggio in più verso lo stesso posto. Per
  // tutto il resto la destinazione è qui — anche per le poesie, il cui
  // `gruppoUrl` porta alla pagina di un premio e non ai versi.
  const INDICIZZATE = [
    { tag: 'articoli', sezione: 'articoli', etichetta: 'Articoli', fuori: true },
    // Delle poesie si indicizzano titolo e nota, mai i versi: l'indice
    // è un file pubblico e leggibile: metterceli dentro vanificherebbe
    // la finestra che li mostra solo al passaggio del puntatore.
    { tag: 'scritti', sezione: 'scritti', etichetta: 'Poesie & Testi', riservato: true },
    { tag: 'tesi', sezione: 'tesi', etichetta: 'Tesi' },
    { tag: 'giornale', sezione: 'il-diavolo-veste-pravda', etichetta: 'Il Diavolo veste Pravda' },
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
    for (const { tag, sezione, etichetta, riservato, fuori } of INDICIZZATE) {
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
          // La pagina propria del pezzo, dove esiste: la ricerca ci
          // manda chi cerca, invece di depositarlo in cima a una
          // sezione lasciandogli il compito di ritrovare la voce.
          // Vuota per le poesie, che pagina non hanno.
          p: voce.url || '',
          // 1 quando l'indirizzo esterno è la casa del testo, non un
          // riferimento accanto a esso.
          x: fuori && d.url ? 1 : 0,
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

  /* Quel che si può seguire da fuori: i pezzi del Diavolo veste Pravda
     e gli articoli usciti altrove, mescolati in un unico ordine
     cronologico. Sono le due cose che escono a cadenza; il resto del
     sito — poesie, tesi, appunti — si visita, non si segue.

     I due tipi puntano a posti diversi, e il modello lo sa: un pezzo
     del giornale porta alla propria pagina qui, un articolo porta alla
     rivista che l'ha pubblicato. */
  eleventyConfig.addCollection('seguibili', (api) => {
    return [
      ...api.getFilteredByTag('giornale'),
      ...api.getFilteredByTag('articoli')
    ].sort((a, b) => quando(b) - quando(a));
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
