import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

/**
 * Le fotografie della galleria.
 *
 * Due lavori, entrambi senza dipendenze: leggere le misure di un
 * file d'immagine, e ripulirlo dei dati che si porta dietro.
 *
 * Le misure servono a scriverle nell'HTML: senza, il browser non sa
 * quanto spazio riservare e la pagina sobbalza mentre le foto
 * arrivano. La pulizia serve a non regalare a chiunque il luogo in
 * cui la foto è stata scattata.
 */

const ESTENSIONI = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

/* ── Misure ──
   Si leggono dall'intestazione del file, che le dichiara. Ogni
   formato ha la sua, e sono tutte poche righe. */

function misureJpeg(b) {
  // I segmenti si susseguono: 0xFF, tipo, lunghezza a due byte. Le
  // misure stanno nel segmento SOF, che è uno di una famiglia.
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) { i++; continue; }
    const tipo = b[i + 1];
    // SOF0..SOF15, saltando DHT (c4), JPG (c8) e DAC (cc) che non lo sono.
    if (tipo >= 0xc0 && tipo <= 0xcf && tipo !== 0xc4 && tipo !== 0xc8 && tipo !== 0xcc) {
      return { altezza: b.readUInt16BE(i + 5), larghezza: b.readUInt16BE(i + 7) };
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return null;
}

