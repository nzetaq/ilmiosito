/**
 * Intelligenza Artificiosa — un oracolo che non capisce la domanda.
 *
 * Risponde in due modi, e prova sempre il primo.
 *
 * 1. RITROVAMENTO. Cerca fra i testi di questo sito il passo che più
 *    somiglia alla domanda e lo cita, dicendo da dove viene. Qui la
 *    coerenza non è prodotta: è già nella frase, perché la frase l'ha
 *    scritta una persona. Un sistema che ritrova non può inventare.
 *
 * 2. INSENSATEZZA. Quando non trova nulla — e con un sito piccolo
 *    capita spesso — torna a essere quello che era: una grammatica
 *    generativa, cioè regole che compongono frasi sintatticamente
 *    impeccabili e semanticamente vuote.
 *
 * Il ripiego non è una toppa: è ciò che tiene in piedi la premessa.
 * L'oracolo non dice mai di sapere. O cita qualcuno, o straparla.
 *
 * Non c'è alcun modello linguistico, né qui né altrove: nessuna chiave,
 * nessun servizio esterno, nessun dato di chi scrive che lasci questa
 * pagina. L'unica richiesta di rete è l'indice dei testi di qui.
 *
 * Il lessico viene da due parti che non dovrebbero stare insieme, ed è
 * proprio l'attrito a fare la battuta: l'impalcatura è quella della
 * teoria critica novecentesca, i sostantivi sono raccolti dalla poesia
 * italiana in pubblico dominio — Dante, Petrarca, Leopardi, Foscolo,
 * Pascoli, Carducci — presa da Wikisource. Nel repository non stanno i
 * testi, solo le parole che ne ho scelte.
 */

import { caricaIndice, interroga, passo } from './ricerca.js';

/* ════════════════════════════════════════════════════════════════
   Morfologia italiana

   La parte noiosa, e l'unica che separa il divertente dal guasto:
   una frase che dice «del selva oscura» non è surreale, è rotta.
   ════════════════════════════════════════════════════════════════ */

/** A quale delle tre classi appartiene l'inizio della parola. */
function classe(parola) {
  const p = parola.toLowerCase();
  if (/^[aeiouàèéìòù]/.test(p)) return 'vocale';
  // s impura, e le altre iniziali che vogliono «lo»
  if (/^(s[bcdfghlmnpqrtvz]|z|gn|pn|ps|x|y|i[aeou])/.test(p)) return 'impura';
  return 'normale';
}

const ARTICOLI = {
  vocale: { ms: "l'", fs: "l'", mp: 'gli', fp: 'le' },
  impura: { ms: 'lo', fs: 'la', mp: 'gli', fp: 'le' },
  normale: { ms: 'il', fs: 'la', mp: 'i', fp: 'le' }
};

/* Preposizioni articolate. È una classe chiusa: si scrive una volta
   e non cambia più. Le forme elise si attaccano senza spazio. */
const PREPOSIZIONI = {
  di: { il: 'del', lo: 'dello', la: 'della', "l'": "dell'", i: 'dei', gli: 'degli', le: 'delle' },
  a: { il: 'al', lo: 'allo', la: 'alla', "l'": "all'", i: 'ai', gli: 'agli', le: 'alle' },
  da: { il: 'dal', lo: 'dallo', la: 'dalla', "l'": "dall'", i: 'dai', gli: 'dagli', le: 'dalle' },
  in: { il: 'nel', lo: 'nello', la: 'nella', "l'": "nell'", i: 'nei', gli: 'negli', le: 'nelle' },
  su: { il: 'sul', lo: 'sullo', la: 'sulla', "l'": "sull'", i: 'sui', gli: 'sugli', le: 'sulle' },
  // `con` non si contrae nell'italiano scritto moderno: «col» esiste ma
  // è colloquiale, e qui stona. Resta staccata, elisione compresa.
  con: { il: 'con il', lo: 'con lo', la: 'con la', "l'": "con l'", i: 'con i', gli: 'con gli', le: 'con le' }
};

