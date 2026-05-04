from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import requests
import os

import models
import schemas
import portfolio
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

security = HTTPBearer()
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://awyfpccnnbwfxumjzenc.supabase.co")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "sb_publishable_UCTWV4dBLfdkHC0sB2_M0g_A0Q_hATC")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}"
    }
    response = requests.get(f"{SUPABASE_URL}/auth/v1/user", headers=headers)
    if response.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Token non valido o scaduto",
        )
    return response.json()

app = FastAPI(title="Portfolio API", dependencies=[Depends(verify_token)])

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/")
def read_root():
    return {"message": "Motore del Portafoglio Attivo e Funzionante!"}

# --- ENDPOINTS TRANSAZIONI ---
@app.get("/api/transactions", response_model=List[schemas.Transaction])
def read_transactions(skip: int = 0, limit: int = 1000, symbol: str = None, db: Session = Depends(get_db), user_data: dict = Depends(verify_token)):
    user_id = user_data["id"]
    query = db.query(models.Transaction).filter(models.Transaction.user_id == user_id)
    if symbol:
        query = query.filter(models.Transaction.symbol == symbol)
    transactions = query.offset(skip).limit(limit).all()
    
    # Aggiungiamo dinamicamente la currency ad ogni transazione in uscita
    assets = db.query(models.Asset).filter(models.Asset.user_id == user_id).all()
    asset_map = {a.symbol: a.currency for a in assets}
    for t in transactions:
        if t.type in ["Deposit", "Withdrawal"] and t.symbol in ["EUR", "USD", "GBP", "CHF", "JPY"]:
            setattr(t, 'currency', t.symbol)
        else:
            setattr(t, 'currency', asset_map.get(t.symbol, "EUR"))
            
    return transactions

@app.post("/api/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db), user_data: dict = Depends(verify_token)):
    user_id = user_data["id"]
    tx_data = transaction.model_dump(exclude={"currency", "user_id"})
    db_transaction = models.Transaction(**tx_data, user_id=user_id)
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.put("/api/transactions/{transaction_id}", response_model=schemas.Transaction)
def update_transaction(transaction_id: int, transaction: schemas.TransactionCreate, db: Session = Depends(get_db), user_data: dict = Depends(verify_token)):
    user_id = user_data["id"]
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == user_id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transazione non trovata")
    
    tx_data = transaction.model_dump(exclude={"currency", "user_id"})
    for key, value in tx_data.items():
        if key != "user_id": # eviteremo di sovrascriverlo per errore
            setattr(db_transaction, key, value)
        
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db), user_data: dict = Depends(verify_token)):
    user_id = user_data["id"]
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == user_id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transazione non trovata")
    
    db.delete(db_transaction)
    db.commit()
    return {"message": "Transazione eliminata con successo"}

# --- ENDPOINTS ASSET ---
@app.get("/api/search-tickers")
def api_search_tickers(q: str):
    import finance
    return finance.search_tickers(q)

@app.get("/api/assets", response_model=List[schemas.Asset])
def read_assets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), user_data: dict = Depends(verify_token)):
    user_id = user_data["id"]
    assets = db.query(models.Asset).filter(models.Asset.user_id == user_id).offset(skip).limit(limit).all()
    return assets

@app.post("/api/assets", response_model=schemas.Asset)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(get_db), user_data: dict = Depends(verify_token)):
    user_id = user_data["id"]
    db_asset = db.query(models.Asset).filter(models.Asset.symbol == asset.symbol, models.Asset.user_id == user_id).first()
    if db_asset:
        if db_asset.currency != asset.currency or db_asset.category != asset.category:
            db_asset.currency = asset.currency
            db_asset.category = asset.category
            db.commit()
            db.refresh(db_asset)
        return db_asset
    
    db_asset = models.Asset(**asset.model_dump())
    db_asset.user_id = user_id
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

# --- ENDPOINTS PORTFOLIO ---
@app.get("/api/portfolio", response_model=List[schemas.PortfolioItem])
def read_portfolio(db: Session = Depends(get_db), user_data: dict = Depends(verify_token)):
    user_id = user_data["id"]
    portfolio_data = portfolio.get_portfolio_data(db, user_id)
    
    liquidity_data = portfolio.get_liquidity(db, user_id)
    portfolio.update_daily_snapshot(db, portfolio_data, liquidity_data, user_id)
    
    return portfolio_data

@app.get("/api/liquidity")
def read_liquidity(db: Session = Depends(get_db), user_data: dict = Depends(verify_token)):
    user_id = user_data["id"]
    return portfolio.get_liquidity(db, user_id)

@app.get("/api/fx_rates")
def read_fx_rates():
    import finance
    return finance.get_exchange_rates()

# --- ENDPOINTS SNAPSHOTS STORICI ---
@app.get("/api/snapshots", response_model=List[schemas.DailySnapshot])
def read_snapshots(db: Session = Depends(get_db), user_data: dict = Depends(verify_token)):
    user_id = user_data["id"]
    return db.query(models.DailySnapshot).filter(models.DailySnapshot.user_id == user_id).order_by(models.DailySnapshot.date).all()

