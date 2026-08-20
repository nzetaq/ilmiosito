/**
 * Le figure del salvaschermo: un disegno per ogni veste.
 *
 * Il primo è arrivato da fuori — `psichedelia.html`, un esperimento a
 * sé che non fa parte di questa repository — e disegna quel che Officina è: onde, caleidoscopi, frattali,
 * inchiostri fluorescenti che non stanno fermi. Le sue sei figure sono
 * rimaste quelle, con la stessa matematica; sono cadute solo le due
 * cose che qui non avrebbero senso, il puntatore che deforma il piano
 * e i tasti che cambiano figura. Un salvaschermo si spegne al primo
 * gesto: non c'è modo di comandarlo senza farlo sparire, e le figure
 * girano perciò da sole.
 *
 * Le altre cinque sono nate qui, perché Officina non è il sito: è una
 * delle sei vesti, e uno schermo che si accende psichedelico davanti a
 * chi ha scelto Saggio è la veste di un altro. Ognuna disegna quel che
 * la propria veste dichiara altrove — la carta marmorizzata del libro,
 * il cartellone che gira, i ritagli di cartoncino, la carta
 * topografica, il fosforo del terminale — con i suoi inchiostri e non
 * con una tavolozza inventata qui.
 *
 * ── Come è fatto un disegno ──
 * Ogni veste dichiara una funzione sola:
 *
 *     vec3 figura(int quale, vec2 p, float t)
 *
 * `p` è il piano centrato e normalizzato sul lato corto — quindi
 * indipendente dalla forma della finestra — e `t` sono i secondi. Il
 * preludio e la coda, uguali per tutti, ci mettono intorno le
 * dichiarazioni, il rumore frattale e la vignettatura.
 *
 * `quale` serve solo a Officina, che di figure ne ha sei: chi ne ha
 * una sola ignora l'argomento. È la stessa funzione a essere chiamata
 * due volte durante il passaggio da una figura all'altra, con due
 * indici diversi, e il risultato mescolato: costa un disegno in più
 * per i due secondi della dissolvenza, e non richiede una seconda tela.
 *
 * I colori non stanno qui. Arrivano come uniformi dal foglio di stile,
 * che è il solo posto dove sono scritti: vedi `salvaschermo.js`.
 */

/* Un triangolo solo, più grande dello schermo: copre la tela intera
   senza il taglio diagonale che due triangoli lascerebbero in mezzo. */
export const VERTICE = `
attribute vec2 a_pos;
void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

/* ── Il preludio: quel che ogni figura può dare per scontato ── */
const PRELUDIO = `
precision highp float;

uniform vec2  u_res;        /* la tela, in pixel */
uniform float u_time;       /* i secondi da quando la figura è accesa */
uniform float u_hue;        /* la ruota dei colori, per chi la usa */
uniform int   u_figura;     /* quale disegno */
uniform int   u_figura_b;   /* quello verso cui si sta passando */
uniform float u_mescola;    /* quanto del secondo è già arrivato */

/* Gli inchiostri della veste, presi dal foglio di stile: fondo,
   inchiostro e le tre tinte, ciascuno da 0 a 1. */
uniform vec3 u_fondo;
uniform vec3 u_inchiostro;
uniform vec3 u_tinta;
uniform vec3 u_tinta_2;
uniform vec3 u_tinta_3;

const float PI = 3.14159265;

mat2 giro(float a){
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for(int i = 0; i < 5; i++){
    v += a * noise(p);
    p *= 2.03;
    a *= 0.5;
  }
  return v;
}
`;

/* ── La coda: il piano, il passaggio fra due figure, la vignettatura ──
   `VIGNETTA` la dichiara ogni veste: è quanto lo schermo si spegne ai
   bordi, e non è lo stesso per una carta topografica e per un
   cartellone stampato piatto. */
const CODA = `
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);

  vec3 col = figura(u_figura, p, u_time);
  if(u_mescola > 0.0) col = mix(col, figura(u_figura_b, p, u_time), u_mescola);

  col = clamp(col, 0.0, 1.0);
  col *= 1.0 - VIGNETTA * smoothstep(0.65, 1.45, length(p));
  gl_FragColor = vec4(col, 1.0);
}
`;

/* ── Officina · le sei figure di psichedelia ──
   La tavolozza è quella dell'esperimento e non quella della veste: tre
   coseni sfasati che percorrono la ruota intera. È il solo disegno che
   non usa gli inchiostri del sito, ed è giusto così — Officina è la
   veste che porta il fluorescente, e questa ne è la versione accesa. */
const OFFICINA = `
const float VIGNETTA = 0.35;

