/**
 * Il salvaschermo: quel che il sito fa quando non lo si guarda più.
 *
 * Dopo qualche minuto senza un gesto — puntatore fermo, pagina ferma,
 * tastiera ferma — lo schermo si copre di una figura che si muove
 * piano, e il primo gesto qualunque la fa sparire. Non c'è nulla da
 * imparare e nulla da comandare: un salvaschermo che chiedesse
 * attenzione sarebbe il contrario di sé stesso.
 *
 * ── Perché è una figura per veste ──
 * L'idea viene da `psichedelia.html`, un esperimento a parte, ed è
 * quella di Officina: fluorescenze, caleidoscopi, frattali. Ma
 * Officina è una delle sei vesti, non il sito: accendere quelle
 * fluorescenze davanti a chi ha scelto Saggio — carta, serif, nessuna
 * campitura — sarebbe mostrargli la casa di un altro. Ogni veste ha
 * quindi il suo disegno, con i suoi inchiostri; stanno in `figure.js`.
 *
 * ── Perché di notte anche di giorno ──
 * Uno schermo che riposa si spegne, non si accende: la figura vive sul
 * fondo notturno della veste anche per chi legge il sito di giorno.
 * Gli inchiostri della notte sono perciò dichiarati nel foglio di
 * stile una volta per veste, fuori dai tre modi (`--notte-*`), e di
 * lì li legge questo modulo: il colore del sito sta scritto in un
 * posto solo, e non c'è una seconda tavolozza da tenere allineata.
 *
 * ── Quando non si accende affatto ──
 *  - se il sistema chiede movimento ridotto, o se il cursore del moto
 *    è a zero: sono due modi di dire la stessa cosa, e questa è la
 *    cosa più in movimento del sito;
 *  - nel modo Contrasto, che esiste per togliere ogni rumore dalla
 *    pagina: una figura a pieno schermo sarebbe il rumore più grande
 *    di tutti;
 *  - dove il puntatore non è fine: sul telefono lo schermo lo spegne
 *    il telefono, e una tela animata a pieno schermo consumerebbe
 *    soltanto batteria;
 *  - mentre è aperta una finestra di dialogo, che il browser tiene
 *    sopra ogni cosa: il salvaschermo le finirebbe sotto, e si
 *    vedrebbe metà sito e metà figura;
 *  - a scheda nascosta, dove non ci sarebbe nessuno a guardare.
 *
 * La velocità della figura segue il cursore del moto come ogni altro
 * movimento del sito: a metà velocità la figura si muove per metà.
 */

import { VERTICE, disegno } from './figure.js';

/* Quanta quiete prima di accendersi. Quattro minuti sono la misura
   dei salvaschermi veri, ed è anche la misura giusta qui: una pagina
   di questo sito si legge scorrendo, e chi legge muove qualcosa molto
   prima. Chi non muove più niente ha finito. */
const ATTESA = 4 * 60 * 1000;

/* Quanto dura una figura per chi ne ha più d'una, e quanto dura il
   passaggio alla seguente. Sono secondi di figura, non di orologio:
   col moto a metà durano il doppio, come tutto il resto. */
const DURATA = 26;
const DISSOLVENZA = 2.4;

/* Più di questo non aggiunge nulla che si veda, e su uno schermo
   grande a densità doppia toglie fotogrammi. */
const DENSITA_MAX = 1.5;

/* I gesti che valgono come «c'è ancora qualcuno». Si ascoltano in
   cattura, e passivi dove il browser lo consente: nessuno di questi
   viene mai fermato, e nessuno viene mai annullato. */
const GESTI = ['pointermove', 'pointerdown', 'wheel', 'keydown', 'touchstart', 'scroll', 'focusin'];

const radice = () => document.documentElement;

/* Gli inchiostri notturni della veste — tre numeri da 0 a 255 per
   ciascuno, come li scrive il foglio di stile — e il nome con cui
   ognuno arriva alla figura. */
const INCHIOSTRI = [
  ['--notte-fondo', 'u_fondo'],
  ['--notte-inchiostro', 'u_inchiostro'],
  ['--notte-tinta', 'u_tinta'],
  ['--notte-tinta-2', 'u_tinta_2'],
  ['--notte-tinta-3', 'u_tinta_3']
];

function numero(nome, ripiego) {
  const valore = parseFloat(getComputedStyle(radice()).getPropertyValue(nome));
  return Number.isFinite(valore) ? valore : ripiego;
}

/** "21, 29, 51" → [0.08, 0.11, 0.2]. Un colore illeggibile vale nero. */
function colore(nome) {
  const parti = getComputedStyle(radice()).getPropertyValue(nome).split(',');
  if (parti.length !== 3) return [0, 0, 0];
  const rgb = parti.map((p) => parseFloat(p) / 255);
  return rgb.every((c) => Number.isFinite(c)) ? rgb : [0, 0, 0];
}