# --- ENDPOINTS ASSET HISTORY ---
@app.get("/api/asset-history/{symbol}")
def read_asset_history(symbol: str, period: str = "1y", db: Session = Depends(get_db)):
    import finance
    history = finance.get_historical_prices(symbol, period)
    if not history:
        raise HTTPException(status_code=404, detail="Dati storici non trovati per questo simbolo.")
    return history

@app.get("/api/benchmark")
def read_benchmark_history(period: str = "5y"):
    import finance
    history = finance.get_historical_prices("^GSPC", period)
    if not history:
        raise HTTPException(status_code=404, detail="Impossibile recuperare i dati del benchmark (S&P 500).")
    return history

# --- ENDPOINTS ANALYTICS AVANZATI ---

@app.get("/api/analytics/correlation")
def read_correlation_matrix(
    period: str = "1y",
    db: Session = Depends(get_db),
    user_data: dict = Depends(verify_token)
):
    """
    Matrice di correlazione dei rendimenti giornalieri tra tutti gli asset in portafoglio.
    Param period: "3mo" | "6mo" | "1y" | "2y" | "5y"
    """
    user_id = user_data["id"]
    import analytics

    # Recupera i dati del portafoglio per estrarre i simboli attivi
    portfolio_data = portfolio.get_portfolio_data(db, user_id)

    # Considera solo asset con quantità > 0 e non-cash
    active_symbols = [
        item["symbol"] for item in portfolio_data
        if item["quantity"] > 0.000001 and item["symbol"] not in ["EUR", "USD", "GBP", "CHF"]
    ]

    if len(active_symbols) < 2:
        raise HTTPException(status_code=400, detail="Servono almeno 2 asset attivi per calcolare la correlazione.")

    # Risolvi i ticker Yahoo (es. ENI → ENI.MI, BTCUSD → BTC-USD)
    yahoo_symbols = analytics.resolve_yahoo_symbols(active_symbols)

    result = analytics.get_correlation_matrix(yahoo_symbols, period=period)
    # Remap le label ai simboli originali dell'utente per la UI
    label_map = dict(zip(yahoo_symbols, active_symbols))
    result["labels"] = [label_map.get(l, l) for l in result["labels"]]
    return result


@app.get("/api/analytics/drawdown")
def read_portfolio_drawdown(
    db: Session = Depends(get_db),
    user_data: dict = Depends(verify_token)
):
    """
    Serie temporale del drawdown storico del portafoglio (calo % rispetto al picco precedente).
    """
    user_id = user_data["id"]
    import analytics

    snapshots = db.query(models.DailySnapshot).filter(
        models.DailySnapshot.user_id == user_id
    ).order_by(models.DailySnapshot.date).all()

    snap_list = [
        {"date": str(s.date), "total_value": s.total_value}
        for s in snapshots
    ]

    return analytics.get_portfolio_drawdown(snap_list)


@app.get("/api/analytics/risk-metrics")
def read_risk_metrics(
    period: str = "1y",
    db: Session = Depends(get_db),
    user_data: dict = Depends(verify_token)
):
    """
    Calcola le metriche di rischio del portafoglio:
    Sharpe Ratio, Beta vs S&P500, Alpha, Volatilità annualizzata, Max Drawdown, Rendimento totale.
    Param period: periodo per scaricare il benchmark S&P500, default "1y".
    """
    user_id = user_data["id"]
    import analytics

    snapshots = db.query(models.DailySnapshot).filter(
        models.DailySnapshot.user_id == user_id
    ).order_by(models.DailySnapshot.date).all()

    snap_list = [
        {"date": str(s.date), "total_value": s.total_value}
        for s in snapshots
    ]

    return analytics.get_risk_metrics(snap_list, period=period)


# ============================================================
# ENDPOINTS ANALISI FONDAMENTALI
# Corrispondono 1:1 ai 10 tab dell'app Streamlit originale:
# Sommario | Mercato | Valutazione | Redditività | Salute |
# Crescita | Dividendi | Bilanci | Azionisti | Esporta
# ============================================================

import time as _time

_fundamental_cache: dict = {}
_CACHE_TTL_SECONDS = 300  # 5 minuti


def _get_cached_fundamental_data(ticker_upper: str):
    """Scarica da Yahoo Finance e mette in cache per 5 minuti."""
    now = _time.time()
    if ticker_upper in _fundamental_cache:
        ts, cached = _fundamental_cache[ticker_upper]
        if now - ts < _CACHE_TTL_SECONDS:
            return cached
    import data_fetcher as _df
    result = _df.fetch_all_data(ticker_upper)
    if result is not None:
        _fundamental_cache[ticker_upper] = (now, result)
    return result


_PCT_KEYWORDS = ["margin", "yield", "roe", "roa", "payout", "crescita"]


def _fmt_value(label: str, value) -> str:
    """Formatta un valore in stringa leggibile (%, B, M, K...)."""
    import datetime as _dt
    import data_fetcher as _df

    if value is None:
        return "N/D"
    if "Date" in label and isinstance(value, int):
        try:
            return _dt.datetime.fromtimestamp(value).strftime("%Y-%m-%d")
        except Exception:
            return str(value)
    if isinstance(value, float) and -1 <= value <= 1 and any(kw in label.lower() for kw in _PCT_KEYWORDS):
        return f"{value * 100:.2f}%"
    if isinstance(value, (int, float)) and abs(value) > 1_000_000:
        return _df.format_large_number(value)
    if isinstance(value, float):
        return f"{value:.2f}"
    return str(value)


