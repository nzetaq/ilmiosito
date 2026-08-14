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

foto/                         le fotografie della galleria, fuori da src/
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
nota: "Selezionata nella … Edizione del Premio."
# data: "2026-03"                           # facoltativa
# url: "https://…"                          # facoltativa, con linkTesto
---

Qui i versi, andando a capo dove vanno a capo.
Le interruzioni di riga sono conservate come le scrivi,
e una riga vuota separa una strofa dalla seguente.
```

**Il corpo del file è la poesia**; la nota del premio sta in `nota`, nel
front matter. Le voci con lo stesso `gruppo` finiscono sotto la stessa
intestazione. La cartella `tesi/` segue lo stesso schema, senza la lente.

#### La lente

Quando il corpo contiene dei versi, il titolo diventa una **lente**: si
segnala con `❧`, e al passaggio del puntatore apre **al centro dello
schermo** una finestra che mostra la poesia. Allontanando il puntatore la
finestra si chiude. Finché il corpo è vuoto il titolo resta un titolo
normale, senza appigli e senza promesse — quindi si può scrivere una poesia
alla volta senza stati intermedi rotti.

La finestra sta al centro e non accanto al titolo: un titolo in fondo alla
pagina non lascia spazio né sotto né sopra, e una poesia lunga finiva
tagliata dal bordo dello schermo, illeggibile e senza modo di spostarla. Il
centro è l'unico punto che non dipende da dove si trova il titolo.

Le dimensioni le detta il testo — larga quanto il verso più lungo, alta
quanto la poesia. Quando non ci sta, `adatta()` in `poesie.js` prova, in
quest'ordine:

1. **colonne** (fino a quattro, quante ne stanno in larghezza), tenendo
   intere le strofe;
2. le stesse colonne **lasciando che le strofe si spezzino** — una poesia
   scritta senza righe vuote è una strofa sola, e se restasse indivisibile
   riempirebbe una colonna lasciando vuote le altre;
3. **corpo più piccolo**, da 15px fino a 12px.

Se nemmeno così ci sta, si passa a **una colonna sola al corpo pieno e si
scorre**: con la rotella del mouse, con due dita sul touchpad, o da tastiera
con le frecce, `PagSu`/`PagGiù`, `Inizio`/`Fine`. Due sfumature ai bordi
dicono da che parte il testo continua.

Una colonna e non quattro, perché scorrendo le colonne diventano un
supplizio: si arriva in fondo alla prima e bisogna risalire tutto per
cominciare la seconda.

Lo scorrimento passa da un ascoltatore esplicito su `wheel`, non dal
comportamento nativo: la finestra è `pointer-events: none` e il puntatore
sta comunque sul titolo, quindi nessuno dei due riceverebbe mai l'evento per
conto proprio. Serve `{ passive: false }`, altrimenti il browser considera
l'ascoltatore una promessa di non interferire e ignora `preventDefault()`.
Quando la poesia ci sta tutta la rotella non viene toccata e la pagina
scorre come sempre.

Serve a far leggere i versi senza che si prendano con un gesto solo. Due
regole fanno il lavoro, in `.au-versi-finestra`:

- `user-select: none` toglie la selezione;
- `pointer-events: none` rende la finestra **inafferrabile**: il puntatore la
  attraversa e resta sul titolo, quindi non la si può cliccare, trascinare,
  né aprirci sopra il menu contestuale.

I versi **non entrano nell'indice** dell'Intelligenza Artificiosa — che è un
file pubblico e leggibile: delle poesie si indicizzano titolo e `nota`, mai
il corpo (`riservato: true` in `eleventy.config.js`).

> **Che cosa questo non è.** Il testo viaggia comunque nel documento, e chi
> lo cerca nel sorgente della pagina lo trova. Su un sito statico non esiste
> modo di mostrare qualcosa senza mandarlo, e ogni tentativo di nasconderlo
> davvero finirebbe per nasconderlo anche a chi legge con la tastiera o con
> un lettore di schermo. È un attrito contro la copia distratta, non una
> serratura — ed è bene saperlo prima di contarci.

Per questo il titolo è raggiungibile con `Tab` e la finestra si apre anche
al fuoco da tastiera: chi non ha un puntatore da posare deve poter leggere
lo stesso, e non toglie nulla al deterrente.

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

Queste due sezioni si leggono **dall'ultimo scritto in giù**, e usano il
filtro `cronologia` invece di `ordina`. La sola `data` è il giorno, e due
pezzi dello stesso giorno risulterebbero pari: l'ultimo arrivato finirebbe
sotto al precedente per puro caso. Il campo facoltativo `istante` — che la
redazione compila da sé, e non compare da nessuna parte — scioglie il
pareggio portando ora e fuso di chi ha scritto:

```yaml
data: "2026-08-09"
istante: "2026-08-09T01:20:00+02:00"
```

> **La data è quella di chi scrive, non di Greenwich.** La redazione usava
> `toISOString()`, che dà l'ora UTC: scrivendo dopo le ventidue — cioè fin
> troppo spesso — il pezzo si ritrovava datato al giorno prima, finiva
> sotto al precedente e mostrava sul sito una data sbagliata.

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

### Un'intestazione propria

Una sezione può sostituire `N·Z·Q` e il motto con un titolo proprio,
centrato — lo fanno *Intelligenza Artificiosa* e *Il Diavolo veste Pravda*.
Basta aggiungere alla sua voce in `site.json`:

```json
{
  "id": "giornale",
  "etichetta": "Il Diavolo veste Pravda",
  "titolo": "Il Diavolo veste Pravda",
  "sottotitolo": ["Prima frase.", "Seconda frase."]
}
```

`titolo` è obbligatorio perché l'intestazione compaia; `sottotitolo` è
facoltativo, e ogni voce dell'elenco prende una riga per sé.

Il ricambio lo governa il CSS a partire da `[data-sez]`, che lo script del
`<head>` scrive prima del primo disegno: non c'è un istante in cui si veda
l'intestazione sbagliata. Il CSS però non sa confrontare due attributi fra
loro, quindi la corrispondenza fra la sezione accesa e la sua intestazione
va scritta a mano — due righe nei selettori di `.au-header-sezione`.

## La redazione — `/scrivi/`

Una pagina per scrivere un contenuto e depositarlo nel repository senza
passare da GitHub. Non è collegata da nessuna parte, è esclusa da
`robots.txt` e porta `noindex`.

**Non è nascosta, è inerte.** Su un sito statico non esiste una pagina
privata: chiunque la apra la vede. Ciò che non ha è la chiave, e senza
chiave non fa nulla.

### La chiave

Un **token a grana fine** di GitHub, con `Contents: Read and write` sul solo
`nzetaq/ilmiosito`. Si incolla una volta e resta in `localStorage` di quel
browser. «Dimentica la chiave» lo cancella; revocarlo su GitHub è un clic e
non tocca nient'altro dell'account.

> È il punto debole dichiarato: un token in `localStorage` sarebbe leggibile
> da codice ostile che finisse in questa pagina. A difendere quella porta c'è
> la Content Security Policy, che **solo qui** si allarga ad `api.github.com`
> — verificato che sulle altre pagine quella stessa chiamata venga rifiutata.

### Come funziona

Non c'è alcun server: l'API di GitHub accetta chiamate dal browser
(`access-control-allow-origin: *`, `PUT` e `Authorization` ammessi), quindi
la pagina scrive i file da sé e l'azione di pubblicazione fa il resto.

- **Pubblica** scrive in `src/content/<sezione>/` e il pezzo è in linea in
  circa un minuto.
- **Salva come bozza** scrive in `bozze/<sezione>/`, che Eleventy non legge:
  resta nel repository senza andare in linea. «Riprendi una bozza» la
  ricarica nel modulo, e pubblicandola la bozza viene rimossa.
- **«Modifica un pezzo pubblicato»** riapre nel modulo un pezzo già in linea.
  Il pulsante diventa «Aggiorna il pezzo» e il file viene sovrascritto
  **dov'è**: l'indirizzo pubblico non cambia neanche cambiando il titolo,
  perché è quello che i collegamenti altrui si aspettano di trovare. Se il
  titolo cambia al punto da cambiare l'indirizzo, compare una casella che
  permette di spostarlo davvero — scritto per esteso cosa comporta.

  Riaprendo un file, i campi del front matter che il modulo non mostra
  vengono messi da parte e riscritti tali e quali. Serve soprattutto a
  `istante`: senza, correggere una virgola a un pezzo di mesi fa lo
  rimetterebbe in cima. L'unica eccezione è l'istante stesso quando la data
  cambia — allora viene rifatto, perché è l'istante a sciogliere i pari
  merito fra pezzi dello stesso giorno.

A deposito riuscito il pulsante **si spegne** e cambia etichetta in
«Pubblicato ✓» o «Bozza salvata ✓», e la conferma compare **accanto ai
pulsanti** con il collegamento al file su GitHub. Alla prima modifica il
pulsante torna valido. Dopo una pubblicazione appare «Comincia un altro»,
che svuota il modulo tenendo i valori predefiniti.

> L'esito sta lì e non in cima alla pagina perché in cima **non si vedeva**:
> fra la riga di stato e i pulsanti corrono oltre mille pixel, quindi la
> conferma arrivava fuori dallo schermo di chi aveva appena premuto. Vale
> anche per gli avvisi di campo mancante, che oltre a comparire lì portano
> il fuoco sul primo campo vuoto.

Il modulo conosce il front matter di ogni sezione: propone le fonti e i
gruppi già in uso, calcola l'`ordine` successivo, deriva `fonteId` dalla
fonte e compone il nome del file secondo la convenzione della cartella
(`slug` oppure `data-slug`).

### L'anteprima

Rende il Markdown — corsivo, grassetto, codice, collegamenti, titoli,
elenchi, citazioni — **costruendo nodi**, mai passando da `innerHTML`. La
differenza conta su una pagina che custodisce un token: non esiste stringa
che possa diventare HTML, perché nessuna stringa viene mai letta come HTML.
HTML scritto a mano nel testo resta testo, e un collegamento che non
cominci per `http`/`https` non diventa un'ancora.

Somiglia al risultato e non al file: le andate a capo singole si uniscono
con uno spazio, come fa il Markdown del sito, e `nome_del_file` non diventa
un corsivo.

**Nelle poesie non interpreta niente**, ed è voluto: là il sito mostra i
versi grezzi — la lente legge il testo come lo scrivi e il filtro `versi`
si limita a togliere i segni di enfasi. Renderli in corsivo qui sarebbe
un'anteprima che mente. La nota sotto il titolo lo dice, e cambia con la
sezione.

### Aggiungere una sezione alla redazione

Si descrive in `src/_data/redazione.json` e basta: il template genera i
campi, e `scrivi.js` li legge dal documento invece di ripeterne lo schema.

## Galleria — `#galleria`

