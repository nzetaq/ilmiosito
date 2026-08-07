/* ════════════════════════════════════════════════════════════════
   Ritrovamento nei testi del sito

   Non genera niente: cerca, fra le cose scritte qui, il passo che
   più somiglia alla domanda. La coerenza non va prodotta perché è
   già nel testo — le frasi sono vere, le ha scritte una persona, e
   non possono contraddirsi né inventare.

   L'indice viene costruito da Eleventy a ogni compilazione e
   scaricato solo alla prima domanda: chi non interroga l'oracolo
   non paga nemmeno un byte.
   ════════════════════════════════════════════════════════════════ */

/* ── Parole vuote ──
   Reggono la frase ma non la distinguono: se «di» valesse come
   indizio, ogni domanda somiglierebbe a ogni testo. */
const FERMA = new Set(`
  il lo la i gli le un uno una dei degli delle del dello della
  di a da in con su per tra fra al allo alla ai agli alle dal dallo
  dalla dai dagli dalle nel nello nella nei negli nelle sul sullo
  sulla sui sugli sulle col coi
  e ed o od ma se perche che chi cui come quando dove quanto quale
  quali cosa quali qual
  non ne ci vi si mi ti lo la li le ne
  essere sono sei siamo siete e stato stata stati state
  avere ho hai ha abbiamo avete hanno avuto
  fare faccio fai fa facciamo fate fanno fatto
  puo posso puoi possiamo potete possono
  mi dici dimmi parlami spiegami sai conosci vorrei voglio
  questo questa questi queste quello quella quelli quelle
  suo sua suoi sue mio mia miei mie tuo tua tuoi tue
  piu meno molto poco tutto tutta tutti tutte
  the of and to in is a for on with that this it as be by are was
`.trim().split(/\s+/));

/* ── Riduzione a radice ──
   Un accenno di morfologia, non un analizzatore: basta che
   «magistratura» e «magistrature», «intelligenza» e «intelligente»
   finiscano sullo stesso gancio. I suffissi vanno dal più lungo al
   più corto, perché il primo che combacia vince. */
const SUFFISSI = [
  'issimamente', 'issimo', 'issima', 'issimi', 'issime',
  'amente', 'mente', 'zione', 'zioni', 'sione', 'sioni',
  'mento', 'menti', 'logia', 'logie', 'grafia', 'grafie',
  'abile', 'ibile', 'abili', 'ibili', 'trice', 'trici',
  'ita', 'eta', 'ismo', 'ismi', 'ista', 'isti', 'iste',
  'anza', 'anze', 'enza', 'enze', 'ente', 'enti',
  'tore', 'tori', 'ando', 'endo', 'ata', 'ate', 'ato', 'ati',
  'uta', 'ute', 'uto', 'uti', 'ite', 'ito', 'iti',
  'osa', 'ose', 'oso', 'osi', 'ica', 'ici', 'ico', 'iche',
  'are', 'ere', 'ire', 'ura', 'ure', 'ezza', 'ezze',
  'a', 'e', 'i', 'o'
];

const MINIMA = 4;   // sotto questa lunghezza la radice non si tocca
const PREFISSO = 5; // radici diverse ma con questo prefisso comune combaciano

function radice(parola) {
  if (parola.length <= MINIMA) return parola;
  for (const s of SUFFISSI) {
    if (parola.endsWith(s) && parola.length - s.length >= MINIMA) {
      return parola.slice(0, -s.length);
    }
  }
  return parola;
}

