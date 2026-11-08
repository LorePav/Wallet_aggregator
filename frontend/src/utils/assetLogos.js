/**
 * Risolutore centralizzato dei loghi degli asset.
 *
 * Priorità:
 *   1. override manuale (REMOTE_OVERRIDES)
 *   2. file locale in src/assets/logos/{SIMBOLO}.png|svg|jpg|webp
 *   3. provider remoti (CoinCap / Parqet per le crypto, FMP / Parqet per azioni ed ETF)
 *   4. iniziali colorate (gestite da AssetIcon)
 *
 * Per aggiungere un logo senza toccare il codice basta salvare un file in
 * src/assets/logos con nome uguale al simbolo dell'asset, es. KAMINO.png
 * oppure IWDA.AS.png.
 */

// Vite importa automaticamente ogni immagine presente nella cartella.
const LOCAL_LOGO_MODULES = import.meta.glob('../assets/logos/*.{png,svg,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const LOCAL_LOGOS = Object.entries(LOCAL_LOGO_MODULES).reduce((acc, [path, url]) => {
  const fileName = path.split('/').pop() || '';
  const symbol = fileName.replace(/\.[^.]+$/, '').toUpperCase();
  if (symbol) acc[symbol] = url;
  return acc;
}, {});

// Override remoti espliciti: vincono sui provider automatici ma non sui file locali.
// Utile per asset che non hanno un ticker riconosciuto (es. protocolli DeFi).
const REMOTE_OVERRIDES = {
  // 'USX': 'https://esempio.com/usx.png',
};

// Simboli che rappresentano denaro contante, non asset da quotare.
export const CASH_SYMBOLS = new Set(['EUR', 'USD', 'GBP', 'JPY', 'CHF']);

const CRYPTO_QUOTES = ['USDT', 'USDC', 'BUSD', 'FDUSD', 'TUSD', 'USDP', 'USD', 'EUR', 'GBP'];

export const isCashSymbol = (symbol) => CASH_SYMBOLS.has(String(symbol || '').toUpperCase().trim());

const sanitizeSymbol = (symbol) => String(symbol || '').toUpperCase().trim();

/**
 * Trasforma coppie crypto tipo BTCUSD / BTC-USD / BTC/USDT in BTC.
 * Non tocca i simboli che sono già "base" (es. USDT resta USDT).
 */
export const normalizeCryptoSymbol = (symbol) => {
  const raw = sanitizeSymbol(symbol).replace(/[/_]/g, '-');

  if (raw.includes('-')) {
    const [base, quote] = raw.split('-');
    if (base && CRYPTO_QUOTES.includes(quote)) return base;
  }

  for (const quote of CRYPTO_QUOTES) {
    if (raw.endsWith(quote) && raw.length > quote.length + 1) {
      return raw.slice(0, -quote.length);
    }
  }

  return raw;
};

const looksLikeCryptoPair = (symbol) => {
  const raw = sanitizeSymbol(symbol);
  return raw.length > 3 && CRYPTO_QUOTES.some((quote) => raw.endsWith(quote));
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const coincapUrl = (symbol) =>
  `https://assets.coincap.io/assets/icons/${encodeURIComponent(symbol.toLowerCase())}@2x.png`;

const parqetCryptoUrl = (symbol) =>
  `https://assets.parqet.com/logos/crypto/${encodeURIComponent(symbol)}?format=png`;

const fmpUrl = (symbol) =>
  `https://financialmodelingprep.com/image-stock/${encodeURIComponent(symbol)}.png`;

const parqetSymbolUrl = (symbol) =>
  `https://assets.parqet.com/logos/symbol/${encodeURIComponent(symbol)}?format=png`;

const STOCK_EXCHANGE_SUFFIXES = ['.MI', '.DE', '.AS', '.PA', '.MC', '.L', '.SW'];

const stockVariants = (symbol) => {
  const variants = [symbol];
  if (symbol.includes('.')) {
    // IWDA.AS -> IWDA (ultimo tentativo se il provider non conosce la borsa)
    variants.push(symbol.split('.')[0]);
  } else {
    // Il DB a volte salva solo il ticker (STLAM, ZAL): proviamo le borse europee più comuni.
    STOCK_EXCHANGE_SUFFIXES.forEach((suffix) => variants.push(symbol + suffix));
  }
  return unique(variants);
};

/**
 * Restituisce true se esiste un logo locale per il simbolo.
 * Serve ad AssetIcon per dare sempre priorità ai file caricati a mano.
 */
export const hasLocalLogo = (symbol) => {
  const raw = sanitizeSymbol(symbol);
  if (!raw) return false;
  return Boolean(LOCAL_LOGOS[raw] || LOCAL_LOGOS[normalizeCryptoSymbol(raw)]);
};

/**
 * Restituisce la lista ordinata di URL da provare per il logo.
 * Se la lista è vuota, AssetIcon mostra le iniziali.
 */
export const getLogoCandidates = ({ symbol, category } = {}) => {
  const raw = sanitizeSymbol(symbol);
  if (!raw || isCashSymbol(raw)) return [];

  const upperCategory = String(category || '').toUpperCase();
  const isCrypto = upperCategory.includes('CRYPTO') || upperCategory.includes('CRIPTO');
  const isFarming = upperCategory.includes('FARM');
  const cryptoSymbol = normalizeCryptoSymbol(raw);

  // 1. Logo locale + override espliciti.
  const localKeys = unique([raw, cryptoSymbol]);
  const curated = unique([
    REMOTE_OVERRIDES[raw],
    REMOTE_OVERRIDES[cryptoSymbol],
    ...localKeys.map((key) => LOCAL_LOGOS[key]),
  ]);

  // I farming/protocolli non hanno un provider affidabile: solo loghi curati.
  if (isFarming) return curated;

  // 2. Crypto: CoinCap prima, Parqet come riserva.
  if (isCrypto) {
    return unique([...curated, coincapUrl(cryptoSymbol), parqetCryptoUrl(cryptoSymbol)]);
  }

  // 3. Azioni / ETF / asset generici.
  const cryptoFallback = looksLikeCryptoPair(raw)
    ? [coincapUrl(cryptoSymbol), parqetCryptoUrl(cryptoSymbol)]
    : [];
  const stockUrls = stockVariants(raw).flatMap((variant) => [fmpUrl(variant), parqetSymbolUrl(variant)]);

  return unique([...curated, ...cryptoFallback, ...stockUrls]);
};

/**
 * Colore stabile (stesso simbolo -> stesso colore) per il fallback a iniziali.
 */
export const getSymbolColor = (symbol) => {
  const palette = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#f97316', '#84cc16',
  ];
  const raw = sanitizeSymbol(symbol) || '?';
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
};

export const getInitials = (symbol) => {
  const raw = sanitizeSymbol(symbol);
  return raw ? raw.charAt(0) : '?';
};

export const isStockCategory = (category) => {
  const upperCategory = String(category || '').toUpperCase();
  return ['AZIONI', 'AZIONE', 'STOCK', 'EQUITY', 'ETF', 'FUND', 'FONDO'].some((value) =>
    upperCategory.includes(value)
  );
};
