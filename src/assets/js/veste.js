/**
 * I regolatori della veste: quanto è grande il sito, e quanto si muove.
 *
 * Due regolazioni con la stessa meccanica — ricordate in `localStorage`
 * e applicate dallo script del <head> **prima del primo disegno**,
 * altrimenti la pagina apparirebbe alla misura sbagliata e si
 * riassesterebbe sotto gli occhi di chi legge — ma con due comandi
 * diversi, per una ragione che si scopre solo usandoli.
 *
 * La scala ha due pulsanti e non un cursore: cambiando la scala cambia
 * la pagina, e con essa il cursore stesso, che scappa da sotto il
 * puntatore mentre lo si trascina. Un clic invece è istantaneo, e dopo
 * il clic il pulsante resta a fuoco: si può continuare con Invio o con
 * la barra spaziatrice senza rincorrere niente.
 *
 * Il moto resta un cursore, perché muoverlo non sposta nulla.
 *
 * Si scrive con `setProperty` e non con un foglio di stile aggiunto: la
 * Content Security Policy ammette il CSSOM e rifiuta uno <style>
 * iniettato — verificato — ed è giusto che sia così.
 */

/* ── Quanto è grande il sito ── */
const SCALA = {
  chiave: 'au-scala',
  proprieta: '--scala',
  minimo: 100,
  massimo: 300,
  passo: 5,
  predefinito: 100,
  // Diretta: 150% significa una volta e mezza. Ogni misura del foglio è
  // in rem, quindi cresce tutto insieme e le proporzioni reggono.
  valore: (p) => p / 100
};

/* ── Quanto si muove ── */
const MOTO = {
  chiave: 'au-moto',
  proprieta: '--moto',
  predefinito: 100,
  // Inversa: la percentuale è una velocità e il tempo ne è il
  // reciproco, quindi a metà velocità il passaggio dura il doppio. Lo
  // zero è a parte — velocità nulla varrebbe durata infinita — e vale
  // «nessun movimento».
  valore: (p) => (p > 0 ? 100 / p : 0),
  voce: (p) => (p === 0 ? 'nessun movimento, passaggi netti' : 'velocità al ' + p + ' per cento')
};

const radice = () => document.documentElement;

function ricorda(chiave, percentuale) {
  try {
    localStorage.setItem(chiave, String(percentuale));
  } catch (e) {
    // Archiviazione non disponibile: la scelta vale per questa visita.
  }
}

function ricordata(chiave, minimo, massimo, predefinito) {
  try {
    const salvato = parseInt(localStorage.getItem(chiave), 10);
    if (salvato >= minimo && salvato <= massimo) return salvato;
  } catch (e) {}
  return predefinito;
}

/* ── La scala, a passi ── */
function avviaScala() {
  const meno = document.getElementById('au-scala-meno');
  const piu = document.getElementById('au-scala-piu');
  const valore = document.getElementById('au-scala-valore');
  if (!meno || !piu || !valore) return;

  let attuale = ricordata(SCALA.chiave, SCALA.minimo, SCALA.massimo, SCALA.predefinito);

  function applica(percentuale, salva) {
    attuale = Math.min(SCALA.massimo, Math.max(SCALA.minimo, percentuale));

    /* Spegnere le transizioni non è solo per non vedere la misura
       inseguirsi: senza, il cambio non arriverebbe dove deve. Una
       proprietà in transizione — `max-width` sulla colonna — resta
       congelata al valore calcolato prima, se a cambiare è il corpo
       della radice invece della proprietà stessa: i testi crescevano e
       la colonna no. Leggere una misura obbliga il browser a
       ricalcolare subito, mentre le transizioni sono ancora spente. */
    radice().setAttribute('data-scalando', '');
    radice().style.setProperty(SCALA.proprieta, SCALA.valore(attuale));
    void radice().offsetHeight;
    radice().removeAttribute('data-scalando');

    valore.textContent = attuale + '%';
    meno.disabled = attuale <= SCALA.minimo;
    piu.disabled = attuale >= SCALA.massimo;
    if (salva) ricorda(SCALA.chiave, attuale);
  }

  function muovi(verso, pulsante) {
    applica(attuale + verso * SCALA.passo, true);
    /* Il fuoco resta sul pulsante anche dopo il clic — Safari da solo
       non lo darebbe — così si può continuare con Invio senza inseguire
       col puntatore un pulsante che nel frattempo si è spostato. */
    if (!pulsante.disabled) pulsante.focus();
  }

  meno.addEventListener('click', () => muovi(-1, meno));
  piu.addEventListener('click', () => muovi(+1, piu));

  // Lo script del <head> ha già applicato il valore ricordato: qui si
  // allineano soltanto l'etichetta e lo stato dei due pulsanti.
  applica(attuale, false);
}

/* ── Il moto, a cursore ── */
function avviaMoto() {
  const cursore = document.getElementById('au-moto');
  const valore = document.getElementById('au-moto-valore');
  if (!cursore || !valore) return;

  const scatola = cursore.closest('.au-regolatore');

  /* Chi ha chiesto al sistema di ridurre le animazioni ha già tutto
     fermo: il foglio azzera ogni transizione con `!important`, e vince
     su qualunque cosa scriva questo cursore. Fingere che funzioni
     sarebbe peggio che spegnerlo — è un'impostazione di salute, non una
     preferenza di gusto. */
  const ridotto = window.matchMedia('(prefers-reduced-motion: reduce)');

  function mostra(percentuale) {
    valore.textContent = percentuale + '%';
    // Il cursore è già descritto dalla propria etichetta; questo dice a
    // voce il valore, che altrimenti resterebbe solo un numero.
    cursore.setAttribute('aria-valuetext', MOTO.voce(percentuale));
  }

  function applica(percentuale, salva) {
    radice().style.setProperty(MOTO.proprieta, MOTO.valore(percentuale));
    mostra(percentuale);
    if (salva) ricorda(MOTO.chiave, percentuale);
  }

  function adeguaAllaPreferenza() {
    const fermo = ridotto.matches;
    cursore.disabled = fermo;
    if (scatola) scatola.classList.toggle('is-imposto', fermo);
    if (fermo) {
      valore.textContent = 'fermo';
      cursore.title = 'Il movimento è disattivato nelle impostazioni del sistema.';
    } else {
      cursore.removeAttribute('title');
      mostra(Number(cursore.value));
    }
  }

  const iniziale = ricordata(MOTO.chiave, 0, 100, MOTO.predefinito);
  cursore.value = String(iniziale);
  applica(iniziale, false);
  adeguaAllaPreferenza();

  cursore.addEventListener('input', () => applica(Number(cursore.value), true));
  ridotto.addEventListener('change', adeguaAllaPreferenza);
}

export function avviaVeste() {
  avviaScala();
  avviaMoto();
}
