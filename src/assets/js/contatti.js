import { t } from './lingua.js';

/**
 * Il modulo dei contatti, spedito senza lasciare la pagina.
 *
 * Senza JavaScript il modulo resta quello che è: un <form> che parte
 * per davvero e finisce su /grazie/. Qui il viaggio viene intercettato
 * e fatto in silenzio, per due ragioni. La prima è che chi scrive non
 * perde il posto in cui si trovava, né i propri caratteri se qualcosa
 * va storto. La seconda è che una conferma vale se si vede: la pagina
 * che restava identica non diceva se il messaggio fosse partito o
 * caduto nel vuoto.
 *
 * L'indirizzo di destinazione non compare nemmeno qui: si ricava
 * dall'action del modulo, che porta l'alias e non l'indirizzo vero.
 */

/* Il servizio espone la stessa cassetta in due forme: una che
   risponde con una pagina e una che risponde con del JSON. È solo
   una parola in più nel percorso. */
function versoJson(destinazione) {
  return destinazione.replace('formsubmit.co/', 'formsubmit.co/ajax/');
}

export function avviaContatti() {
  const modulo = document.querySelector('.au-contatti-form');
  if (!modulo) return;

  const esito = document.getElementById('au-contatti-esito');
  const invio = modulo.querySelector('.au-contatti-invio');
  let inVolo = false;

  const dire = (testo, tipo = '') => {
    if (!esito) return;
    esito.textContent = testo;
    esito.className = 'au-contatti-esito' + (tipo ? ' is-' + tipo : '');
    esito.hidden = !testo;
  };

  // Un ripensamento cancella l'avviso precedente: un «inviato» che
  // resta appeso mentre si riscrive è peggio di nessun avviso.
  modulo.addEventListener('input', () => {
    if (!inVolo) dire('');
  });

  modulo.addEventListener('submit', async (evento) => {
    // Il browser ha già rifiutato i campi obbligatori vuoti: se siamo
    // qui, il modulo è valido.
    evento.preventDefault();
    if (inVolo) return;

    const dati = {};
    new FormData(modulo).forEach((valore, nome) => {
      // `_next` era l'indirizzo dove andare dopo l'invio: qui non si
      // va da nessuna parte, e mandarlo confonderebbe soltanto.
      if (nome !== '_next') dati[nome] = valore;
    });

    inVolo = true;
    /* La parola sul pulsante si legge adesso e non all'avvio: fra
       l'una e l'altra visita di questa riga può essere cambiata la
       lingua, e rimetterci quella di prima significherebbe lasciare
       «Invia» in mezzo a una pagina inglese. */
    const parola = invio ? invio.textContent : '';
    if (invio) {
      invio.disabled = true;
      invio.textContent = t('inVolo');
    }
    dire('');

    try {
      const risposta = await fetch(versoJson(modulo.action), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(dati),
      });

      let corpo = null;
      try {
        corpo = await risposta.json();
      } catch (e) {
        // Risposta non leggibile: decide lo stato, qui sotto.
      }

      // `success` arriva come stringa «true», non come booleano.
      const andata = risposta.ok && (!corpo || String(corpo.success) !== 'false');
      if (!andata) {
        throw new Error((corpo && corpo.message) || t('rifiutato'));
      }

      // Solo adesso i campi si svuotano: finché non c'è conferma, quel
      // che è stato scritto resta dov'è.
      modulo.reset();
      dire(t('inviato'), 'fatto');
    } catch (errore) {
      // Il motivo arriva da fuori e a volte porta già il suo punto:
      // toglierlo evita la doppia punteggiatura in mezzo alla frase.
      const motivo = String(errore.message || t('motivoIgnoto')).replace(/\.\s*$/, '');
      dire(t('nonPartito', motivo), 'guaio');
    } finally {
      inVolo = false;
      if (invio) {
        invio.disabled = false;
        invio.textContent = parola;
      }
    }
  });
}
