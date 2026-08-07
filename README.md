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
│   ├── js/                   moduli ES: router, tema, filtri, citazioni, oracolo
│   ├── font/                 Archivo e Space Grotesk, ospitati qui
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

## Analisi del traffico

Il conteggio si appoggia a [GoatCounter](https://www.goatcounter.com/):
gratuito, senza cookie e senza dati personali, quindi **non serve alcun
banner di consenso**. Finché non è configurato non viene caricato nulla:
nessuno script di terze parti finisce nella pagina.

### Messa in opera

1. Aprire un conto su goatcounter.com e scegliere il codice del sito
   (il sottodominio, per esempio `nzetaq`).
2. Scriverlo in `src/_data/site.json`, alla voce `analisi.goatcounter`.
   Da quel momento la pagina comincia a contare.
3. Nel proprio conto GoatCounter, creare una chiave API con il permesso
   di **lettura delle statistiche**.
4. Su GitHub, in *Settings → Secrets and variables → Actions*:
   - variabile `GOATCOUNTER_CODICE` — lo stesso codice del punto 2;
   - segreto `GOATCOUNTER_TOKEN` — la chiave del punto 3.

Senza il punto 4 il workflow non fallisce: si limita a non fare nulla.

### I rapporti

`.github/workflows/rapporto.yml` gira ogni giorno alle 05:10 UTC e
deposita in `analisi/` un rapporto per giornata — sezioni lette, paesi,
provenienze, browser, sistemi — più un riepilogo aggiornato degli ultimi
sessanta giorni.

Non serve però aspettare la notte per il primo: dalla scheda *Actions →
Rapporto analisi → Run workflow* si ottiene subito, indicando nel campo
del giorno la data che interessa — **oggi stesso**, se si vuole vedere
quanto raccolto finora. Lasciando il campo vuoto rileva ieri, che è ciò
che serve all'esecuzione automatica ma quasi mai a una prova manuale.

Rieseguire lo stesso giorno è innocuo: il file viene semplicemente
riscritto con i dati aggiornati. Un rapporto generato a metà giornata
sarà quindi completato dall'esecuzione automatica del mattino dopo.

Per provarlo dal proprio computer, senza scrivere nulla su disco:

```bash
GOATCOUNTER_CODICE=... GOATCOUNTER_TOKEN=... \
  node strumenti/rapporto-analisi.mjs --prova
```

Aggiungendo `--grezzo` si vede il JSON restituito dall'API, utile se un
elenco risultasse vuoto.

### Due avvertenze

- **Questo repository è pubblico:** i rapporti depositati in `analisi/`
  sono leggibili da chiunque, come i registri delle azioni.
- **I numeri sono per difetto:** chi usa un blocco degli script non
  viene conteggiato, perché `gc.zgo.at` compare in diversi elenchi di
  domini bloccati.
- **Do Not Track e Global Privacy Control non sospendono il conteggio.**
  È una scelta deliberata, spiegata in `src/assets/js/analisi.js`: sono
  segnali che GoatCounter stesso ignora, e rispettarli rendeva invisibili
  al proprietario del sito perfino le proprie visite. Si ripristina con
  poche righe, se si cambia idea.
- GitHub sospende i workflow pianificati nei repository fermi da sessanta
  giorni. Un commit qualsiasi li riattiva.

## Intelligenza Artificiosa

La sezione `I.A.` è un oracolo che non capisce la domanda. **Non c'è alcun
modello linguistico**, né qui né altrove: nessuna chiave, nessuna richiesta
di rete, nessun dato di chi scrive che lasci la pagina. C'è una grammatica
generativa in `src/assets/js/artificiosa.js` — circa 8 KB, zero dipendenze —
che compone frasi sintatticamente impeccabili e semanticamente vuote.

Funziona su tre strati:

1. **Risposte fisse** per i casi prevedibili (`chi sei`, `ciao`, gli insulti,
   l'invio a vuoto, la stessa domanda posta due volte). Sono le battute
   migliori perché mirate.
2. **L'eco**: si ripesca un sostantivo dalla domanda e lo si incastona nella
   frase. È ciò che dà l'illusione dell'ascolto.
3. **La morfologia**: articoli, elisioni, preposizioni articolate, accordo di
   genere e numero. È la parte noiosa e l'unica che separa il divertente dal
   guasto — una frase che dice «del selva oscura» non è surreale, è rotta.

Senza un analizzatore grammaticale non si distingue `scrivi` (verbo) da
`scritti` (nome), né `la merce` (singolare) da `le stelle` (plurale). La
soluzione è rovesciare l'onere della prova: **l'eco ripesca soltanto ciò che
riconosce** — un elenco di nomi noti, un suffisso inequivocabile, e una tabella
di parole la cui terminazione inganna. In ogni altro caso tace e usa il lessico
interno. Chi legge non vede il rifiuto: è precisamente il modo in cui deve
fallire.

### Il lessico e la sua provenienza

L'attrito è fra due registri che non dovrebbero stare insieme: l'impalcatura
viene dalla teoria critica novecentesca, i sostantivi dalla poesia italiana.
Questi ultimi sono stati raccolti da [Wikisource](https://it.wikisource.org/) —
Dante, Petrarca, Leopardi, Foscolo, Pascoli, Carducci — su un corpus di circa
7.700 parole, e poi scelti a mano.

**Tutti gli autori usati sono in pubblico dominio.** In Italia il diritto
d'autore dura la vita più settant'anni, il che esclude i grandi del Novecento:
Saba fino al 2028, Quasimodo al 2039, Ungaretti al 2041, Montale al 2052. Non
sono stati usati e non vanno aggiunti.

Nel repository **non stanno i testi**, solo le parole scelte: la raccolta è uno
strumento a monte, non una dipendenza del sito.

### Se un giorno il corpus crescesse

Il lessico è scritto a mano perché la comicità ha bisogno di parole scelte per
come suonano, non per come sono frequenti. Ma `src/content/` contiene oggi
circa 170 parole di prosa italiana — il resto è testo segnaposto o l'abstract
inglese della tesi. Quando `giornale/` e `appunti/` avranno del testo vero,
vale la pena riprendere in mano il lessico e lasciarvi entrare i termini di
casa.

## Sicurezza

Il sito è statico: nessun database, nessun codice che gira su un
server, nessun modulo da compilare, nessun dato di chi legge. Le
vulnerabilità più comuni non hanno appiglio. Ciò che resta da
proteggere è la possibilità che qualcuno pubblichi al posto tuo, e si
difende fuori di qui: due fattori su GitHub, due fattori e blocco al
trasferimento presso il registrar del dominio.

Nel codice sono state prese queste misure:

- **Nessuna risorsa di terzi.** I caratteri stanno in `assets/font/` e
  il contatore di GoatCounter in `assets/js/count.js`. Nessun lettore
  rivela il proprio indirizzo a Google o a `gc.zgo.at` per il solo
  fatto di aprire la pagina, e nessun terzo può cambiare ciò che gira
  nel suo browser. Le copie però non si aggiornano da sé: in cima a
  `count.js` sono annotate provenienza, data e impronta dell'originale.
- **Content Security Policy** dichiarata nel `<meta>` di `base.njk` —
  su GitHub Pages non si possono impostare intestazioni HTTP. Tutto
  proviene da `'self'`; i due blocchi inline (lo script che decide tema
  e sezione, lo stile di riserva senza JavaScript) sono ammessi per
  impronta, ricalcolata a ogni compilazione dal filtro `impronta`, mai
  con `'unsafe-inline'`. L'unica destinazione esterna consentita è il
  conteggio delle visite.
- **Azioni ancorate all'identificativo del commit** invece che a
  un'etichetta come `@v4`, che chi controlla quel repository può
  spostare su codice diverso. `dependabot.yml` propone gli
  aggiornamenti una volta al mese, così l'ancoraggio non invecchia.
- `npm ci` in fase di pubblicazione: installa esattamente quanto è nel
  lockfile. Il workflow che usa il token di GoatCounter non installa
  alcun pacchetto, quindi nessun codice di terzi gli si avvicina.

Due limiti da conoscere:

- **Clickjacking:** `frame-ancestors` non è ammesso in un `<meta>` e su
  Pages non si possono impostare intestazioni. Non c'è modo di impedire
  che il sito venga incluso nella cornice di un altro. Senza pulsanti
  che compiano azioni, il danno possibile è prossimo a zero.
- Aprendo `dist/index.html` con l'anteprima di macOS la pagina appare
  senza stile: in quel contesto `'self'` non corrisponde a nulla. Per
  vedere il sito basta `npm start`.

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
- **Schermi stretti**: sotto i 700px le sette voci del menu non stanno più su
  una riga — sommate misurano 627px — e diventano blocchi che vanno a capo,
  ciascuno col proprio contorno, alti abbastanza da essere colpiti con un
  dito. Prima le ultime tre finivano oltre il bordo e, con `overflow-x`
  nascosto sul corpo, restavano irraggiungibili dal telefono.
- **Senza JavaScript**: la pagina mostra tutte le sezioni una dopo l'altra
  invece di restare vuota.
- **Movimento ridotto**: chi lo ha chiesto al sistema operativo non vede
  né composizione né raccordi; i contenuti compaiono e basta.
- **Temi**: chiaro e scuro condividono le stesse regole e differiscono solo
  per le variabili colore definite in cima a `style.css`. La scelta è
  ricordata dal browser e applicata prima del primo disegno.