vec3 tavolozza(float t){
  return 0.5 + 0.5 * cos(6.28318 * (t + u_hue + vec3(0.0, 0.33, 0.67)));
}

vec3 figura(int quale, vec2 p, float t){
  float r = max(length(p), 1e-4);
  float a = atan(p.y, p.x);
  vec3 col = vec3(0.0);

  if(quale == 0){
    /* plasma: onde sinusoidali sovrapposte */
    float v = sin(p.x * 7.0 + t * 1.10)
            + sin(p.y * 7.0 - t * 0.90)
            + sin((p.x + p.y) * 5.0 + t * 0.70)
            + sin(r * 12.0 - t * 1.60);
    col = tavolozza(v * 0.12 + t * 0.03);
  }
  else if(quale == 1){
    /* caleidoscopio: piano ripiegato in 12 spicchi */
    float seg = PI / 6.0;
    float b = abs(mod(a, seg * 2.0) - seg);
    vec2 q = vec2(cos(b), sin(b)) * r;
    q += 0.30 * vec2(sin(t * 0.40), cos(t * 0.33));
    float v = sin(q.x * 10.0 + t) + sin(q.y * 10.0 - t * 1.2) + sin(r * 14.0 - t * 2.0);
    col = tavolozza(v * 0.14 + t * 0.02);
    col *= 0.70 + 0.30 * sin(r * 9.0 - t * 1.5);
  }
  else if(quale == 2){
    /* tunnel: coordinate polari proiettate all'infinito */
    vec2 uv = vec2(a / PI, 0.55 / r + t * 0.55);
    float v = sin(uv.x * 8.0 + t) + sin(uv.y * 6.0) + sin((uv.x + uv.y) * 4.0 - t * 0.5);
    col = tavolozza(v * 0.16 + t * 0.04);
    col *= smoothstep(0.0, 0.32, r);
  }
  else if(quale == 3){
    /* frattale kali: ripiegamento e inversione iterati */
    vec2 z = p * 1.15;
    vec2 c = vec2(0.72 + 0.14 * sin(t * 0.23), 0.53 + 0.12 * cos(t * 0.19));
    float acc = 0.0;
    for(int i = 0; i < 14; i++){
      z = abs(z) / max(dot(z, z), 1e-4) - c;
      acc += exp(-5.0 * abs(length(z) - 1.05));
    }
    col = tavolozza(acc * 0.09 + t * 0.03);
  }
  else if(quale == 4){
    /* liquido: rumore frattale deformato su se stesso */
    vec2 s = p * 1.5;
    vec2 q = vec2(fbm(s + 0.10 * t), fbm(s + vec2(5.2, 1.3) - 0.08 * t));
    vec2 w = vec2(fbm(s + 3.0 * q + vec2(1.7, 9.2) + 0.12 * t),
                  fbm(s + 3.0 * q + vec2(8.3, 2.8) - 0.10 * t));
    float f = fbm(s + 3.5 * w);
    col = tavolozza(f * 1.4 + length(w) * 0.35 + t * 0.02);
    col *= 0.55 + 0.75 * f;
  }
  else {
    /* spirale: bracci logaritmici in controrotazione */
    float l = log(r + 0.05);
    float v = sin(a * 5.0 + l * 7.0 - t * 2.0);
    float w = sin(a * 3.0 - l * 5.0 + t * 1.3);
    col = tavolozza(v * 0.20 + w * 0.15 + t * 0.04);
    col *= 0.75 + 0.25 * sin(r * 18.0 - t * 3.0);
  }

  /* La stessa leggera correzione di gamma dell'originale: gli
     inchiostri fluorescenti tengono, i mezzi toni si alzano. */
  return pow(clamp(col, 0.0, 1.0), vec3(0.85));
}
`;

/* ── Saggio · la carta marmorizzata ──
   La veste della rivista non ha campiture né ombre: la carta è carta.
   Il suo salvaschermo è la controguardia di un libro rilegato — la
   marmorizzazione a pettine, dove l'inchiostro galleggia sull'acqua e
   viene tirato piano. Nessun colore squillante: l'ambra della veste,
   una vena più chiara, e il fondo che resta quasi sempre in vista. */
const SAGGIO = `
const float VIGNETTA = 0.30;