def _metrics_to_list(metrics: dict) -> list:
    """Converte un dict di metriche in lista [{label, value, formatted}]."""
    return [
        {"label": k, "value": v, "formatted": _fmt_value(k, v)}
        for k, v in metrics.items()
    ]


def _serialize_df(df) -> dict:
    """Converte un DataFrame in {columns: [...], rows: {label: [valori...]}}."""
    import pandas as pd
    if df is None or (hasattr(df, "empty") and df.empty):
        return {"columns": [], "rows": {}}
    columns = [str(c)[:10] for c in df.columns]
    rows = {}
    for idx in df.index:
        row_vals = []
        for col in df.columns:
            val = df.loc[idx, col]
            try:
                row_vals.append(None if pd.isna(val) else float(val))
            except Exception:
                row_vals.append(str(val) if val is not None else None)
        rows[str(idx)] = row_vals
    return {"columns": columns, "rows": rows}


def _df_to_records(df) -> list:
    """Converte un DataFrame in lista di dict (per tabelle azionisti/raccomandazioni)."""
    if df is None or (hasattr(df, "empty") and df.empty):
        return []
    try:
        return df.fillna("N/D").to_dict(orient="records")
    except Exception:
        return []


# ----------------------------------------------------------
# TAB SOMMARIO + VALUTAZIONE RAPIDA
# GET /api/fundamental/{ticker}
# Restituisce tutto il necessario per il tab Sommario:
# nome, settore, prezzo, market cap, giudizio complessivo,
# 6 metriche chiave con semaforo, commenti per ogni sezione.
# ----------------------------------------------------------
@app.get("/api/fundamental/{ticker}")
def get_fundamental_summary(ticker: str, user_data: dict = Depends(verify_token)):
    import analyzer as az
    import data_fetcher as df_mod

    t = ticker.strip().upper()
    data = _get_cached_fundamental_data(t)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{t}' non trovato su Yahoo Finance.")

    info = data["info"]
    sg = df_mod.safe_get

    key_metrics_cfg = [
        ("P/E (TTM)",        sg(info, "trailingPE"),                        15,  30,  False),
        ("P/B",              sg(info, "priceToBook"),                         1,   4,  False),
        ("ROE %",           (sg(info, "returnOnEquity")  or 0) * 100,        15,   5,  True),
        ("Margine Netto %", (sg(info, "profitMargins")   or 0) * 100,        10,   3,  True),
        ("Debt/Equity",      sg(info, "debtToEquity"),                      0.5,   2,  False),
        ("Div. Yield %",    (sg(info, "dividendYield")   or 0) * 100,         3,   1,  True),
    ]

    key_metrics = [
        {
            "label":           label,
            "value":           val,
            "value_formatted": f"{val:.2f}" if val is not None else "N/D",
            "rating":          az._rating(val, g, b, hib),
        }
        for label, val, g, b, hib in key_metrics_cfg
    ]

    return {
        "ticker":            t,
        "name":              sg(info, "shortName", t),
        "sector":            sg(info, "sector",   "N/D"),
        "industry":          sg(info, "industry", "N/D"),
        "country":           sg(info, "country",  "N/D"),
        "website":           sg(info, "website"),
        "currency":          sg(info, "currency", "USD"),
        "exchange":          sg(info, "exchange", "N/D"),
        "description":       sg(info, "longBusinessSummary", ""),
        "employees":         sg(info, "fullTimeEmployees"),
        "price": {
            "current":       sg(info, "currentPrice") or sg(info, "regularMarketPrice"),
            "change_pct":    sg(info, "regularMarketChangePercent"),
            "week_52_high":  sg(info, "fiftyTwoWeekHigh"),
            "week_52_low":   sg(info, "fiftyTwoWeekLow"),
            "ma_50d":        sg(info, "fiftyDayAverage"),
            "ma_200d":       sg(info, "twoHundredDayAverage"),
        },
        "market_cap":            sg(info, "marketCap"),
        "market_cap_formatted":  df_mod.format_large_number(sg(info, "marketCap")),
        "enterprise_value":      sg(info, "enterpriseValue"),
        "summary":               az.generate_overall_summary(info),
        "key_metrics":           key_metrics,
        "comments": {
            "valuation":     az.generate_valuation_comment(info),
            "profitability": az.generate_profitability_comment(info),
            "health":        az.generate_health_comment(info),
            "dividends":     az.generate_dividend_comment(info),
        },
    }


# ----------------------------------------------------------
# TAB MERCATO
# GET /api/fundamental/{ticker}/market
# Metriche di mercato: prezzo 52W, medie mobili, volumi,
# beta, market cap, azioni in circolazione, short ratio.
# ----------------------------------------------------------
@app.get("/api/fundamental/{ticker}/market")
def get_fundamental_market(ticker: str, user_data: dict = Depends(verify_token)):
    import analyzer as az

    t = ticker.strip().upper()
    data = _get_cached_fundamental_data(t)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{t}' non trovato.")

    return {"metrics": _metrics_to_list(az.get_market_metrics(data["info"]))}


