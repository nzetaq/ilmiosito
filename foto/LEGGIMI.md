# Le fotografie della galleria

Metti qui i file — `.jpg`, `.png`, `.webp` — e compariranno nella
sezione **Galleria** del sito, in ordine di nome.

## Come si ordinano

Per nome di file. Un prefisso numerico decide l'ordine senza
rinominare niente d'altro:

    01-bologna-portico.jpg
    02-mare-inverno.jpg

## Le didascalie

Facoltative, in un file `didascalie.json` in questa stessa cartella:

```json
{
  "01-bologna-portico.jpg": "Sotto i portici, verso sera",
  "02-mare-inverno.jpg": "Il mare d'inverno"
}
```

Una foto senza didascalia compare lo stesso: la didascalia è un di
più, non un obbligo.

## Cosa succede al momento della pubblicazione

**I dati nascosti vengono tolti.** Una fotografia scattata col
telefono porta con sé il luogo, l'ora esatta e il numero di serie
dell'apparecchio. Pubblicarla così com'è significa pubblicare anche
quelli — la posizione di casa propria è a due clic per chiunque
scarichi il file. La compilazione li rimuove senza ricomprimere
l'immagine: i pixel restano identici.

**Il peso invece resta quello.** Non c'è nessuno strumento che
rimpicciolisca le foto: un file da otto megabyte viene servito da otto
megabyte, e chi apre la pagina se lo scarica. Prima di metterle qui,
ridimensionale — 1600 punti sul lato lungo bastano per uno schermo, e
un JPEG di qualità 80 pesa qualche centinaio di kilobyte. La
compilazione avverte quando trova un file oltre il mezzo megabyte.

## Se preferisci tenerle in una repository privata

Si può: la pubblicazione le preleva da lì e le copia qui prima di
compilare. Serve un segreto `FOTO_CHIAVE` nelle impostazioni del
repository e una variabile `FOTO_REPO` col nome di quella privata.
Vale la pena sapere che **le foto che finiscono sul sito sono
pubbliche comunque**: la repository privata protegge gli originali —
quelli grandi, quelli scartati, quelli col luogo dentro — non le copie
in linea.