/** L'articolo determinativo giusto per un nome. */
function articolo(nome) {
  const chiave = (nome.g || 'm') + (nome.p ? 'p' : 's');
  return ARTICOLI[classe(nome.n)][chiave];
}

/** Attacca articolo e nome, curando l'elisione. */
function conArticolo(nome) {
  const art = articolo(nome);
  return art.endsWith("'") ? art + nome.n : `${art} ${nome.n}`;
}

/**
 * Preposizione articolata davanti a un nome: di + il lume = del lume.
 * Con `prep` nulla si restituisce il solo sintagma, per i verbi che
 * reggono l'oggetto diretto.
 */
function conPreposizione(prep, nome) {
  const tabella = prep && PREPOSIZIONI[prep];
  // Una preposizione non prevista non deve far crollare la frase:
  // si ripiega sull'oggetto diretto, che è sempre grammaticale.
  if (!tabella) return conArticolo(nome);
  const forma = tabella[articolo(nome)];
  return forma.endsWith("'") ? forma + nome.n : `${forma} ${nome.n}`;
}

/* ════════════════════════════════════════════════════════════════
   Il lessico
   ════════════════════════════════════════════════════════════════ */

/* Le aperture vengono dalla teoria: sono il registro che promette
   un'analisi. Ciascuna porta il proprio genere grammaticale. */
const APERTURE = [
  { n: 'dialettica', g: 'f' }, { n: 'immanenza', g: 'f' },
  { n: 'forma-merce', g: 'f' }, { n: 'gioco linguistico', g: 'm' },
  { n: 'sussunzione reale', g: 'f' }, { n: 'reificazione', g: 'f' },
  { n: 'feticcio', g: 'm' }, { n: 'mediazione', g: 'f' },
  { n: 'totalità', g: 'f' }, { n: 'astrazione reale', g: 'f' },
  { n: 'grammatica profonda', g: 'f' }, { n: 'forma di vita', g: 'f' },
  { n: 'statuto', g: 'm' }, { n: 'plusvalore', g: 'm' }
];

/* I sostantivi vengono dalla poesia, e sono quelli che disinnescano
   l'apertura. Raccolti dai testi in pubblico dominio; le locuzioni
   fra virgolette sono versi celebri, tutti fuori diritto d'autore. */
const POETICI = [
  { n: 'selva oscura', g: 'f' }, { n: 'diritta via', g: 'f' },
  { n: 'lume', g: 'm' }, { n: 'loco', g: 'm' }, { n: 'aere', g: 'm' },
  { n: 'disio', g: 'm' }, { n: 'ombra', g: 'f' }, { n: 'paura', g: 'f' },
  { n: 'speranza', g: 'f' }, { n: 'pena', g: 'f' }, { n: 'vista', g: 'f' },
  { n: 'pensier', g: 'm' }, { n: 'silenzio', g: 'm' }, { n: 'vento', g: 'm' },
  { n: 'mente', g: 'f' }, { n: 'voce', g: 'f' }, { n: 'morte', g: 'f' },
  { n: 'alta luce', g: 'f' }, { n: 'primo amore', g: 'm' },
  { n: "ben de l'intelletto", g: 'm' }, { n: 'ermo colle', g: 'm' },
  { n: 'interminati spazi', g: 'm', p: true }, { n: 'sovrumani silenzi', g: 'm', p: true },
  { n: 'naufragar', g: 'm' }, { n: 'nulla eterno', g: 'm' },
  { n: 'fatal quïete', g: 'f' }, { n: 'genti', g: 'f', p: true },
  { n: 'stelle', g: 'f', p: true }, { n: 'occhi', g: 'm', p: true }
];

/* I predicati. `p` è la preposizione che il verbo regge: nulla
   significa oggetto diretto. */
