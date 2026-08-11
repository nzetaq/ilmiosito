/**
 * La redazione: scrivere un contenuto e depositarlo nel repository.
 *
 * Non c'è un server, e non ce n'è bisogno: l'API di GitHub accetta
 * chiamate dal browser (risponde `access-control-allow-origin: *` e
 * ammette PUT con l'intestazione Authorization), quindi questa pagina
 * scrive i file direttamente e l'azione di pubblicazione fa il resto.
 *
 * Sulla riservatezza conviene essere precisi. Questa pagina è pubblica
 * come tutto il resto del sito: chiunque la apra la vede. Ciò che non
 * ha è la chiave, e senza chiave non fa nulla. «Accessibile solo a me»
 * qui significa «inerte per chiunque altro», non «invisibile»: su un
 * sito statico la seconda cosa non esiste.
 *
 * La chiave è un token a grana fine, valido su questo solo repository
 * e sui soli contenuti, e vive in `localStorage`. È il punto debole
 * dichiarato: se un giorno finisse del codice ostile in questa pagina,
 * potrebbe leggerlo. A difendere quella porta c'è la Content Security
 * Policy, che qui si allarga alla sola api.github.com.
 *
 * Lo schema dei campi non è ripetuto qui: sta in `_data/redazione.json`,
 * da cui il template genera i gruppi di campi, e questo modulo li legge
 * dal documento. Una sezione nuova si descrive in un posto solo.
 */

const REPO = 'nzetaq/ilmiosito';
const RAMO = 'main';
const CHIAVE = 'au-scrivi-token';
const RADICE_CONTENUTI = 'src/content';
const RADICE_BOZZE = 'bozze';

/* ── Utilità ───────────────────────────────────────────────── */

/** Base64 di un testo UTF-8: `btoa` da solo si ferma al primo accento. */
function inBase64(testo) {
  const byte = new TextEncoder().encode(testo);
  let grezzo = '';
  for (const b of byte) grezzo += String.fromCharCode(b);
  return btoa(grezzo);
}

