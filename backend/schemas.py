from pydantic import BaseModel
from datetime import date
from typing import Optional

# ===== ASSET SCHEMAS =====
class AssetBase(BaseModel):
    user_id: Optional[str] = None
    symbol: str
    name: str
    category: str
    currency: str

class AssetCreate(AssetBase):
    pass

class Asset(AssetBase):
    id: int

    class Config:
        from_attributes = True

# ===== TRANSACTION SCHEMAS =====
class TransactionBase(BaseModel):
    user_id: Optional[str] = None
    date: date
    type: str
    symbol: str
    quantity: float
    price: float
    total: float
    fees: Optional[float] = 0.0
    account: str
    currency: Optional[str] = "EUR"

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int

    class Config:
        from_attributes = True

# ===== PORTFOLIO SCHEMAS =====
class PortfolioItem(BaseModel):
    symbol: str
    name: str
    category: str
    currency: str
    quantity: float
    pmc: float
    total_invested: float
    realized_gain: float
    live_price: float
    current_value: float
    current_value_eur: float
    current_value_usd: float
    total_invested_eur: float
    total_invested_usd: float
    unrealized_gain: float
    unrealized_gain_eur: float
    unrealized_gain_usd: float
    unrealized_gain_percent: float

# ===== SNAPSHOT SCHEMAS =====
class DailySnapshotBase(BaseModel):
    user_id: Optional[str] = None
    date: date
    total_value: float
    total_invested: float

class DailySnapshot(DailySnapshotBase):
    id: int

    class Config:
        from_attributes = True
