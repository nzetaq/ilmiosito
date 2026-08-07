# Analisi del traffico

Qui compariranno i rapporti sul traffico del sito: uno per giornata,
generati automaticamente da GitHub Actions alle 05:10 UTC a partire dai
dati raccolti da [GoatCounter](https://www.goatcounter.com/).

**Non c'è ancora nulla.** Questo file è un segnaposto, e verrà
sostituito dal riepilogo vero non appena il primo rapporto sarà pronto.

## Perché è vuota

Il conteggio non è ancora acceso. Servono quattro passi, descritti per
esteso nel [README del progetto](../README.md#analisi-del-traffico):

1. aprire un conto su goatcounter.com e scegliere il nome dell'account;
2. scriverlo in `src/_data/site.json`, alla voce `analisi.goatcounter`;
3. creare nel proprio conto una chiave API con permesso di lettura;
4. registrare su GitHub la variabile `GOATCOUNTER_CODICE` e il segreto
   `GOATCOUNTER_TOKEN`.

Dal secondo passo il sito comincia a contare e il cruscotto di
GoatCounter si popola subito. Dal quarto, la mattina seguente, compare
qui il primo file.

## Cosa comparirà

- `AAAA-MM-GG.md` — un rapporto per giornata: sezioni lette, provenienza
  geografica, siti da cui arrivano i lettori, programmi di navigazione e
  sistemi operativi.
- `dati/AAAA-MM-GG.json` — gli stessi numeri in forma grezza, se
  servisse rielaborarli.
- Questo file — il riepilogo degli ultimi sessanta giorni, con totale,
  media giornaliera e la sezione più letta di ogni giornata.

---

_Questo repository è pubblico: anche questi rapporti lo saranno._
