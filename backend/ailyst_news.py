# ==============================================================================
# ailyst_news.py
#
# Il "Collettore di Informazioni" di Ailyst.
#
# Questo modulo si occupa di:
#   1. Scaricare le notizie da fonti RSS (CoinDesk, Reuters, ecc.)
#   2. Analizzare il sentiment di ogni notizia (positivo o negativo)
#   3. Evitare di scaricare due volte la stessa notizia (deduplicazione)
#   4. Recuperare i prezzi attuali degli asset dalla watchlist
#   5. Recuperare l'indice "Fear & Greed" del mercato crypto
#
# ANALOGIA: Pensa a questo file come a un operaio che ogni mattina
#           gira per i banchi del mercato (RSS, API), raccoglie le
#           informazioni più fresche e le porta in magazzino (database).
# ==============================================================================

import hashlib
import json
import logging
from datetime import datetime, timedelta
from typing import Optional

import requests
import yfinance as yf

logger = logging.getLogger("ailyst_news")

# ------------------------------------------------------------------------------
# CONFIGURAZIONE FONTI RSS
# Puoi aggiungere o rimuovere feed qui senza toccare il resto del codice.
# ------------------------------------------------------------------------------
RSS_FEEDS = {
    "CoinDesk":       "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "CryptoPanic":    "https://cryptopanic.com/news/rss/",
    "The Block":      "https://www.theblock.co/rss.xml",
    "Reuters Business": "https://feeds.reuters.com/reuters/businessNews",
    "Cointelegraph":  "https://cointelegraph.com/rss",
}

# Parole chiave che aumentano il punteggio di rilevanza
BULLISH_KEYWORDS = [
    "surge", "rally", "soar", "jump", "gain", "high", "record", "growth",
    "bullish", "adoption", "approval", "launch", "partnership", "upgrade",
    "rialzo", "crescita", "record", "approvazione", "adozione"
]
BEARISH_KEYWORDS = [
    "crash", "drop", "fall", "plunge", "hack", "scam", "ban", "regulation",
    "bearish", "sell", "decline", "loss", "warning", "risk", "fear",
    "crollo", "calo", "perdita", "divieto", "attacco", "truffa"
]


# ==============================================================================
# FUNZIONI DI SUPPORTO
# ==============================================================================

def get_article_hash(title: str) -> str:
    """
    Crea un'impronta digitale univoca per ogni articolo basata sul titolo.
    È come un codice a barre: due articoli con lo stesso titolo avranno
    lo stesso hash e verranno trattati come duplicati.
    """
    normalized = title.lower().strip()
    return hashlib.md5(normalized.encode("utf-8")).hexdigest()


def score_sentiment(text: str) -> float:
    """
    Analizza il tono di un testo e restituisce un punteggio:
    - Vicino a  +1.0 = notizia molto positiva (bullish)
    - Vicino a   0.0 = notizia neutrale
    - Vicino a  -1.0 = notizia molto negativa (bearish)

    Usa VADER, un analizzatore di sentiment progettato per testi brevi e social.
    """
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        analyzer = SentimentIntensityAnalyzer()
        scores = analyzer.polarity_scores(text)
        return round(scores["compound"], 3)
    except ImportError:
        # Se VADER non è installato, usiamo un metodo semplice basato su parole chiave
        text_lower = text.lower()
        score = 0.0
        for word in BULLISH_KEYWORDS:
            if word in text_lower:
                score += 0.1
        for word in BEARISH_KEYWORDS:
            if word in text_lower:
                score -= 0.1
        return max(-1.0, min(1.0, round(score, 3)))


def extract_mentioned_assets(text: str, watchlist_symbols: list[str]) -> list[str]:
    """
    Cerca i simboli della watchlist nel testo dell'articolo.
    Esempio: se la watchlist contiene 'BTC' e il titolo dice 'Bitcoin (BTC) surges',
    questa funzione restituirà ['BTC'].
    """
    text_upper = text.upper()
    mentioned = []
    for symbol in watchlist_symbols:
        # Cerchiamo il simbolo come parola intera (non come parte di un'altra parola)
        if f" {symbol} " in f" {text_upper} " or f"({symbol})" in text_upper:
            mentioned.append(symbol)
    return list(set(mentioned))


def score_relevance(title: str, summary: str, watchlist_symbols: list[str]) -> int:
    """
    Calcola quanto una notizia è rilevante per la watchlist dell'utente.
    Punteggio da 0 a 100:
    - 100 = notizia direttamente su un asset in watchlist
    -  50 = notizia generica su crypto/mercati
    -   0 = notizia non rilevante
    """
    full_text = f"{title} {summary}".upper()
    score = 30  # Punteggio base per qualsiasi notizia finanziaria

    # Bonus se menziona asset in watchlist
    for symbol in watchlist_symbols:
        if symbol.upper() in full_text:
            score += 25
            break  # Massimo un bonus per asset

    # Bonus per parole chiave importanti
    important_keywords = ["bitcoin", "ethereum", "crypto", "market", "fed", "inflation",
                          "rate", "etf", "sec", "defi", "nft", "blockchain"]
    for kw in important_keywords:
        if kw in full_text.lower():
            score += 5

    return min(100, score)