# ----------------------------------------------------------
# TAB MERCATO - STORICO PREZZI (candele + volumi)
# GET /api/fundamental/{ticker}/price-history?period=1y
# period: "1y" | "5y"
# Ritorna lista di {date, open, high, low, close, volume}.
# ----------------------------------------------------------
@app.get("/api/fundamental/{ticker}/price-history")
def get_fundamental_price_history(
    ticker: str,
    period: str = "1y",
    user_data: dict = Depends(verify_token),
):
    import pandas as pd

    t = ticker.strip().upper()
    data = _get_cached_fundamental_data(t)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{t}' non trovato.")

    hist = data.get("history_1y") if period == "1y" else data.get("history_5y")
    if hist is None or hist.empty:
        return []

    result = []
    for date, row in hist.iterrows():
        def _f(col):
            v = row.get(col)
            try:
                return None if (v is None or pd.isna(v)) else float(v)
            except Exception:
                return None

        result.append({
            "date":   str(date)[:10],
            "open":   _f("Open"),
            "high":   _f("High"),
            "low":    _f("Low"),
            "close":  _f("Close"),
            "volume": int(row["Volume"]) if _f("Volume") is not None else None,
        })
    return result


# ----------------------------------------------------------
# TAB VALUTAZIONE
# GET /api/fundamental/{ticker}/valuation
# P/E, P/B, P/S, EV/EBITDA, EV/Revenue, PEG + commento.
# ----------------------------------------------------------
@app.get("/api/fundamental/{ticker}/valuation")
def get_fundamental_valuation(ticker: str, user_data: dict = Depends(verify_token)):
    import analyzer as az

    t = ticker.strip().upper()
    data = _get_cached_fundamental_data(t)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{t}' non trovato.")

    info = data["info"]
    return {
        "metrics": _metrics_to_list(az.get_valuation_metrics(info)),
        "comment": az.generate_valuation_comment(info),
    }


# ----------------------------------------------------------
# TAB REDDITIVITÀ
# GET /api/fundamental/{ticker}/profitability
# ROE, ROA, margini lordo/operativo/netto, EBITDA + commento.
# ----------------------------------------------------------
@app.get("/api/fundamental/{ticker}/profitability")
def get_fundamental_profitability(ticker: str, user_data: dict = Depends(verify_token)):
    import analyzer as az

    t = ticker.strip().upper()
    data = _get_cached_fundamental_data(t)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{t}' non trovato.")

    info = data["info"]
    return {
        "metrics": _metrics_to_list(az.get_profitability_metrics(info)),
        "comment": az.generate_profitability_comment(info),
    }


# ----------------------------------------------------------
# TAB SALUTE FINANZIARIA
# GET /api/fundamental/{ticker}/health
# Debito totale, cassa, D/E, Current Ratio, Quick Ratio,
# Free Cash Flow, Operating Cash Flow + commento.
# ----------------------------------------------------------
@app.get("/api/fundamental/{ticker}/health")
def get_fundamental_health(ticker: str, user_data: dict = Depends(verify_token)):
    import analyzer as az

    t = ticker.strip().upper()
    data = _get_cached_fundamental_data(t)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{t}' non trovato.")

    info = data["info"]
    return {
        "metrics": _metrics_to_list(az.get_financial_health_metrics(info)),
        "comment": az.generate_health_comment(info),
    }


# ----------------------------------------------------------
# TAB CRESCITA
# GET /api/fundamental/{ticker}/growth
# Crescita ricavi YoY, EPS TTM/Forward, ricavi trimestrali.
# ----------------------------------------------------------
@app.get("/api/fundamental/{ticker}/growth")
def get_fundamental_growth(ticker: str, user_data: dict = Depends(verify_token)):
    import analyzer as az
    import pandas as pd
    import data_fetcher as df_mod

    t = ticker.strip().upper()
    data = _get_cached_fundamental_data(t)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{t}' non trovato.")

    info = data["info"]
    sg = df_mod.safe_get

    # Ricavi trimestrali
    qf = data.get("quarterly_financials")
    quarterly_revenue = []
    if qf is not None and not qf.empty and "Total Revenue" in qf.index:
        rev = qf.loc["Total Revenue"].dropna().sort_index()
        quarterly_revenue = [
            {"quarter": str(d)[:10], "revenue": float(v), "revenue_formatted": df_mod.format_large_number(v)}
            for d, v in rev.items()
        ]

    return {
        "metrics":           _metrics_to_list(az.get_growth_metrics(info)),
        "quarterly_revenue": quarterly_revenue,
        "eps": {
            "trailing": sg(info, "trailingEps"),
            "forward":  sg(info, "forwardEps"),
        },
    }


