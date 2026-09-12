import { avviaLingua } from './lingua.js';
import { avviaRouter } from './router.js';
import { avviaTema } from './tema.js';
import { avviaVeste } from './veste.js';
import { avviaFiltri } from './filtri.js';
import { avviaCitazioni } from './citazioni.js';
import { avviaArtificiosa } from './artificiosa.js';
import { avviaPoesie } from './poesie.js';
import { avviaAnalisi } from './analisi.js';
import { avviaContatti } from './contatti.js';
import { avviaMenu } from './menu.js';
import { avviaCerca } from './cerca.js';
import { avviaGalleria } from './galleria.js';

// I moduli sono differiti per natura: il documento è già completo.
// L'analisi si iscrive per prima, così non perde il primo annuncio.
avviaAnalisi();
// La lingua è già applicata — lo script del <head> e quello in fondo al
// corpo l'hanno decisa e scritta prima del primo disegno. Qui resta da
// dichiararla nell'indirizzo, quando è una scelta e non una
// supposizione: la barra non si disegna con la pagina, e può aspettare
// di arrivare fin qui.
avviaLingua();
avviaRouter();
avviaMenu();
avviaTema();
avviaVeste();
avviaFiltri();
avviaCitazioni();
avviaArtificiosa();
avviaPoesie();
avviaContatti();
avviaCerca();
avviaGalleria();