function compila(gl, tipo, sorgente) {
  const pezzo = gl.createShader(tipo);
  gl.shaderSource(pezzo, sorgente);
  gl.compileShader(pezzo);
  if (gl.getShaderParameter(pezzo, gl.COMPILE_STATUS)) return pezzo;
  // Un errore qui è un errore di scrittura in figure.js, non un guasto
  // del lettore: va detto a chi può correggerlo, e il sito prosegue
  // senza salvaschermo.
  console.error('Salvaschermo:', gl.getShaderInfoLog(pezzo));
  gl.deleteShader(pezzo);
  return null;
}

/** La tela accesa, o niente se questo browser non sa disegnarla. */
function apparecchia(tela, stile) {
  const gl = tela.getContext('webgl', {
    alpha: false,
    depth: false,
    stencil: false,
    antialias: false,
    powerPreference: 'low-power'
  });
  if (!gl) return null;

  const { sorgente, quante } = disegno(stile);
  const vertice = compila(gl, gl.VERTEX_SHADER, VERTICE);
  const frammento = compila(gl, gl.FRAGMENT_SHADER, sorgente);
  if (!vertice || !frammento) return null;

  const programma = gl.createProgram();
  gl.attachShader(programma, vertice);
  gl.attachShader(programma, frammento);
  gl.linkProgram(programma);
  if (!gl.getProgramParameter(programma, gl.LINK_STATUS)) {
    console.error('Salvaschermo:', gl.getProgramInfoLog(programma));
    return null;
  }
  gl.useProgram(programma);

  // Il triangolo che copre la tela. Una volta sola: da qui in avanti
  // cambiano soltanto le uniformi.
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const posizione = gl.getAttribLocation(programma, 'a_pos');
  gl.enableVertexAttribArray(posizione);
  gl.vertexAttribPointer(posizione, 2, gl.FLOAT, false, 0, 0);

  // Gli inchiostri non cambiano finché la figura è accesa: si scrivono
  // adesso e non a ogni fotogramma.
  for (const [variabile, uniforme] of INCHIOSTRI) {
    const [r, v, b] = colore(variabile);
    gl.uniform3f(gl.getUniformLocation(programma, uniforme), r, v, b);
  }

  return {
    gl,
    quante,
    // Una figura che non c'è — getUniformLocation restituisce null per
    // le uniformi che il compilatore ha tolto perché inutilizzate — si
    // scrive senza effetto e senza errore: è quel che serve, perché
    // non tutti i disegni usano tutte le uniformi.
    dove: {
      res: gl.getUniformLocation(programma, 'u_res'),
      tempo: gl.getUniformLocation(programma, 'u_time'),
      ruota: gl.getUniformLocation(programma, 'u_hue'),
      figura: gl.getUniformLocation(programma, 'u_figura'),
      figuraB: gl.getUniformLocation(programma, 'u_figura_b'),
      mescola: gl.getUniformLocation(programma, 'u_mescola')
    }
  };
}

