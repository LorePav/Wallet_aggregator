import yfinance as yf
import requests
import requests

def get_exchange_rates() -> dict[str, float]:
    """
    Recupera i tassi di cambio rispetto all'Euro (EUR).
    Restituisce un dizionario: { 'USD': 1.05, 'GBP': 0.85, ... } 
    che rappresenta quante unità di valuta estera servono per 1 EUR, 
    oppure direttamente il moltiplicatore per convertire in EUR a seconda della convenzione.
    Per comodità calcoliamo il moltiplicatore per convertire DA valuta estera A Euro.
    Es. se EURUSD=X è 1.05 (1€ = 1.05$), per convertire 100$ in Euro facciamo 100 / 1.05.
    Noi restituiremo direttamente il tasso, quindi i prezzi andranno DIVISI per questo valore se la valuta è la base (es USD),
    o calcolati in modo coerente.
    """
    rates = {'EUR': 1.0}
    symbols = {
        'USD': 'EURUSD=X',
        'GBP': 'EURGBP=X',
        'CHF': 'EURCHF=X',
        'JPY': 'EURJPY=X'
    }
    
    for currency, ticker_sym in symbols.items():
        try:
            ticker = yf.Ticker(ticker_sym)
            try:
                rate = ticker.fast_info.last_price
            except:
                hist = ticker.history(period="1d")
                if not hist.empty:
                    rate = hist['Close'].iloc[-1]
                else:
                    rate = 1.0 # fallback
            rates[currency] = round(float(rate), 4)
        except Exception as e:
            print(f"Errore recupero tasso di cambio per {currency}: {e}")
            rates[currency] = 1.0 # In caso di errore fallisce "silenziosamente" con 1:1
            
    return rates

def _get_live_price(import_symbol: str) -> float:
    """Helper: restituisce il prezzo live per un simbolo Yahoo, oppure 0.0."""
    try:
        ticker = yf.Ticker(import_symbol)
        try:
            price = ticker.fast_info.last_price
            if price is not None and float(price) > 0:
                return round(float(price), 2)
        except Exception:
            pass
        hist = ticker.history(period="1d")
        if not hist.empty:
            return round(float(hist['Close'].iloc[-1]), 2)
    except Exception:
        pass
    return 0.0

def get_live_prices(symbols: list) -> dict:
    """
    Recupera i prezzi in tempo reale usando yfinance.
    Auto-scopre il suffisso di borsa per le azioni europee.
    """
    prices = {}
    EUROPEAN_SUFFIXES = [".MI", ".DE", ".PA", ".AS", ".MC", ".L", ".SW", ".VI", ".BR", ".LS"]

    for sym in symbols:
        if sym in ["USD", "EUR", "GBP", "CHF"]:
            prices[sym] = 1.0
            continue

        # Mappatura primaria per casi speciali
        import_symbol = sym
        if sym == "TAOUSD":
            import_symbol = "TAO22974-USD"
        elif sym.endswith("USD") and sym != "USD" and not sym.endswith("-USD"):
            import_symbol = sym[:-3] + "-USD"
        elif sym in _yahoo_symbol_cache:
            # Usa il simbolo già risolto dalla cache (es. ENI -> ENI.MI)
            import_symbol = _yahoo_symbol_cache[sym]

        price = _get_live_price(import_symbol)

        # Se prezzo è 0 e non c'era già una risoluzione in cache, prova suffissi europei
        if price == 0.0 and sym not in _yahoo_symbol_cache and "." not in import_symbol and "-" not in import_symbol:
            for suffix in EUROPEAN_SUFFIXES:
                candidate = import_symbol + suffix
                candidate_price = _get_live_price(candidate)
                if candidate_price > 0:
                    print(f"[finance] Live price risolto {sym} -> {candidate}")
                    _yahoo_symbol_cache[sym] = candidate
                    price = candidate_price
                    break

        prices[sym] = price

    return prices

def _try_fetch_history(import_symbol: str, period: str) -> list:
    """Helper: fetch history e restituisce una lista di dict {date, price} oppure []."""
    try:
        ticker = yf.Ticker(import_symbol)
        hist = ticker.history(period=period)
        if not hist.empty:
            return [{"date": date.strftime("%Y-%m-%d"), "price": round(float(row['Close']), 2)}
                    for date, row in hist.iterrows()]
    except Exception:
        pass
    return []

# Cache in-memory: sym -> yahoo_symbol risolto (evita N lookup per lo stesso asset)
_yahoo_symbol_cache: dict = {}

def get_historical_prices(sym: str, period: str = "1y") -> list:
    """
    Recupera la serie storica per il grafico dell'asset.
    Auto-scopre il suffisso di borsa per le azioni europee.
    """
    # Normalizza il periodo: yfinance v1.2.0 accetta solo valori ufficiali Yahoo Finance.
    VALID_PERIODS = {"1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"}
    if period not in VALID_PERIODS:
        period = "5d" if period == "7d" else "1mo"

    if sym in ["USD", "EUR", "GBP", "CHF"]:
        return []

    # Usa la cache se il simbolo Yahoo è già noto
    if sym in _yahoo_symbol_cache:
        return _try_fetch_history(_yahoo_symbol_cache[sym], period)

    # --- Mappatura primaria per casi speciali ---
    import_symbol = sym
    if sym == "TAOUSD":
        import_symbol = "TAO22974-USD"
    elif sym.endswith("USD") and sym != "USD" and not sym.endswith("-USD"):
        import_symbol = sym[:-3] + "-USD"

    # --- Prova il simbolo diretto ---
    result = _try_fetch_history(import_symbol, period)
    if result:
        _yahoo_symbol_cache[sym] = import_symbol
        return result

    # --- Auto-discovery per azioni europee: prova suffissi di borsa comuni ---
    # Solo se il simbolo non contiene già un punto o trattino (es. BTC-USD non viene modificato)
    if "." not in import_symbol and "-" not in import_symbol:
        EUROPEAN_SUFFIXES = [".MI", ".DE", ".PA", ".AS", ".MC", ".L", ".SW", ".VI", ".BR", ".LS"]
        for suffix in EUROPEAN_SUFFIXES:
            candidate = import_symbol + suffix
            result = _try_fetch_history(candidate, period)
            if result:
                print(f"[finance] Risolto {sym} -> {candidate}")
                _yahoo_symbol_cache[sym] = candidate
                return result

    print(f"[finance] Nessun dato trovato per {sym} (period={period})")
    _yahoo_symbol_cache[sym] = import_symbol  # Salva anche il fallback per non ritentare
    return []

def search_tickers(query: str) -> list[dict]:
    """
    Cerca ticker su Yahoo Finance.
    Restituisce una lista di risultati limitata a 5.
    """
    if not query:
        return []
        
    url = f"https://query2.finance.yahoo.com/v1/finance/search?q={query}&quotesCount=5&newsCount=0"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        quotes = data.get("quotes", [])
        
        results = []
        for q in quotes:
            symbol = q.get("symbol")
            name = q.get("shortname") or q.get("longname") or symbol
            exchange = q.get("exchDisp") or q.get("exchange") or ""
            quote_type = q.get("quoteType", "")
            
            if symbol:
                results.append({
                    "symbol": symbol,
                    "name": name,
                    "exchange": exchange,
                    "type": quote_type
                })
        return results
    except Exception as e:
        print(f"Errore ricerca ticker per '{query}': {e}")
        return []
