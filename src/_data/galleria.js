import path from 'node:path';
import { prepara } from '../../strumenti/foto.mjs';

/**
 * L'elenco delle fotografie, e le copie da servire.
 *
 * Gli originali stanno in `foto/`, fuori da `src/`: Eleventy tratta
 * come modello ogni file che trova nella cartella d'ingresso, e un
 * JPEG non è un modello.
 *
 * Le copie si preparano qui e non in un passo successivo, perché la
 * pagina deve conoscerne i nomi e le misure mentre si scrive. Gli
 * originali non vengono mai copiati: restano nel repository, e in
 * linea vanno solo le copie ridotte e spogliate.
 */
export default async function () {
  return prepara(
    path.join(process.cwd(), 'foto'),
    path.join(process.cwd(), 'dist', 'assets', 'foto')
  );
}
