/**
 * DESIGN TOKEN SCRAPER
 *
 * DISCLAIMER LEGALE: Questo script rispetta robots.txt e non effettua
 * richieste aggressive. Usare solo per ricerca educativa.
 *
 * NOTA TECNICA: La maggior parte delle piattaforme moderne (Coinbase, Binance,
 * Bybit, Jupiter) servono CSS bundled via JavaScript (webpack/vite). Questo
 * significa che il CSS non è disponibile come file statico separato, e lo
 * scraping CSS diretto NON funzionerà. In questi casi lo script:
 *   1. Segnala il problema chiaramente
 *   2. Conserva il file pre-curato esistente in scripts/tokens/
 *
 * USO: node scripts/scrape-tokens.js
 *      node scripts/scrape-tokens.js --target binance
 */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');
const { URL } = require('url');

// ──────────────────────────────────────────────
// CONFIGURAZIONE
// ──────────────────────────────────────────────
const TARGETS = [
  { name: 'coinbase',   url: 'https://www.coinbase.com' },
  { name: 'binance',    url: 'https://www.binance.com'  },
  { name: 'robinhood',  url: 'https://robinhood.com'    },
  { name: 'bybit',      url: 'https://www.bybit.com'    },
  { name: 'jupiter',    url: 'https://jup.ag'           },
];

const TIMEOUT_MS  = 8000;
const MAX_CSS_FILES = 4;          // Massimo CSS file per sito (evita richieste eccessive)
const OUTPUT_DIR  = path.join(__dirname, 'tokens');
const USER_AGENT  = 'DesignTokenBot/1.0 (+educational-research; non-commercial)';

