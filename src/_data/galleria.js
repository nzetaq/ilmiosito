import path from 'node:path';
import { raccogli } from '../../strumenti/foto.mjs';

/**
 * L'elenco delle fotografie, letto dalla cartella `foto/`.
 *
 * Sta fuori da `src/` di proposito: Eleventy tratta come modello ogni
 * file che trova nella cartella d'ingresso, e un JPEG non è un
 * modello. Da qui viene solo l'elenco; a copiare i file ci pensa la
 * configurazione, che nel frattempo li ripulisce.
 */
export default function () {
  return raccogli(path.join(process.cwd(), 'foto'));
}
