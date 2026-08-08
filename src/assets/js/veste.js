/**
 * I regolatori della veste: quanto è grande il sito, e quanto si muove.
 *
 * Due cursori con la stessa meccanica, quindi una sola funzione che la
 * descrive. Ognuno ricorda la propria posizione in `localStorage`, e lo
 * script del <head> la applica **prima del primo disegno**: altrimenti
 * la pagina apparirebbe alla misura sbagliata e si riassesterebbe sotto
 * gli occhi di chi legge.
 *
 * Si scrive con `setProperty` e non con un foglio di stile aggiunto: la
 * Content Security Policy ammette il CSSOM e rifiuta uno <style>
 * iniettato — verificato — ed è giusto che sia così.
 */

/* ── Le due regolazioni ──
   `valore` traduce la percentuale del cursore nel numero che finisce
   nella variabile CSS. Sono l'unica cosa che le distingue. */
const REGOLAZIONI = [
  {
    id: 'au-scala',
    chiave: 'au-scala',
    proprieta: '--scala',
    predefinito: 100,
    // Diretta: 150% significa una volta e mezza. Ogni misura del foglio
    // è in rem, quindi cresce tutto insieme e le proporzioni reggono.
    valore: (p) => p / 100,
    voce: (p) => 'ingrandimento al ' + p + ' per cento',
    // Vedi la regola `[data-scalando]` nel foglio di stile: senza,
    // le larghezze in transizione resterebbero alla misura vecchia.
    senzaTransizioni: true
  },
  {
    id: 'au-moto',
    chiave: 'au-moto',
    proprieta: '--moto',
    predefinito: 100,
    // Inversa: la percentuale è una velocità e il tempo ne è il
    // reciproco, quindi a metà velocità il passaggio dura il doppio.
    // Lo zero è a parte — velocità nulla varrebbe durata infinita — e
    // vale «nessun movimento».
    valore: (p) => (p > 0 ? 100 / p : 0),
    voce: (p) => (p === 0 ? 'nessun movimento, passaggi netti' : 'velocità al ' + p + ' per cento'),
    // Chi ha chiesto al sistema di ridurre le animazioni ha già tutto
    // fermo: il foglio azzera ogni transizione con `!important`, e vince
    // su qualunque cosa scriva questo cursore. Fingere che funzioni
    // sarebbe peggio che spegnerlo — è un'impostazione di salute.
    soggettoA: '(prefers-reduced-motion: reduce)',
    imposto: 'fermo',
    spiegazione: 'Il movimento è disattivato nelle impostazioni del sistema.'
  }
];

function avviaRegolatore(r) {
  const cursore = document.getElementById(r.id);
  const valore = document.getElementById(r.id + '-valore');
  if (!cursore || !valore) return;

  const radice = document.documentElement;
  const scatola = cursore.closest('.au-regolatore');

  function mostra(percentuale) {
    valore.textContent = percentuale + '%';
    // Il cursore è già descritto dalla propria etichetta; questo dice a
    // voce il valore, che altrimenti resterebbe solo un numero.
    cursore.setAttribute('aria-valuetext', r.voce(percentuale));
  }

  function applica(percentuale, ricorda) {
    if (r.senzaTransizioni) radice.setAttribute('data-scalando', '');
    radice.style.setProperty(r.proprieta, r.valore(percentuale));
    if (r.senzaTransizioni) {
      // Leggere una misura obbliga il browser a ricalcolare subito,
      // mentre le transizioni sono ancora spente: è il ricalcolo che
      // serve, e va fatto adesso e non alla prossima cornice.
      void radice.offsetHeight;
      radice.removeAttribute('data-scalando');
    }
    mostra(percentuale);
    if (!ricorda) return;
    try {
      localStorage.setItem(r.chiave, String(percentuale));
    } catch (e) {
      // Archiviazione non disponibile: la scelta vale per questa visita.
    }
  }

  let ridotto = null;
  function adeguaAllaPreferenza() {
    if (!ridotto) return;
    const fermo = ridotto.matches;
    cursore.disabled = fermo;
    if (scatola) scatola.classList.toggle('is-imposto', fermo);
    if (fermo) {
      valore.textContent = r.imposto;
      cursore.title = r.spiegazione;
    } else {
      cursore.removeAttribute('title');
      mostra(Number(cursore.value));
    }
  }

  // Lo script del <head> ha già applicato il valore ricordato: qui si
  // allinea soltanto la posizione del cursore, come fa il pulsante del
  // tema con la propria etichetta.
  let iniziale = r.predefinito;
  try {
    const salvato = parseInt(localStorage.getItem(r.chiave), 10);
    if (salvato >= Number(cursore.min) && salvato <= Number(cursore.max)) iniziale = salvato;
  } catch (e) {}

  cursore.value = String(iniziale);
  applica(iniziale, false);

  if (r.soggettoA) {
    ridotto = window.matchMedia(r.soggettoA);
    adeguaAllaPreferenza();
    ridotto.addEventListener('change', adeguaAllaPreferenza);
  }

  cursore.addEventListener('input', () => applica(Number(cursore.value), true));
}

export function avviaVeste() {
  for (const r of REGOLAZIONI) avviaRegolatore(r);
}