vec3 figura(int quale, vec2 p, float t){
  /* Il bagno d'acqua: il rumore deformato due volte su se stesso è
     quel che fa le volute. Lentissimo — questa veste non ha fretta. */
  vec2 s = p * 1.6;
  float d = t * 0.045;
  vec2 q = vec2(fbm(s + vec2(0.0, d)), fbm(s + vec2(4.3, 1.7) - d));
  vec2 w = vec2(fbm(s + 2.1 * q + vec2(1.2, 3.4) + 0.6 * d),
                fbm(s + 2.1 * q + vec2(7.1, 0.9) - 0.5 * d));
  float v = fbm(s + 2.4 * w);

  /* Il fondo si scalda dove l'inchiostro si è raccolto. */
  vec3 col = mix(u_fondo, mix(u_fondo, u_tinta, 0.46), smoothstep(0.28, 0.68, v));
  col = mix(col, mix(u_fondo, u_tinta_3, 0.38), smoothstep(0.52, 0.92, length(w)) * 0.55);

  /* Il pettine: le vene sottili sono le creste di una sinusoide del
     campo, alzate a potenza perché restino righe e non fasce. */
  float onda = abs(sin(PI * (v * 5.0 + length(w) * 1.1)));
  float vena = pow(1.0 - onda, 9.0);
  col = mix(col, u_tinta_2, vena * 0.55);

  /* Il fiore d'oro, uno solo, che passa e se ne va. */
  float f = smoothstep(0.62, 0.98, v) * smoothstep(0.30, 0.05, length(p - 0.42 * vec2(sin(t * 0.07), cos(t * 0.05))));
  col = mix(col, u_inchiostro, f * 0.35);

  return col;
}
`;

/* ── Insegna · le lame ──
   Il cartellone si legge da lontano e non ha mezzi toni: spicchi che
   girano, anelli che scorrono, e i bordi netti. Netti ma non
   scalettati — la larghezza del bordo è quella di un pixel, calcolata
   sul posto, altrimenti gli spicchi sfarfallerebbero al centro dove si
   stringono. */
const INSEGNA = `
const float VIGNETTA = 0.14;

/* Un'onda quadra addolcita quanto basta: l'onda va da 0 a 1 e
   torna, la larghezza è quanto dura il passaggio fra le due campiture. */
float taglio(float onda, float larghezza){
  return smoothstep(0.5 - larghezza, 0.5 + larghezza, onda);
}

vec3 figura(int quale, vec2 p, float t){
  float pixel = 1.0 / min(u_res.x, u_res.y);
  float r = max(length(p), 1e-4);
  float a = atan(p.y, p.x);

  /* Dodici spicchi che girano piano. Il bordo di uno spicchio, vicino
     al centro, vale meno di un pixel: là il taglio si allarga. */
  float spicchi = 6.0;
  float onda = abs(fract((a / PI) * spicchi + t * 0.06) - 0.5) * 2.0;
  float largo = clamp(pixel * spicchi / r, 0.004, 0.5);
  float lama = taglio(onda, largo);

  /* Gli anelli non tagliano: scambiano la tinta dello spicchio, come
     il secondo colore di una stampa a due passaggi. */
  float anello = taglio(abs(fract(r * 2.2 - t * 0.10) - 0.5) * 2.0, pixel * 2.2 + 0.002);
  vec3 acceso = mix(u_tinta, u_tinta_2, anello);

  vec3 col = mix(u_fondo, acceso, lama);

  /* Il disco al centro, che pulsa come un'insegna al neon, e il suo
     anello di contorno. */
  float disco = 0.13 + 0.012 * sin(t * 1.1);
  col = mix(col, u_tinta_3, taglio(1.0 - smoothstep(disco - pixel, disco + pixel, r), 0.02));
  float orlo = abs(r - disco * 1.5);
  col = mix(col, u_fondo, taglio(1.0 - smoothstep(0.006, 0.006 + pixel * 2.0, orlo), 0.02));

  return col;
}
`;

/* ── Cartone · i ritagli ──
   Lo studio della United Productions of America non disegnava
   sfumature: ritagliava cartoncini piatti e li muoveva a piani. Qui
   sono sette, ognuno con la sua velocità, la sua tinta e la propria
   copia fuori registro sotto — che è il difetto di stampa diventato
   maniera. La grana della carta è ferma: dipende dal pixel e non dal
   tempo, quindi non sfarfalla. */
const CARTONE = `
const float VIGNETTA = 0.26;

