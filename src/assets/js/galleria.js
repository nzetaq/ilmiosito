/**
 * La lente della galleria.
 *
 * Una fotografia in una griglia si guarda; per vederla ci vuole lo
 * schermo intero. Il dialogo mostra il file com'è — la stessa immagine
 * della griglia, non una copia più grande, perché una sola copia c'è.
 *
 * L'indirizzo della foto viaggia in un attributo del pulsante e non
 * viene mai composto a mano: si legge e si assegna, senza passare da
 * stringhe di marcatura.
 */
export function avviaGalleria() {
  const scena = document.getElementById('au-foto-scena');
  const griglia = document.querySelector('.au-galleria');
  if (!scena || !griglia || typeof scena.showModal !== 'function') return;

  const immagine = document.getElementById('au-foto-grande-immagine');
  const didascalia = document.getElementById('au-foto-grande-didascalia');

  griglia.addEventListener('click', (evento) => {
    const pulsante = evento.target.closest('.au-foto-apri');
    if (!pulsante) return;

    immagine.src = pulsante.dataset.foto;
    // L'alternativa testuale è la didascalia, se c'è: una fotografia
    // senza descrizione è meglio annunciarla vuota che con il nome del
    // file, che a chi ascolta non dice nulla.
    immagine.alt = pulsante.dataset.didascalia || '';
    didascalia.textContent = pulsante.dataset.didascalia || '';
    scena.showModal();
  });

  // Un tocco ovunque chiude: qui non c'è niente su cui si possa voler
  // cliccare, se non la foto stessa — e chi l'ha aperta ha finito.
  scena.addEventListener('click', () => scena.close());

  // Chiusa la lente, l'immagine si lascia andare: tenerla in memoria
  // non serve a nessuno.
  scena.addEventListener('close', () => {
    immagine.removeAttribute('src');
    didascalia.textContent = '';
  });
}