# ==============================================================================
# RACCOLTA NOTIZIE DA RSS
# ==============================================================================

def fetch_rss_feeds(watchlist_symbols: list[str] = None) -> list[dict]:
    """
    Scarica e analizza tutti i feed RSS configurati.
    Restituisce una lista di articoli con sentiment e rilevanza già calcolati.
    """
    if watchlist_symbols is None:
        watchlist_symbols = []

    articles = []

    for source_name, feed_url in RSS_FEEDS.items():
        try:
            import feedparser
            feed = feedparser.parse(feed_url)

            for entry in feed.entries[:15]:  # Massimo 15 articoli per fonte
                title   = entry.get("title", "").strip()
                summary = entry.get("summary", entry.get("description", "")).strip()
                url     = entry.get("link", "")

                if not title:
                    continue

                # Data di pubblicazione
                published_at = None
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    try:
                        import time
                        published_at = datetime(*entry.published_parsed[:6])
                    except Exception:
                        published_at = datetime.utcnow()

                full_text = f"{title} {summary}"

                articles.append({
                    "hash":             get_article_hash(title),
                    "title":            title,
                    "summary":          summary[:500],  # Limitiamo la lunghezza
                    "source":           source_name,
                    "url":              url,
                    "sentiment_score":  score_sentiment(full_text),
                    "relevance_score":  score_relevance(title, summary, watchlist_symbols),
                    "assets_mentioned": json.dumps(extract_mentioned_assets(full_text, watchlist_symbols)),
                    "published_at":     published_at or datetime.utcnow(),
                })

        except Exception as e:
            logger.warning(f"Errore nel fetch di {source_name}: {e}")
            continue

    return articles


# ==============================================================================
# PIPELINE PRINCIPALE: SCARICA, DEDUPLICA E SALVA
# ==============================================================================

def run_collection_pipeline(db, watchlist_symbols: list[str] = None) -> list[dict]:
    """
    Pipeline completa di raccolta notizie.

    FLUSSO (come in una linea di produzione CNC):
    1. Scarica articoli da tutti i feed RSS
    2. Controlla se ogni articolo è già in database (deduplica)
    3. Salva solo i nuovi articoli
    4. Restituisce la lista dei nuovi articoli aggiunti

    Args:
        db: Sessione database SQLAlchemy
        watchlist_symbols: Lista di simboli da monitorare ['BTC', 'ETH', 'AAPL']
    """
    from ailyst_models import AilystNewsCache

    if watchlist_symbols is None:
        watchlist_symbols = []

    raw_articles = fetch_rss_feeds(watchlist_symbols)
    new_articles = []

    for article in raw_articles:
        # Controllo duplicati: esiste già questo hash nel DB?
        existing = db.query(AilystNewsCache).filter(
            AilystNewsCache.hash == article["hash"]
        ).first()

        if existing:
            continue  # Già presente, saltiamo

        # Salva il nuovo articolo
        news_item = AilystNewsCache(
            hash             = article["hash"],
            title            = article["title"],
            summary          = article["summary"],
            source           = article["source"],
            url              = article["url"],
            sentiment_score  = article["sentiment_score"],
            relevance_score  = article["relevance_score"],
            assets_mentioned = article["assets_mentioned"],
            published_at     = article["published_at"],
        )
        db.add(news_item)
        new_articles.append(article)

    db.commit()
    logger.info(f"Ailyst: {len(new_articles)} nuovi articoli salvati su {len(raw_articles)} scaricati.")
    return new_articles


def get_recent_news(db, hours: int = 24, asset_filter: str = None, limit: int = 30) -> list[dict]:
    """
    Recupera le notizie più recenti dal database.

    Args:
        db: Sessione database
        hours: Ultime N ore da considerare (default: ultime 24 ore)
        asset_filter: Simbolo specifico da filtrare (es: 'BTC') — opzionale
        limit: Numero massimo di articoli da restituire
    """
    from ailyst_models import AilystNewsCache

    cutoff = datetime.utcnow() - timedelta(hours=hours)
    query = db.query(AilystNewsCache).filter(
        AilystNewsCache.fetched_at >= cutoff
    )

    if asset_filter:
        # Filtra per asset specifico cercando nel JSON assets_mentioned
        query = query.filter(
            AilystNewsCache.assets_mentioned.contains(asset_filter.upper())
        )

    news = query.order_by(
        AilystNewsCache.relevance_score.desc(),
        AilystNewsCache.fetched_at.desc()
    ).limit(limit).all()

    return [
        {
            "id":              n.id,
            "title":           n.title,
            "summary":         n.summary,
            "source":          n.source,
            "url":             n.url,
            "sentiment_score": n.sentiment_score,
            "sentiment_label": _sentiment_label(n.sentiment_score),
            "relevance_score": n.relevance_score,
            "assets_mentioned": json.loads(n.assets_mentioned or "[]"),
            "published_at":    n.published_at.isoformat() if n.published_at else None,
        }
        for n in news
    ]