Le fotografie stanno in **`foto/`**, fuori da `src/`: Eleventy tratta come
modello ogni file che trova nella cartella d'ingresso, e un JPEG non è un
modello. Basta metterci i file — compaiono in ordine di nome. Un prefisso
numerico decide l'ordine senza rinominare altro.

Le didascalie sono facoltative, in `foto/didascalie.json`, con il nome del
file come chiave:

```json
{ "01-bologna-portico.jpg": "Sotto i portici, verso sera" }
```

**Gli originali non arrivano mai in linea.** Alla compilazione, `sharp`
prepara di ciascuno due copie in WebP e serve quelle: una da 700 punti per il
riquadro nella griglia, una da 1600 per quando la foto si apre. Gli originali
restano nel repository.

Nel passaggio succedono tre cose:

- **si raddrizzano.** Una foto scattata tenendo il telefono di traverso non
  viene ruotata: i pixel restano come sono usciti dal sensore e nel file si
  scrive da che parte sta l'alto. La rotazione viene applicata ai pixel, e
  dopo la foto è dritta davvero;
- **si spogliano.** Luogo, ora, apparecchio e numero di serie restano
  nell'originale e non arrivano in linea. Pubblicare una foto così com'è
  significa mettere la posizione di casa propria a due clic da chiunque
  scarichi il file;