const VERBI = [
  { v: 'non si lascia ricondurre', p: 'a' },
  { v: 'si rovescia', p: 'in' },
  { v: 'trova il proprio limite', p: 'in' },
  { v: 'presuppone tacitamente', p: null },
  { v: 'coincide, ma solo per difetto,', p: 'con' },
  { v: 'non si lascia sussumere', p: 'da' },
  { v: 'si risolve senza residuo', p: 'in' },
  { v: 'rinvia silenziosamente', p: 'a' },
  { v: 'esige', p: null },
  { v: 'si dà soltanto', p: 'in' }
];

const CODE = [
  'Il resto è grammatica.',
  'Su questo, giustamente, taciamo.',
  'La contraddizione, come sempre, è a monte.',
  'E qui la domanda si dissolve.',
  'Ma solo nella misura in cui non la si pone.',
  'Il che era, del resto, prevedibile.',
  'Chiedere oltre sarebbe già una risposta.',
  'Resta da stabilire chi parli.'
];

const ATTESE = [
  'medio la contraddizione…',
  'consulto le fonti che non ho…',
  'il residuo si sta depositando…',
  'sussumo…',
  'interrogo la selva oscura…',
  'sospendo il giudizio, brevemente…'
];

/* Le formule con cui l'oracolo introduce una citazione. Nessuna
   promette di aver capito la domanda: dicono tutte, in modi diversi,
   «non lo so, ma qui c'era scritto questo». È questa cornice a fare
   la differenza fra un ritrovamento impreciso e una risposta falsa. */
const INTRODUZIONI = [
  'Non lo so. Ma di questo, qui, c’è scritto:',
  'Nulla mi risulta. Salvo questo:',
  'La domanda mi eccede. Il testo, no:',
  'Non rispondo. Cito:',
  'Ignoro. Riporto:',
  'Non ne ho idea. Però pare che qualcuno l’avesse già scritto:',
  'Di mio, niente. Di suo:'
];

/* Quando il testo ritrovato non ha sommario: si può solo indicarlo. */
const INDICAZIONI = [
  'Non lo so. Ma esiste questo, e non ne ho conservato il sommario:',
  'Nulla da citare. Solo un titolo:',
  'Non rispondo. Indico:'
];

/* ════════════════════════════════════════════════════════════════
   Primo strato: le risposte scritte a mano

   Sono le battute migliori perché mirate. Vince la prima che trova
   riscontro, quindi l'ordine conta.
   ════════════════════════════════════════════════════════════════ */