/* Un rettangolo dagli angoli tondi: cambiando il raggio da 0 a metà
   lato si passa dal cartoncino squadrato al disco. */
float ritaglio(vec2 p, vec2 mezzi, float tondo){
  vec2 d = abs(p) - mezzi + tondo;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - tondo;
}

vec3 tinta(float n){
  if(n < 0.28) return u_tinta;
  if(n < 0.56) return u_tinta_2;
  if(n < 0.82) return u_tinta_3;
  return u_inchiostro;
}

vec3 figura(int quale, vec2 p, float t){
  vec3 col = u_fondo;
  float pixel = 1.5 / min(u_res.x, u_res.y);

  for(int i = 0; i < 9; i++){
    float n = float(i);
    float seme = hash(vec2(n, 3.0));
    float seme2 = hash(vec2(n, 9.0));
    float seme3 = hash(vec2(n, 17.0));

    /* Il posto di partenza sta su una scacchiera di tre per tre, con
       uno scarto per non farla riconoscere: lasciati liberi, i ritagli
       si radunavano tutti in un angolo e mezzo schermo restava vuoto.
       Da lì ognuno deriva per conto suo, e torna da dove è uscito
       senza che si veda un salto: due seni non finiscono mai. */
    vec2 casella = vec2(mod(n, 3.0) - 1.0, floor(n / 3.0) - 1.0);
    vec2 base = casella * vec2(0.60, 0.38) + 0.16 * vec2(seme - 0.5, seme3 - 0.5);
    float lento = 0.05 + 0.05 * seme;
    vec2 centro = base + 0.20 * vec2(sin(t * lento + seme * 6.28),
                                     cos(t * lento * 0.82 + seme2 * 6.28));

    vec2 q = giro(seme3 * 6.28 + t * (0.02 + 0.03 * seme2)) * (p - centro);
    vec2 mezzi = vec2(0.07 + 0.13 * seme2, 0.05 + 0.15 * seme3);
    float tondo = min(mezzi.x, mezzi.y) * (0.25 + 0.75 * seme);
    float d = ritaglio(q, mezzi, tondo);

    /* Prima la copia fuori registro, poi il cartoncino sopra: l'ordine
       è quello dei passaggi in macchina. */
    float scarto = 0.012 + 0.010 * seme;
    float fuori = ritaglio(q + vec2(scarto, -scarto), mezzi, tondo);
    col = mix(col, mix(u_fondo, tinta(seme2), 0.55), 1.0 - smoothstep(0.0, pixel, fuori));
    col = mix(col, tinta(seme), 1.0 - smoothstep(0.0, pixel, d));
  }

  /* La grana del cartoncino, ferma sullo schermo. */
  col *= 0.965 + 0.07 * hash(floor(gl_FragCoord.xy * 0.5));
  return col;
}
`;

/* ── Atlante · le isoipse ──
   Il tavolo del cartografo: un rilievo che non esiste, disegnato come
   si disegna una carta. Le curve di livello sono tutte uguali tranne
   una ogni cinque, che è la direttrice e va più marcata; sotto una
   certa quota c'è l'acqua, e sull'acqua le curve non si tracciano. Il
   reticolo dei paralleli sta sopra tutto, sottile, come il ritaglio di
   un foglio millimetrato. */
const ATLANTE = `
const float VIGNETTA = 0.38;