# ----------------------------------------------------------
# TAB DIVIDENDI
# GET /api/fundamental/{ticker}/dividends
# Yield, rate, payout, ex-date, storico annuale + commento.
# ----------------------------------------------------------
@app.get("/api/fundamental/{ticker}/dividends")
def get_fundamental_dividends(ticker: str, user_data: dict = Depends(verify_token)):
    import analyzer as az

    t = ticker.strip().upper()
    data = _get_cached_fundamental_data(t)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{t}' non trovato.")

    info = data["info"]

    # Storico dividendi aggregato per anno
    divs = data.get("dividends")
    annual_dividends = []
    if divs is not None and len(divs) > 0:
        import pandas as pd
        div_df = divs.reset_index()
        div_df.columns = ["date", "value"]
        div_df["year"] = div_df["date"].dt.year
        agg = div_df.groupby("year")["value"].sum().reset_index()
        annual_dividends = [
            {"year": int(row["year"]), "value": float(row["value"])}
            for _, row in agg.iterrows()
        ]

    return {
        "metrics":          _metrics_to_list(az.get_dividend_metrics(info)),
        "comment":          az.generate_dividend_comment(info),
        "annual_dividends": annual_dividends,
    }


# ----------------------------------------------------------
# TAB BILANCI
# GET /api/fundamental/{ticker}/financials?type=income
# type: income | balance | cashflow | income_quarterly | balance_quarterly
# Ritorna il bilancio come {columns, rows} serializzato.
# ----------------------------------------------------------
@app.get("/api/fundamental/{ticker}/financials")
def get_fundamental_financials(
    ticker: str,
    type: str = "income",
    user_data: dict = Depends(verify_token),
):
    t = ticker.strip().upper()
    data = _get_cached_fundamental_data(t)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{t}' non trovato.")

    type_map = {
        "income":              "income_stmt",
        "balance":             "balance_sheet",
        "cashflow":            "cashflow",
        "income_quarterly":    "quarterly_financials",
        "balance_quarterly":   "quarterly_balance",
    }
    if type not in type_map:
        raise HTTPException(status_code=400, detail=f"type deve essere uno di: {list(type_map.keys())}")

    df = data.get(type_map[type])
    return _serialize_df(df)


# ----------------------------------------------------------
# TAB AZIONISTI
# GET /api/fundamental/{ticker}/holders
# Azionisti principali, istituzionali, raccomandazioni analisti,
# storico dividendi grezzo.
# ----------------------------------------------------------
@app.get("/api/fundamental/{ticker}/holders")
def get_fundamental_holders(ticker: str, user_data: dict = Depends(verify_token)):
    t = ticker.strip().upper()
    data = _get_cached_fundamental_data(t)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{t}' non trovato.")

    # Storico dividendi come serie temporale
    divs = data.get("dividends")
    dividends_history = []
    if divs is not None and len(divs) > 0:
        for date, val in divs.items():
            try:
                dividends_history.append({"date": str(date)[:10], "value": float(val)})
            except Exception:
                pass

    return {
        "major_holders":         _df_to_records(data.get("major_holders")),
        "institutional_holders": _df_to_records(data.get("institutional_holders")),
        "recommendations":       _df_to_records(data.get("recommendations")),
        "dividends_history":     dividends_history,
    }


# ----------------------------------------------------------
# TAB ESPORTA - PDF
# GET /api/fundamental/{ticker}/export/pdf
# Scarica report completo in formato PDF.
# ----------------------------------------------------------
@app.get("/api/fundamental/{ticker}/export/pdf")
def export_fundamental_pdf(ticker: str, user_data: dict = Depends(verify_token)):
    from fastapi.responses import Response as _Resp

    t = ticker.strip().upper()
    data = _get_cached_fundamental_data(t)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{t}' non trovato.")
    try:
        import fundamental_exporter
        pdf_bytes = fundamental_exporter.export_to_pdf(data)
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="Librerie mancanti. Eseguire: pip install python-docx fpdf2"
        )
    return _Resp(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="analisi_{t}.pdf"'},
    )


# ----------------------------------------------------------
# TAB ESPORTA - WORD
# GET /api/fundamental/{ticker}/export/word
# Scarica report completo in formato Word (.docx).
# ----------------------------------------------------------
@app.get("/api/fundamental/{ticker}/export/word")
def export_fundamental_word(ticker: str, user_data: dict = Depends(verify_token)):
    from fastapi.responses import Response as _Resp

    t = ticker.strip().upper()
    data = _get_cached_fundamental_data(t)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Ticker '{t}' non trovato.")
    try:
        import fundamental_exporter
        word_bytes = fundamental_exporter.export_to_word(data)
    except ImportError:
        raise HTTPException(
            status_code=501,
            detail="Librerie mancanti. Eseguire: pip install python-docx fpdf2"
        )
    return _Resp(
        content=word_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="analisi_{t}.docx"'},
    )