- **si rimpiccioliscono.** È la ragione per cui tutto questo esiste: tredici
  fotografie a piena misura facevano trenta megabyte.

```
originali    13 file   29.6 MB   restano qui
copie 700    13 file      491 KB  la griglia intera, scorsa fino in fondo
copie 1600   13 file     2212 KB  una sola per volta, 170 KB in media
```

Le misure della copia piccola finiscono in `width`/`height`: senza, il browser
non sa quanto spazio riservare e la pagina sobbalza mentre le immagini
arrivano.

Solo WebP, senza ripiego in JPEG: il sito usa già le *container query* per la
barra delle sezioni, che chiedono Safari 16, e WebP è sostenuto da Safari 14.
Il ripiego avrebbe protetto da nulla, raddoppiando i file.

### Se le fotografie stanno in una repository privata

Il flusso di pubblicazione le preleva da lì e le posa in `foto/` prima di
compilare. Serve, nelle impostazioni del repository:

- una **variabile** `FOTO_REPO` col nome della repository privata, per esempio
  `nzetaq/fotografie`;
- un **segreto** `FOTO_CHIAVE`, un token a grana fine con *Contents: Read* su
  quella sola.

Senza quelle due impostazioni il passo non fa nulla e valgono le foto presenti
qui. Vale la pena ricordare che **le foto pubblicate sono pubbliche
comunque**: la repository privata protegge gli originali — quelli grandi,
quelli scartati, quelli col luogo dentro — non le copie che finiscono in
linea.

