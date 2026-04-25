"""
analytics.py
============
Modulo per le analisi avanzate del portafoglio.

Funzioni esposte:
  - get_correlation_matrix(symbols, period)  → matrice di correlazione tra asset
  - get_portfolio_drawdown(snapshots)         → serie temporale del drawdown del portafoglio
  - get_risk_metrics(portfolio_data, snapshots) → Sharpe Ratio, Beta vs S&P500, Volatilità annualizzata
"""

import numpy as np
import pandas as pd
import yfinance as yf
from typing import List, Dict, Any


# ---------------------------------------------------------------------------
# 1. MATRICE DI CORRELAZIONE
# ---------------------------------------------------------------------------

def get_correlation_matrix(symbols: List[str], period: str = "1y") -> Dict[str, Any]:
    """
    Calcola la matrice di correlazione dei rendimenti giornalieri tra i simboli indicati.

    Parametri:
        symbols  – lista di ticker Yahoo Finance (es. ["AAPL", "BTC-USD", "ENI.MI"])
        period   – periodo yfinance (default "1y")

    Ritorna un dict con:
        - labels: lista dei simboli usati
        - matrix: lista di liste (NxN) con le correlazioni, valore da -1.0 a +1.0
    """
    if len(symbols) < 2:
        return {"labels": symbols, "matrix": [[1.0]]}

    # Scarica tutti i prezzi di chiusura in un'unica chiamata yfinance
    raw = yf.download(symbols, period=period, auto_adjust=True, progress=False)

    # yfinance restituisce un DataFrame multi-level se ci sono più simboli
    if isinstance(raw.columns, pd.MultiIndex):
        closes = raw["Close"]
    else:
        # yf.download con un solo simbolo restituisce un DataFrame flat: prendiamo solo Close
        # e ricostruiamo come DataFrame con 1 colonna avente il nome del simbolo
        closes = raw[["Close"]].rename(columns={"Close": symbols[0]})

    # Mantieni solo le colonne con dati sufficienti (>= 20 osservazioni)
    closes = closes.dropna(axis=1, thresh=20)
    valid_symbols = list(closes.columns)

    if len(valid_symbols) < 2:
        return {"labels": valid_symbols, "matrix": [[1.0] * len(valid_symbols)]}

    # Rendimenti percentuali giornalieri
    returns = closes.pct_change().dropna()
    corr = returns.corr()

    matrix = [[round(corr.loc[r, c], 4) for c in valid_symbols] for r in valid_symbols]

    return {
        "labels": valid_symbols,
        "matrix": matrix
    }


# ---------------------------------------------------------------------------
# 2. DRAWDOWN DEL PORTAFOGLIO
# ---------------------------------------------------------------------------

