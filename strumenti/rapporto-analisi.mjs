#!/usr/bin/env node
/**
 * Rapporto giornaliero sul traffico del sito.
 *
 * Interroga l'API di GoatCounter per un singolo giorno e ne ricava un
 * rapporto leggibile in `analisi/`, più i numeri grezzi in `analisi/dati/`
 * da cui viene rigenerato il riepilogo.
 *
 * Uso:
 *   node strumenti/rapporto-analisi.mjs                 # ieri
 *   node strumenti/rapporto-analisi.mjs --giorno=2026-08-06
 *   node strumenti/rapporto-analisi.mjs --prova         # stampa e basta
 *   node strumenti/rapporto-analisi.mjs --grezzo        # mostra il JSON ricevuto
 *
 * Variabili d'ambiente richieste:
 *   GOATCOUNTER_CODICE  il sottodominio del sito (es. «nzetaq»)
 *   GOATCOUNTER_TOKEN   una chiave API creata dal proprio account
 */

import { writeFile, mkdir, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const CARTELLA = 'analisi';
const CARTELLA_DATI = path.join(CARTELLA, 'dati');
const GIORNI_RIEPILOGO = 60;

const argomenti = process.argv.slice(2);
const opzione = (nome) => {
  const trovato = argomenti.find((a) => a.startsWith(`--${nome}=`));
  return trovato ? trovato.split('=').slice(1).join('=') : null;
};
const presente = (nome) => argomenti.includes(`--${nome}`);

const PROVA = presente('prova');
const GREZZO = presente('grezzo');

const CODICE = process.env.GOATCOUNTER_CODICE;
const TOKEN = process.env.GOATCOUNTER_TOKEN;

if (!CODICE || !TOKEN) {
  console.error(
    'Mancano le credenziali.\n' +
    '  GOATCOUNTER_CODICE  il sottodominio del sito su GoatCounter\n' +
    '  GOATCOUNTER_TOKEN   una chiave API creata dal proprio account'
  );
  process.exit(1);
}

/* ── Il giorno di cui si riferisce ── */

function ieri() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const GIORNO = opzione('giorno') || ieri();
if (!/^\d{4}-\d{2}-\d{2}$/.test(GIORNO)) {
  console.error(`Data non valida: ${GIORNO}. Attesa la forma AAAA-MM-GG.`);
  process.exit(1);
}

const INIZIO = `${GIORNO}T00:00:00Z`;
const FINE = `${GIORNO}T23:59:59Z`;

/* ── Interrogazione dell'API ── */

// L'indirizzo si può sostituire per le prove, senza toccare il codice.
const BASE = process.env.GOATCOUNTER_BASE || `https://${CODICE}.goatcounter.com/api/v0`;

async function chiedi(percorso, parametri = {}) {
  const url = new URL(`${BASE}/${percorso}`);
  url.searchParams.set('start', INIZIO);
  url.searchParams.set('end', FINE);
  for (const [k, v] of Object.entries(parametri)) url.searchParams.set(k, v);

  const risposta = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }
  });

  if (!risposta.ok) {
    const corpo = await risposta.text().catch(() => '');
    throw new Error(
      `${percorso}: ${risposta.status} ${risposta.statusText}${corpo ? ` — ${corpo.slice(0, 200)}` : ''}`
    );
  }
  const dati = await risposta.json();
  if (GREZZO) console.error(`\n── ${percorso} ──\n${JSON.stringify(dati, null, 2)}`);
  return dati;
}

/** Come sopra, ma un errore non fa cadere l'intero rapporto. */
async function chiediSePuoi(percorso, parametri) {
  try {
    return { dati: await chiedi(percorso, parametri) };
  } catch (errore) {
    console.error(`  avviso: ${errore.message}`);
    return { errore: errore.message };
  }
}

/* ── Normalizzazione ──
   I nomi dei campi variano fra un elenco e l'altro; invece di
   irrigidirsi su una forma sola si accettano i sinonimi plausibili. */

function elenco(risposta, quanti = 10) {
  const grezzo = risposta?.stats ?? risposta?.hits ?? [];
  if (!Array.isArray(grezzo)) return [];
  return grezzo
    .map((voce) => ({
      nome: voce.name ?? voce.path ?? voce.id ?? voce.title ?? '—',
      titolo: voce.title ?? '',
      visite: Number(voce.count ?? voce.total ?? 0),
      unici: Number(voce.count_unique ?? voce.unique ?? 0)
    }))
    .filter((v) => v.visite > 0)
    .sort((a, b) => b.visite - a.visite)
    .slice(0, quanti);
}

const numero = (n) => Number(n || 0).toLocaleString('it-IT');

/* ── Composizione del rapporto ── */

function tabella(intestazione, voci) {
  if (!voci.length) return '_Nessun dato._';
  return [
    `| ${intestazione} | Visite | Unici |`,
    '| --- | ---: | ---: |',
    ...voci.map(
      (v) => `| ${String(v.nome).replace(/\|/g, '\\|')} | ${numero(v.visite)} | ${numero(v.unici)} |`
    )
  ].join('\n');
}

