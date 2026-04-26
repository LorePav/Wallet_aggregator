# ============================================================
# DATA_FETCHER.PY
# Questo modulo si occupa di SCARICARE i dati da Yahoo Finance.
# Pensa a questo file come al "magazziniere" dell'agente:
# va a prendere tutte le informazioni e le porta al resto del codice.
#
# Libreria usata: yfinance (Yahoo Finance unofficial API, gratuita)
# ============================================================

import yfinance as yf      # La libreria principale per i dati finanziari
import pandas as pd        # Per gestire i dati come tabelle (DataFrame)
import numpy as np         # Per i calcoli matematici


def fetch_all_data(ticker_symbol: str) -> dict:
    """
    Funzione principale: dato un ticker (es. "AAPL"), scarica TUTTI i dati
    necessari per l'analisi fondamentale e li restituisce in un dizionario.

    Un dizionario in Python è come una rubrica: ogni voce ha un nome (chiave)
    e un valore. Es: {"nome": "Apple", "settore": "Technology", ...}

    Parametri:
        ticker_symbol (str): il simbolo del titolo, es. "AAPL", "MSFT", "ENI.MI"

    Ritorna:
        dict: dizionario con tutti i dati, oppure None se il ticker non esiste
    """

    # Creiamo l'oggetto Ticker: è come "aprire il file" di quella società
    ticker = yf.Ticker(ticker_symbol.upper())

    # Scarichiamo le informazioni generali (nome, settore, P/E, dividendi, ecc.)
    info = ticker.info

    # Se il dizionario info è vuoto o non ha il nome dell'azienda, il ticker è sbagliato
    if not info or info.get("shortName") is None:
        return None

    # ----------------------------------------------------------------
    # 1. DATI STORICI DEI PREZZI (ultimi 5 anni)
    #    history() scarica il prezzo di apertura, chiusura, volume, ecc.
    # ----------------------------------------------------------------
    history_5y = ticker.history(period="5y")    # 5 anni di dati giornalieri
    history_1y = ticker.history(period="1y")    # 1 anno (per il grafico principale)

    # ----------------------------------------------------------------
    # 2. BILANCIO ANNUALE (Income Statement = Conto Economico)
    #    Contiene: ricavi, utile netto, EBITDA, ecc. — ultimi 4 anni
    # ----------------------------------------------------------------
    try:
        income_stmt = ticker.financials          # Conto economico annuale
    except Exception:
        income_stmt = pd.DataFrame()             # Se non disponibile, tabella vuota

    # ----------------------------------------------------------------
    # 3. STATO PATRIMONIALE (Balance Sheet)
    #    Contiene: attivo, passivo, debiti, cassa, ecc.
    # ----------------------------------------------------------------
    try:
        balance_sheet = ticker.balance_sheet
    except Exception:
        balance_sheet = pd.DataFrame()

    # ----------------------------------------------------------------
    # 4. FLUSSO DI CASSA (Cash Flow Statement)
    #    Mostra quanti soldi reali entrano ed escono dall'azienda
    # ----------------------------------------------------------------
    try:
        cashflow = ticker.cashflow
    except Exception:
        cashflow = pd.DataFrame()

    # ----------------------------------------------------------------
    # 5. DIVIDENDI STORICI
    #    Storia completa di tutti i dividendi pagati nel tempo
    # ----------------------------------------------------------------
    try:
        dividends = ticker.dividends
    except Exception:
        dividends = pd.Series(dtype=float)

    # ----------------------------------------------------------------
    # 6. AZIONISTI PRINCIPALI (Major Holders)
    #    Chi possiede le quote maggiori dell'azienda
    # ----------------------------------------------------------------
    try:
        major_holders = ticker.major_holders
    except Exception:
        major_holders = pd.DataFrame()

    # ----------------------------------------------------------------
    # 7. AZIONISTI ISTITUZIONALI (Institutional Holders)
    #    Fondi di investimento, banche, ecc. che detengono azioni
    # ----------------------------------------------------------------
    try:
        institutional_holders = ticker.institutional_holders
    except Exception:
        institutional_holders = pd.DataFrame()

    # ----------------------------------------------------------------
    # 8. RACCOMANDAZIONI DEGLI ANALISTI
    #    Buy, Sell, Hold suggeriti dagli analisti di Wall Street
    # ----------------------------------------------------------------
    try:
        recommendations = ticker.recommendations
        # Prendiamo solo le ultime 10 raccomandazioni
        if recommendations is not None and not recommendations.empty:
            recommendations = recommendations.tail(10)
    except Exception:
        recommendations = pd.DataFrame()

    # ----------------------------------------------------------------
    # 9. DATI TRIMESTRALI (per vedere la crescita recente)
    # ----------------------------------------------------------------
    try:
        quarterly_financials = ticker.quarterly_financials
    except Exception:
        quarterly_financials = pd.DataFrame()

    try:
        quarterly_balance = ticker.quarterly_balance_sheet
    except Exception:
        quarterly_balance = pd.DataFrame()

    # ----------------------------------------------------------------
    # COSTRUIAMO IL DIZIONARIO FINALE con tutti i dati raccolti
    # Ogni chiave è il nome della sezione, ogni valore sono i dati
    # ----------------------------------------------------------------
    result = {
        "ticker":                   ticker_symbol.upper(),
        "info":                     info,                    # Info generali
        "history_1y":               history_1y,              # Prezzi 1 anno
        "history_5y":               history_5y,              # Prezzi 5 anni
        "income_stmt":              income_stmt,             # Conto economico
        "balance_sheet":            balance_sheet,           # Stato patrimoniale
        "cashflow":                 cashflow,                # Flusso di cassa
        "dividends":                dividends,               # Dividendi storici
        "major_holders":            major_holders,           # Azionisti principali
        "institutional_holders":    institutional_holders,   # Istituzionali
        "recommendations":          recommendations,         # Raccomandazioni
        "quarterly_financials":     quarterly_financials,    # Trimestrali
        "quarterly_balance":        quarterly_balance,       # Balance trimestrale
    }

    return result


def safe_get(info: dict, key: str, default=None):
    """
    Funzione di supporto: legge un valore dal dizionario info in modo sicuro.
    Se il dato non esiste o è NaN (non disponibile), restituisce il valore
    di default (di solito None o 0).

    Parametri:
        info   : il dizionario con le info dell'azienda
        key    : il nome del campo che vogliamo leggere
        default: cosa restituire se il dato non c'è
    """
    value = info.get(key, default)

    # np.nan è il modo Python per dire "dato mancante" — lo gestiamo qui
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return default

    return value


def format_large_number(number) -> str:
    """
    Formatta i numeri grandi in modo leggibile.
    Es: 1_000_000_000 → "1.00 B" (miliardi)
         500_000_000  → "500.00 M" (milioni)

    Parametri:
        number: il numero da formattare

    Ritorna:
        str: il numero formattato come stringa
    """
    if number is None:
        return "N/D"

    try:
        number = float(number)
    except (TypeError, ValueError):
        return "N/D"

    if np.isnan(number):
        return "N/D"

    if abs(number) >= 1_000_000_000_000:   # Trilioni
        return f"{number / 1_000_000_000_000:.2f} T"
    elif abs(number) >= 1_000_000_000:     # Miliardi
        return f"{number / 1_000_000_000:.2f} B"
    elif abs(number) >= 1_000_000:         # Milioni
        return f"{number / 1_000_000:.2f} M"
    elif abs(number) >= 1_000:             # Migliaia
        return f"{number / 1_000:.2f} K"
    else:
        return f"{number:.2f}"
