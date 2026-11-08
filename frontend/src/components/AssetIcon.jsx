import React, { useMemo, useState } from 'react';
import {
  getInitials,
  getLogoCandidates,
  getSymbolColor,
  hasLocalLogo,
  isCashSymbol,
  isStockCategory,
} from '../utils/assetLogos';

const CACHE_PREFIX = 'assetLogoUrl:';
// La cache dei loghi scade dopo 30 giorni: se un provider cambia URL,
// l'icona non resta sbagliata per sempre.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const EMPTY_URLS = [];

const readCache = (symbol) => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + symbol);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && parsed.url) {
        if (!parsed.ts || Date.now() - parsed.ts > CACHE_TTL_MS) {
          localStorage.removeItem(CACHE_PREFIX + symbol);
          return null;
        }
        return parsed.url;
      }
    } catch {
      // Vecchio formato (stringa semplice): lo consideriamo valido e verrà
      // riscritto nel nuovo formato al prossimo caricamento.
    }
    return raw;
  } catch {
    return null;
  }
};

const writeCache = (symbol, url) => {
  try {
    localStorage.setItem(CACHE_PREFIX + symbol, JSON.stringify({ url, ts: Date.now() }));
  } catch {
    // localStorage non disponibile (modalità privata / quota piena): ignora.
  }
};

const clearCache = (symbol) => {
  try {
    localStorage.removeItem(CACHE_PREFIX + symbol);
  } catch {
    // ignora
  }
};

/**
 * Icona circolare di un asset con fallback automatico:
 * logo locale -> provider remoto -> iniziali colorate.
 */
const AssetIcon = ({ symbol = '', name = '', category = '', size = 36, title, style, className }) => {
  const cacheKey = String(symbol || '').toUpperCase().trim();
  const identity = `${cacheKey}|${String(category || '').toUpperCase()}`;
  const candidates = useMemo(() => getLogoCandidates({ symbol, category }), [symbol, category]);
  const cachedUrl = useMemo(() => readCache(cacheKey), [cacheKey]);
  const [failedState, setFailedState] = useState({ identity, urls: EMPTY_URLS });

  // Se cambia l'asset ripartiamo dai candidati "puliti" senza bisogno di un effect.
  const failedUrls = failedState.identity === identity ? failedState.urls : EMPTY_URLS;

  // Un logo locale appena aggiunto deve avere sempre la precedenza sulla cache.
  const orderedCandidates = useMemo(() => {
    if (!cachedUrl || !candidates.includes(cachedUrl) || hasLocalLogo(symbol)) return candidates;
    return [cachedUrl, ...candidates.filter((url) => url !== cachedUrl)];
  }, [cachedUrl, candidates, symbol]);

  const src = orderedCandidates.find((url) => !failedUrls.includes(url)) || null;
  const label = title || (name ? `${symbol} - ${name}` : symbol);
  const isCash = isCashSymbol(symbol);

  const handleError = () => {
    if (!src) return;
    if (readCache(cacheKey) === src) clearCache(cacheKey);
    setFailedState((prev) => {
      const urls = prev.identity === identity ? prev.urls : EMPTY_URLS;
      if (urls.includes(src)) return { identity, urls };
      return { identity, urls: [...urls, src] };
    });
  };

  const handleLoad = () => {
    if (src) writeCache(cacheKey, src);
  };

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: isCash
      ? 'rgba(16, 185, 129, 0.2)'
      : (isStockCategory(category) ? '#ffffff' : 'var(--surface-hover)'),
    border: '1px solid rgba(255,255,255,0.1)',
    ...style,
  };

  if (isCash) {
    return (
      <div style={containerStyle} title={label} className={className}>
        <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>💵</span>
      </div>
    );
  }

  if (!src) {
    return (
      <div
        style={{ ...containerStyle, backgroundColor: getSymbolColor(symbol), border: '1px solid rgba(255,255,255,0.15)' }}
        title={label}
        className={className}
      >
        <span
          style={{
            fontSize: Math.max(10, size * 0.38),
            fontWeight: 700,
            lineHeight: 1,
            color: '#ffffff',
          }}
        >
          {getInitials(symbol)}
        </span>
      </div>
    );
  }

  return (
    <div style={containerStyle} title={label} className={className}>
      <img
        src={src}
        alt={`Logo ${symbol}`}
        loading="lazy"
        decoding="async"
        onError={handleError}
        onLoad={handleLoad}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />
    </div>
  );
};

export default AssetIcon;
