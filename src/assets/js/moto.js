const CHIAVE = 'au-moto';

/**
 * Quanto movimento fra una sezione e l'altra.
 *
 * La percentuale è la **durata**, non la velocità: 100% è la misura
 * piena di sempre, 25% la accorcia a un quarto, 0% ferma tutto. Detta
 * così la parola «moto» torna letterale — a metà cursore c'è metà
 * movimento — dove «velocità 25%» avrebbe voluto dire il contrario.
 *
 * Il valore finisce in una sola variabile, `--moto`, per cui passano
 * tutti e quattro i tempi del foglio di stile. Cambiarla li accorcia
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
      ? 'fermo' : 'movimento al ' + percentuale + ' per cento');
  }

  function applica(percentuale, ricorda) {
    radice.style.setProperty('--moto', percentuale / 100);
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
  let iniziale = 100;
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
