from fastapi import FastAPI, Depends, HTTPException, Security
from fastapi.security.api_key import APIKeyHeader
from sqlalchemy.orm import Session
from typing import List
from fastapi.middleware.cors import CORSMiddleware
import os

import models
import schemas
import portfolio
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

API_PASSWORD = os.environ.get("API_PASSWORD", "Lorewallet")
api_key_header = APIKeyHeader(name="x-api-password", auto_error=False)

def verify_password(api_key: str = Security(api_key_header)):
    # Se è impostata una password, verifichiamo che l'header corrisponda
    if API_PASSWORD and api_key != API_PASSWORD:
        raise HTTPException(
            status_code=401,
            detail="Password non valida",
        )
    return api_key

app = FastAPI(title="Portfolio API", dependencies=[Depends(verify_password)])
# Permettiamo al Frontend (React) di parlare col Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connessione DB
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
def read_transactions(skip: int = 0, limit: int = 1000, symbol: str = None, db: Session = Depends(get_db)):
    query = db.query(models.Transaction)
    if symbol:
        query = query.filter(models.Transaction.symbol == symbol)
    transactions = query.offset(skip).limit(limit).all()
    return transactions

@app.post("/api/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = models.Transaction(**transaction.model_dump())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.put("/api/transactions/{transaction_id}", response_model=schemas.Transaction)
def update_transaction(transaction_id: int, transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transazione non trovata")
    
    for key, value in transaction.model_dump().items():
        setattr(db_transaction, key, value)
        
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    db_transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
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
def read_assets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    assets = db.query(models.Asset).offset(skip).limit(limit).all()
    return assets

@app.post("/api/assets", response_model=schemas.Asset)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(get_db)):
    db_asset = db.query(models.Asset).filter(models.Asset.symbol == asset.symbol).first()
    if db_asset:
        raise HTTPException(status_code=400, detail="Asset già inserito nel portafoglio")
    db_asset = models.Asset(**asset.model_dump())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    return db_asset

# --- ENDPOINTS PORTFOLIO ---
@app.get("/api/portfolio", response_model=List[schemas.PortfolioItem])
def read_portfolio(db: Session = Depends(get_db)):
    portfolio_data = portfolio.get_portfolio_data(db)
    
    # Genera snapshot aggiornando con l'MTM live
    liquidity_data = portfolio.get_liquidity(db)
    portfolio.update_daily_snapshot(db, portfolio_data, liquidity_data)
    
    return portfolio_data

@app.get("/api/liquidity")
def read_liquidity(db: Session = Depends(get_db)):
    return portfolio.get_liquidity(db)

@app.get("/api/fx_rates")
def read_fx_rates():
    import finance
    return finance.get_exchange_rates()

# --- ENDPOINTS SNAPSHOTS STORICI ---
@app.get("/api/snapshots", response_model=List[schemas.DailySnapshot])
def read_snapshots(db: Session = Depends(get_db)):
    # Restituisce gli snapshot in ordine cronologico ascendente per disegnare il grafico da sinistra a destra
    return db.query(models.DailySnapshot).order_by(models.DailySnapshot.date).all()

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
    # ^GSPC is the ticker for S&P 500 on Yahoo Finance
    history = finance.get_historical_prices("^GSPC", period)
    if not history:
        raise HTTPException(status_code=404, detail="Impossibile recuperare i dati del benchmark (S&P 500).")
    return history

@app.delete("/api/reset")
def reset_portfolio(db: Session = Depends(get_db)):
    try:
        db.query(models.Transaction).delete()
        db.query(models.Asset).delete()
        db.query(models.DailySnapshot).delete()
        db.commit()
        return {"message": "Tutti i dati del portafoglio sono stati cancellati con successo."}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- ENDPOINT EXPORT GOOGLE SHEETS ---
@app.post("/api/export-sheets")
def export_to_sheets(db: Session = Depends(get_db)):
    try:
        portfolio_data = portfolio.get_portfolio_data(db)
        liquidity_data = portfolio.get_liquidity(db)
        
        import export_sheets
        result = export_sheets.export_portfolio(portfolio_data, liquidity_data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante l'esportazione: {str(e)}")

