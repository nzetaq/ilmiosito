/**
 * La veste: lo stile e il modo.
 *
 * Due scelte indipendenti — quali inchiostri, quanta luce — che il
 * foglio di stile combina in diciotto tavolozze. Qui si registrano su
 * <html> e nella memoria del browser; il resto lo fa il CSS.
 *
 * Sono già applicate dallo script del <head>, prima del primo disegno:
 * questo modulo allinea i pulsanti e raccoglie i clic.
 *
 * Le voci non stanno tutte in vista: ciascuna scelta è un pulsante che
 * le apre sotto di sé, come quello della ricerca. Chiuso, il pulsante
 * dice comunque quale voce è in vigore — e quel nome lo scrive questo
 * modulo, perché è il solo momento in cui si sa già quale veste sia
 * stata ricordata.
 */

const ASSI = [
  {
    chiave: 'au-stile',
    attributo: 'data-stile',
    gruppo: '.au-stili',
    voce: '.au-stile',
    apri: 'au-stile-apri',
    valore: 'au-stile-valore'
  },
  {
    chiave: 'au-tema',
    attributo: 'data-tema',
    gruppo: '.au-temi',
    voce: '.au-tema',
    apri: 'au-tema-apri',
    valore: 'au-tema-valore'
  }
];

/* La barra del browser sul telefono prende il colore del fondo. Non è
   scritto in nessuna tabella: si chiede al foglio di stile quale fondo
   sia in vigore, così diciotto combinazioni non diventano diciotto
   valori da tenere allineati a mano. */
function tingiLaBarra() {
  const barra = document.getElementById('au-colore-barra');
  if (!barra) return;
  const fondo = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  if (fondo) barra.setAttribute('content', fondo);
}

export function avviaTema() {
  const radice = document.documentElement;
  let trovato = false;

  /* I due pannelli si conoscono per potersi escludere: aperti insieme
     coprirebbero tutta la colonna dei comandi, e nessuno dei due si
     consulta mentre si consulta l'altro. È lo stesso patto che hanno
     il menù delle sezioni e la veste sugli schermi stretti. */
  const pannelli = [];

  for (const asse of ASSI) {
    const gruppo = document.querySelector(asse.gruppo);
    if (!gruppo) continue;
    trovato = true;

    const pulsanti = [...gruppo.querySelectorAll(asse.voce)];
    const validi = pulsanti.map((p) => p.dataset.valore);
    const apri = document.getElementById(asse.apri);
    const valore = document.getElementById(asse.valore);

    const allinea = () => {
      const corrente = radice.getAttribute(asse.attributo);
      for (const p of pulsanti) {
        const suo = p.dataset.valore === corrente;
        p.setAttribute('aria-pressed', String(suo));
        // Il nome della voce in vigore viene dalla voce stessa: le
        // etichette stanno nei dati del sito, e riscriverle qui
        // sarebbe un secondo elenco da tenere allineato al primo.
        if (suo && valore) valore.textContent = p.textContent.trim();
      }
    };

    allinea();

    const pannello = apri && {
      apri,
      aperto: () => apri.getAttribute('aria-expanded') === 'true',
      disponi: (mostra) => {
        apri.setAttribute('aria-expanded', String(mostra));
        gruppo.hidden = !mostra;
      }
    };

    if (pannello) {
      pannelli.push(pannello);
      apri.addEventListener('click', () => {
        const mostra = !pannello.aperto();
        if (mostra) for (const altro of pannelli) altro.disponi(false);
        pannello.disponi(mostra);
      });
    }

    gruppo.addEventListener('click', (evento) => {
      const pulsante = evento.target.closest(asse.voce);
      if (!pulsante) return;
      const scelto = pulsante.dataset.valore;
      if (validi.indexOf(scelto) === -1) return;

      /* Il cambio va fatto a transizioni spente. Una proprietà in
         transizione non si accorge che è cambiata la variabile che la
         alimenta, e resta al valore vecchio: senza questo, dopo un
         cambio di veste le linguette e i collegamenti conservavano
         l'inchiostro del tema precedente. Il ricalcolo forzato in
         mezzo è ciò che rende il rimedio effettivo. */
      radice.setAttribute('data-vestendo', '');
      radice.setAttribute(asse.attributo, scelto);
      void radice.offsetHeight;
      radice.removeAttribute('data-vestendo');

      allinea();
      tingiLaBarra();

      /* Scelta una voce, il pannello ha finito il suo compito — come
         il menù delle sezioni, che si richiude appena si sceglie dove
         andare. Il fuoco torna al pulsante: chi ha scelto con la
         tastiera resterebbe altrimenti su un elemento appena
         nascosto, e il fuoco cadrebbe in cima al documento. */
      if (pannello) {
        pannello.disponi(false);
        apri.focus();
      }

      try {
        localStorage.setItem(asse.chiave, scelto);
        // La chiave di quando i temi erano due non serve più e
        // resterebbe a contraddire la nuova al prossimo caricamento.
        localStorage.removeItem('au-theme');
      } catch (e) {
        // Archiviazione non disponibile: la scelta vale per questa
        // sessione e non viene ricordata.
      }
    });
  }

  if (pannelli.length) {
    document.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Escape') return;
      for (const pannello of pannelli) {
        if (!pannello.aperto()) continue;
        pannello.disponi(false);
        pannello.apri.focus();
      }
    });

    /* Un clic fuori chiude. Il bersaglio è la scelta intera —
       pulsante e voci — e non i comandi tutti: cliccando sulla lente o
       sui cursori della scala si è già passati ad altro, e un pannello
       di parole rimasto aperto lì sotto è solo ingombro. */
    document.addEventListener('click', (evento) => {
      if (evento.target.closest('.au-scelta')) return;
      for (const pannello of pannelli) pannello.disponi(false);
    });
  }

  // Lo script del <head> gira prima che il foglio di stile sia
  // applicato, e là il colore del fondo non si può ancora leggere:
  // il primo colore giusto della barra si mette qui.
  if (trovato) tingiLaBarra();
}
