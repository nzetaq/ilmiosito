import { avviaRouter } from './router.js';
import { avviaTema } from './tema.js';
import { avviaVeste } from './veste.js';
import { avviaFiltri } from './filtri.js';
import { avviaCitazioni } from './citazioni.js';
import { avviaArtificiosa } from './artificiosa.js';
import { avviaPoesie } from './poesie.js';
import { avviaAnalisi } from './analisi.js';

// I moduli sono differiti per natura: il documento è già completo.
// L'analisi si iscrive per prima, così non perde il primo annuncio.
avviaAnalisi();
avviaRouter();
avviaTema();
avviaVeste();
avviaFiltri();
avviaCitazioni();
avviaArtificiosa();
avviaPoesie();