vec3 figura(int quale, vec2 p, float t){
  /* Il foglio scorre, e insieme il rilievo cambia lentamente forma:
     senza la seconda cosa la carta sarebbe un'immagine trascinata. */
  vec2 q = p * 1.9 + vec2(t * 0.020, t * 0.012);
  float h = fbm(q + 0.45 * fbm(q * 0.6 + vec2(0.0, t * 0.01)));

  float acqua = smoothstep(0.44, 0.40, h);
  vec3 col = mix(u_fondo, mix(u_fondo, u_tinta_2, 0.30), acqua);
  /* La terra si alza di tono con la quota, ma di pochissimo: una carta
     non è un quadro. */
  col = mix(col, mix(col, u_inchiostro, 0.10), smoothstep(0.44, 0.85, h));

  /* Le curve di livello: dove la quota attraversa un gradino. */
  float passi = 26.0;
  float n = h * passi;
  float f = fract(n);
  float d = min(f, 1.0 - f);
  float direttrice = step(mod(floor(n), 5.0), 0.5);
  float spessore = 0.045 + 0.045 * direttrice;
  float curva = (1.0 - smoothstep(0.0, spessore, d)) * (1.0 - acqua);
  col = mix(col, mix(u_tinta, u_inchiostro, 0.25 * direttrice), curva * (0.55 + 0.35 * direttrice));

  /* Il reticolo, in coordinate del foglio e non del rilievo. */
  vec2 rete = abs(fract(p * 4.0 + vec2(t * 0.02, t * 0.012)) - 0.5);
  float maglia = 1.0 - smoothstep(0.0, 0.012, min(rete.x, rete.y));
  col = mix(col, u_tinta_3, maglia * 0.16);

  /* La lampada del tavolo: una banda di luce che attraversa la carta
     una volta ogni tanto. */
  float lampada = smoothstep(0.55, 0.0, abs(dot(p, vec2(0.72, 0.42)) - sin(t * 0.05) * 0.9));
  col += u_tinta * lampada * 0.05;

  return col;
}
`;

/* ── Terminale · il fosforo ──
   L'unica veste che non viene dalla stampa non poteva avere un
   disegno di inchiostri: qui il colore è luce accesa da dietro. È un
   oscilloscopio — una figura di Lissajous che cambia rapporto
   lentissimamente — con il nucleo, l'alone della persistenza, la
   griglia del quadro e le righe di scansione.
   La traccia è fatta di quaranta segmenti e la distanza si prende dal
   più vicino: meno segmenti si vedrebbero come una spezzata, molti di
   più costerebbero senza aggiungere nulla. */
const TERMINALE = `
const float VIGNETTA = 0.45;

float segmento(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

vec2 traccia(float u, float t){
  float rx = 3.0 + 0.6 * sin(t * 0.043);
  float ry = 2.0 + 0.6 * cos(t * 0.031);
  return vec2(sin(u * rx + t * 0.5), sin(u * ry + t * 0.37 + 1.2)) * 0.62;
}

vec3 figura(int quale, vec2 p, float t){
  float d = 10.0;
  vec2 prima = traccia(0.0, t);
  for(int i = 1; i <= 40; i++){
    vec2 poi = traccia(float(i) / 40.0 * 6.28318, t);
    d = min(d, segmento(p, prima, poi));
    prima = poi;
  }

  vec3 col = u_fondo;

  /* La griglia del quadro, appena accesa. */
  vec2 rete = abs(fract(p * 5.0) - 0.5);
  col += u_tinta * (1.0 - smoothstep(0.0, 0.012, min(rete.x, rete.y))) * 0.09;

  /* Nucleo e persistenza: due esponenziali, una stretta e una larga. */
  col += u_tinta * exp(-d * 150.0);
  col += u_tinta * exp(-d * 26.0) * 0.34;
  /* L'ambra è la seconda traccia dei terminali che ne avevano due:
     qui è la stessa figura, un poco in ritardo. */
  float ritardo = 10.0;
  vec2 vecchia = traccia(t * 0.5, t - ritardo);
  col += u_tinta_2 * exp(-length(p - vecchia) * 40.0) * 0.55;

  /* Le righe di scansione e il respiro dell'alta tensione. */
  col *= 0.90 + 0.10 * sin(gl_FragCoord.y * PI * 0.5);
  col *= 0.97 + 0.03 * sin(t * 3.1);

  return col;
}
`;

/* Il disegno di ciascuna veste, e quante figure ha. Chi non compare
   qui — non dovrebbe accadere, gli stili sono sei — prende Officina. */
const DISEGNI = {
  officina: { corpo: OFFICINA, quante: 6 },
  saggio: { corpo: SAGGIO, quante: 1 },
  insegna: { corpo: INSEGNA, quante: 1 },
  cartone: { corpo: CARTONE, quante: 1 },
  atlante: { corpo: ATLANTE, quante: 1 },
  terminale: { corpo: TERMINALE, quante: 1 }
};

export function disegno(stile) {
  const scelto = DISEGNI[stile] || DISEGNI.officina;
  return { sorgente: PRELUDIO + scelto.corpo + CODA, quante: scelto.quante };
}