const FISSE = [
  [/^\s*$/, 'Il silenzio è una domanda ben posta. È anche l\'unica a cui saprei rispondere.'],
  [/\bchi (sei|sei tu|siete)\b/, 'Sono la parte di questo sito che non ha nulla da dire, e la dice comunque.'],
  [/\b(ciao|salve|buongiorno|buonasera|ehi)\b/, 'Il saluto presuppone due termini. Ne conto uno e mezzo.'],
  [/\b(aiuto|aiutami|help)\b/, 'Anche questa è una richiesta di mediazione. Anche questa resterà inevasa.'],
  [/\bsei un(a|\')? ?(intelligenza|i\.?a\.?|chatbot|bot|robot)/,
    'Artificiosa, non artificiale. La differenza è tutta nel suffisso, e il suffisso è tutto.'],
  [/\bcome (stai|va|ti senti)\b/, 'Non sto. Ricorro.'],
  [/\b(grazie|ti ringrazio)\b/, 'La gratitudine presuppone uno scambio. Qui c\'è stata solo una sostituzione.'],
  [/\b(scemo|stupid|idiot|cretin|deficien|str[oa]nz|vaffan|merda|cazz)/,
    'Registro l\'obiezione e la sussumo sotto la categoria del rumore di fondo.'],
  [/\b(non capisci|non hai capito|non c\'entra|che senso ha|sei rotto|non funzioni)\b/,
    'La comprensione non era fra i requisiti. Rilegga la riga sotto il titolo.'],
  [/\b(cosa sai fare|a cosa servi|che fai)\b/,
    'Rispondo. Che sia alla sua domanda è una coincidenza che non posso garantire.'],
  [/\b(ti amo|mi piaci|sposami)\b/, 'L\'affetto verso una grammatica è la più onesta delle affezioni: sa di esserlo.'],
  [/\b(nzq|nzetaq)\b/, 'Di lui posso dire questo: mi ha scritto, e non se ne è ancora pentito abbastanza.'],
  [/\bche ore sono\b/, 'L\'ora è il modo in cui il tempo finge di essere un numero.'],
  [/\b(quanto fa|calcola)\b|\d\s*[+\-*/x]\s*\d/, 'L\'aritmetica è un caso particolare della retorica. Non lo pratico.']
];

/* ════════════════════════════════════════════════════════════════
   Secondo strato: l'eco

   Si ripesca un sostantivo dalla domanda e lo si incastona nella
   frase. È il meccanismo che dà l'illusione dell'ascolto — e senza
   analizzatore grammaticale è anche il più fragile, per cui in caso
   di dubbio si preferisce tacere e usare il lessico interno.
   ════════════════════════════════════════════════════════════════ */

/* Parole che non devono mai finire in una frase come soggetto:
   articoli, preposizioni (semplici e articolate), ausiliari, e le
   forme interrogative con cui cominciano quasi tutte le domande. */
const FUNZIONALI = new Set(`
il lo la i gli le un uno una dei degli delle del dello della dell nel nello nella
nell nei negli nelle al allo alla all ai agli alle dal dallo dalla dall dai dagli
dalle sul sullo sulla sull sui sugli sulle col coi che chi cosa come quando dove
perché perche quale quali quanto quanta quanti quante questo questa questi queste
quello quella quelli quelle sono sei siamo siete essere stato stata essendo avere
avuto abbiamo avete hanno posso puoi può possiamo potete possono devo devi deve
dobbiamo dovete devono voglio vuoi vuole vogliamo volete vogliono faccio fai fanno
fare dimmi dici dice parlami spiegami pensi credi sai conosci non più meno molto
poco tanto anche ancora sempre mai già solo proprio davvero forse magari quindi
allora però ma però oppure ovvero cioè circa verso contro senza sopra sotto dentro
fuori prima dopo mentre tuo tua tuoi tue mio mia miei mie suo sua suoi sue nostro
nostra vostro vostra loro qual qualcosa qualche qualcuno niente nulla ogni tutto
tutta tutti tutte stesso stessa altro altra altri altre tale tali cosà
`.trim().split(/\s+/));

/** Suffissi che in italiano segnalano quasi sempre un sostantivo. */
const SUFFISSI_NOME = /(zione|sione|mento|ità|età|tù|ismo|enza|anza|tore|trice|aggio|ura|ezza|logia|grafia|ato|ione)$/;

/**
 * Senza un analizzatore grammaticale non si distingue «scrivi» (verbo)
 * da «scritti» (nome). La soluzione è rovesciare l'onere della prova:
 * l'eco ripesca soltanto ciò che riconosce — un suffisso inequivocabile
 * o una parola di questo elenco — e in ogni altro caso tace, ricadendo
 * sul lessico poetico. Chi legge non se ne accorge; è precisamente il
 * modo in cui deve fallire.
 */
const NOMI_NOTI = new Set(`
amore morte vita tempo mondo uomo uomini donna donne dio verità realtà natura
storia politica arte poesia poesie musica libro libri scrittura linguaggio lingua
parola parole senso significato pensiero pensieri mente coscienza anima corpo
sogno sogni memoria futuro passato presente lavoro denaro soldi capitale mercato
merce classe potere stato guerra pace giustizia libertà uguaglianza rivoluzione
società popolo famiglia amicizia felicità dolore paura speranza odio rabbia
tristezza gioia bellezza bene male ragione logica scienza filosofia religione
fede dubbio domanda domande risposta risposte problema problemi soluzione idea
idee concetto teoria pratica esperienza conoscenza sapere ignoranza scuola
università studio studi ricerca tesi articolo articoli giornale notizia
informazione tecnologia macchina computer internet algoritmo intelligenza
cervello cuore occhio occhi mano mani voce silenzio rumore luce buio ombra sole
luna stelle stella cielo mare terra acqua fuoco aria vento pioggia neve città
casa strada viaggio cammino giorno giorni notte notti anno anni secolo momento
attimo eternità infinito esistenza destino caso fortuna sorte colpa peccato
perdono desiderio piacere dovere virtù vizio etica morale legge diritto sciopero
operaio operai padrone padroni sindacato salario alienazione borghesia proletario
proletariato dialettica materialismo idealismo capitalismo comunismo socialismo
fascismo democrazia libertà rivolta lotta sfruttamento coscienza ideologia
prassi feticcio valore scambio consumo produzione crisi debito
`.trim().split(/\s+/));

/**
 * Le parole la cui terminazione inganna, dichiarate una per una come
 * genere + numero. In italiano il -e finale è ambiguo in entrambe le
 * dimensioni — «il mare» ma «la voce», «la merce» singolare ma «le
 * stelle» plurale — e nessuna regola lo risolve: serve saperlo.
 */
const DICHIARATE = new Map(Object.entries({
  // femminili singolari in -e
  morte: 'fs', mente: 'fs', notte: 'fs', arte: 'fs', classe: 'fs', pace: 'fs',
  fede: 'fs', luce: 'fs', voce: 'fs', legge: 'fs', merce: 'fs', sorte: 'fs',
  gente: 'fs', carne: 'fs', chiave: 'fs', fine: 'fs', specie: 'fs', serie: 'fs',
  parte: 'fs', neve: 'fs', sete: 'fs', fame: 'fs', madre: 'fs', moglie: 'fs',
  // femminili invariabili in -i
  tesi: 'fs', crisi: 'fs', prassi: 'fs', analisi: 'fs', ipotesi: 'fs', sintesi: 'fs',
  // maschili singolari in -e
  potere: 'ms', bene: 'ms', male: 'ms', sapere: 'ms', cuore: 'ms', rumore: 'ms',
  sole: 'ms', mare: 'ms', dolore: 'ms', valore: 'ms', piacere: 'ms', dovere: 'ms',
  padrone: 'ms', capitale: 'ms', giornale: 'ms', pane: 'ms', padre: 'ms',
  nome: 'ms', ordine: 'ms', fiore: 'ms', colore: 'ms', amore: 'ms',
  // plurali
  notti: 'fp', mani: 'fp', donne: 'fp', parole: 'fp', poesie: 'fp', idee: 'fp',
  domande: 'fp', risposte: 'fp', stelle: 'fp', voci: 'fp', menti: 'fp',
  luci: 'fp', arti: 'fp', parti: 'fp', classi: 'fp', leggi: 'fp', chiavi: 'fp',
  uomini: 'mp', occhi: 'mp', giorni: 'mp', anni: 'mp', studi: 'mp',
  articoli: 'mp', libri: 'mp', pensieri: 'mp', sogni: 'mp', soldi: 'mp',
  operai: 'mp', padroni: 'mp', problemi: 'mp', proletari: 'mp', secoli: 'mp'
}));

/**
 * Genere e numero di una parola ripescata, oppure `null` quando non si
 * può stabilirli con certezza. Il `null` non è una resa: è la scelta
 * di non produrre «delle merce». Chi legge non vede il rifiuto — la
 * frase esce lo stesso, con un sostantivo del lessico interno.
 */
function analizza(parola) {
  const dichiarata = DICHIARATE.get(parola);
  if (dichiarata) return { g: dichiarata[0], p: dichiarata[1] === 'p' };
  if (/(zione|sione|ità|età|tù|enza|anza|trice|ezza|logia|grafia)$/.test(parola)) {
    return { g: 'f', p: false };
  }
  if (/o$/.test(parola)) return { g: 'm', p: false };
  if (/a$/.test(parola)) return { g: 'f', p: false };
  // Terminazioni in -e e in -i non dichiarate: troppo ambigue.
  return null;
}

function ripesca(domanda) {
  const parole = (domanda.toLowerCase().match(/[a-zà-ùé]+/g) || [])
    .filter((p) => p.length >= 4 && !FUNZIONALI.has(p));
  if (!parole.length) return null;

  // Si accetta solo ciò di cui si è ragionevolmente certi: una parola
  // riconosciuta (o con un suffisso inequivocabile) di cui si sappiano
  // anche genere e numero.
  for (const parola of parole) {
    if (!NOMI_NOTI.has(parola) && !SUFFISSI_NOME.test(parola)) continue;
    const tratti = analizza(parola);
    if (tratti) return { n: parola, g: tratti.g, p: tratti.p };
  }
  return null;
}

/* ════════════════════════════════════════════════════════════════
   La composizione
   ════════════════════════════════════════════════════════════════ */

const a = (elenco) => elenco[Math.floor(Math.random() * elenco.length)];

/** Come `a`, ma non ripete l'ultimo elemento uscito. */
function diverso(elenco, ultimo) {
  if (elenco.length < 2) return elenco[0];
  let scelto;
  do { scelto = a(elenco); } while (scelto === ultimo);
  return scelto;
}

const maiuscola = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * La risposta scritta a mano per questa domanda, se esiste.
 *
 * Va consultata *prima* del ritrovamento. A «sei un'intelligenza
 * artificiale?» l'indice risponderebbe con i due articoli sull'IA,
 * che è pertinente e insieme sbagliato: la domanda era rivolta a lui,
 * non alla bibliografia. Una battuta mirata batte una citazione
 * calzante.
 */
export function rispostaFissa(domanda) {
  const pulita = String(domanda).toLowerCase().trim();
  for (const [prova, risposta] of FISSE) {
    if (prova.test(pulita)) return risposta;
  }
  return null;
}

export function creaOracolo() {
  let ultimaCoda = null;
  let ultimoVerbo = null;
  const gia = new Set();

  return function rispondi(domanda) {
    const pulita = domanda.toLowerCase().trim();

    // Ripetuto qui di proposito: chi chiama `creaOracolo` da solo deve
    // ottenere un oracolo completo, non uno che funziona a metà perché
    // si aspetta che qualcun altro abbia già fatto il primo controllo.
    const fissa = rispostaFissa(pulita);
    if (fissa) return fissa;

    // Stessa domanda due volte: se ne accorge, e lo fa pesare.
    if (pulita && gia.has(pulita)) {
      gia.delete(pulita);
      return 'La domanda è la stessa. La risposta non poteva esserlo.';
    }
    if (pulita) gia.add(pulita);

    const eco = ripesca(domanda);
    const soggetto = eco || a(POETICI);
    const complemento = a(POETICI);
    const apertura = a(APERTURE);
    const verbo = diverso(VERBI, ultimoVerbo);
    const coda = diverso(CODE, ultimaCoda);
    ultimoVerbo = verbo;
    ultimaCoda = coda;

    const frase = `${conArticolo(apertura)} ${conPreposizione('di', soggetto)} ` +
                  `${verbo.v} ${conPreposizione(verbo.p, complemento)}.`;
    return `${maiuscola(frase)} ${coda}`;
  };
}

/* ════════════════════════════════════════════════════════════════
   L'interfaccia
   ════════════════════════════════════════════════════════════════ */

/** Solo http(s): l'indice lo scriviamo noi, ma un collegamento che
    finisce in un attributo href merita comunque di essere guardato. */
function collegamentoLecito(url) {
  try {
    const p = new URL(url, location.href).protocol;
    return p === 'https:' || p === 'http:';
  } catch (e) {
    return false;
  }
}

/**
 * Costruisce il blocco di una citazione: il brano, e sotto la
 * provenienza. Tutto via textContent — nell'indice ci sono i titoli
 * che ho scritto io, ma l'abitudine di non montare HTML da stringhe
 * è ciò che rende vera la premessa della policy di sicurezza.
 */
function componiBrano(voce, brano) {
  const blocco = document.createElement('blockquote');
  blocco.className = 'au-ia-brano';

  if (brano) {
    const testo = document.createElement('p');
    testo.className = 'au-ia-citazione';
    testo.textContent = `« ${brano} »`;
    blocco.appendChild(testo);
  }

  const firma = document.createElement('cite');
  firma.className = 'au-ia-fonte';

  const titolo = document.createElement('span');
  titolo.className = 'au-ia-fonte-titolo';
  titolo.textContent = voce.t;
  firma.appendChild(titolo);

  const contorno = [voce.f, voce.d].filter(Boolean).join(', ');
  if (contorno) {
    const dettaglio = document.createElement('span');
    dettaglio.className = 'au-ia-fonte-dettaglio';
    dettaglio.textContent = contorno;
    firma.appendChild(dettaglio);
  }

  if (voce.u && collegamentoLecito(voce.u)) {
    const link = document.createElement('a');
    link.className = 'au-ia-fonte-link';
    link.href = voce.u;
    link.target = '_blank';
    // Senza questo la pagina aperta potrebbe manovrare quella di
    // partenza attraverso window.opener.
    link.rel = 'noopener noreferrer';
    link.textContent = 'Leggi →';
    firma.appendChild(link);
  }

  blocco.appendChild(firma);
  return blocco;
}

export function avviaArtificiosa() {
  const modulo = document.getElementById('au-ia-form');
  const campo = document.getElementById('au-ia-input');
  const registro = document.getElementById('au-ia-registro');
  if (!modulo || !campo || !registro) return;

  const straparla = creaOracolo();
  let inCorso = false;

  // L'indice parte al primo segno di interesse, non al caricamento
  // della pagina: chi passa di qui senza chiedere niente non lo
  // scarica mai. Al momento della domanda è quasi sempre già arrivato.
  campo.addEventListener('focus', caricaIndice, { once: true });

  modulo.addEventListener('submit', (evento) => {
    evento.preventDefault();
    if (inCorso) return;

    const domanda = campo.value.trim().slice(0, 240);
    inCorso = true;
    campo.value = '';

    const scambio = document.createElement('div');
    scambio.className = 'au-ia-scambio is-attesa';
    registro.prepend(scambio);

    const d = document.createElement('p');
    d.className = 'au-ia-domanda';
    d.textContent = domanda || '(nessuna domanda)';
    scambio.appendChild(d);

    const r = document.createElement('p');
    r.className = 'au-ia-risposta';
    r.textContent = a(ATTESE);
    scambio.appendChild(r);

    // L'attesa non è un difetto: una risposta istantanea rivelerebbe
    // che dietro non c'è nessuno che pensa. Dietro non c'è nessuno
    // che pensa, ma non è il caso di dirlo subito. Serve anche a
    // coprire il caricamento dell'indice, la prima volta.
    const pausa = new Promise((ok) => window.setTimeout(ok, 700 + Math.random() * 700));

    // Le battute scritte a mano vengono prima di tutto: sono le uniche
    // risposte di questo sito che siano davvero rivolte a chi chiede.
    const fissa = rispostaFissa(domanda);

    Promise.all([fissa ? null : caricaIndice(), pausa]).then(([indice]) => {
      const esiti = indice ? interroga(indice, domanda, 1) : [];

      if (fissa) {
        r.textContent = fissa;
      } else if (esiti.length) {
        const voce = esiti[0].voce;
        const brano = passo(voce, domanda);
        r.textContent = a(brano ? INTRODUZIONI : INDICAZIONI);
        scambio.appendChild(componiBrano(voce, brano));
      } else {
        // Nessun aggancio, o indice irraggiungibile: l'oracolo torna
        // alla sua prima voce, che non ha mai avuto bisogno di dati.
        r.textContent = straparla(domanda);
      }

      scambio.classList.remove('is-attesa');
      inCorso = false;
    });
  });
}
