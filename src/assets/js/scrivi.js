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

const oggi = () => new Date().toISOString().slice(0, 10);

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

/* ── La pagina ─────────────────────────────────────────────── */

export function avviaScrivi() {
  const el = (id) => document.getElementById(id);
  const stato = el('au-stato');
  const modulo = el('au-modulo');
  const scelta = el('au-sezione');
  if (!modulo || !scelta) return;

  let sportello = null;
  let bozzaAperta = null;   // { percorso, sha } quando si sta riprendendo una bozza

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
    bozzaAperta = null;
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
     Divide in paragrafi e conserva le andate a capo, cioè esattamente
     quello che il sito fa del testo. Non interpreta la sintassi
     Markdown: costruirla a mano vorrebbe dire montare HTML da una
     stringa, che è il modo in cui si aprono i buchi. Meglio
     un'anteprima onesta e parziale che una completa e pericolosa. */
  function aggiornaAnteprima() {
    const g = gruppo();
    if (!g) return;
    const area = campo(g, 'corpo');
    const resa = el('au-anteprima');
    resa.textContent = '';
    resa.classList.toggle('is-versi', area.dataset.preserva === '1');
    for (const blocco of area.value.split(/\n\s*\n/)) {
      if (!blocco.trim()) continue;
      const p = document.createElement('p');
      p.textContent = blocco.trim();
      resa.appendChild(p);
    }
    el('au-anteprima-blocco').hidden = !area.value.trim();
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
    bozzaAperta = null;
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
    if (!corpo.trim()) {
      esito('Il testo è vuoto.', 'guaio');
      annuncia('Il testo è vuoto.', 'guaio');
      campo(g, 'corpo').focus();
      return;
    }

    const percorso = percorsoDi(g, dentroBozze);
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
      if (!dentroBozze && bozzaAperta) {
        await sportello.cancella(bozzaAperta.percorso, bozzaAperta.sha, 'Bozza pubblicata');
        bozzaAperta = null;
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

  /* ── Bozze ── */
  async function apriBozze() {
    const g = gruppo();
    const elenco = el('au-bozze-voci');
    elenco.textContent = '';
    let voci = null;
    try {
      voci = await sportello.elenca(`${RADICE_BOZZE}/${g.dataset.cartella}`);
    } catch (e) {
      annuncia(e.message, 'guaio');
      return;
    }
    const file = Array.isArray(voci) ? voci.filter((v) => v.name.endsWith('.md')) : [];
    if (!file.length) {
      const vuoto = document.createElement('li');
      vuoto.textContent = 'Nessuna bozza in questa sezione.';
      elenco.appendChild(vuoto);
    }
    for (const v of file) {
      const riga = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'au-scrivi-bottone au-scrivi-bottone--muto';
      b.textContent = v.name;
      b.addEventListener('click', () => caricaBozza(v.path));
      riga.appendChild(b);
      elenco.appendChild(riga);
    }
    el('au-elenco-bozze').showModal();
  }

  async function caricaBozza(percorso) {
    try {
      const file = await sportello.leggi(percorso);
      const pezzi = scomponiFile(daBase64(file.content));
      if (!pezzi) throw new Error('La bozza non ha un front matter leggibile.');
      const g = gruppo();
      for (const ingresso of campiDi(g)) {
        const nome = ingresso.dataset.campo;
        ingresso.value = nome === 'corpo' ? pezzi.corpo : (pezzi.valori[nome] || '');
      }
      bozzaAperta = { percorso, sha: file.sha };
      el('au-elenco-bozze').close();
      aggiornaPercorso();
      aggiornaAnteprima();
      annuncia(`Bozza ripresa da ${percorso}. Pubblicandola, la bozza viene rimossa.`);
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
  el('au-bozza').addEventListener('click', () => deposita(true));
  el('au-bozze').addEventListener('click', apriBozze);
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
      el('au-pubblica').textContent = 'Pubblica';
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
    if (ingresso.dataset.derivaDa === undefined && ingresso.dataset.campo !== 'corpo') aggiornaPercorso();
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
