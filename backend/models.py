from sqlalchemy import Column, Integer, String, Float, DateTime, Date
from database import Base
import datetime

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, unique=True, index=True)   # es. 'BTCUSD', 'STLAM'
    name = Column(String, index=True)                  # es. 'Bitcoin', 'Stellantis NV'
    category = Column(String)                          # es. 'Azioni', 'Crypto', 'ETF'
    currency = Column(String)                          # es. 'EUR', 'USD'

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, default=datetime.date.today)
    type = Column(String)              # 'Buy', 'Sell', 'Dividend'
    symbol = Column(String, index=True) # Collega l'asset acquistato
    quantity = Column(Float)
    price = Column(Float)
    total = Column(Float)
    fees = Column(Float, default=0.0)
    account = Column(String)           # 'Taxable', 'Crypto', ecc.

class DailySnapshot(Base):
    __tablename__ = "daily_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, unique=True, index=True, default=datetime.date.today)
    total_value = Column(Float)        # Net Worth Totale (Asset + Cassa)
    total_invested = Column(Float)     # Solo la parte investita (Asset)

