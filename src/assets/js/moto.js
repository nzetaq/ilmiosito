const CHIAVE = 'au-moto';

/* La posizione in cui il passaggio va alla velocità piena, quella
   tarata a mano: il fondo scala, e il valore di partenza. */
const PIENO = 100;

/**
 * Il moltiplicatore dei tempi per una data percentuale di velocità.
 *
 * La percentuale è la velocità, quindi il tempo è il suo **inverso**:
 * a metà velocità il passaggio dura il doppio, a un quarto il
 * quadruplo. Non è la stessa cosa che moltiplicare le durate — sembra
 * un dettaglio, ma è la differenza fra un passaggio che rallenta e uno
 * che si accorcia.
 *
 * Lo zero è un caso a parte, e deliberatamente: velocità nulla
 * varrebbe durata infinita. Vale invece «nessun movimento», cioè
 * durata zero e cambio netto. Ne segue che il punto più lento del
 * cursore è il 25% e non lo 0%.
 */
function fattore(percentuale) {
  return percentuale > 0 ? PIENO / percentuale : 0;
}

/**
 * Quanto movimento fra una sezione e l'altra.
 *
 * La percentuale è la **velocità** del passaggio. Il **100% è il punto
 * di partenza** e vale la velocità tarata a mano, quella di sempre;
 * scendendo il passaggio rallenta nella stessa proporzione — a metà
 * velocità dura il doppio. Lo 0% è a parte: nessun movimento, il
 * contenuto resta fermo e il cambio è netto.
 *
 * Cinque scatti e non un continuo — 0, 25, 50, 75, 100 — perché le vie
 * di mezzo fra due scatti non si distinguono a occhio, e una scelta
 * fatta di posizioni riconoscibili si ritrova.
 *
 * Il valore finisce in una sola variabile, `--moto`, per cui passano
 * tutti e quattro i tempi del foglio di stile. Cambiarla li muove
 * insieme, ed è ciò che conta: la composizione a scalare funziona
 * perché i tempi stanno in proporzione fra loro, non perché valgano
 * quei numeri.
 *
 * Si scrive con `setProperty` e non con un foglio di stile aggiunto:
 * la Content Security Policy ammette il CSSOM e rifiuta uno <style>
 * iniettato — verificato — ed è giusto che sia così.
 */
export function avviaMoto() {
  const cursore = document.getElementById('au-moto');
  const valore = document.getElementById('au-moto-valore');
  if (!cursore || !valore) return;

  const radice = document.documentElement;

  /* Chi ha chiesto al sistema operativo di ridurre le animazioni ha
     già tutto fermo: il foglio di stile azzera ogni transizione con
     `!important`, e vince su qualunque cosa scriva questo cursore.
     Fingere che funzioni sarebbe peggio che spegnerlo: è
     un'impostazione di salute, non una preferenza di gusto. */
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)');

  function mostra(percentuale) {
    valore.textContent = percentuale + '%';
    // Il cursore è già descritto dalla propria etichetta; questo dice
    // a voce il valore, che altrimenti resterebbe solo un numero.
    cursore.setAttribute('aria-valuetext', percentuale === 0
      ? 'nessun movimento, passaggi netti'
      : 'velocità al ' + percentuale + ' per cento');
  }

  function applica(percentuale, ricorda) {
    radice.style.setProperty('--moto', fattore(percentuale));
    mostra(percentuale);
    if (!ricorda) return;
    try {
      localStorage.setItem(CHIAVE, String(percentuale));
    } catch (e) {
      // Archiviazione non disponibile: la scelta vale per questa
      // visita e non viene ricordata.
    }
  }

  function adeguaAllaPreferenza() {
    const fermo = ridotto.matches;
    cursore.disabled = fermo;
    document.querySelector('.au-moto').classList.toggle('is-imposto', fermo);
    if (fermo) {
      valore.textContent = 'fermo';
      cursore.title = 'Il movimento è disattivato nelle impostazioni del sistema.';
    } else {
      cursore.removeAttribute('title');
      mostra(Number(cursore.value));
    }
  }

  // Lo script del <head> ha già applicato il valore ricordato: qui si
  // allinea soltanto la posizione del cursore, come fa il pulsante del
  // tema con la propria etichetta.
  let iniziale = PIENO;
  try {
    const salvato = parseInt(localStorage.getItem(CHIAVE), 10);
    if (salvato >= 0 && salvato <= 100) iniziale = salvato;
  } catch (e) {}

  cursore.value = String(iniziale);
  applica(iniziale, false);
  adeguaAllaPreferenza();

  cursore.addEventListener('input', () => applica(Number(cursore.value), true));
  ridotto.addEventListener('change', adeguaAllaPreferenza);
}
