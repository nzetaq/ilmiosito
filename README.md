# nzetaq.it

Sito personale di NZQ, pubblicato su [www.nzetaq.it](https://www.nzetaq.it).

È un sito statico generato con [Eleventy](https://www.11ty.dev/): i contenuti
si scrivono in Markdown, la compilazione produce una pagina HTML unica, e
GitHub Actions la pubblica su GitHub Pages a ogni push sul ramo `main`.

## Comandi

```bash
npm install      # una volta sola, per installare Eleventy
npm start        # anteprima locale con ricarica automatica (http://localhost:8080)
npm run build    # compila il sito in dist/
```

La cartella `dist/` è generata: non va modificata a mano né versionata.

## Struttura

```
src/
├── index.njk                 pagina unica, con tutte le sezioni
├── 404.njk                   pagina di errore servita da GitHub Pages
├── robots.njk, sitemap.njk   file per i motori di ricerca
├── CNAME                     dominio personalizzato
├── _data/site.json           titolo, dominio, bio, voci di menu
├── _includes/layouts/        impalcatura HTML condivisa
├── assets/
│   ├── css/style.css         foglio di stile unico
│   ├── js/                   moduli ES: router, tema, filtri, citazioni
│   └── img/                  illustrazioni e favicon
└── content/                  i contenuti, un file Markdown per voce
    ├── articoli/
    ├── scritti/
    ├── tesi/
    ├── giornale/
    └── appunti/
```

## Aggiungere un contenuto

Basta creare un file `.md` nella cartella giusta: la sezione corrispondente
si aggiorna da sé alla compilazione successiva. Il testo dopo il front matter
è il corpo della voce, e può occupare più paragrafi.

### Un articolo — `src/content/articoli/`

```markdown
---
titolo: "Titolo dell'articolo"
fonte: "Capibara"           # nome mostrato ed etichetta del filtro
fonteId: "capibara"         # identificativo del filtro, senza spazi
data: "2026-03"             # anno e mese
ordine: 10                  # numero più alto = più in alto nell'elenco
url: "https://…"            # dove si legge l'articolo
---

Una o due righe che ne sintetizzano il contenuto.
```

I pulsanti di filtro nascono dalle fonti presenti: introdurre un nuovo
`fonteId` aggiunge da sé il pulsante corrispondente. Gli articoli si
raggruppano per anno in automatico.

### Una poesia — `src/content/scritti/`

```markdown
---
titolo: "Titolo"
tipo: "Poesia"
gruppo: "Premio Alberoandronico"            # intestazione del gruppo
gruppoUrl: "https://…"                      # link accanto all'intestazione
gruppoLinkTesto: "Vai all'Albo d'oro →"
ordine: 4
# data: "2026-03"                           # facoltativa
# url: "https://…"                          # facoltativa, con linkTesto
---

Selezionata nella … Edizione del Premio.
```

Le voci con lo stesso `gruppo` finiscono sotto la stessa intestazione.
La cartella `tesi/` segue esattamente lo stesso schema.

### Una pagina di giornale — `src/content/giornale/`

```markdown
---
titolo: "Titolo della pagina"
data: "2026-05-01"          # giorno, mese e anno
---

Il testo, diviso nei paragrafi che servono.
```

La voce più recente compare anche nella colonna a fianco della home.
La cartella `appunti/` funziona allo stesso modo, ma senza colonna.

Le date restano fra virgolette: sono stringhe, e vengono composte in
italiano al momento della compilazione.

## Aggiungere una sezione

Le sezioni non nascono da sole come i contenuti: vanno dichiarate in tre
punti, che è bene tenere allineati.

1. `src/_data/site.json` — una voce in `sezioni`, che genera il menu.
2. `src/index.njk` — il blocco `<section class="au-section" id="sec-…">`.
3. `src/assets/css/style.css` — l'identificativo va aggiunto ai due
   elenchi di selettori che rispondono a `[data-sez]`: quello che rende
   visibile la sezione e quello che accende la linguetta nel menu.

## Note tecniche

- **Navigazione**: le sezioni sono indirizzi veri (`/#articoli`), quindi
  ricaricare la pagina non riporta alla home e i tasti avanti/indietro
  del browser funzionano.
- **Sezione corrente**: vive in un solo posto, l'attributo `data-sez` su
  `<html>`. Lo scrive uno script nel `<head>`, prima del primo disegno,
  e da lì il foglio di stile ricava tutto: quale sezione è visibile,
  quale linguetta è accesa, se compare la colonna del giornale. Così al
  ricaricamento la pagina appare già nella sezione giusta, senza passare
  un istante dalla home. Il router in JavaScript si limita ad aggiornare
  l'attributo e ad animare i passaggi.
- **Passaggi fra sezioni**: la sezione entrante si compone a scalare, un
  elemento dopo l'altro; il router assegna a ciascuno il proprio posto in
  fila nella variabile `--i`. Intanto la colonna del giornale si richiude
  raccordata — è la traccia della griglia che passa da `1fr` a `0fr` — e
  la linguetta del menu si accende per dissolvenza. Tutti i tempi sono
  raccolti in cima a `style.css` (`--durata-voce`, `--passo-composizione`,
  `--durata-impaginazione`): per rendere il movimento più rapido o più
  lento basta cambiare quelli.
- **Senza JavaScript**: la pagina mostra tutte le sezioni una dopo l'altra
  invece di restare vuota.
- **Movimento ridotto**: chi lo ha chiesto al sistema operativo non vede
  né composizione né raccordi; i contenuti compaiono e basta.
- **Temi**: chiaro e scuro condividono le stesse regole e differiscono solo
  per le variabili colore definite in cima a `style.css`. La scelta è
  ricordata dal browser e applicata prima del primo disegno.