/** Minuscole, via gli accenti, via la punteggiatura. */
function normalizza(testo) {
  return String(testo)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function scomponi(testo) {
  if (!testo) return [];
  return normalizza(testo)
    .split(' ')
    .filter((p) => p.length >= 3 && !FERMA.has(p))
    .map(radice);
}

/* ── Costruzione dell'indice invertito ──
   Il titolo pesa il triplo del corpo: chi cerca «bonapartismo»
   intende quell'articolo, non un testo che lo nomina di sfuggita. */
const PESO_TITOLO = 3;
const PESO_FONTE = 2;
const PESO_CATEGORIA = 2;

export function costruisci(voci) {
  const documenti = voci.map((v) => {
    const parole = [];
    for (let n = 0; n < PESO_TITOLO; n++) parole.push(...scomponi(v.t));
    for (let n = 0; n < PESO_FONTE; n++) parole.push(...scomponi(v.f));
    // Il nome della categoria — «Poesia», «Tesi» — è l'unico posto in
    // cui certe voci dicono che cosa sono.
    for (let n = 0; n < PESO_CATEGORIA; n++) parole.push(...scomponi(v.k));
    parole.push(...scomponi(v.s));

    const frequenze = new Map();
    for (const p of parole) frequenze.set(p, (frequenze.get(p) || 0) + 1);
    return { voce: v, frequenze, lunghezza: parole.length };
  });

  // Quanti documenti contengono ciascuna radice: è ciò che rende
  // «magistratura» un indizio e «verità» quasi nessuno.
  const documentiPer = new Map();
  for (const d of documenti) {
    for (const p of d.frequenze.keys()) {
      documentiPer.set(p, (documentiPer.get(p) || 0) + 1);
    }
  }

  const media = documenti.reduce((s, d) => s + d.lunghezza, 0) / (documenti.length || 1);
  return { documenti, documentiPer, media, vocabolario: [...documentiPer.keys()] };
}

/* ── Punteggio BM25 ──
   Tiene conto di tre cose: quante volte la parola compare nel testo,
   quanto è rara nell'insieme, e quanto è lungo il testo — così la
   tesi, che è dieci volte gli altri, non vince per stazza. */
const K1 = 1.2;
const B = 0.75;

function affine(radiceDomanda, vocabolario) {
  const esatta = [];
  for (const v of vocabolario) {
    if (v === radiceDomanda) return [v];
    const comune = v.startsWith(radiceDomanda) || radiceDomanda.startsWith(v);
    if (comune && Math.min(v.length, radiceDomanda.length) >= PREFISSO) esatta.push(v);
  }
  return esatta;
}

export function interroga(indice, domanda, quante = 1) {
  const radici = [...new Set(scomponi(domanda))];
  if (!radici.length) return [];

  const { documenti, documentiPer, media, vocabolario } = indice;
  const N = documenti.length;
  const esiti = [];

  for (const d of documenti) {
    let punteggio = 0;
    let combaciate = 0;

    for (const r of radici) {
      // Una parola della domanda può agganciare più forme vicine nel
      // testo: vale la migliore, non la somma, per non premiare due
      // volte lo stesso indizio.
      let migliore = 0;
      for (const v of affine(r, vocabolario)) {
        const tf = d.frequenze.get(v);
        if (!tf) continue;
        const df = documentiPer.get(v) || 0;
        // Se la radice sta in tutti i documenti l'idf si annulla e il
        // termine smette di contare: è la parola vuota che il nostro
        // elenco non prevedeva.
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        const norma = tf * (K1 + 1) / (tf + K1 * (1 - B + B * d.lunghezza / media));
        migliore = Math.max(migliore, idf * norma);
      }
      if (migliore > 0) {
        punteggio += migliore;
        combaciate++;
      }
    }

    if (combaciate > 0) esiti.push({ voce: d.voce, punteggio, combaciate, radici: radici.length });
  }

  // Prima chi aggancia più parole della domanda, poi chi lo fa meglio:
  // due parole su due battono una sola per quanto pesante.
  esiti.sort((a, b) => b.combaciate - a.combaciate || b.punteggio - a.punteggio);
  return esiti.slice(0, quante);
}

/** Una radice della domanda tocca l'insieme, per identità o per prefisso. */
function aggancia(r, insieme) {
  if (insieme.has(r)) return true;
  for (const v of insieme) {
    if ((v.startsWith(r) || r.startsWith(v)) && Math.min(v.length, r.length) >= PREFISSO) return true;
  }
  return false;
}

/* ── Estrazione del passo ──
   Un testo lungo non va citato intero: dell'abstract della tesi
   interessa la frase che riguarda la domanda, non le millecinquecento
   battute che la circondano. */
export function passo(voce, domanda, massimo = 300) {
  const testo = (voce && voce.s) || '';
  if (!testo || testo.length <= massimo) return testo;

  const radici = new Set(scomponi(domanda));
  const frasi = testo.match(/[^.!?]+[.!?]*\s*/g) || [testo];

  let migliore = 0;
  let punteggioMigliore = -1;
  frasi.forEach((f, i) => {
    const insieme = new Set(scomponi(f));
    let n = 0;
    for (const r of radici) if (aggancia(r, insieme)) n++;
    if (n > punteggioMigliore) { punteggioMigliore = n; migliore = i; }
  });

  // Dalla frase più pertinente si prosegue finché c'è spazio: una
  // frase isolata dal mezzo di un ragionamento resta monca.
  let brano = frasi[migliore].trim();
  for (let i = migliore + 1; i < frasi.length; i++) {
    const prossima = frasi[i].trim();
    if (brano.length + 1 + prossima.length > massimo) break;
    brano += ' ' + prossima;
  }

  const iniziale = migliore > 0 ? '…' : '';
  const finale = migliore + 1 < frasi.length ? '…' : '';
  return iniziale + brano + finale;
}

/* ── Caricamento ──
   Differito e una volta sola. Se il file non arriva, il chiamante
   riceve `null` e si arrangia: l'oracolo ha sempre la sua altra voce. */
let promessa = null;

export function caricaIndice() {
  if (promessa) return promessa;
  const dove = new URL('../indice.json', import.meta.url);
  promessa = fetch(dove)
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((voci) => (Array.isArray(voci) && voci.length ? costruisci(voci) : null))
    .catch(() => null);
  return promessa;
}