def get_portfolio_drawdown(snapshots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Calcola il drawdown giornaliero del portafoglio a partire dagli snapshot storici.

    Parametri:
        snapshots – lista di dict con chiavi "date" (str YYYY-MM-DD) e "total_value" (float)

    Ritorna una lista di dict con:
        - date: str YYYY-MM-DD
        - value: valore totale del portafoglio
        - peak: massimo storico al giorno corrente
        - drawdown_pct: percentuale di calo rispetto al picco (valore negativo o 0)
    """
    if not snapshots:
        return []

    # Ordina per data
    sorted_snaps = sorted(snapshots, key=lambda x: x["date"])

    result = []
    peak = 0.0

    for snap in sorted_snaps:
        value = snap.get("total_value", 0.0)
        if value > peak:
            peak = value

        drawdown_pct = ((value - peak) / peak * 100) if peak > 0 else 0.0

        result.append({
            "date": snap["date"],
            "value": round(value, 2),
            "peak": round(peak, 2),
            "drawdown_pct": round(drawdown_pct, 4)
        })

    return result


# ---------------------------------------------------------------------------
# 3. METRICHE DI RISCHIO (Sharpe, Beta, Volatilità)
# ---------------------------------------------------------------------------

RISK_FREE_RATE_ANNUAL = 0.03   # 3% annuo (approssimazione BOT/T-Bill)
TRADING_DAYS = 252             # giorni di trading in un anno

def get_risk_metrics(snapshots: List[Dict[str, Any]], period: str = "1y") -> Dict[str, Any]:
    """
    Calcola le principali metriche di rischio del portafoglio:
        - Volatilità annualizzata (%)
        - Sharpe Ratio annualizzato (risk-free: 3%)
        - Beta vs S&P 500
        - Alpha vs S&P 500 (Jensen's Alpha annualizzato)
        - Max Drawdown (%)
        - Rendimento totale del periodo (%)

    Parametri:
        snapshots – lista di dict {"date": str, "total_value": float}
        period    – periodo yfinance per scaricare l'S&P 500 come benchmark

    Ritorna un dict con tutte le metriche numeriche.
    """
    default_response = {
        "volatility_annual_pct": None,
        "sharpe_ratio": None,
        "beta": None,
        "alpha_annual_pct": None,
        "max_drawdown_pct": None,
        "total_return_pct": None,
        "error": None
    }

    if len(snapshots) < 10:
        default_response["error"] = "Dati storici insufficienti (minimo 10 snapshot)."
        return default_response

    # --- Prepara i rendimenti del portafoglio ---
    sorted_snaps = sorted(snapshots, key=lambda x: x["date"])
    df = pd.DataFrame(sorted_snaps)
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()
    df["portfolio_return"] = df["total_value"].pct_change().dropna()
    portfolio_returns = df["portfolio_return"].dropna()

    if len(portfolio_returns) < 5:
        default_response["error"] = "Troppo pochi rendimenti calcolabili dagli snapshot."
        return default_response

    # --- Max Drawdown ---
    rolling_max = df["total_value"].cummax()
    drawdown = (df["total_value"] - rolling_max) / rolling_max * 100
    max_drawdown = round(float(drawdown.min()), 4)

    # --- Rendimento totale ---
    first_value = df["total_value"].iloc[0]
    last_value = df["total_value"].iloc[-1]
    total_return = round((last_value - first_value) / first_value * 100, 4) if first_value > 0 else 0.0

    # --- Volatilità annualizzata ---
    daily_vol = portfolio_returns.std()
    annual_vol = round(float(daily_vol * np.sqrt(TRADING_DAYS) * 100), 4)

    # --- Sharpe Ratio ---
    daily_rf = RISK_FREE_RATE_ANNUAL / TRADING_DAYS
    excess_returns = portfolio_returns - daily_rf
    sharpe = round(float(excess_returns.mean() / excess_returns.std() * np.sqrt(TRADING_DAYS)), 4) \
        if excess_returns.std() > 0 else None

    # --- Beta e Alpha vs S&P 500 ---
    beta = None
    alpha_annual = None
    try:
        sp500 = yf.download("^GSPC", period=period, auto_adjust=True, progress=False)
        if not sp500.empty:
            sp_returns = sp500["Close"].pct_change().dropna()

            # Allinea le date tra portafoglio e benchmark
            port_series = portfolio_returns.copy()
            port_series.index = port_series.index.normalize()
            sp_returns.index = sp_returns.index.normalize()

            combined = pd.DataFrame({
                "portfolio": port_series,
                "sp500": sp_returns
            }).dropna()

            if len(combined) >= 10:
                cov_matrix = combined.cov()
                beta_val = cov_matrix.loc["portfolio", "sp500"] / cov_matrix.loc["sp500", "sp500"]
                beta = round(float(beta_val), 4)

                # Jensen's Alpha annualizzato
                port_annual = float(combined["portfolio"].mean() * TRADING_DAYS)
                sp_annual = float(combined["sp500"].mean() * TRADING_DAYS)
                alpha_annual = round(port_annual - (RISK_FREE_RATE_ANNUAL + beta_val * (sp_annual - RISK_FREE_RATE_ANNUAL)), 4)

    except Exception as e:
        print(f"[analytics] Errore calcolo Beta/Alpha: {e}")

    return {
        "volatility_annual_pct": annual_vol,
        "sharpe_ratio": sharpe,
        "beta": beta,
        # alpha_annual è già in forma percentuale decimale annualizzata (es. 0.05 = 5%)
        # lo moltiplichiamo x100 una sola volta per restituirlo come valore percentuale leggibile
        "alpha_annual_pct": round(float(alpha_annual) * 100, 4) if alpha_annual is not None else None,
        "max_drawdown_pct": max_drawdown,
        "total_return_pct": total_return,
        "error": None
    }


# ---------------------------------------------------------------------------
# 4. HELPER: Risolve i ticker Yahoo per i simboli del portafoglio
#    (rimappa i simboli interni ai ticker Yahoo già risolti via finance.py cache)
# ---------------------------------------------------------------------------

def resolve_yahoo_symbols(portfolio_symbols: List[str]) -> List[str]:
    """
    Prova a risolvere simboli europei aggiungendo suffissi comuni.
    Ritorna i ticker Yahoo Finance validi per download batch.
    """
    import finance  # usa la stessa logica/cache di finance.py
    resolved = []
    for sym in portfolio_symbols:
        yahoo_sym = finance._yahoo_symbol_cache.get(sym, sym)
        # Normalizza crypto (es: BTCUSD → BTC-USD)
        if sym.endswith("USD") and sym != "USD" and not sym.endswith("-USD") and "-" not in sym:
            yahoo_sym = sym[:-3] + "-USD"
        resolved.append(yahoo_sym)
    return resolved
