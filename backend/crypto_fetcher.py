# ============================================================
# CRYPTO_FETCHER.PY
# Scarica dati crypto da CoinGecko API (piano gratuito).
# Funziona sia con API key (demo) sia senza.
#
# Pensalo come il "magazziniere crypto": va a prendere tutti
# i dati di un token (prezzi, supply, community, dev activity)
# e li porta al resto del sistema.
#
# CoinGecko ID examples: "bitcoin", "ethereum", "chainlink"
# Non usa ticker (BTC, ETH) ma ID testuali → usa search_coins()
# per convertire simbolo → ID.
# ============================================================

import os
import time
import requests
import numpy as np

COINGECKO_BASE = "https://api.coingecko.com/api/v3"
_API_KEY = os.environ.get("COINGECKO_API_KEY", "")


def _headers() -> dict:
    """Headers per CoinGecko. Aggiunge la chiave se disponibile."""
    if _API_KEY:
        return {"x-cg-demo-api-key": _API_KEY}
    return {}


def _get(url: str, params: dict = None, timeout: int = 15) -> requests.Response:
    """GET con gestione rate-limit (429) e retry automatico."""
    for attempt in range(3):
        try:
            r = requests.get(url, params=params, headers=_headers(), timeout=timeout)
            if r.status_code == 429:
                # CoinGecko rate limit — aspettiamo e riproviamo
                time.sleep(2 ** attempt)
                continue
            return r
        except requests.RequestException:
            if attempt == 2:
                raise
            time.sleep(1)
    return r  # type: ignore


def search_coins(query: str) -> list:
    """
    Cerca monete per nome o simbolo.
    Ritorna lista di {id, name, symbol, market_cap_rank}.

    Esempio: search_coins("bitcoin") → [{"id": "bitcoin", ...}]
    """
    r = _get(f"{COINGECKO_BASE}/search", params={"query": query})
    r.raise_for_status()
    coins = r.json().get("coins", [])
    return [
        {
            "id":             c["id"],
            "name":           c["name"],
            "symbol":         c.get("symbol", "").upper(),
            "market_cap_rank": c.get("market_cap_rank"),
            "thumb":          c.get("thumb"),
        }
        for c in coins[:15]
    ]


def resolve_coin_id(query: str) -> str | None:
    """
    Converte un simbolo (es. "BTC") o nome (es. "Bitcoin")
    nel CoinGecko ID (es. "bitcoin").
    Priorità: match simbolo esatto > match nome esatto > primo risultato.
    """
    results = search_coins(query)
    if not results:
        return None

    query_upper = query.strip().upper()
    # 1. Match esatto su simbolo
    for c in results:
        if c["symbol"] == query_upper:
            return c["id"]
    # 2. Match esatto su nome (case-insensitive)
    query_lower = query.strip().lower()
    for c in results:
        if c["name"].lower() == query_lower:
            return c["id"]
    # 3. Primo risultato
    return results[0]["id"]


def fetch_coin_data(coin_id: str) -> dict | None:
    """
    Scarica il profilo completo di una moneta da CoinGecko.
    Ritorna il dizionario raw JSON o None se non trovata.

    Include: market_data, developer_data, community_data, tickers.
    """
    params = {
        "localization":    "false",
        "tickers":         "true",
        "market_data":     "true",
        "community_data":  "true",
        "developer_data":  "true",
        "sparkline":       "false",
    }
    r = _get(f"{COINGECKO_BASE}/coins/{coin_id}", params=params)
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.json()


def fetch_price_history(coin_id: str, days: int = 365) -> list:
    """
    Scarica la storia prezzi giornaliera di una moneta.
    Ritorna lista di {date, price, market_cap, volume}.

    days: 7 | 30 | 90 | 365 | "max"
    """
    params = {
        "vs_currency": "usd",
        "days":        str(days),
        "interval":    "daily",
    }
    r = _get(f"{COINGECKO_BASE}/coins/{coin_id}/market_chart", params=params)
    r.raise_for_status()
    raw = r.json()

    prices      = raw.get("prices", [])
    market_caps = raw.get("market_caps", [])
    volumes     = raw.get("total_volumes", [])

    result = []
    for i, (ts, price) in enumerate(prices):
        mc  = market_caps[i][1] if i < len(market_caps) else None
        vol = volumes[i][1]     if i < len(volumes)     else None
        result.append({
            "date":       _ts_to_date(ts),
            "price":      price,
            "market_cap": mc,
            "volume":     vol,
        })
    return result


def _ts_to_date(timestamp_ms: int) -> str:
    """Converte timestamp millisecondi in stringa YYYY-MM-DD."""
    return time.strftime("%Y-%m-%d", time.gmtime(timestamp_ms / 1000))


def safe_nested(data: dict, *keys, default=None):
    """
    Legge un valore annidato in modo sicuro.
    Esempio: safe_nested(data, "market_data", "market_cap", "usd")
    """
    current = data
    for key in keys:
        if not isinstance(current, dict):
            return default
        current = current.get(key)
        if current is None:
            return default
    if isinstance(current, float) and np.isnan(current):
        return default
    return current


def format_large_number(number) -> str:
    """Formatta numeri grandi: 1_000_000_000 → '1.00 B'."""
    if number is None:
        return "N/D"
    try:
        n = float(number)
    except (TypeError, ValueError):
        return "N/D"
    if np.isnan(n):
        return "N/D"
    if abs(n) >= 1_000_000_000_000:
        return f"{n / 1_000_000_000_000:.2f} T"
    if abs(n) >= 1_000_000_000:
        return f"{n / 1_000_000_000:.2f} B"
    if abs(n) >= 1_000_000:
        return f"{n / 1_000_000:.2f} M"
    if abs(n) >= 1_000:
        return f"{n / 1_000:.2f} K"
    return f"{n:.2f}"
