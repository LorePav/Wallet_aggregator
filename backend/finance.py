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

def get_live_prices(symbols: list[str]) -> dict[str, float]:
    """
    Recupera i prezzi in tempo reale usando yfinance.
    """
    prices = {}
    for sym in symbols:
        try:
            # Mappatura dinamica per Yahoo Finance
            import_symbol = sym
            if import_symbol in ["USD", "EUR", "GBP", "CHF"]:
                prices[sym] = 1.0
                continue

            if import_symbol == "TAOUSD":
                import_symbol = "TAO22974-USD" # Caso speciale Bittensor su Yahoo
            elif import_symbol.endswith("USD") and import_symbol != "USD":
                # Convertiamo es: BTCUSD -> BTC-USD
                import_symbol = import_symbol[:-3] + "-USD"
            elif import_symbol == "STLAM":
                import_symbol = "STLAM.MI"
            elif import_symbol == "ZAL":
                import_symbol = "ZAL.DE"
                
            ticker = yf.Ticker(import_symbol)
            # fast_info è molto più veloce di download() per ottenere l'ultimo prezzo
            # Se fast_info fallisce, proviamo con history()
            try:
                price = ticker.fast_info.last_price
            except:
                hist = ticker.history(period="1d")
                if not hist.empty:
                    price = hist['Close'].iloc[-1]
                else:
                    price = 0.0
                    
            prices[sym] = round(float(price), 2)
        except Exception as e:
            print(f"Errore recupero prezzo per {sym}: {e}")
            prices[sym] = 0.0
            
    return prices

def get_historical_prices(sym: str, period: str = "1y") -> list[dict]:
    """
    Recupera la serie storica per il grafico dell'asset.
    """
    # Mappatura dinamica per Yahoo Finance
    import_symbol = sym
    if import_symbol in ["USD", "EUR", "GBP", "CHF"]:
        return []

    if import_symbol == "TAOUSD":
        import_symbol = "TAO22974-USD" # Caso speciale Bittensor su Yahoo
    elif import_symbol.endswith("USD") and import_symbol != "USD":
        # Convertiamo es: BTCUSD -> BTC-USD
        import_symbol = import_symbol[:-3] + "-USD"
    elif import_symbol == "STLAM":
        import_symbol = "STLAM.MI"
    elif import_symbol == "ZAL":
        import_symbol = "ZAL.DE"
        
    try:
        ticker = yf.Ticker(import_symbol)
        hist = ticker.history(period=period)
        
        result = []
        if not hist.empty:
            for date, row in hist.iterrows():
                result.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "price": round(float(row['Close']), 2)
                })
        return result
    except Exception as e:
        print(f"Errore recupero history per {sym}: {e}")
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