## Contatti — `#contatti`

Un modulo che inoltra per posta, appoggiato a **FormSubmit**: gratuito, senza
registrazione, e senza che questo sito debba avere un server.

**L'indirizzo non compare da nessuna parte.** Al suo posto, in
`site.json → contatti.formsubmit`, c'è un **alias**: una stringa casuale che
FormSubmit manda per posta dopo la prima attivazione e che non rivela nulla.
Finché quella voce è vuota, il modulo non compare — meglio niente che un
modulo che non recapita.

### Attivarlo, senza esporre l'indirizzo

L'alias arriva solo dopo un primo invio. Farlo dal sito significherebbe
mettere l'indirizzo vero in `site.json`, cioè nel repository pubblico **e nel
registro dei commit, che non dimentica**. Si fa invece da un file locale, mai
versionato, che manda quel primo messaggio; poi si incolla nel sito la sola
stringa ricevuta.

### Come è protetto

- **`form-action`** nella policy ammette la sola `https://formsubmit.co`, e
  solo sulla pagina che ne ha bisogno: ovunque altro resta `'none'`.
  Verificato che una destinazione diversa venga rifiutata dal browser.
- **Niente reCAPTCHA** (`_captcha=false`): chiamerebbe in causa Google, e
  questo sito non ha terzi. Al suo posto il campo esca `_honey`, fuori dallo
  schermo e invisibile anche ai lettori vocali: un riempitore automatico lo
  compila e il messaggio viene buttato via.
- `_next` riporta su `/grazie/`, una pagina del sito, invece che sulla
  schermata di FormSubmit.

Se lo spam dovesse comunque arrivare, `_blacklist` accetta un elenco di frasi
da filtrare, fino a una ventina.

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
modello linguistico**, né qui né altrove: nessuna chiave, nessun servizio
esterno, nessun dato di chi scrive che lasci la pagina.

Risponde in due modi, e prova sempre il primo.

### 1. Ritrovamento

Cerca fra i testi di questo sito il passo che più somiglia alla domanda e lo
cita, dicendo da dove viene. **La coerenza non è prodotta: è già nella frase**,
perché la frase l'ha scritta una persona. Un sistema che ritrova non può
inventare — non è una garanzia di prudenza, è una proprietà strutturale.

- L'indice si costruisce durante la compilazione (`indice` in `eleventy.config.js`,
  emesso da `src/indice.njk` in `assets/indice.json`). Oggi pesa **circa 5 KB**.
- Si scarica **alla prima domanda**, non al caricamento della pagina: chi passa
  di qui senza chiedere nulla non lo paga. È l'unica richiesta di rete della
  sezione, e va verso questo stesso sito — da cui `connect-src 'self'` nella policy.
- La graduatoria è **BM25** (`src/assets/js/ricerca.js`): frequenza del termine,
  rarità nell'insieme, lunghezza del testo. Titolo, testata e categoria pesano
  più del corpo. Un accenno di morfologia riduce le parole a radice, così
  «magistratura» trova «magistrature».