export function avviaSalvaschermo() {
  const fermo = matchMedia('(prefers-reduced-motion: reduce)');
  const puntatoreFine = matchMedia('(pointer: fine)');

  let attesa = null;      // il conto alla rovescia della quiete
  let scena = null;       // quel che esiste solo mentre è acceso
  let telaio = 0;         // il fotogramma richiesto

  /* Le condizioni si guardano al momento di accendere e non
     all'avvio: nel frattempo si può aver cambiato veste, mosso il
     cursore del moto o aperto una finestra. */
  function ammesso() {
    if (fermo.matches || !puntatoreFine.matches) return false;
    if (document.hidden) return false;
    /* Il modo si guarda per nome. Verrebbe voglia di dedurlo da
       `--ornamento`, che Contrasto azzera — ma lo azzerano anche
       quattro vesti su sei, che ornamenti non ne hanno per conto
       loro, e il salvaschermo sparirebbe da mezzo sito. */
    if (radice().getAttribute('data-tema') === 'contrasto') return false;
    if (numero('--moto', 1) <= 0) return false;
    if (document.querySelector('dialog[open]')) return false;
    return true;
  }

  function rimanda() {
    clearTimeout(attesa);
    attesa = setTimeout(accendi, ATTESA);
  }

  function accendi() {
    if (scena || !ammesso()) {
      // Non ora: si riprova dopo un'altra attesa intera, che è quanto
      // basta perché la condizione cambi senza doverla sorvegliare.
      rimanda();
      return;
    }

    const velo = document.createElement('div');
    velo.className = 'au-salvaschermo';
    // Non c'è niente da leggere né da raggiungere: è la pagina di
    // sotto che resta il documento, e questa è una tenda davanti.
    velo.setAttribute('aria-hidden', 'true');

    const tela = document.createElement('canvas');
    velo.appendChild(tela);

    const disegnata = apparecchia(tela, radice().getAttribute('data-stile') || 'officina');
    if (!disegnata) {
      // Niente WebGL, o uno shader sbagliato: meglio nessun
      // salvaschermo che un rettangolo nero sopra il sito.
      return;
    }

    const nota = document.createElement('p');
    nota.className = 'au-salvaschermo-nota';
    nota.textContent = '— un gesto qualsiasi riporta al sito —';
    velo.appendChild(nota);

    document.body.appendChild(velo);
    // Il primo disegno accade con il velo ancora trasparente; la
    // dissolvenza d'entrata parte da lì, e non da uno schermo nero.
    void velo.offsetHeight;
    velo.classList.add('is-acceso');

    scena = {
      velo,
      tela,
      ...disegnata,
      tempo: 0,
      ruota: Math.random(),
      partenza: Math.floor(Math.random() * disegnata.quante),
      ultimo: performance.now(),
      /* Il cursore del moto dice un tempo, e questa è una velocità:
         sono l'uno l'inverso dell'altro, come nel foglio di stile. Si
         legge adesso e non a ogni fotogramma — muovere quel cursore
         richiede di toccare la pagina, e toccarla spegne tutto. */
      velocita: 1 / numero('--moto', 1)
    };

    // Una tela persa — cambio di scheda video, sospensione, memoria
    // finita — non si ridisegna: si spegne e basta.
    tela.addEventListener('webglcontextlost', (evento) => {
      evento.preventDefault();
      spegni();
    });

    telaio = requestAnimationFrame(passo);
  }

  function misura() {
    const densita = Math.min(window.devicePixelRatio || 1, DENSITA_MAX);
    const larghezza = Math.max(1, Math.floor(innerWidth * densita));
    const altezza = Math.max(1, Math.floor(innerHeight * densita));
    if (scena.tela.width === larghezza && scena.tela.height === altezza) return;
    scena.tela.width = larghezza;
    scena.tela.height = altezza;
    scena.gl.viewport(0, 0, larghezza, altezza);
  }

  function passo(ora) {
    if (!scena) return;
    const { gl, dove } = scena;

    // Il salto massimo tiene ferma la figura quando la scheda torna in
    // primo piano dopo minuti: senza, riprenderebbe da molto più
    // avanti, con uno scatto.
    const battito = Math.min((ora - scena.ultimo) / 1000, 0.1) * scena.velocita;
    scena.ultimo = ora;
    scena.tempo += battito;
    scena.ruota += battito * 0.012;

    // Quale figura, e quanto della seguente è già arrivato. Si ricava
    // dal tempo invece di essere ricordato: non c'è uno stato che
    // possa sfasarsi, e la dissolvenza segue il moto da sé.
    let figura = 0;
    let figuraB = 0;
    let mescola = 0;
    if (scena.quante > 1) {
      const giri = scena.tempo / DURATA;
      const indice = Math.floor(giri);
      figura = (scena.partenza + indice) % scena.quante;
      figuraB = (figura + 1) % scena.quante;
      const dentro = (giri - indice) * DURATA;
      const resta = DURATA - dentro;
      if (resta < DISSOLVENZA) {
        const parte = 1 - resta / DISSOLVENZA;
        mescola = parte * parte * (3 - 2 * parte);
      }
    }

    misura();
    gl.uniform2f(dove.res, scena.tela.width, scena.tela.height);
    gl.uniform1f(dove.tempo, scena.tempo);
    gl.uniform1f(dove.ruota, scena.ruota);
    gl.uniform1i(dove.figura, figura);
    gl.uniform1i(dove.figuraB, figuraB);
    gl.uniform1f(dove.mescola, mescola);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    telaio = requestAnimationFrame(passo);
  }

  function spegni() {
    if (!scena) return;
    const uscita = scena;
    scena = null;
    cancelAnimationFrame(telaio);
    uscita.velo.classList.remove('is-acceso');

    // Quanto dura l'uscita lo dice il foglio di stile, che l'ha appena
    // cambiata togliendo la classe: il tempo è scritto là e qui non se
    // ne tiene una seconda copia.
    const durata = parseFloat(getComputedStyle(uscita.velo).transitionDuration) * 1000;
    setTimeout(() => {
      uscita.velo.remove();
      // La memoria della scheda video torna subito indietro, invece di
      // aspettare che il raccoglitore si accorga della tela.
      const perdita = uscita.gl.getExtension('WEBGL_lose_context');
      if (perdita) perdita.loseContext();
    }, Number.isFinite(durata) ? durata : 0);
  }

  function gesto() {
    if (scena) spegni();
    rimanda();
  }

  for (const nome of GESTI) {
    addEventListener(nome, gesto, { capture: true, passive: true });
  }

  // Passare a un'altra scheda non è un gesto sul sito: la figura si
  // spegne, e il conto riparte quando si torna. Disegnare per nessuno
  // costerebbe soltanto batteria.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (scena) spegni();
      clearTimeout(attesa);
    } else {
      rimanda();
    }
  });

  rimanda();
}
