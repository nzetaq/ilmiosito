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

/* ── Pulizia ──
   Una fotografia scattata col telefono porta con sé, oltre
   all'immagine, il luogo in cui è stata scattata, l'ora esatta, il
   numero di serie dell'apparecchio. Pubblicarla così significa
   pubblicare anche quelli: la posizione di casa propria è a due clic
   per chiunque scarichi il file.

   Nel JPEG quei dati stanno in segmenti a parte, riconoscibili e
   staccabili senza toccare l'immagine: si riscrive il file saltandoli,
   e i pixel restano identici — nessuna ricompressione, nessuna
   perdita. */
export function senzaExif(b) {
  if (!(b.length > 4 && b[0] === 0xff && b[1] === 0xd8)) return b;

  const pezzi = [b.subarray(0, 2)];
  let i = 2;
  let tolti = 0;

  while (i < b.length - 1) {
    if (b[i] !== 0xff) break;
    const tipo = b[i + 1];

    // Inizio dei dati compressi: da qui in poi è immagine, si copia
    // tutto il resto così com'è.
    if (tipo === 0xda) { pezzi.push(b.subarray(i)); i = b.length; break; }
    if (tipo === 0xd8 || (tipo >= 0xd0 && tipo <= 0xd9)) { i += 2; continue; }

    const lunghezza = b.readUInt16BE(i + 2);
    const fine = i + 2 + lunghezza;

    // APP1 (Exif, XMP), APP2 (profili), APP13 (IPTC, Photoshop) e i
    // commenti: via. Gli altri restano — APP0 è la sigla JFIF, e
    // APP14 dice a certi decodificatori come leggere i colori.
    const daTogliere = tipo === 0xe1 || tipo === 0xe2 || tipo === 0xed || tipo === 0xfe;
    if (daTogliere) tolti += fine - i;
    else pezzi.push(b.subarray(i, fine));

    i = fine;
  }

  return { dati: Buffer.concat(pezzi), tolti };
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
    voci.push({
      file: nome,
      larghezza: m.larghezza || null,
      altezza: m.altezza || null,
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
