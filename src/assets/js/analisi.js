/**
 * Conteggio delle visite, appoggiato a GoatCounter.
 *
 * Il sito è una pagina sola e le sezioni sono frammenti (#articoli):
 * il frammento non viene mai inviato al server, quindi senza questo
 * modulo si vedrebbe per sempre una sola visita a «/». Qui ogni
 * sezione viene contata come se fosse una pagina a sé, così nel
 * cruscotto si legge davvero quali parti del sito vengono lette.
 *
 * Se il codice del sito non è configurato, non viene caricato nulla:
 * nessuna richiesta, nessuno script di terze parti.
 */

const SORGENTE = 'https://gc.zgo.at/count.js';

/** Il conteggio si rimanda finché lo script esterno non è pronto. */
const inAttesa = [];
let pronto = false;

function conta(visita) {
  if (!pronto) {
    inAttesa.push(visita);
    return;
  }
  const gc = window.goatcounter;
  if (gc && typeof gc.count === 'function') gc.count(visita);
  // Se lo script è caricato ma non ha lasciato `count` — perché
  // manomesso o interrotto a metà — la visita si perde e amen: rimetterla
  // in coda farebbe girare a vuoto lo smaltimento qui sotto.
}

function smaltiscilaCoda() {
  pronto = true;
  // Si svuota in un colpo solo: se si estraesse una visita per volta
  // mentre `conta` può rimetterla dentro, il ciclo non finirebbe mai.
  const arretrate = inAttesa.splice(0);
  for (const visita of arretrate) conta(visita);
}

/** Chi ha chiesto di non essere tracciato non viene contato. */
function rifiutaTracciamento() {
  const nav = window.navigator || {};
  return (
    nav.doNotTrack === '1' ||
    window.doNotTrack === '1' ||
    nav.msDoNotTrack === '1' ||
    nav.globalPrivacyControl === true
  );
}

/** Dalla sezione all'indirizzo con cui comparirà nel cruscotto. */
function percorso(id) {
  return id && id !== 'home' ? `/${id}` : '/';
}

/** Il titolo leggibile della sezione, preso dalla voce di menu. */
function titolo(id) {
  const voce = document.querySelector(`.au-nav-btn[data-sez="${id}"]`);
  const nome = voce ? voce.textContent.trim() : '';
  return nome ? `${document.title} — ${nome}` : document.title;
}

function segna(id) {
  conta({ path: percorso(id), title: titolo(id) });
}

export function avviaAnalisi() {
  const meta = document.querySelector('meta[name="analisi-codice"]');
  const codice = meta && meta.content.trim();
  if (!codice || rifiutaTracciamento()) return;

  // no_onload impedisce il conteggio automatico: le sezioni le
  // dichiariamo noi, una per una, con il loro indirizzo.
  window.goatcounter = { no_onload: true, no_events: true };

  const script = document.createElement('script');
  script.async = true;
  script.src = SORGENTE;
  script.dataset.goatcounter = `https://${codice}.goatcounter.com/count`;
  script.addEventListener('load', smaltiscilaCoda);
  script.addEventListener('error', () => {
    inAttesa.length = 0; // bloccato o irraggiungibile: si lascia perdere
  });
  document.head.appendChild(script);

  // La sezione di partenza è già scritta su <html> dallo script del <head>.
  segna(document.documentElement.getAttribute('data-sez') || 'home');

  document.addEventListener('nzq:sezione', (evento) => segna(evento.detail.id));
}
