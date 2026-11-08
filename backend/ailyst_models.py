# ==============================================================================
# ailyst_models.py
#
# Questo file definisce le "tabelle" del database per il modulo Ailyst.
# Pensa a ogni classe come a un foglio Excel con le sue colonne.
# SQLAlchemy le trasformerà automaticamente in tabelle reali nel database.
# ==============================================================================

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, UniqueConstraint
from database import Base  # Usiamo la stessa "base" dell'app esistente
import datetime


class AilystWatchlist(Base):
    """
    Watchlist: la lista degli asset che l'utente vuole monitorare.
    Ogni riga = un asset salvato da un utente specifico.
    """
    __tablename__ = "ailyst_watchlist"
    __table_args__ = (
        UniqueConstraint('user_id', 'symbol', name='uq_ailyst_user_symbol'),
    )

    id             = Column(Integer, primary_key=True, index=True)
    user_id        = Column(String, index=True, nullable=False)   # ID Supabase dell'utente
    symbol         = Column(String, index=True, nullable=False)   # es: BTC, AAPL, EUR/USD
    name           = Column(String, nullable=True)                 # es: Bitcoin, Apple Inc.
    asset_type     = Column(String, default="crypto")             # crypto | stock | forex | index
    coingecko_id   = Column(String, nullable=True)                # es: "bitcoin" (per CoinGecko API)
    yahoo_ticker   = Column(String, nullable=True)                # es: "BTC-USD", "AAPL" (per yfinance)
    tags           = Column(String, default="[]")                  # JSON stringa: '["DeFi", "AI"]'
    alert_above    = Column(Float, nullable=True)                  # Alert se prezzo SALE sopra questa soglia
    alert_below    = Column(Float, nullable=True)                  # Alert se prezzo SCENDE sotto questa soglia
    added_at       = Column(DateTime, default=datetime.datetime.utcnow)


class AilystNewsCache(Base):
    """
    Cache delle notizie già scaricate e analizzate.
    Serve per non scaricare due volte la stessa notizia (deduplicazione).
    Ogni riga = una notizia unica con il suo punteggio sentiment.
    """
    __tablename__ = "ailyst_news_cache"

    id               = Column(Integer, primary_key=True, index=True)
    hash             = Column(String, unique=True, index=True)    # Impronta digitale del titolo (MD5)
    title            = Column(String)
    summary          = Column(Text)
    source           = Column(String)                              # es: "CoinDesk", "Reuters"
    url              = Column(String)
    sentiment_score  = Column(Float, default=0.0)                 # Da -1 (bearish) a +1 (bullish)
    relevance_score  = Column(Integer, default=50)                # Da 0 a 100
    assets_mentioned = Column(String, default="[]")               # JSON: '["BTC", "ETH"]'
    published_at     = Column(DateTime, nullable=True)
    fetched_at       = Column(DateTime, default=datetime.datetime.utcnow)


class AilystReport(Base):
    """
    Storico dei report giornalieri generati.
    Ogni riga = un report inviato a un utente in un determinato giorno.
    """
    __tablename__ = "ailyst_reports"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(String, index=True, nullable=False)
    report_date  = Column(DateTime, default=datetime.datetime.utcnow)
    content_html = Column(Text)                                   # HTML del report completo
    content_json = Column(Text)                                   # Dati grezzi in formato JSON
    sent_email   = Column(Boolean, default=False)                 # True se l'email è stata inviata
    created_at   = Column(DateTime, default=datetime.datetime.utcnow)


class AilystSettings(Base):
    """
    Impostazioni di notifica per ogni utente.
    Un solo record per utente.
    """
    __tablename__ = "ailyst_settings"

    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(String, unique=True, index=True, nullable=False)
    email_enabled     = Column(Boolean, default=True)             # Invia report via email?
    email_address     = Column(String, nullable=True)             # Email di destinazione
    report_hour       = Column(Integer, default=7)                # Ora di invio (formato 24h, default 07:00)
    report_minute     = Column(Integer, default=30)               # Minuto di invio
    updated_at        = Column(DateTime, default=datetime.datetime.utcnow)
