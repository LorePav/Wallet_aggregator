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
