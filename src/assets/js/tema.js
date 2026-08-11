const CHIAVE = 'au-tema';
// La chiave di quando i temi erano due e si diceva «chiaro» o «scuro».
// Chi l'ha lasciata nel proprio browser non deve ritrovarsi il sito
// cambiato sotto gli occhi al primo ritorno.
const CHIAVE_VECCHIA = 'au-theme';
const PREDEFINITO = 'notte';

/**
 * La scelta del tema, fra tre.
 *
 * Il tema è già applicato a <html> dallo script del <head>, prima del
 * primo disegno: qui si allineano i pulsanti e si registra la scelta.
 *
 * Tre e non un interruttore che gira in tondo: con tre stati, premere
 * per vedere cosa capita è un modo di scegliere che si stanca presto.
 */
export function avviaTema() {
  const gruppo = document.querySelector('.au-temi');
  if (!gruppo) return;

  const radice = document.documentElement;
  const pulsanti = [...gruppo.querySelectorAll('.au-tema')];
  const validi = pulsanti.map((p) => p.dataset.tema);
  const barra = document.getElementById('au-colore-barra');

  const allinea = () => {
    const corrente = radice.getAttribute('data-tema') || PREDEFINITO;
    for (const p of pulsanti) {
      p.setAttribute('aria-pressed', String(p.dataset.tema === corrente));
    }
    // La barra del browser sul telefono prende il colore del fondo:
    // senza, resterebbe quella del tema di partenza sopra un sito che
    // nel frattempo è diventato un altro.
    const scelto = pulsanti.find((p) => p.dataset.tema === corrente);
    if (barra && scelto && scelto.dataset.barra) barra.setAttribute('content', scelto.dataset.barra);
  };

  allinea();

  gruppo.addEventListener('click', (evento) => {
    const pulsante = evento.target.closest('.au-tema');
    if (!pulsante) return;
    const scelto = pulsante.dataset.tema;
    if (validi.indexOf(scelto) === -1) return;

    radice.setAttribute('data-tema', scelto);
    allinea();

    try {
      localStorage.setItem(CHIAVE, scelto);
      // La vecchia chiave non serve più e resterebbe a contraddire la
      // nuova al prossimo caricamento.
      localStorage.removeItem(CHIAVE_VECCHIA);
    } catch (e) {
      // Archiviazione non disponibile: la scelta vale per questa
      // sessione e non viene ricordata.
    }
  });
}
