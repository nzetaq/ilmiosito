const CHIAVE = 'au-theme';

/**
 * Interruttore fra tema scuro e tema chiaro.
 *
 * La classe viene applicata a <html> già nel <head> della pagina,
 * prima del primo disegno: qui si allinea solo l'etichetta del
 * pulsante e si registra la scelta.
 */
export function avviaTema() {
  const pulsante = document.getElementById('au-theme-toggle');
  if (!pulsante) return;

  const radice = document.documentElement;

  const aggiornaEtichetta = () => {
    pulsante.textContent = radice.classList.contains('theme-light') ? 'Scuro' : 'Chiaro';
  };

  aggiornaEtichetta();

  pulsante.addEventListener('click', () => {
    const chiaro = radice.classList.toggle('theme-light');
    aggiornaEtichetta();
    try {
      localStorage.setItem(CHIAVE, chiaro ? 'light' : 'dark');
    } catch (e) {
      // Spazio di archiviazione non disponibile: la scelta vale
      // per la sessione corrente e non viene ricordata.
    }
  });
}