- Dei testi lunghi si cita **la frase pertinente**, non tutto: dell'abstract
  della tesi interessano due righe, non millecinquecento battute.

Il **segnaposto non viene indicizzato**. Finché `giornale/` e `appunti/` sono
Lorem ipsum restano fuori da soli, senza doverlo scrivere altrove: ritrovare
latino finto sarebbe peggio che non ritrovare nulla.

> Il collo di bottiglia non è il codice, è il corpus. Oggi sono **14 voci per
> circa 400 parole** di italiano vero. Ogni testo aggiunto migliora il
> ritrovamento senza che si debba riaddestrare niente — è l'unico modo in cui
> «più dati» rende davvero, su un sito statico.

### 2. Insensatezza

Quando non trova nulla — e con un corpus così capita spesso — l'oracolo torna
a essere quello che era: una grammatica generativa che compone frasi
sintatticamente impeccabili e semanticamente vuote.

**Il ripiego non è una toppa: è ciò che tiene in piedi la premessa.** L'oracolo
non dice mai di sapere. O cita qualcuno, o straparla. Le formule che
introducono le citazioni («Non lo so. Ma di questo, qui, c'è scritto:») lo
dichiarano ogni volta: è quella cornice a rendere un ritrovamento impreciso
una citazione onesta anziché una risposta falsa.

Le **risposte scritte a mano** precedono entrambi gli strati. A «sei
un'intelligenza artificiale?» l'indice risponderebbe con i due articoli
sull'IA, che è pertinente e insieme sbagliato: la domanda era rivolta a lui,
non alla bibliografia.

La grammatica funziona su tre strati:

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
- **Quanto è grande**: i due pulsanti `SCALA` regolano l'intera veste, dal
  100% (il disegno originale) al 300%, a passi del 5%. Serve a due cose insieme: riempire uno
  schermo grande — un 34 pollici resta al 32% della sua larghezza a scala
  piena — e dare a chi ha poca vista un ingrandimento che *conserva* la
  composizione, invece dello zoom del browser.

  | cursore | corpo radice | colonna su 15" | colonna su 34" |
  |---|---|---|---|
  | 100% | 16px | 1100px (73%) | 1100px (32%) |
  | 150% | 24px | 1416px (94%) | 1650px (48%) |
  | 200% | 32px | 1384px (92%) | 2200px (64%) |
  | 300% | 48px | 1320px (87%) | 3248px (94%) |

  Il perno è `html { font-size: calc(100% * var(--scala)) }`, e quel `100%`
  è **il corpo che il browser considera predefinito**: chi lo ha alzato
  nelle proprie preferenze se lo vede moltiplicato, non sostituito. Da lì
  segue tutto, perché ogni misura del foglio è in `rem` — corpi, spaziature,
  larghezza della colonna. Le proporzioni non possono rompersi, perché
  nessuna misura è indipendente dalle altre: sul 34 pollici la riga di testo
  resta di 39 caratteri a ogni ingrandimento.

  > **Perché due pulsanti e non un cursore.** Cambiando la scala cambia la
  > pagina, e con essa il comando: trascinando, il pollice del cursore
  > scappa da sotto il puntatore. Un clic invece è istantaneo. Resta una
  > deriva — misurata, ~24px per clic su schermo da 15 pollici, perché la
  > colonna centrata cresce in entrambe le direzioni — quindi il primo clic
  > cade sempre a segno ma il secondo no. Per questo dopo il clic il fuoco
  > resta sul pulsante: si continua con Invio senza inseguire nulla.

  > **Il tranello.** Una proprietà **in transizione** resta congelata al
  > valore calcolato prima, se a cambiare è il corpo della radice invece
  > della proprietà stessa. I testi crescevano e la colonna no, perché
  > `.au-center` ha `transition: max-width`. Per questo `applica()` mette
  > `[data-scalando]` sulla radice, che spegne ogni transizione, forza un
  > ricalcolo leggendo una misura, e la toglie. Serve anche di suo:
  > trascinando il cursore si vuole vedere la misura, non inseguirla.

- **L'orologio da taschino**: l'innesco è `position: absolute` e non
  `fixed`, quindi l'angolo è quello della **pagina** e non della finestra:
  scorrendo se ne va con il resto, e per trovarlo bisogna essere in cima.
  È anche l'unica misura del foglio dichiarata in **pixel** invece che in
  `rem`: crescendo con la scala, a 300% il suo quadrato arrivava a 555px e
  copriva `N·Z·Q`, rubandogli il doppio clic della citazione — e il titolo
  non può difendersi alzando il proprio `z-index`, perché `.au-wrap` apre
  un contesto di impilamento che tiene i suoi discendenti sotto l'innesco.
  Del resto è un'area sensibile, non un contenuto.

- **Quanto movimento**: il cursore `MOTO` sotto l'interruttore del tema
  regola tutte le transizioni fra sezioni. La percentuale è la
  **velocità**: il 100% — il valore di partenza — è quella tarata a mano,
  di sempre, e scendendo il passaggio rallenta nella stessa proporzione.

  Velocità e tempo sono l'uno l'inverso dell'altro, quindi il
  moltiplicatore è `100 / percentuale` e non `percentuale / 100`: a metà
  velocità il passaggio dura il **doppio**. Sembra un dettaglio, ma è la
  differenza fra un passaggio che rallenta e uno che si accorcia.

  | cursore | moltiplicatore | durata | passaggio completo, dieci elementi |
  |---|---|---|---|
  | 0% | 0 | 0 ms | istantaneo |
  | 25% | ×4 | 1360 ms | ~2,7 s |
  | 50% | ×2 | 680 ms | ~1,4 s |
  | 75% | ×1,33 | 453 ms | ~0,9 s |
  | 100% *(partenza)* | ×1 | 340 ms | ~0,68 s |

  Lo **0% è fuori regola**, e deliberatamente: velocità nulla varrebbe
  durata infinita, e vale invece «nessun movimento». Ne segue che il punto
  più lento del cursore è il 25% e non lo 0%.

  **Cinque scatti e non un continuo** (`step="25"`): le vie di mezzo fra due
  scatti non si distinguono a occhio, e una scelta fatta di posizioni
  riconoscibili si ritrova. Un valore intermedio viene riportato allo scatto
  più vicino, e le frecce della tastiera si muovono di 25 alla volta.
  Passa da una sola variabile, `--moto`, per cui sono
  espressi tutti e quattro i tempi (`calc(0.34s * var(--moto))` e simili):
  si accorciano insieme, e la composizione a scalare continua a funzionare
  perché dipende dalla loro proporzione, non dai valori assoluti. Restano
  fisse le micro-interazioni — pulsanti, finestra delle poesie — che sono
  risposte a un gesto e non passaggi di pagina.
  La scelta sta in `localStorage` e viene applicata dallo script del
  `<head>` **prima del primo disegno**, altrimenti la prima transizione
  della visita andrebbe alla velocità piena comunque. Si scrive col CSSOM
  (`style.setProperty`), che la Content Security Policy ammette, non con
  uno `<style>` aggiunto, che rifiuta.
  Chi ha chiesto al sistema operativo di **ridurre le animazioni** ha già
  tutto fermo per via di `prefers-reduced-motion`, che vince con
  `!important` su qualunque valore: in quel caso il cursore si spegne e lo
  dichiara, invece di fingere di funzionare.
- **Impronta negli indirizzi**: il foglio di stile e `main.js` sono chiesti
  con `?v=` seguito dall'impronta del loro contenuto (filtro `versione` in
  `eleventy.config.js`). GitHub Pages dichiara `max-age=600` e non permette
  di cambiarlo: per dieci minuti un browser può tenersi un file e chiederne
  un altro. È successo davvero — rinominate le classi dell'intestazione, chi
  aveva il foglio vecchio in cache lo ha accoppiato all'HTML nuovo, e le
  regole che nascondono le intestazioni alternative non combaciavano più con
  i nomi usati nella pagina: comparivano tutte insieme, su ogni sezione.
  Con l'impronta, se il file cambia cambia il suo indirizzo, e nessuna copia
  vecchia può rispondere per la nuova.
  *Resta scoperto un caso*: i moduli importati da `main.js` (`router.js`,
  `poesie.js`, …) sono chiesti con il loro nome nudo, e versionarli
  vorrebbe dire riscrivere gli `import`. Cambiando un nome di classe usato
  dal JavaScript la finestra dei dieci minuti si riapre.
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