@app.delete("/api/reset")
def reset_portfolio(db: Session = Depends(get_db), user_data: dict = Depends(verify_token)):
    user_id = user_data["id"]
    try:
        db.query(models.Transaction).filter(models.Transaction.user_id == user_id).delete()
        db.query(models.Asset).filter(models.Asset.user_id == user_id).delete()
        db.query(models.DailySnapshot).filter(models.DailySnapshot.user_id == user_id).delete()
        db.commit()
        return {"message": "Tutti i dati del portafoglio sono stati cancellati con successo."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- ENDPOINT EXPORT GOOGLE SHEETS ---
@app.post("/api/export-sheets")
def export_to_sheets(db: Session = Depends(get_db), user_data: dict = Depends(verify_token)):
    user_id = user_data["id"]
    try:
        portfolio_data = portfolio.get_portfolio_data(db, user_id)
        liquidity_data = portfolio.get_liquidity(db, user_id)
        
        import export_sheets
        result = export_sheets.export_portfolio(portfolio_data, liquidity_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante l'esportazione: {str(e)}")

# ============================================================
# ENDPOINTS ANALISI TOKENOMICS (CRYPTO)
# Corrispondono alle sezioni:
# Sommario | Valutazione | Tokenomics | On-Chain |
# Developer | Community | Storico Prezzi | Esporta
# Sorgente dati: CoinGecko API (piano gratuito)
# ============================================================

_tokenomics_cache: dict = {}
_TOKENOMICS_CACHE_TTL = 300  # 5 minuti


def _get_cached_coin_data(coin_id: str):
    """Scarica da CoinGecko e mette in cache per 5 minuti."""
    now = _time.time()
    if coin_id in _tokenomics_cache:
        ts, cached = _tokenomics_cache[coin_id]
        if now - ts < _TOKENOMICS_CACHE_TTL:
            return cached
    import crypto_fetcher as cf
    result = cf.fetch_coin_data(coin_id)
    if result is not None:
        _tokenomics_cache[coin_id] = (now, result)
    return result


def _crypto_fmt(label: str, value) -> str:
    """Formatta valori crypto per le risposte JSON."""
    import crypto_fetcher as cf
    if value is None:
        return "N/D"
    if isinstance(value, str):
        return value
    if "%" in label and isinstance(value, float):
        return f"{value:.2f}%"
    if isinstance(value, (int, float)) and abs(value) > 1_000_000:
        return cf.format_large_number(value)
    if isinstance(value, float):
        return f"{value:.4f}" if abs(value) < 0.01 else f"{value:.2f}"
    return str(value)


def _crypto_metrics_to_list(metrics: dict) -> list:
    return [
        {"label": k, "value": v, "formatted": _crypto_fmt(k, v)}
        for k, v in metrics.items()
    ]


# ----------------------------------------------------------
# RICERCA COIN
# GET /api/tokenomics/search?q=bitcoin
# Cerca monete per nome o simbolo. DEVE stare prima di
# /api/tokenomics/{coin_id} per evitare conflitti di routing.
# ----------------------------------------------------------
@app.get("/api/tokenomics/search")
def search_tokenomics_coins(q: str, user_data: dict = Depends(verify_token)):
    if not q or len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query troppo corta (min 2 caratteri).")
    import crypto_fetcher as cf
    try:
        results = cf.search_coins(q.strip())
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore ricerca CoinGecko: {str(e)}")


# ----------------------------------------------------------
# SOMMARIO COMPLETO
# GET /api/tokenomics/{coin_id}
# coin_id: CoinGecko ID (es. "bitcoin", "ethereum")
# Ritorna: overview + key metrics con rating + commenti + summary
# ----------------------------------------------------------
@app.get("/api/tokenomics/{coin_id}")
def get_tokenomics_summary(coin_id: str, user_data: dict = Depends(verify_token)):
    import crypto_fetcher as cf
    import crypto_analyzer as ca

    cid  = coin_id.strip().lower()
    data = _get_cached_coin_data(cid)
    if data is None:
        raise HTTPException(status_code=404,
                            detail=f"Coin '{cid}' non trovata su CoinGecko. Usare /api/tokenomics/search per trovare l'ID corretto.")

    md   = data.get("market_data", {})
    sg   = cf.safe_nested
    fln  = cf.format_large_number
    mc   = sg(md, "market_cap", "usd")
    fdv  = sg(md, "fully_diluted_valuation", "usd")
    circ = sg(md, "circulating_supply")
    tot  = sg(md, "total_supply")

    # 6 metriche chiave con semaforo (equivalente alle azioni)
    mc_fdv = (mc / fdv) if (mc and fdv and fdv > 0) else None
    circ_pct = (circ / tot * 100) if (circ and tot and tot > 0) else None
    commits = data.get("developer_data", {}).get("commit_count_4_weeks")

    key_metrics = [
        {
            "label":           "Market Cap Rank",
            "value":           data.get("market_cap_rank"),
            "value_formatted": f"#{data.get('market_cap_rank')}" if data.get("market_cap_rank") else "N/D",
            "rating":          ca._rating(data.get("market_cap_rank"), 20, 100, higher_is_better=False),
        },
        {
            "label":           "MC / FDV",
            "value":           mc_fdv,
            "value_formatted": f"{mc_fdv:.0%}" if mc_fdv else "N/D",
            "rating":          ca._rating(mc_fdv, 0.75, 0.5, higher_is_better=True),
        },
        {
            "label":           "Supply Circolante %",
            "value":           circ_pct,
            "value_formatted": f"{circ_pct:.1f}%" if circ_pct else "N/D",
            "rating":          ca._rating(circ_pct, 70, 40, higher_is_better=True),
        },
        {
            "label":           "Commit/4 settimane",
            "value":           commits,
            "value_formatted": str(commits) if commits is not None else "N/D",
            "rating":          ca._rating(commits, 50, 10, higher_is_better=True),
        },
        {
            "label":           "Market Cap (USD)",
            "value":           mc,
            "value_formatted": fln(mc),
            "rating":          ca._rating(mc, 1_000_000_000, 100_000_000, higher_is_better=True),
        },
        {
            "label":           "Sentiment Positivo %",
            "value":           data.get("sentiment_votes_up_percentage"),
            "value_formatted": f"{data.get('sentiment_votes_up_percentage'):.0f}%" if data.get("sentiment_votes_up_percentage") else "N/D",
            "rating":          ca._rating(data.get("sentiment_votes_up_percentage"), 70, 50, higher_is_better=True),
        },
    ]

    links = data.get("links", {})
    homepage = (links.get("homepage") or [""])[0] or None
    github   = (links.get("repos_url", {}).get("github") or [""])[0] or None

    return {
        "coin_id":            cid,
        "name":               data.get("name"),
        "symbol":             data.get("symbol", "").upper(),
        "categories":         data.get("categories", [])[:5],
        "genesis_date":       data.get("genesis_date"),
        "homepage":           homepage,
        "github":             github,
        "description":        data.get("description", {}).get("en", "")[:800],
        "image":              data.get("image", {}).get("large"),
        "coingecko_score":    data.get("coingecko_score"),
        "developer_score":    data.get("developer_score"),
        "community_score":    data.get("community_score"),
        "liquidity_score":    data.get("liquidity_score"),
        "price": {
            "current":        sg(md, "current_price", "usd"),
            "change_24h_pct": sg(md, "price_change_percentage_24h"),
            "change_7d_pct":  sg(md, "price_change_percentage_7d"),
            "change_30d_pct": sg(md, "price_change_percentage_30d"),
            "high_24h":       sg(md, "high_24h", "usd"),
            "low_24h":        sg(md, "low_24h", "usd"),
            "ath":            sg(md, "ath", "usd"),
            "ath_change_pct": sg(md, "ath_change_percentage", "usd"),
        },
        "market_cap":             mc,
        "market_cap_formatted":   fln(mc),
        "fdv":                    fdv,
        "fdv_formatted":          fln(fdv),
        "summary":                ca.generate_overall_summary(data),
        "key_metrics":            key_metrics,
        "comments": {
            "valuation":  ca.generate_valuation_comment(data),
            "tokenomics": ca.generate_tokenomics_comment(data),
            "developer":  ca.generate_developer_comment(data),
            "community":  ca.generate_community_comment(data),
        },
    }


# ----------------------------------------------------------
# TAB VALUTAZIONE
# GET /api/tokenomics/{coin_id}/valuation
# Market Cap, FDV, MC/FDV, ATH, trend prezzi + commento.
# ----------------------------------------------------------
@app.get("/api/tokenomics/{coin_id}/valuation")
def get_tokenomics_valuation(coin_id: str, user_data: dict = Depends(verify_token)):
    import crypto_analyzer as ca
    cid  = coin_id.strip().lower()
    data = _get_cached_coin_data(cid)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Coin '{cid}' non trovata.")
    return {
        "metrics": _crypto_metrics_to_list(ca.get_valuation_metrics(data)),
        "comment": ca.generate_valuation_comment(data),
    }


# ----------------------------------------------------------
# TAB TOKENOMICS
# GET /api/tokenomics/{coin_id}/tokenomics
# Supply, inflazione, volume, hard cap + commento.
# ----------------------------------------------------------
@app.get("/api/tokenomics/{coin_id}/tokenomics")
def get_tokenomics_supply(coin_id: str, user_data: dict = Depends(verify_token)):
    import crypto_analyzer as ca
    cid  = coin_id.strip().lower()
    data = _get_cached_coin_data(cid)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Coin '{cid}' non trovata.")
    return {
        "metrics": _crypto_metrics_to_list(ca.get_tokenomics_metrics(data)),
        "comment": ca.generate_tokenomics_comment(data),
    }


# ----------------------------------------------------------
# TAB ON-CHAIN & MERCATO
# GET /api/tokenomics/{coin_id}/onchain
# Exchange, trust score, liquidity, sentiment scores.
# ----------------------------------------------------------
@app.get("/api/tokenomics/{coin_id}/onchain")
def get_tokenomics_onchain(coin_id: str, user_data: dict = Depends(verify_token)):
    import crypto_analyzer as ca
    cid  = coin_id.strip().lower()
    data = _get_cached_coin_data(cid)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Coin '{cid}' non trovata.")
    return {"metrics": _crypto_metrics_to_list(ca.get_onchain_metrics(data))}


# ----------------------------------------------------------
# TAB DEVELOPER ACTIVITY
# GET /api/tokenomics/{coin_id}/developer
# GitHub stars, forks, commits, issue resolution + commento.
# ----------------------------------------------------------
@app.get("/api/tokenomics/{coin_id}/developer")
def get_tokenomics_developer(coin_id: str, user_data: dict = Depends(verify_token)):
    import crypto_analyzer as ca
    cid  = coin_id.strip().lower()
    data = _get_cached_coin_data(cid)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Coin '{cid}' non trovata.")
    return {
        "metrics": _crypto_metrics_to_list(ca.get_developer_metrics(data)),
        "comment": ca.generate_developer_comment(data),
    }


# ----------------------------------------------------------
# TAB COMMUNITY
# GET /api/tokenomics/{coin_id}/community
# Twitter, Reddit, Telegram, sentiment + commento.
# ----------------------------------------------------------
@app.get("/api/tokenomics/{coin_id}/community")
def get_tokenomics_community(coin_id: str, user_data: dict = Depends(verify_token)):
    import crypto_analyzer as ca
    cid  = coin_id.strip().lower()
    data = _get_cached_coin_data(cid)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Coin '{cid}' non trovata.")
    return {
        "metrics": _crypto_metrics_to_list(ca.get_community_metrics(data)),
        "comment": ca.generate_community_comment(data),
    }


# ----------------------------------------------------------
# STORICO PREZZI
# GET /api/tokenomics/{coin_id}/price-history?days=365
# days: 7 | 30 | 90 | 365 | "max"
# Ritorna [{date, price, market_cap, volume}]
# ----------------------------------------------------------
@app.get("/api/tokenomics/{coin_id}/price-history")
def get_tokenomics_price_history(
    coin_id: str,
    days: str = "365",
    user_data: dict = Depends(verify_token),
):
    import crypto_fetcher as cf
    cid = coin_id.strip().lower()
    # Validazione parametro days
    if days != "max":
        try:
            days_int = int(days)
            if days_int not in (7, 30, 90, 365):
                days_int = 365
        except ValueError:
            days_int = 365
    else:
        days_int = "max"

    # La price history non usa la cache principale (dataset diverso)
    try:
        return cf.fetch_price_history(cid, days=days_int)
    except Exception as e:
        raise HTTPException(status_code=404,
                            detail=f"Impossibile recuperare lo storico per '{cid}': {str(e)}")


# ----------------------------------------------------------
# TOP EXCHANGE (tickers)
# GET /api/tokenomics/{coin_id}/exchanges
# Lista degli exchange che listano il token con volumi.
# ----------------------------------------------------------
@app.get("/api/tokenomics/{coin_id}/exchanges")
def get_tokenomics_exchanges(coin_id: str, user_data: dict = Depends(verify_token)):
    cid  = coin_id.strip().lower()
    data = _get_cached_coin_data(cid)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Coin '{cid}' non trovata.")

    tickers = data.get("tickers", [])[:20]  # Top 20 exchange
    result  = []
    for t in tickers:
        market = t.get("market", {})
        result.append({
            "exchange":     market.get("name"),
            "pair":         f"{t.get('base', '')}/{t.get('target', '')}",
            "price_usd":    t.get("converted_last", {}).get("usd"),
            "volume_usd":   t.get("converted_volume", {}).get("usd"),
            "trust_score":  t.get("trust_score"),
            "is_anomaly":   t.get("is_anomaly"),
            "is_stale":     t.get("is_stale"),
            "trade_url":    t.get("trade_url"),
        })
    return result


# ----------------------------------------------------------
# ESPORTA PDF
# GET /api/tokenomics/{coin_id}/export/pdf
# ----------------------------------------------------------
@app.get("/api/tokenomics/{coin_id}/export/pdf")
def export_tokenomics_pdf(coin_id: str, user_data: dict = Depends(verify_token)):
    from fastapi.responses import Response as _Resp
    cid  = coin_id.strip().lower()
    data = _get_cached_coin_data(cid)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Coin '{cid}' non trovata.")
    try:
        import tokenomics_exporter
        pdf_bytes = tokenomics_exporter.export_to_pdf(data)
    except ImportError:
        raise HTTPException(status_code=501, detail="Eseguire: pip install python-docx fpdf2")
    symbol = data.get("symbol", cid).upper()
    return _Resp(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="tokenomics_{symbol}.pdf"'},
    )


# ----------------------------------------------------------
# ESPORTA WORD
# GET /api/tokenomics/{coin_id}/export/word
# ----------------------------------------------------------
@app.get("/api/tokenomics/{coin_id}/export/word")
def export_tokenomics_word(coin_id: str, user_data: dict = Depends(verify_token)):
    from fastapi.responses import Response as _Resp
    cid  = coin_id.strip().lower()
    data = _get_cached_coin_data(cid)
    if data is None:
        raise HTTPException(status_code=404, detail=f"Coin '{cid}' non trovata.")
    try:
        import tokenomics_exporter
        word_bytes = tokenomics_exporter.export_to_word(data)
    except ImportError:
        raise HTTPException(status_code=501, detail="Eseguire: pip install python-docx fpdf2")
    symbol = data.get("symbol", cid).upper()
    return _Resp(
        content=word_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="tokenomics_{symbol}.docx"'},
    )


# --- ENDPOINT ANALISTA DI MERCATO ---
@app.get("/api/market-analyst/{ticker}")
def analyze_market_ticker(ticker: str, user_data: dict = Depends(verify_token)):
    """
    Richiama l'agente AI che analizza i fondamentali di mercato
    in linguaggio semplice.
    """
    try:
        import market_analyst
        result = market_analyst.analizza_azienda(ticker)
        if "errore" in result:
            raise HTTPException(status_code=404, detail=result["errore"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante l'analisi: {str(e)}")