async function main() {
  console.error(`Rapporto per il ${GIORNO} (sito ${CODICE})`);

  // Il totale è l'unica chiamata indispensabile: se fallisce, di solito
  // è un problema di credenziali e va segnalato subito.
  const totale = await chiedi('stats/total');

  const [pagine, paesi, provenienze, browser, sistemi] = await Promise.all([
    chiediSePuoi('stats/hits', { limit: 20 }),
    chiediSePuoi('stats/locations', { limit: 10 }),
    chiediSePuoi('stats/toprefs', { limit: 10 }),
    chiediSePuoi('stats/browsers', { limit: 10 }),
    chiediSePuoi('stats/systems', { limit: 10 })
  ]);

  const dati = {
    giorno: GIORNO,
    visite: Number(totale.total ?? 0),
    eventi: Number(totale.total_events ?? 0),
    pagine: elenco(pagine.dati, 20).map((v) => ({
      ...v,
      nome: v.nome === '/' ? '/ · home' : v.nome
    })),
    paesi: elenco(paesi.dati),
    provenienze: elenco(provenienze.dati),
    browser: elenco(browser.dati),
    sistemi: elenco(sistemi.dati)
  };

  const testo = componiRapporto(dati);

  if (PROVA) {
    console.log(testo);
    return;
  }

  await mkdir(CARTELLA_DATI, { recursive: true });
  await writeFile(path.join(CARTELLA, `${GIORNO}.md`), testo);
  await writeFile(path.join(CARTELLA_DATI, `${GIORNO}.json`), JSON.stringify(dati, null, 2) + '\n');
  await rigeneraRiepilogo();
  console.error(`Scritto ${CARTELLA}/${GIORNO}.md — ${numero(dati.visite)} visite`);
}

function componiRapporto(d) {
  const sezione = (titolo, corpo) => `## ${titolo}\n\n${corpo}`;

  if (!d.visite) {
    return [
      `# Traffico del ${d.giorno}`,
      '',
      'Nessuna visita registrata in questa giornata.',
      '',
      `_Rilevato tramite GoatCounter. Le visite sono conteggiate senza cookie e`,
      `senza dati personali; chi ha attivato un blocco degli script non compare._`,
      ''
    ].join('\n');
  }

  return [
    `# Traffico del ${d.giorno}`,
    '',
    `**${numero(d.visite)}** visite complessive.`,
    '',
    sezione('Sezioni lette', tabella('Sezione', d.pagine)),
    '',
    sezione('Provenienza geografica', tabella('Paese', d.paesi)),
    '',
    sezione('Da dove arrivano', tabella('Sorgente', d.provenienze)),
    '',
    sezione('Programmi di navigazione', tabella('Browser', d.browser)),
    '',
    sezione('Sistemi operativi', tabella('Sistema', d.sistemi)),
    '',
    '---',
    '',
    '_Rilevato tramite GoatCounter, senza cookie e senza dati personali._',
    '_Chi usa un blocco degli script non viene conteggiato: i numeri sono per difetto._',
    ''
  ].join('\n');
}

/** Il riepilogo si ricostruisce dai numeri grezzi già archiviati. */
async function rigeneraRiepilogo() {
  let file = [];
  try {
    file = (await readdir(CARTELLA_DATI)).filter((f) => f.endsWith('.json')).sort().reverse();
  } catch {
    return;
  }

  const giorni = [];
  for (const f of file.slice(0, GIORNI_RIEPILOGO)) {
    try {
      giorni.push(JSON.parse(await readFile(path.join(CARTELLA_DATI, f), 'utf8')));
    } catch {
      // un file illeggibile non deve impedire il riepilogo
    }
  }

  const totale = giorni.reduce((s, g) => s + (g.visite || 0), 0);
  const media = giorni.length ? Math.round(totale / giorni.length) : 0;

  const righe = giorni.map((g) => {
    const prima = (g.pagine && g.pagine[0]) || null;
    return `| [${g.giorno}](${g.giorno}.md) | ${numero(g.visite)} | ${prima ? prima.nome : '—'} |`;
  });

  const testo = [
    '# Analisi del traffico',
    '',
    'Rapporti generati una volta al giorno da GitHub Actions, a partire',
    'dai dati di GoatCounter. Un file per giornata; qui il riepilogo.',
    '',
    `**Ultimi ${giorni.length} giorni:** ${numero(totale)} visite complessive, ` +
      `media di ${numero(media)} al giorno.`,
    '',
    '| Giorno | Visite | Sezione più letta |',
    '| --- | ---: | --- |',
    ...righe,
    '',
    '---',
    '',
    '_Questo repository è pubblico: anche questi rapporti lo sono._',
    ''
  ].join('\n');

  await writeFile(path.join(CARTELLA, 'README.md'), testo);
}

main().catch((errore) => {
  console.error(`Errore: ${errore.message}`);
  process.exit(1);
});
