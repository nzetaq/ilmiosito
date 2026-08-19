/**
 * La veste: lo stile e il modo.
 *
 * Due scelte indipendenti — quali inchiostri, quanta luce — che il
 * foglio di stile combina in quindici tavolozze. Qui si registrano su
 * <html> e nella memoria del browser; il resto lo fa il CSS.
 *
 * Sono già applicate dallo script del <head>, prima del primo disegno:
 * questo modulo allinea i pulsanti e raccoglie i clic.
 */

const ASSI = [
  { chiave: 'au-stile', attributo: 'data-stile', gruppo: '.au-stili', voce: '.au-stile' },
  { chiave: 'au-tema', attributo: 'data-tema', gruppo: '.au-temi', voce: '.au-tema' }
];

/* La barra del browser sul telefono prende il colore del fondo. Non è
   scritto in nessuna tabella: si chiede al foglio di stile quale fondo
   sia in vigore, così quindici combinazioni non diventano quindici
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

  for (const asse of ASSI) {
    const gruppo = document.querySelector(asse.gruppo);
    if (!gruppo) continue;
    trovato = true;

    const pulsanti = [...gruppo.querySelectorAll(asse.voce)];
    const validi = pulsanti.map((p) => p.dataset.valore);

    const allinea = () => {
      const corrente = radice.getAttribute(asse.attributo);
      for (const p of pulsanti) {
        p.setAttribute('aria-pressed', String(p.dataset.valore === corrente));
      }
    };

    allinea();

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

  // Lo script del <head> gira prima che il foglio di stile sia
  // applicato, e là il colore del fondo non si può ancora leggere:
  // il primo colore giusto della barra si mette qui.
  if (trovato) tingiLaBarra();
}
