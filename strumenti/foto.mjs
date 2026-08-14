import { readdirSync, existsSync, mkdirSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * Le fotografie della galleria.
 *
 * Da una cartella di originali — quelli che escono dal telefono, da
 * quattromila punti di lato e qualche megabyte l'uno — si ricavano due
 * copie per ciascuna: una piccola per il riquadro nella griglia, una
 * grande per quando si apre. In WebP, che a parità di aspetto pesa
 * circa la metà di un JPEG.
 *
 * Tre cose succedono qui, e vale la pena dirle per nome.
 *
 * **Si raddrizzano.** Una foto scattata tenendo il telefono di
 * traverso non viene ruotata: i pixel restano come sono usciti dal
 * sensore e nel file si scrive da che parte sta l'alto. `rotate()`
 * senza argomenti applica quell'indicazione ai pixel — dopo, la foto è
 * dritta davvero e non ha più bisogno di dirlo a nessuno.
 *
 * **Si spogliano.** Sharp non ricopia i dati dell'originale se non
 * glielo si chiede: luogo, ora, apparecchio e numero di serie restano
 * nel file di partenza e non arrivano in linea.
 *
 * **Si rimpiccioliscono.** È la ragione per cui tutto questo esiste:
 * tredici fotografie a piena misura facevano ventotto megabyte, e una
 * pagina che ne pesa ventotto su una connessione mobile è una pagina
 * che non si apre.
 *
 * Prima tutto questo si faceva a mano, senza dipendenze: si toglievano
 * i segmenti dei dati dal JPEG lasciando i pixel intatti. Rimuovere si
 * poteva; ridimensionare no — quello richiede di decodificare e
 * ricomprimere, ed è il lavoro per cui esiste una libreria.
 */

const ESTENSIONI = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.heic']);

/* Il riquadro nella griglia è al massimo 330 punti; su uno schermo
   fitto ne servono il doppio. La copia grande è tarata su uno schermo
   grande senza arrivare al doppio: oltre una certa misura la
   differenza non si vede e il peso sì. */
export const MISURA_PICCOLA = 700;
export const MISURA_GRANDE = 1600;

const QUALITA = 78;

/** Il nome della copia: quello dell'originale, senza estensione. */
function nomeCopia(file, misura) {
  return `${path.basename(file, path.extname(file))}-${misura}.webp`;
}

/* Si rifà solo ciò che serve: se la copia esiste ed è più recente
   dell'originale, è già quella giusta. Serve alla prova locale, dove
   si ricompila di continuo; sulla pubblicazione la cartella è sempre
   vuota e si rifà tutto. */
function daRifare(origine, destinazione) {
  if (!existsSync(destinazione)) return true;
  return statSync(origine).mtimeMs > statSync(destinazione).mtimeMs;
}

async function unaCopia(origine, destinazione, misura) {
  if (!daRifare(origine, destinazione)) return false;
  await sharp(origine)
    // Applica ai pixel l'orientamento dichiarato: dopo, la foto è
    // dritta e non ha più bisogno di dichiarare niente.
    .rotate()
    // `withoutEnlargement` perché ingrandire una foto piccola non la
    // migliora: la sgrana e basta.
    .resize({ width: misura, height: misura, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITA })
    .toFile(destinazione);
  return true;
}

/**
 * Prepara le copie e restituisce l'elenco da mostrare.
 *
 * Le misure sono quelle della copia piccola: sono quelle che la pagina
 * deve riservare, e sono già ruotate.
 */
export async function prepara(cartella, destinazione) {
  if (!existsSync(cartella)) return [];
  mkdirSync(destinazione, { recursive: true });

  const didascalie = leggiDidascalie(cartella);
  const voci = [];
  let rifatte = 0;

  for (const nome of readdirSync(cartella).sort()) {
    if (!ESTENSIONI.has(path.extname(nome).toLowerCase())) continue;
    const origine = path.join(cartella, nome);

    let dati;
    try {
      /* `autoOrient` fa dichiarare a sharp le misure che si vedranno,
         non quelle del sensore: per una foto girata di un quarto sono
         scambiate, e riservare il riquadro sbagliato fa sobbalzare la
         pagina mentre le immagini arrivano. */
      dati = await sharp(origine, { autoOrient: true }).metadata();
    } catch (e) {
      console.warn(`[galleria] ${nome} non si legge: ${e.message}`);
      continue;
    }

    const piccola = nomeCopia(nome, MISURA_PICCOLA);
    const grande = nomeCopia(nome, MISURA_GRANDE);

    try {
      if (await unaCopia(origine, path.join(destinazione, piccola), MISURA_PICCOLA)) rifatte++;
      if (await unaCopia(origine, path.join(destinazione, grande), MISURA_GRANDE)) rifatte++;
    } catch (e) {
      console.warn(`[galleria] ${nome} non si è potuta preparare: ${e.message}`);
      continue;
    }

    // La copia piccola ha la stessa proporzione dell'originale,
    // rimpicciolita quel tanto che basta a starci dentro.
    const scala = Math.min(1, MISURA_PICCOLA / Math.max(dati.width, dati.height));
    voci.push({
      file: nome,
      piccola,
      grande,
      larghezza: Math.round(dati.width * scala),
      altezza: Math.round(dati.height * scala),
      didascalia: didascalie[nome] || ''
    });
  }

  if (voci.length) {
    const pesa = (f) => (existsSync(f) ? statSync(f).size : 0);
    const peso = voci.reduce(
      (somma, v) => somma + pesa(path.join(destinazione, v.piccola)) + pesa(path.join(destinazione, v.grande)),
      0
    );
    console.log(
      `[galleria] ${voci.length} fotografie` +
        (rifatte ? `, ${rifatte} copie rifatte` : ', copie già pronte') +
        `, ${Math.round(peso / 1024)} KB in tutto`
    );
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
