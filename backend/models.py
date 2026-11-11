from sqlalchemy import Column, Integer, String, Float, DateTime, Date, UniqueConstraint
from database import Base
import datetime

class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True) # ID Supabase User
    symbol = Column(String, index=True)   # rimosso unique=True perché più utenti possono avere lo stesso simbolo, user_id+symbol lo definisce.
    name = Column(String, index=True)                  
    category = Column(String)                          
    currency = Column(String)                          

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True) # ID Supabase User
    date = Column(Date, default=datetime.date.today)
    type = Column(String)              
    symbol = Column(String, index=True) 
    quantity = Column(Float)
    price = Column(Float)
    total = Column(Float)
    fees = Column(Float, default=0.0)
    account = Column(String)
    # Valuta in cui viene pagata la ricompensa (Dividend / Farming DeFi).
    # Separata dall'asset collegato: es. farming su SOL con rendimento in USD.
    reward_currency = Column(String, nullable=True)
    # Percentuale di farming passivo (APR/APY), solo informativa.
    yield_percent = Column(Float, nullable=True)

class DailySnapshot(Base):
    __tablename__ = "daily_snapshots"
    __table_args__ = (UniqueConstraint('user_id', 'date', name='uq_user_date'),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=True) # ID Supabase User
    date = Column(Date, index=True, default=datetime.date.today) # rimosso unique=True per gestire più utenti
    total_value = Column(Float)        
    total_invested = Column(Float)     