function misurePng(b) {
  // IHDR è sempre il primo blocco, subito dopo la firma.
  if (b.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { larghezza: b.readUInt32BE(16), altezza: b.readUInt32BE(20) };
}

function misureWebp(b) {
  if (b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const forma = b.toString('ascii', 12, 16);
  if (forma === 'VP8X') {
    return {
      larghezza: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
      altezza: 1 + (b[27] | (b[28] << 8) | (b[29] << 16))
    };
  }
  if (forma === 'VP8 ') {
    return { larghezza: b.readUInt16LE(26) & 0x3fff, altezza: b.readUInt16LE(28) & 0x3fff };
  }
  if (forma === 'VP8L') {
    const n = b.readUInt32LE(21);
    return { larghezza: (n & 0x3fff) + 1, altezza: ((n >> 14) & 0x3fff) + 1 };
  }
  return null;
}

export function misure(b) {
  if (b.length > 24 && b[0] === 0xff && b[1] === 0xd8) return misureJpeg(b);
  if (b.length > 24 && b.toString('ascii', 1, 4) === 'PNG') return misurePng(b);
  if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF') return misureWebp(b);
  // AVIF e altri: non si leggono qui, e va detto invece che tirare a
  // indovinare. Chi chiama decide cosa farne.
  return null;
}

/* ── Orientamento ──
   Una fotografia scattata tenendo il telefono di traverso non viene
   ruotata: i pixel restano come sono usciti dal sensore, e nel file si
   scrive da che parte sta l'alto. È il browser a raddrizzarla.

   Sta fra i dati che portano anche il luogo e l'ora, ed è l'unico di
   quei dati che serve a vedere l'immagine dritta. */
export function orientamento(b) {
  if (!(b.length > 4 && b[0] === 0xff && b[1] === 0xd8)) return 1;
  let i = 2;
  while (i < b.length - 1) {
    if (b[i] !== 0xff) return 1;
    const tipo = b[i + 1];
    if (tipo === 0xda) return 1;
    const lunghezza = b.readUInt16BE(i + 2);

    if (tipo === 0xe1 && b.toString('ascii', i + 4, i + 10) === 'Exif\u0000\u0000') {
      const tiff = i + 10;
      const piccolo = b.toString('ascii', tiff, tiff + 2) === 'II';
      const leggi16 = (p) => (piccolo ? b.readUInt16LE(p) : b.readUInt16BE(p));
      const leggi32 = (p) => (piccolo ? b.readUInt32LE(p) : b.readUInt32BE(p));
      const ifd = tiff + leggi32(tiff + 4);
      if (ifd + 2 > b.length) return 1;
      const quante = leggi16(ifd);
      for (let k = 0; k < quante; k++) {
        const voce = ifd + 2 + k * 12;
        if (voce + 12 > b.length) break;
        if (leggi16(voce) === 0x0112) {
          const v = leggi16(voce + 8);
          return v >= 1 && v <= 8 ? v : 1;
        }
      }
      return 1;
    }
    i += 2 + lunghezza;
  }
  return 1;
}

/* Un blocco Exif ridotto all'osso: dichiara l'orientamento e nient'altro.
   Trentaquattro byte, contro i decine di migliaia che una macchina
   fotografica ci mette dentro. */
function soloOrientamento(valore) {
  const corpo = Buffer.alloc(32);
  corpo.write('Exif\u0000\u0000', 0, 'ascii');
  corpo.write('II', 6, 'ascii');
  corpo.writeUInt16LE(42, 8);
  corpo.writeUInt32LE(8, 10);      // l'elenco comincia subito dopo
  corpo.writeUInt16LE(1, 14);      // una voce sola
  corpo.writeUInt16LE(0x0112, 16); // Orientation
  corpo.writeUInt16LE(3, 18);      // tipo: intero corto
  corpo.writeUInt32LE(1, 20);      // quantità: uno
  corpo.writeUInt16LE(valore, 24);
  corpo.writeUInt32LE(0, 28);      // non segue nessun altro elenco

  const testa = Buffer.alloc(4);
  testa[0] = 0xff;
  testa[1] = 0xe1;
  testa.writeUInt16BE(corpo.length + 2, 2);
  return Buffer.concat([testa, corpo]);
}

/* ── Pulizia ──
   Una fotografia scattata col telefono porta con sé, oltre
   all'immagine, il luogo in cui è stata scattata, l'ora esatta, il
   numero di serie dell'apparecchio. Pubblicarla così significa
   pubblicare anche quelli: la posizione di casa propria è a due clic
   per chiunque scarichi il file.

   Nel JPEG quei dati stanno in segmenti a parte, riconoscibili e
   staccabili senza toccare l'immagine: si riscrive il file saltandoli,
   e i pixel restano identici — nessuna ricompressione, nessuna
   perdita.

   Con un'eccezione, imparata sbagliando: fra quei dati c'è anche
   l'orientamento, e senza di esso una foto scattata di traverso
   compare capovolta. Si conserva quello solo, riscritto in un blocco
   di trentaquattro byte che non dice altro. */
export function senzaExif(b) {
  if (!(b.length > 4 && b[0] === 0xff && b[1] === 0xd8)) return { dati: b, tolti: 0, orientamento: 1 };

  const verso = orientamento(b);
  const pezzi = [b.subarray(0, 2)];
  if (verso !== 1) pezzi.push(soloOrientamento(verso));

  let i = 2;
  let tolti = 0;

  while (i < b.length - 1) {
    if (b[i] !== 0xff) break;
    const tipo = b[i + 1];

    /* Fine dell'immagine. Da qui in poi si taglia: quel che segue non
       è immagine e nessun browser lo guarda, ma c'era eccome — questi
       telefoni attaccano in coda da quaranta a settanta kilobyte di
       XMP, cioè altri dati sulla foto, che sopravvivevano a tutta la
       pulizia perché stavano fuori dai segmenti. */
    if (tipo === 0xd9) { pezzi.push(b.subarray(i, i + 2)); i += 2; break; }

    if (tipo === 0xd8 || (tipo >= 0xd0 && tipo <= 0xd7) || tipo === 0x01) {
      pezzi.push(b.subarray(i, i + 2));
      i += 2;
      continue;
    }

    /* Una scansione: intestazione, poi i dati compressi. Si cammina
       fino al marcatore seguente — dentro i dati un 0xFF è sempre
       seguito da 0x00 o da un marcatore di ripartenza, quindi
       riconoscerlo è sicuro. Camminare invece di saltare alla fine è
       ciò che permette di trovare la fine vera: un JPEG progressivo ha
       più scansioni, e fermarsi alla prima lo troncherebbe a metà. */
    if (tipo === 0xda) {
      const lunghezza = b.readUInt16BE(i + 2);
      let k = i + 2 + lunghezza;
      while (k < b.length - 1) {
        if (b[k] === 0xff) {
          const seguente = b[k + 1];
          if (seguente !== 0x00 && !(seguente >= 0xd0 && seguente <= 0xd7)) break;
        }
        k++;
      }
      pezzi.push(b.subarray(i, k));
      tolti += 0;
      i = k;
      continue;
    }

    const lunghezza = b.readUInt16BE(i + 2);
    const fine = i + 2 + lunghezza;

    /* Si tiene solo ciò che serve a *decodificare* l'immagine, e si
       butta tutto il resto — non per elenco di cattivi, ma per elenco
       di buoni. L'elenco dei cattivi era il modo sbagliato: toglievo
       APP1, APP2, APP13 e i commenti, e sopravviveva indisturbato un
       APP4 da quindicimila byte messo lì dal telefono, con dentro chi
       sa cosa. Quel che non si conosce va tolto, non lasciato.

         · APP0  la sigla JFIF, dice la densità
         · APP2  ma solo il profilo di colore: senza, i colori
                 slittano. Gli altri APP2 — indici di anteprime,
                 estensioni — se ne vanno
         · APP14 dice a certi decodificatori come leggere i colori

       L'orientamento non è qui: è già stato riscritto in cima, in un
       blocco di trentaquattro byte che non dice altro. */
    const profiloColore =
      tipo === 0xe2 && b.toString('ascii', i + 4, i + 15) === 'ICC_PROFILE';
    const daTenere = tipo === 0xe0 || tipo === 0xee || profiloColore ||
      !((tipo >= 0xe0 && tipo <= 0xef) || tipo === 0xfe);

    if (daTenere) pezzi.push(b.subarray(i, fine));
    else tolti += fine - i;

    i = fine;
  }

  return { dati: Buffer.concat(pezzi), tolti, orientamento: verso };
}

/** Le fotografie di una cartella, in ordine, con le loro misure. */
export function raccogli(cartella) {
  if (!existsSync(cartella)) return [];

  const didascalie = leggiDidascalie(cartella);
  const voci = [];

  for (const nome of readdirSync(cartella).sort()) {
    const est = path.extname(nome).toLowerCase();
    if (!ESTENSIONI.has(est)) continue;

    const dati = readFileSync(path.join(cartella, nome));
    const m = misure(dati) || {};
    const verso = orientamento(dati);

    /* Da 5 a 8 la fotografia è girata di un quarto: le misure scritte
       nel file sono quelle del sensore, non quelle che si vedranno.
       Scriverle senza scambiarle farebbe riservare alla pagina un
       riquadro sdraiato per un'immagine in piedi. */
    const girata = verso >= 5 && verso <= 8;
    voci.push({
      file: nome,
      larghezza: (girata ? m.altezza : m.larghezza) || null,
      altezza: (girata ? m.larghezza : m.altezza) || null,
      orientamento: verso,
      byte: dati.length,
      didascalia: didascalie[nome] || ''
    });
  }
  return voci;
}

/* Le didascalie stanno in un file a parte, con il nome del file come
   chiave: così aggiungere una foto è mettere un file in una cartella,
   e darle una didascalia è facoltativo. */
function leggiDidascalie(cartella) {
  const percorso = path.join(cartella, 'didascalie.json');
  if (!existsSync(percorso)) return {};
  try {
    return JSON.parse(readFileSync(percorso, 'utf8'));
  } catch (e) {
    // Un file malscritto non deve fermare la compilazione del sito,
    // ma nemmeno passare inosservato.
    console.warn('[galleria] didascalie.json non si legge: ' + e.message);
    return {};
  }
}
