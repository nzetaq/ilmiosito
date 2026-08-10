/**
 * Una frase di sintesi ricavata dal testo di un pezzo.
 *
 * Serve alla descrizione della pagina — quella che compare nei
 * risultati di ricerca e nell'anteprima quando qualcuno condivide
 * l'indirizzo. Scriverla a mano per ogni pezzo sarebbe un campo in più
 * da ricordare a ogni pubblicazione; ricavarla dal testo costa nulla e
 * non si dimentica.
 *
 * Il Markdown viene spogliato dei suoi segni: chi legge l'anteprima
 * vedrebbe altrimenti trattini bassi e cancelletti al posto del corsivo
 * e dei titoli.
 */

const LIMITE = 160;

export function sintesi(testo, limite = LIMITE) {
  if (!testo) return '';

  let piano = String(testo)
    // Il preambolo fra i tratti non è testo: sono i dati del pezzo.
    .replace(/^---[\s\S]*?\n---\s*/, '')
    // Immagini e collegamenti: resta il nome, non l'indirizzo.
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // Titoli, citazioni, elenchi: cade il segno, resta la riga.
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    // Enfasi e codice.
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    // Quel che resta di eventuale HTML.
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (piano.length <= limite) return piano;

  // Si taglia all'ultimo spazio prima del limite: una parola spezzata a
  // metà in un'anteprima si nota, e fa sembrare rotto il sito.
  const tagliato = piano.slice(0, limite);
  const spazio = tagliato.lastIndexOf(' ');
  return (spazio > limite * 0.6 ? tagliato.slice(0, spazio) : tagliato).replace(/[.,;:—-]$/, '') + '…';
}