function daBase64(base64) {
  const grezzo = atob(base64.replace(/\s/g, ''));
  const byte = Uint8Array.from(grezzo, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(byte);
}

/** Titolo → nome di file: minuscole, senza accenti, parole unite da trattini. */
function inSegnatura(testo) {
  return String(testo)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Una stringa dentro il front matter: le virgolette vanno protette. */
function inYaml(valore) {
  return '"' + String(valore).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

/**
 * La data di oggi secondo l'orologio di chi scrive, non di Greenwich.
 *
 * `toISOString()` dà l'ora UTC, e in Italia siamo avanti di una o due
 * ore: scrivendo dopo le ventidue — cioè fin troppo spesso — il pezzo
 * si ritrovava datato al giorno prima, finiva sotto al precedente
 * nell'elenco, e portava sul sito una data che non era quella in cui
 * era stato scritto.
 */
function oggi() {
  const d = new Date();
  const due = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
}

/**
 * L'istante preciso, col fuso di chi scrive: `2026-08-09T01:20:00+02:00`.
 *
 * La sola data non basta a ordinare due pezzi dello stesso giorno, e
 * due pezzi nello stesso giorno capitano. Questo campo non si mostra
 * da nessuna parte: serve solo a sapere quale dei due viene prima.
 */
function adesso() {
  const d = new Date();
  const due = (n) => String(n).padStart(2, '0');
  const scarto = -d.getTimezoneOffset();
  const segno = scarto >= 0 ? '+' : '-';
  const ore = due(Math.floor(Math.abs(scarto) / 60));
  const minuti = due(Math.abs(scarto) % 60);
  return `${oggi()}T${due(d.getHours())}:${due(d.getMinutes())}:${due(d.getSeconds())}` +
         `${segno}${ore}:${minuti}`;
}

/* ── Dialogo con GitHub ────────────────────────────────────── */

function creaSportello(token) {
  async function chiedi(percorso, opzioni = {}) {
    const risposta = await fetch(`https://api.github.com/repos/${REPO}/${percorso}`, {
      ...opzioni,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opzioni.body ? { 'Content-Type': 'application/json' } : {})
      }
    });
    if (risposta.status === 404) return null;
    if (!risposta.ok) {
      const dettaglio = await risposta.json().catch(() => ({}));
      throw new Error(dettaglio.message || `GitHub ha risposto ${risposta.status}`);
    }
    return risposta.status === 204 ? true : risposta.json();
  }

  return {
    elenca: (cartella) => chiedi(`contents/${cartella}?ref=${RAMO}`),
    leggi: (percorso) => chiedi(`contents/${percorso}?ref=${RAMO}`),
    scrivi: (percorso, testo, messaggio, sha) => chiedi(`contents/${percorso}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: messaggio,
        content: inBase64(testo),
        branch: RAMO,
        ...(sha ? { sha } : {})
      })
    }),
    cancella: (percorso, sha, messaggio) => chiedi(`contents/${percorso}`, {
      method: 'DELETE',
      body: JSON.stringify({ message: messaggio, sha, branch: RAMO })
    })
  };
}

/* ── Front matter ──────────────────────────────────────────── */

function componiFile(campi, corpo) {
  const righe = ['---'];
  for (const [chiave, valore, tipo] of campi) {
    if (valore === '' || valore == null) continue;
    righe.push(`${chiave}: ${tipo === 'numero' ? Number(valore) : inYaml(valore)}`);
  }
  righe.push('---', '', corpo.replace(/\s+$/, ''), '');
  return righe.join('\n');
}

/** Separa il front matter dal corpo. Ritorna `null` se non c'è. */
function scomponiFile(testo) {
  const trovato = testo.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!trovato) return null;
  const valori = {};
  for (const riga of trovato[1].split(/\r?\n/)) {
    const coppia = riga.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!coppia) continue;
    let v = coppia[2].trim();
    if (/^".*"$/.test(v)) v = v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    valori[coppia[1]] = v;
  }
  return { valori, corpo: trovato[2].replace(/^\n+/, '') };
}

/* ── Resa del Markdown ─────────────────────────────────────
   L'anteprima interpreta la sintassi, ma non passa mai da `innerHTML`:
   costruisce nodi con createElement e ci mette il testo con
   textContent. È la differenza che conta su una pagina che custodisce
   un token — non esiste stringa che possa diventare HTML, perché
   nessuna stringa viene mai letta come HTML.

   Gli indirizzi dei collegamenti sono l'unico punto in cui un valore
   scritto da chi compone finisce in un attributo: passano solo se
   cominciano per http o https, altrimenti restano testo. */

const SCHEMI_LECITI = /^https?:\/\//i;

const INLINE = /(\*\*|__)([\s\S]+?)\1|(\*|_)([\s\S]+?)\3|`([^`]+)`|\[([^\]]*)\]\(([^)\s]+)\)/;

/** Il contenuto di una riga: grassetti, corsivi, codice, collegamenti. */
function inLinea(testo) {
  const frammento = document.createDocumentFragment();
  let resto = testo;

  while (resto) {
    const trovato = INLINE.exec(resto);
    if (!trovato) {
      frammento.appendChild(document.createTextNode(resto));
      break;
    }

    // Il trattino basso dentro una parola non è un corsivo: `nome_file`
    // resta `nome_file`, come in qualunque Markdown serio.
    const segno = trovato[1] || trovato[3];
    if (segno === '_' || segno === '__') {
      const prima = resto[trovato.index - 1];
      const dopo = resto[trovato.index + trovato[0].length];
      if ((prima && /[A-Za-z0-9]/.test(prima)) || (dopo && /[A-Za-z0-9]/.test(dopo))) {
        frammento.appendChild(document.createTextNode(resto.slice(0, trovato.index + trovato[0].length)));
        resto = resto.slice(trovato.index + trovato[0].length);
        continue;
      }
    }

    if (trovato.index) frammento.appendChild(document.createTextNode(resto.slice(0, trovato.index)));

    if (trovato[1]) {
      const forte = document.createElement('strong');
      forte.appendChild(inLinea(trovato[2]));
      frammento.appendChild(forte);
    } else if (trovato[3]) {
      const corsivo = document.createElement('em');
      corsivo.appendChild(inLinea(trovato[4]));
      frammento.appendChild(corsivo);
    } else if (trovato[5] != null) {
      const codice = document.createElement('code');
      codice.textContent = trovato[5];
      frammento.appendChild(codice);
    } else if (SCHEMI_LECITI.test(trovato[7])) {
      const link = document.createElement('a');
      link.href = trovato[7];
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.appendChild(inLinea(trovato[6]));
      frammento.appendChild(link);
    } else {
      // Indirizzo non ammesso: si mostra com'è scritto, senza diventare
      // un collegamento su cui si possa cliccare.
      frammento.appendChild(document.createTextNode(trovato[0]));
    }

    resto = resto.slice(trovato.index + trovato[0].length);
  }
  return frammento;
}

/**
 * Il testo intero, diviso in blocchi.
 *
 * `versi` cambia tutto, e deve: per le poesie il sito **non** interpreta
 * il Markdown. La lente mostra il testo grezzo e il filtro `versi` in
 * eleventy.config.js si limita a togliere i segni di enfasi. Renderle
 * in corsivo qui sarebbe un'anteprima che mente.
 */
function componiTesto(testo, versi) {
  const frammento = document.createDocumentFragment();

  for (const blocco of testo.split(/\n\s*\n/)) {
    if (!blocco.trim()) continue;

    if (versi) {
      const strofa = document.createElement('p');
      strofa.textContent = blocco.trim().replace(/[*_`]/g, '');
      frammento.appendChild(strofa);
      continue;
    }

    const righe = blocco.split('\n').filter((r) => r.trim());

    const titolo = righe[0].match(/^(#{1,6})\s+(.*)$/);
    if (titolo && righe.length === 1) {
      const h = document.createElement('h' + Math.min(6, titolo[1].length + 2));
      h.appendChild(inLinea(titolo[2]));
      frammento.appendChild(h);
      continue;
    }

    if (righe.every((r) => /^>\s?/.test(r))) {
      const citazione = document.createElement('blockquote');
      const p = document.createElement('p');
      p.appendChild(inLinea(righe.map((r) => r.replace(/^>\s?/, '')).join(' ')));
      citazione.appendChild(p);
      frammento.appendChild(citazione);
      continue;
    }

    const puntato = righe.every((r) => /^\s*[-*+]\s+/.test(r));
    const numerato = righe.every((r) => /^\s*\d+[.)]\s+/.test(r));
    if (puntato || numerato) {
      const elenco = document.createElement(numerato ? 'ol' : 'ul');
      for (const r of righe) {
        const voce = document.createElement('li');
        voce.appendChild(inLinea(r.replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')));
        elenco.appendChild(voce);
      }
      frammento.appendChild(elenco);
      continue;
    }

    // Paragrafo. Le andate a capo singole si uniscono con uno spazio,
    // come fa il Markdown del sito: l'anteprima deve somigliare al
    // risultato, non al file.
    const p = document.createElement('p');
    p.appendChild(inLinea(righe.join(' ')));
    frammento.appendChild(p);
  }
  return frammento;
}

/* ── La pagina ─────────────────────────────────────────────── */

export function avviaScrivi() {
  const el = (id) => document.getElementById(id);
  const stato = el('au-stato');
  const modulo = el('au-modulo');
  const scelta = el('au-sezione');
  if (!modulo || !scelta) return;

  let sportello = null;
  /* Il file che si sta riprendendo, se ce n'è uno. Due specie, e la
     differenza conta:
       una BOZZA, pubblicandola, va rimossa — resterebbe un doppione;
       un PUBBLICATO, risalvandolo, va sovrascritto dov'è.
     `extra` porta i campi del front matter che il modulo non mostra —
     `istante` sopra tutti. Senza, riaprire un pezzo del giornale e
     risalvarlo gli darebbe l'ora di adesso, e il pezzo salterebbe in
     cima all'elenco come se fosse appena uscito. */
  let aperto = null;   // { percorso, sha, pubblicato, extra }

  function annuncia(testo, tipo = '') {
    stato.textContent = testo;
    stato.className = 'au-scrivi-stato' + (tipo ? ' is-' + tipo : '');
  }

  /**
   * L'esito di un deposito, scritto accanto ai pulsanti.
   *
   * In cima alla pagina c'è già una riga di stato, ma fra quella e i
   * pulsanti corrono più di mille pixel: la conferma finiva fuori
   * dallo schermo di chi aveva appena premuto, e sembrava che non
   * fosse successo niente.
   */
  function esito(testo, tipo = '', indirizzo = '') {
    const riga = el('au-esito');
    riga.textContent = testo;
    riga.className = 'au-scrivi-esito' + (tipo ? ' is-' + tipo : '');
    if (indirizzo && /^https:\/\//.test(indirizzo)) {
      riga.appendChild(document.createTextNode(' '));
      const link = document.createElement('a');
      link.href = indirizzo;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'au-scrivi-link';
      link.textContent = 'Guarda il file →';
      riga.appendChild(link);
    }
  }

  /* I pulsanti si spengono appena hanno fatto il loro, e si riaccendono
     alla prima modifica: finché il testo è quello già depositato, non
     c'è niente da depositare di nuovo. */
  function riabilita() {
    el('au-pubblica').disabled = false;
    el('au-bozza').disabled = false;
    el('au-nuovo').hidden = true;
    esito('');
  }

  /** Svuota i campi della sezione corrente per ricominciare da capo. */
  function svuota() {
    const g = gruppo();
    for (const ingresso of campiDi(g)) {
      ingresso.value = ingresso.dataset.predefinito || '';
      delete ingresso.dataset.toccato;
    }
    aperto = null;
    el('au-sposta-riga').hidden = true;
    el('au-sposta').checked = false;
    el('au-pubblica').textContent = 'Pubblica';
    riabilita();
    preimposta(g);
    aggiornaPercorso();
    aggiornaAnteprima();
    if (sportello) raccogliSuggerimenti(g).catch(() => {});
    const primo = campiDi(g)[0];
    if (primo) primo.focus();
  }

  const gruppo = () => document.querySelector(`.au-scrivi-gruppo[data-sez="${scelta.value}"]`);
  const campiDi = (g) => [...g.querySelectorAll('[data-campo]')];
  const campo = (g, nome) => g.querySelector(`[data-campo="${nome}"]`);

  /* ── Nome del file e percorso ── */
  function percorsoDi(g, dentroBozze) {
    const titolo = (campo(g, 'titolo') || {}).value || '';
    const segnatura = inSegnatura(titolo) || 'senza-titolo';
    const data = (campo(g, 'data') || {}).value || '';
    const nome = g.dataset.nomeFile === 'data-slug' && data
      ? `${data}-${segnatura}.md`
      : `${segnatura}.md`;
    const radice = dentroBozze ? `${RADICE_BOZZE}/${g.dataset.cartella}` : `${RADICE_CONTENUTI}/${g.dataset.cartella}`;
    return `${radice}/${nome}`;
  }

  function aggiornaPercorso() {
    const g = gruppo();
    if (!g) return;
    el('au-percorso').textContent = 'Finirà in  ' + percorsoDi(g, false);
  }

  /* ── Anteprima ──
     Mostra il testo come lo mostrerà il sito, sezione per sezione: con
     la formattazione dove il sito la rende, grezzo dove il sito lo
     lascia grezzo. La resa è in `componiTesto`, che costruisce nodi e
     non tocca mai `innerHTML`. */
  function aggiornaAnteprima() {
    const g = gruppo();
    if (!g) return;
    const area = campo(g, 'corpo');
    const versi = area.dataset.preserva === '1';
    const resa = el('au-anteprima');
    resa.textContent = '';
    resa.classList.toggle('is-versi', versi);
    resa.appendChild(componiTesto(area.value, versi));
    el('au-anteprima-blocco').hidden = !area.value.trim();
    el('au-anteprima-nota').textContent = versi
      ? 'In questa sezione il sito non interpreta il Markdown: la lente mostra i versi come li scrivi, e i segni di enfasi vengono tolti. L\'anteprima fa lo stesso.'
      : 'Corsivo, grassetto, codice, collegamenti, titoli ed elenchi sono resi come li renderà il sito.';
  }

  /* ── Suggerimenti dalla cartella ──
     Legge i file già presenti nella sezione per proporre le fonti e i
     gruppi esistenti, e per calcolare l'ordine successivo. È la parte
     noiosa che l'editor esiste per togliere di mezzo. */
  /**
   * I valori che si possono mettere senza chiedere niente a nessuno.
   *
   * Stavano dentro `raccogliSuggerimenti`, e dipendevano quindi dal
   * fatto che l'elenco della cartella arrivasse: con una cartella vuota
   * — o appena creata — la data restava vuota, la validazione la dava
   * per mancante e il deposito si fermava senza dire perché. Una data
   * di oggi non ha nulla a che vedere con ciò che c'è nella cartella.
   */
  function preimposta(g) {
    for (const ingresso of campiDi(g)) {
      if (ingresso.value) continue;
      if (ingresso.dataset.auto === 'oggi') {
        ingresso.value = ingresso.dataset.tipo === 'mese' ? oggi().slice(0, 7) : oggi();
        ingresso.dataset.automatico = '1';
      }
      if (ingresso.dataset.auto === 'successivo') {
        ingresso.value = '1';
        ingresso.dataset.automatico = '1';
      }
    }
  }

  async function raccogliSuggerimenti(g) {
    const voci = await sportello.elenca(`${RADICE_CONTENUTI}/${g.dataset.cartella}`);
    if (!Array.isArray(voci)) {
      annuncia('La cartella è vuota o non esiste ancora: nessun suggerimento.');
      return;
    }

    const testi = await Promise.all(
      voci.filter((v) => v.name.endsWith('.md'))
        .map((v) => sportello.leggi(v.path).then((f) => (f && f.content ? daBase64(f.content) : '')))
    );
    const frontMatter = testi.map(scomponiFile).filter(Boolean).map((x) => x.valori);

    for (const ingresso of campiDi(g)) {
      const nome = ingresso.dataset.campo;

      if (ingresso.list) {
        ingresso.list.textContent = '';
        for (const v of [...new Set(frontMatter.map((f) => f[nome]).filter(Boolean))]) {
          const o = document.createElement('option');
          o.value = v;
          ingresso.list.appendChild(o);
        }
      }

      // L'ordine si affina con ciò che c'è davvero nella cartella, ma
      // solo se nessuno l'ha ancora scritto a mano.
      if (ingresso.dataset.auto === 'successivo' && ingresso.dataset.automatico === '1') {
        const numeri = frontMatter.map((f) => Number(f[nome])).filter((n) => !Number.isNaN(n));
        ingresso.value = String(numeri.length ? Math.max(...numeri) + 1 : 1);
      }
    }
    annuncia(`${frontMatter.length} voci già presenti in questa sezione.`);
  }

  function mostraGruppo() {
    for (const g of document.querySelectorAll('.au-scrivi-gruppo')) {
      g.hidden = g.dataset.sez !== scelta.value;
    }
    aperto = null;
    el('au-sposta-riga').hidden = true;
    el('au-sposta').checked = false;
    el('au-pubblica').textContent = 'Pubblica';
    el('au-bozza').textContent = 'Salva come bozza';
    riabilita();
    preimposta(gruppo());
    aggiornaPercorso();
    aggiornaAnteprima();
    if (sportello) raccogliSuggerimenti(gruppo()).catch((e) => annuncia(e.message, 'guaio'));
  }

  /* ── Composizione e deposito ── */
  function raccogli(g) {
    const campi = [];
    let corpo = '';
    for (const ingresso of campiDi(g)) {
      if (ingresso.dataset.campo === 'corpo') { corpo = ingresso.value; continue; }
      campi.push([ingresso.dataset.campo, ingresso.value.trim(), ingresso.dataset.tipo]);
    }
    return { campi, corpo };
  }

  function mancanti(g) {
    return campiDi(g)
      .filter((i) => i.closest('.au-scrivi-voce').querySelector('.au-scrivi-obbligo') && !i.value.trim())
      .map((i) => i.dataset.campo);
  }

  async function deposita(dentroBozze) {
    const g = gruppo();
    const vuoti = mancanti(g);
    if (vuoti.length) {
      // Anche questo va scritto accanto ai pulsanti: è il momento in cui
      // ci si aspetta una risposta, e in cima alla pagina non si vede.
      esito('Mancano: ' + vuoti.join(', '), 'guaio');
      annuncia('Mancano: ' + vuoti.join(', '), 'guaio');
      const primo = campiDi(g).find((i) => i.dataset.campo === vuoti[0]);
      if (primo) primo.focus();
      return;
    }

    const { campi, corpo } = raccogli(g);

    /* I campi che il modulo non mostra tornano nel file come erano.
       Vale soprattutto per `istante`: riscriverlo a ogni salvataggio
       farebbe risalire in cima all'elenco un pezzo di mesi fa, appena
       gli si corregge una virgola.

       Con un'eccezione: l'istante deve seguire la data. Se qualcuno
       ridata un pezzo, tenergli l'istante vecchio lo farebbe finire
       sotto a tutti quelli del giorno nuovo — perché è proprio
       l'istante a sciogliere i pari merito. */
    if (aperto && aperto.extra) {
      const giorno = (campi.find((c) => c[0] === 'data') || [, ''])[1];
      for (const [nome, valore] of Object.entries(aperto.extra)) {
        if (campi.some((c) => c[0] === nome)) continue;
        if (nome === 'istante' && giorno && !String(valore).startsWith(giorno)) continue;
        campi.push([nome, valore, 'testo']);
      }
    }

    // Nelle sezioni ordinate per data si annota anche l'istante: è
    // l'unica cosa che distingue due pezzi dello stesso giorno.
    if (g.dataset.cronologico === '1' && !campi.some((c) => c[0] === 'istante')) {
      campi.push(['istante', adesso(), 'testo']);
    }
    if (!corpo.trim()) {
      esito('Il testo è vuoto.', 'guaio');
      annuncia('Il testo è vuoto.', 'guaio');
      campo(g, 'corpo').focus();
      return;
    }

    /* Dove va a finire. Un pezzo già pubblicato resta al proprio
       indirizzo anche se il titolo è cambiato: quell'indirizzo è ciò
       che i collegamenti altrui si aspettano di trovare, e cambiarlo
       di nascosto li romperebbe tutti. Si sposta solo su richiesta
       esplicita, con la casella qui sotto ai pulsanti. */
    const calcolato = percorsoDi(g, dentroBozze);
    const sposta = el('au-sposta').checked;
    const percorso = (aperto && aperto.pubblicato && !dentroBozze && !sposta)
      ? aperto.percorso
      : calcolato;
    annuncia('Deposito…');

    const pulsante = el(dentroBozze ? 'au-bozza' : 'au-pubblica');
    const etichetta = pulsante.textContent;
    pulsante.disabled = true;
    pulsante.textContent = 'Un momento…';
    esito('');

    try {
      // Se il file esiste già lo si sovrascrive, ma serve il suo `sha`:
      // GitHub lo chiede per essere certo che non si stia cancellando
      // una versione più recente senza saperlo.
      const esistente = await sportello.leggi(percorso);
      const scritto = await sportello.scrivi(
        percorso,
        componiFile(campi, corpo),
        (dentroBozze ? 'Bozza: ' : 'Aggiungo ') + (campi.find((c) => c[0] === 'titolo') || [, ''])[1],
        esistente && esistente.sha
      );

      // Pubblicando una bozza, la bozza sparisce: altrimenti resterebbe
      // un doppione che invecchia.
      if (!dentroBozze && aperto && !aperto.pubblicato) {
        await sportello.cancella(aperto.percorso, aperto.sha, 'Bozza pubblicata');
        aperto = null;
      } else if (!dentroBozze && aperto && aperto.pubblicato && percorso !== aperto.percorso) {
        // Spostato per scelta: il file vecchio va tolto, altrimenti il
        // pezzo comparirebbe due volte nel sito.
        await sportello.cancella(aperto.percorso, aperto.sha, 'Spostato in ' + percorso);
        aperto = { ...aperto, percorso, sha: (scritto && scritto.content && scritto.content.sha) || null };
        el('au-sposta').checked = false;
        el('au-sposta-riga').hidden = true;
      } else if (!dentroBozze && aperto && aperto.pubblicato) {
        // Risalvato dov'era: serve il nuovo sha per un eventuale
        // salvataggio successivo senza ricaricare la pagina.
        aperto = { ...aperto, sha: (scritto && scritto.content && scritto.content.sha) || null };
      }

      const dove = scritto && scritto.content && scritto.content.html_url;
      const verbo = esistente ? 'aggiornata' : 'salvata';
      esito(dentroBozze
        ? `Bozza ${verbo} in ${percorso}. Resta fuori dal sito: Eleventy legge solo src/.`
        : `${esistente ? 'Aggiornato' : 'Pubblicato'} in ${percorso}. In linea fra un minuto circa.`,
        'fatto', dove);
      annuncia(dentroBozze ? 'Bozza salvata.' : 'Pubblicato.', 'fatto');

      // Resta spento finché non si cambia qualcosa: è la prova che ciò
      // che si vede sullo schermo è già depositato.
      pulsante.textContent = dentroBozze ? 'Bozza salvata ✓' : 'Pubblicato ✓';
      if (!dentroBozze) el('au-nuovo').hidden = false;
    } catch (e) {
      pulsante.disabled = false;
      pulsante.textContent = etichetta;
      esito(e.message, 'guaio');
      annuncia(e.message, 'guaio');
    }
  }

  /* ── Riaprire ──
     Le bozze e i pezzi pubblicati si riaprono con lo stesso gesto: si
     sceglie un file da un elenco e i suoi campi tornano nel modulo.
     Cambia la cartella da cui si legge, e cambia cosa succede al
     salvataggio — una bozza pubblicata sparisce, un pezzo pubblicato
     si sovrascrive dov'è. */
  async function apriElenco(pubblicati) {
    // Senza chiave non c'è nulla da elencare. Il modulo è nascosto
    // finché non si entra, quindi non dovrebbe accadere — ma un errore
    // grezzo del motore, se accadesse, non direbbe niente a nessuno.
    if (!sportello) {
      annuncia('Serve la chiave.', 'guaio');
      return;
    }
    const g = gruppo();
    const elenco = el('au-bozze-voci');
    elenco.textContent = '';
    el('au-elenco-titolo').textContent = pubblicati ? 'Pezzi pubblicati' : 'Bozze';

    const radice = pubblicati ? RADICE_CONTENUTI : RADICE_BOZZE;
    let voci = null;
    try {
      voci = await sportello.elenca(`${radice}/${g.dataset.cartella}`);
    } catch (e) {
      annuncia(e.message, 'guaio');
      return;
    }

    const file = Array.isArray(voci) ? voci.filter((v) => v.name.endsWith('.md')) : [];
    // Dal più recente: nelle sezioni datate il nome del file comincia
    // con la data, e ciò che si vuole ritoccare è quasi sempre l'ultimo.
    file.sort((a, b) => b.name.localeCompare(a.name));

    if (!file.length) {
      const vuoto = document.createElement('li');
      vuoto.textContent = pubblicati
        ? 'Nessun pezzo pubblicato in questa sezione.'
        : 'Nessuna bozza in questa sezione.';
      elenco.appendChild(vuoto);
    }
    for (const v of file) {
      const riga = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'au-scrivi-bottone au-scrivi-bottone--muto';
      b.textContent = v.name;
      b.addEventListener('click', () => carica(v.path, pubblicati));
      riga.appendChild(b);
      elenco.appendChild(riga);
    }
    el('au-elenco-bozze').showModal();
  }

  /* Quando il titolo di un pezzo pubblicato cambia al punto da
     cambiarne l'indirizzo, non si decide da soli: si mostra la casella
     e si dice cosa comporta spuntarla. */
  function controllaIndirizzo() {
    const riga = el('au-sposta-riga');
    if (!aperto || !aperto.pubblicato) {
      riga.hidden = true;
      return;
    }
    const calcolato = percorsoDi(gruppo(), false);
    if (!calcolato || calcolato === aperto.percorso) {
      riga.hidden = true;
      el('au-sposta').checked = false;
      return;
    }
    el('au-sposta-testo').textContent =
      `Sposta anche il file: da ${aperto.percorso} a ${calcolato}. ` +
      'L\'indirizzo pubblico del pezzo cambia, e i collegamenti al vecchio si rompono.';
    riga.hidden = false;
  }

  async function carica(percorso, pubblicato) {
    try {
      const file = await sportello.leggi(percorso);
      const pezzi = scomponiFile(daBase64(file.content));
      if (!pezzi) throw new Error('Il file non ha un front matter leggibile.');

      const g = gruppo();
      const mostrati = new Set(campiDi(g).map((i) => i.dataset.campo));
      for (const ingresso of campiDi(g)) {
        const nome = ingresso.dataset.campo;
        ingresso.value = nome === 'corpo' ? pezzi.corpo : (pezzi.valori[nome] || '');
        delete ingresso.dataset.automatico;
      }

      // Tutto ciò che il modulo non sa mostrare viene messo da parte e
      // riscritto tale e quale al salvataggio.
      const extra = {};
      for (const [nome, valore] of Object.entries(pezzi.valori)) {
        if (!mostrati.has(nome)) extra[nome] = valore;
      }

      aperto = { percorso, sha: file.sha, pubblicato, extra };
      el('au-elenco-bozze').close();
      el('au-pubblica').textContent = pubblicato ? 'Aggiorna il pezzo' : 'Pubblica';
      riabilita();
      aggiornaPercorso();
      aggiornaAnteprima();
      controllaIndirizzo();
      annuncia(pubblicato
        ? `Pezzo ripreso da ${percorso}. Salvando, si sovrascrive lì: l'indirizzo pubblico non cambia.`
        : `Bozza ripresa da ${percorso}. Pubblicandola, la bozza viene rimossa.`);
    } catch (e) {
      annuncia(e.message, 'guaio');
    }
  }

  /* ── La chiave ── */
  async function entra(token) {
    sportello = creaSportello(token);
    annuncia('Verifico la chiave…');
    try {
      const repo = await sportello.leggi('README.md');
      if (!repo) throw new Error('Il repository non risponde.');
    } catch (e) {
      sportello = null;
      annuncia('La chiave non va: ' + e.message, 'guaio');
      return;
    }
    try { localStorage.setItem(CHIAVE, token); } catch (e) {}
    el('au-token').value = '';
    el('au-token').hidden = true;
    el('au-entra').hidden = true;
    el('au-esci').hidden = false;
    modulo.hidden = false;
    annuncia('Chiave riconosciuta.', 'fatto');
    mostraGruppo();
  }

  el('au-entra').addEventListener('click', () => {
    const token = el('au-token').value.trim();
    if (token) entra(token);
  });

  el('au-esci').addEventListener('click', () => {
    try { localStorage.removeItem(CHIAVE); } catch (e) {}
    location.reload();
  });

  scelta.addEventListener('change', mostraGruppo);
  el('au-pubblica').addEventListener('click', () => deposita(false));
  el('au-pubblicati').addEventListener('click', () => apriElenco(true));
  el('au-bozza').addEventListener('click', () => deposita(true));
  el('au-bozze').addEventListener('click', () => apriElenco(false));
  el('au-chiudi-bozze').addEventListener('click', () => el('au-elenco-bozze').close());

  el('au-nuovo').addEventListener('click', () => {
    el('au-pubblica').textContent = 'Pubblica';
    el('au-bozza').textContent = 'Salva come bozza';
    svuota();
  });

  modulo.addEventListener('input', (e) => {
    const ingresso = e.target;
    if (!ingresso.dataset || !ingresso.dataset.campo) return;

    // Prima modifica dopo un deposito: i pulsanti tornano validi.
    if (el('au-pubblica').disabled || el('au-bozza').disabled) {
      el('au-pubblica').textContent =
        aperto && aperto.pubblicato ? 'Aggiorna il pezzo' : 'Pubblica';
      el('au-bozza').textContent = 'Salva come bozza';
      riabilita();
    }
    // L'identificativo del filtro si scrive da sé mentre si scrive la
    // fonte, finché non lo si tocca a mano.
    const g = gruppo();
    for (const altro of campiDi(g)) {
      if (altro.dataset.derivaDa === ingresso.dataset.campo && !altro.dataset.toccato) {
        altro.value = inSegnatura(ingresso.value);
      }
    }
    if (ingresso.dataset.derivaDa === undefined && ingresso.dataset.campo !== 'corpo') {
      aggiornaPercorso();
      // Il titolo può aver cambiato l'indirizzo che il pezzo avrebbe:
      // la casella per spostarlo compare o sparisce di conseguenza.
      controllaIndirizzo();
    }
    if (ingresso.dataset.campo === 'corpo') aggiornaAnteprima();
    if (ingresso.dataset.derivaDa) ingresso.dataset.toccato = '1';
    delete ingresso.dataset.automatico;
  });

  // Chiave già in casa: si entra da soli.
  let ricordata = null;
  try { ricordata = localStorage.getItem(CHIAVE); } catch (e) {}
  if (ricordata) entra(ricordata);
  else annuncia('Serve la chiave.');
}

avviaScrivi();