// ──────────────────────────────────────────────
// HTTP FETCH con timeout e redirect
// ──────────────────────────────────────────────
function fetchUrl(rawUrl, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Troppi redirect'));
    let parsedUrl;
    try { parsedUrl = new URL(rawUrl); }
    catch (e) { return reject(new Error(`URL non valido: ${rawUrl}`)); }

    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const req = lib.get(rawUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/css,text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: TIMEOUT_MS,
    }, (res) => {
      // Gestione redirect
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        const loc = res.headers.location;
        if (!loc) return reject(new Error('Redirect senza Location header'));
        const redirectUrl = loc.startsWith('http') ? loc : new URL(loc, rawUrl).href;
        return fetchUrl(redirectUrl, maxRedirects - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume(); // Consuma il body per liberare la connessione
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { if (data.length < 2_000_000) data += chunk; }); // Max 2MB
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ──────────────────────────────────────────────
// ROBOTS.TXT — rispetto del protocollo
// ──────────────────────────────────────────────
async function isAllowedByRobots(siteUrl) {
  const u = new URL(siteUrl);
  const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
  try {
    const txt = await fetchUrl(robotsUrl);
    const lines = txt.split('\n');
    let activeAgent = false;
    for (const raw of lines) {
      const line = raw.trim().toLowerCase();
      if (line.startsWith('user-agent:')) {
        const agent = line.split(':')[1]?.trim();
        activeAgent = (agent === '*' || agent === 'designtokenbot');
      } else if (activeAgent && line.startsWith('disallow:')) {
        const disallowed = line.split(':')[1]?.trim();
        // Blocco della root = tutto il sito è off-limits
        if (disallowed === '/' || disallowed === '/*') return false;
      }
    }
    return true;
  } catch {
    return true; // Se robots.txt non trovato, si assume permesso
  }
}

// ──────────────────────────────────────────────
// PARSING CSS → DESIGN TOKEN
// ──────────────────────────────────────────────
function extractTokens(css) {
  const tokens = { colors: [], fonts: [], radii: [] };

  // Cerca CSS custom properties (--nome: valore)
  const customPropRx = /--([a-zA-Z][\w-]*)\s*:\s*([^;}{]+);/g;
  let m;
  while ((m = customPropRx.exec(css)) !== null) {
    const name  = m[1].toLowerCase();
    const value = m[2].trim();
    const isColor = /(color|bg|background|accent|primary|secondary|brand|surface|text|fill|stroke)/i.test(name);
    const isFontVar = /(font|family|typeface)/i.test(name);
    const isRadius  = /(radius|rounded|corner)/i.test(name);
    const looksLikeColor = /^#[0-9a-f]{3,8}$/i.test(value) || /^rgba?\s*\(/.test(value);

    if (isColor && looksLikeColor)     tokens.colors.push({ name: `--${m[1]}`, value });
    if (isFontVar)                     tokens.fonts.push({ name: `--${m[1]}`, value });
    if (isRadius)                      tokens.radii.push({ name: `--${m[1]}`, value });
  }

  // Font-family esplicite (non custom-property)
  const fontRx = /(?:^|[{;])\s*font-family\s*:\s*([^;}{]+);/gm;
  const seen = new Set();
  while ((m = fontRx.exec(css)) !== null && tokens.fonts.length < 5) {
    const fam = m[1].trim();
    if (!seen.has(fam)) { seen.add(fam); tokens.fonts.push({ name: 'font-family', value: fam }); }
  }

  // Border-radius espliciti
  const radiusRx = /(?:^|[{;])\s*border-radius\s*:\s*([^;}{]+);/gm;
  while ((m = radiusRx.exec(css)) !== null && tokens.radii.length < 5) {
    tokens.radii.push({ name: 'border-radius', value: m[1].trim() });
  }

  return tokens;
}

// ──────────────────────────────────────────────
// ESTRAZIONE <link stylesheet> dall'HTML
// ──────────────────────────────────────────────
function extractCssLinks(html, base) {
  const rx = /<link[^>]+href=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi;
  const links = [];
  let m;
  while ((m = rx.exec(html)) !== null) {
    try { links.push(new URL(m[1], base).href); } catch {}
  }
  return links;
}

// ──────────────────────────────────────────────
// MAIN SCRAPER per singolo target
// ──────────────────────────────────────────────
async function scrapeTarget(target) {
  console.log(`\n┌─ [${target.name.toUpperCase()}] ${target.url}`);

  // 1. Robots
  const allowed = await isAllowedByRobots(target.url);
  if (!allowed) {
    console.log(`│  ⛔ robots.txt blocca la root. Skip.`);
    return null;
  }
  console.log(`│  ✓ robots.txt: OK`);

  // 2. HTML fetch
  let html;
  try {
    html = await fetchUrl(target.url);
    console.log(`│  ✓ HTML ricevuto (${(html.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.log(`│  ✗ HTML fetch fallito: ${e.message}`);
    return null;
  }

  // 3. Estrai link CSS
  const cssLinks = extractCssLinks(html, target.url);
  console.log(`│  CSS link trovati: ${cssLinks.length}`);

  if (cssLinks.length === 0) {
    console.log(`│  ⚠  Nessun <link stylesheet> trovato. Probabile SPA con CSS bundled.`);
    return null;
  }

  // 4. Fetch e parsing CSS
  const all = { colors: [], fonts: [], radii: [] };
  let parsed = 0;
  for (const link of cssLinks.slice(0, MAX_CSS_FILES)) {
    try {
      const css = await fetchUrl(link);
      const t = extractTokens(css);
      all.colors.push(...t.colors);
      all.fonts.push(...t.fonts);
      all.radii.push(...t.radii);
      parsed++;
    } catch (e) {
      console.log(`│  ✗ CSS non raggiungibile: ${link.substring(0, 70)}...`);
    }
  }

  if (all.colors.length === 0 && all.fonts.length === 0) {
    console.log(`│  ⚠  CSS trovati (${parsed}) ma nessun token estratto (CSS-in-JS?).`);
    return null;
  }

  console.log(`│  ✓ Token estratti → colori:${all.colors.length} font:${all.fonts.length} radii:${all.radii.length}`);
  return {
    themeName:  target.name,
    scrapedAt:  new Date().toISOString(),
    sourceUrl:  target.url,
    note: 'Auto-scraped — verifica manualmente prima di usare.',
    tokens: {
      colors: all.colors.slice(0, 20),
      fonts:  all.fonts.slice(0,  5),
      radii:  all.radii.slice(0,  5),
    },
  };
}

// ──────────────────────────────────────────────
// ENTRY POINT
// ──────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const targetArg = process.argv.find((a, i) => process.argv[i - 1] === '--target');
  const targets = targetArg ? TARGETS.filter(t => t.name === targetArg) : TARGETS;

  if (targets.length === 0) {
    console.error(`❌ Target "${targetArg}" non trovato. Disponibili: ${TARGETS.map(t=>t.name).join(', ')}`);
    process.exit(1);
  }

  console.log('╔═══════════════════════════════════╗');
  console.log('║     DESIGN TOKEN SCRAPER v1.0     ║');
  console.log('╚═══════════════════════════════════╝');

  for (const target of targets) {
    const outFile = path.join(OUTPUT_DIR, `${target.name}.json`);
    const scraped  = await scrapeTarget(target);

    if (scraped) {
      fs.writeFileSync(outFile, JSON.stringify(scraped, null, 2));
      console.log(`└─ 💾 Salvato: tokens/${target.name}.json`);
    } else {
      if (fs.existsSync(outFile)) {
        console.log(`└─ 📦 Conservato file pre-curato: tokens/${target.name}.json`);
      } else {
        console.log(`└─ ⚠  Crea manualmente: scripts/tokens/${target.name}.json`);
      }
    }
  }

  console.log('\n✅ Scraping completato.');
  console.log('   Passo successivo → node scripts/generate-themes.js\n');
}

main().catch(err => { console.error('ERRORE FATALE:', err); process.exit(1); });