def _sentiment_label(score: float) -> str:
    """Converte il punteggio numerico in etichetta leggibile."""
    if score >= 0.35:
        return "bullish"
    elif score <= -0.35:
        return "bearish"
    else:
        return "neutral"


# ==============================================================================
# DATI DI MERCATO: PREZZI E FEAR & GREED
# ==============================================================================

def get_crypto_prices(symbols_coingecko: dict) -> dict:
    """
    Recupera prezzi crypto attuali da CoinGecko.

    Args:
        symbols_coingecko: dict {symbol: coingecko_id} es: {'BTC': 'bitcoin', 'ETH': 'ethereum'}

    Returns:
        dict {symbol: {price, change_24h, market_cap}}
    """
    if not symbols_coingecko:
        return {}

    coin_ids = list(symbols_coingecko.values())
    ids_param = ",".join(coin_ids)

    try:
        response = requests.get(
            "https://api.coingecko.com/api/v3/simple/price",
            params={
                "ids": ids_param,
                "vs_currencies": "usd,eur",
                "include_24hr_change": "true",
                "include_market_cap": "true",
            },
            timeout=10
        )
        response.raise_for_status()
        data = response.json()

        result = {}
        for symbol, cg_id in symbols_coingecko.items():
            if cg_id in data:
                coin_data = data[cg_id]
                result[symbol] = {
                    "price_usd":    coin_data.get("usd"),
                    "price_eur":    coin_data.get("eur"),
                    "change_24h":   coin_data.get("usd_24h_change"),
                    "market_cap":   coin_data.get("usd_market_cap"),
                    "source":       "CoinGecko",
                }
        return result

    except Exception as e:
        logger.error(f"Errore CoinGecko prices: {e}")
        return {}


def get_stock_prices(symbols_yahoo: dict) -> dict:
    """
    Recupera prezzi di azioni/ETF da Yahoo Finance (yfinance).

    Args:
        symbols_yahoo: dict {symbol: yahoo_ticker} es: {'AAPL': 'AAPL', 'SP500': '^GSPC'}

    Returns:
        dict {symbol: {price, change_24h}}
    """
    if not symbols_yahoo:
        return {}

    result = {}
    for symbol, yahoo_ticker in symbols_yahoo.items():
        try:
            ticker = yf.Ticker(yahoo_ticker)
            info = ticker.fast_info
            price = getattr(info, "last_price", None)
            prev_close = getattr(info, "previous_close", None)

            change_pct = None
            if price and prev_close and prev_close != 0:
                change_pct = round(((price - prev_close) / prev_close) * 100, 2)

            result[symbol] = {
                "price_usd":  round(price, 2) if price else None,
                "price_eur":  None,  # yfinance non converte automaticamente
                "change_24h": change_pct,
                "market_cap": None,
                "source":     "Yahoo Finance",
            }
        except Exception as e:
            logger.warning(f"Errore yfinance per {yahoo_ticker}: {e}")
            continue

    return result


def get_fear_greed_index() -> dict:
    """
    Recupera il Fear & Greed Index del mercato crypto da alternative.me.

    Questo indice va da 0 (paura estrema = possibile momento d'acquisto)
    a 100 (avidità estrema = possibile momento di vendita).
    È una metrica utile come "termometro del mercato".
    """
    try:
        response = requests.get(
            "https://api.alternative.me/fng/?limit=2",
            timeout=8
        )
        response.raise_for_status()
        data = response.json()
        latest = data["data"][0]
        yesterday = data["data"][1] if len(data["data"]) > 1 else None

        return {
            "value":           int(latest["value"]),
            "label":           latest["value_classification"],
            "timestamp":       latest["timestamp"],
            "yesterday_value": int(yesterday["value"]) if yesterday else None,
            "change":          int(latest["value"]) - int(yesterday["value"]) if yesterday else None,
        }
    except Exception as e:
        logger.warning(f"Errore Fear & Greed Index: {e}")
        return {"value": None, "label": "N/D", "timestamp": None}


def get_all_prices_for_watchlist(watchlist_items: list) -> dict:
    """
    Funzione principale che recupera tutti i prezzi per la watchlist.
    Divide automaticamente tra crypto (CoinGecko) e azioni (Yahoo Finance).

    Args:
        watchlist_items: Lista di oggetti AilystWatchlist dal database

    Returns:
        dict {symbol: {price_usd, price_eur, change_24h, ...}}
    """
    crypto_map = {}
    stock_map  = {}

    for item in watchlist_items:
        if item.asset_type == "crypto" and item.coingecko_id:
            crypto_map[item.symbol] = item.coingecko_id
        elif item.yahoo_ticker:
            stock_map[item.symbol] = item.yahoo_ticker

    crypto_prices = get_crypto_prices(crypto_map)
    stock_prices  = get_stock_prices(stock_map)

    return {**crypto_prices, **stock_prices}
