# ==============================================================================
# ailyst_router.py
#
# Il "Centralino" del modulo Ailyst: gestisce tutte le richieste HTTP
# che arrivano dal frontend (React) e le indirizza ai moduli giusti.
#
# ENDPOINT DISPONIBILI (prefisso /api/ailyst/):
#
#   Watchlist:
#     GET    /api/ailyst/watchlist            → lista asset monitorati
#     POST   /api/ailyst/watchlist            → aggiungi asset
#     DELETE /api/ailyst/watchlist/{id}       → rimuovi asset
#
#   Ricerca Asset:
#     GET    /api/ailyst/search/crypto?q=...  → cerca su CoinGecko
#     GET    /api/ailyst/search/stock?q=...   → cerca su Yahoo Finance
#
#   News & Prezzi:
#     GET    /api/ailyst/news                 → ultime notizie (con filtri opzionali)
#     GET    /api/ailyst/prices               → prezzi correnti watchlist
#     GET    /api/ailyst/fear-greed           → Fear & Greed Index
#
#   Report:
#     GET    /api/ailyst/report/latest        → ultimo report generato
#     POST   /api/ailyst/report/generate      → genera e invia report manualmente
#
#   Impostazioni:
#     GET    /api/ailyst/settings             → impostazioni notifiche
#     PUT    /api/ailyst/settings             → aggiorna impostazioni
#
# NOTA PER ANTIGRAVITY:
#   Tutte le risposte seguono il formato standard del progetto: { data, meta, error }
#   Tutti gli endpoint richiedono autenticazione Supabase JWT nell'header Authorization.
# ==============================================================================

import json
import logging
import os
from datetime import datetime

import requests
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from database import SessionLocal, engine
from supabase_config import SUPABASE_URL, SUPABASE_ANON_KEY

# Importa i moduli Ailyst
import ailyst_models
import ailyst_news
import ailyst_email

logger = logging.getLogger("ailyst_router")
# Nota: le tabelle vengono create da main.py tramite Base.metadata.create_all()

# Inizializza il router (è come un "mini-app" FastAPI che verrà agganciata al main)
ailyst_router = APIRouter(prefix="/api/ailyst", tags=["Ailyst"])

# ==============================================================================
# AUTENTICAZIONE (stesso meccanismo del main.py)
# ==============================================================================
_security = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(_security)) -> dict:
    """Verifica il JWT Supabase e restituisce i dati utente."""
    token = credentials.credentials
    headers = {
        "apikey":        SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {token}",
    }
    try:
        response = requests.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=headers,
            timeout=5,
        )
    except requests.RequestException:
        raise HTTPException(
            status_code=503,
            detail="Servizio di autenticazione non raggiungibile",
        )
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Token non valido o scaduto")
    return response.json()


def get_db():
    """Fornisce una sessione database, poi la chiude automaticamente."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ==============================================================================
# MODELLI PYDANTIC (schema delle richieste in ingresso dal frontend)
# ==============================================================================

class WatchlistCreate(BaseModel):
    """Dati necessari per aggiungere un asset alla watchlist."""
    symbol:        str
    name:          Optional[str] = None
    asset_type:    str = "crypto"        # "crypto" | "stock" | "forex" | "index"
    coingecko_id:  Optional[str] = None  # Es: "bitcoin" (per crypto)
    yahoo_ticker:  Optional[str] = None  # Es: "AAPL" (per azioni)
    tags:          Optional[list[str]] = []
    alert_above:   Optional[float] = None
    alert_below:   Optional[float] = None


class SettingsUpdate(BaseModel):
    """Dati per aggiornare le impostazioni di notifica."""
    email_enabled:  Optional[bool]  = None
    email_address:  Optional[str]   = None
    report_hour:    Optional[int]   = None    # 0-23
    report_minute:  Optional[int]   = None    # 0-59


# ==============================================================================
# HELPER: risposta standardizzata
# ==============================================================================
def _ok(data, meta: dict = None):
    return {"data": data, "meta": meta or {}, "error": None}


# ==============================================================================
# ENDPOINT WATCHLIST
# ==============================================================================

@ailyst_router.get("/watchlist")
def get_watchlist(
    db:        Session = Depends(get_db),
    user_data: dict    = Depends(verify_token)
):
    """
    Restituisce tutti gli asset nella watchlist dell'utente.
    Include i prezzi correnti se disponibili.
    """
    user_id = user_data["id"]
    items   = db.query(ailyst_models.AilystWatchlist)\
                .filter(ailyst_models.AilystWatchlist.user_id == user_id)\
                .order_by(ailyst_models.AilystWatchlist.added_at.desc())\
                .all()

    result = [
        {
            "id":           item.id,
            "symbol":       item.symbol,
            "name":         item.name,
            "asset_type":   item.asset_type,
            "coingecko_id": item.coingecko_id,
            "yahoo_ticker": item.yahoo_ticker,
            "tags":         json.loads(item.tags or "[]"),
            "alert_above":  item.alert_above,
            "alert_below":  item.alert_below,
            "added_at":     item.added_at.isoformat() if item.added_at else None,
        }
        for item in items
    ]

    return _ok(result, {"count": len(result)})


@ailyst_router.post("/watchlist", status_code=201)
def add_to_watchlist(
    payload:   WatchlistCreate,
    db:        Session = Depends(get_db),
    user_data: dict    = Depends(verify_token)
):
    """
    Aggiunge un nuovo asset alla watchlist dell'utente.
    Se l'asset è già presente, restituisce quello esistente senza duplicarlo.
    """
    user_id = user_data["id"]
    symbol  = payload.symbol.strip().upper()

    # Controlla se esiste già
    existing = db.query(ailyst_models.AilystWatchlist).filter(
        ailyst_models.AilystWatchlist.user_id == user_id,
        ailyst_models.AilystWatchlist.symbol  == symbol,
    ).first()

    if existing:
        return _ok({"id": existing.id, "symbol": existing.symbol}, {"message": "Asset già presente in watchlist"})

    new_item = ailyst_models.AilystWatchlist(
        user_id       = user_id,
        symbol        = symbol,
        name          = payload.name,
        asset_type    = payload.asset_type,
        coingecko_id  = payload.coingecko_id,
        yahoo_ticker  = payload.yahoo_ticker,
        tags          = json.dumps(payload.tags or []),
        alert_above   = payload.alert_above,
        alert_below   = payload.alert_below,
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    logger.info(f"Ailyst: {symbol} aggiunto alla watchlist di {user_id}")
    return _ok({"id": new_item.id, "symbol": new_item.symbol})


@ailyst_router.delete("/watchlist/{item_id}")
def remove_from_watchlist(
    item_id:   int,
    db:        Session = Depends(get_db),
    user_data: dict    = Depends(verify_token)
):
    """Rimuove un asset dalla watchlist dell'utente."""
    user_id = user_data["id"]
    item    = db.query(ailyst_models.AilystWatchlist).filter(
        ailyst_models.AilystWatchlist.id      == item_id,
        ailyst_models.AilystWatchlist.user_id == user_id,
    ).first()

    if not item:
        raise HTTPException(status_code=404, detail="Asset non trovato nella watchlist")

    db.delete(item)
    db.commit()
    return _ok({"removed": item_id})


# ==============================================================================
# ENDPOINT RICERCA ASSET
# ==============================================================================

@ailyst_router.get("/search/crypto")
def search_crypto(
    q:         str,
    user_data: dict = Depends(verify_token)
):
    """
    Cerca una criptovaluta su CoinGecko per nome o simbolo.
    Esempio: GET /api/ailyst/search/crypto?q=bitcoin
    Restituisce: [{id, symbol, name, thumb, market_cap_rank}]
    """
    if len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query troppo corta (minimo 2 caratteri)")

    try:
        response = requests.get(
            "https://api.coingecko.com/api/v3/search",
            params={"query": q.strip()},
            timeout=8
        )
        response.raise_for_status()
        data   = response.json()
        coins  = data.get("coins", [])[:10]

        result = [
            {
                "id":              c.get("id"),
                "symbol":          c.get("symbol", "").upper(),
                "name":            c.get("name"),
                "thumb":           c.get("thumb"),
                "market_cap_rank": c.get("market_cap_rank"),
                # Pre-compila i campi utili per aggiungere alla watchlist
                "coingecko_id":    c.get("id"),
                "yahoo_ticker":    f"{c.get('symbol', '').upper()}-USD",
                "asset_type":      "crypto",
            }
            for c in coins
        ]

        return _ok(result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore ricerca CoinGecko: {str(e)}")


@ailyst_router.get("/search/stock")
def search_stock(
    q:         str,
    user_data: dict = Depends(verify_token)
):
    """
    Cerca un'azione o ETF usando Yahoo Finance.
    Esempio: GET /api/ailyst/search/stock?q=apple
    Restituisce: [{symbol, name, exchange, asset_type}]
    """
    if len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query troppo corta (minimo 2 caratteri)")

    try:
        import finance  # Modulo già presente nel progetto
        results = finance.search_tickers(q.strip())
        return _ok(results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore ricerca Yahoo Finance: {str(e)}")


# ==============================================================================
# ENDPOINT NEWS
# ==============================================================================

@ailyst_router.get("/news")
def get_news(
    hours:        int            = 24,
    asset:        Optional[str]  = None,
    limit:        int            = 30,
    refresh:      bool           = False,
    db:           Session        = Depends(get_db),
    user_data:    dict           = Depends(verify_token)
):
    """
    Restituisce le ultime notizie finanziarie e crypto.

    Parametri URL:
      ?hours=24       → considera ultime N ore (default 24)
      ?asset=BTC      → filtra per asset specifico (opzionale)
      ?limit=30       → numero massimo risultati
      ?refresh=true   → forza un nuovo fetch RSS prima di rispondere
    """
    user_id = user_data["id"]

    # Se richiesto refresh, raccoglie prima le nuove notizie
    if refresh:
        watchlist = db.query(ailyst_models.AilystWatchlist)\
                      .filter(ailyst_models.AilystWatchlist.user_id == user_id)\
                      .all()
        symbols   = [w.symbol for w in watchlist]
        ailyst_news.run_collection_pipeline(db, symbols)

    news = ailyst_news.get_recent_news(db, hours=hours, asset_filter=asset, limit=limit)
    return _ok(news, {"count": len(news), "hours_range": hours})


# ==============================================================================
# ENDPOINT PREZZI
# ==============================================================================

@ailyst_router.get("/prices")
def get_prices(
    db:        Session = Depends(get_db),
    user_data: dict    = Depends(verify_token)
):
    """
    Restituisce i prezzi correnti di tutti gli asset nella watchlist dell'utente.
    Include anche il Fear & Greed Index crypto.
    """
    user_id   = user_data["id"]
    watchlist = db.query(ailyst_models.AilystWatchlist)\
                  .filter(ailyst_models.AilystWatchlist.user_id == user_id)\
                  .all()

    prices     = ailyst_news.get_all_prices_for_watchlist(watchlist)
    fear_greed = ailyst_news.get_fear_greed_index()

    return _ok({
        "prices":     prices,
        "fear_greed": fear_greed,
        "updated_at": datetime.utcnow().isoformat(),
    })


@ailyst_router.get("/fear-greed")
def get_fear_greed(user_data: dict = Depends(verify_token)):
    """Restituisce solo il Fear & Greed Index crypto."""
    data = ailyst_news.get_fear_greed_index()
    return _ok(data)


# ==============================================================================
# ENDPOINT REPORT
# ==============================================================================

@ailyst_router.get("/report/latest")
def get_latest_report(
    db:        Session = Depends(get_db),
    user_data: dict    = Depends(verify_token)
):
    """
    Restituisce l'ultimo report generato per questo utente.
    Se non esiste nessun report, restituisce null.
    """
    user_id = user_data["id"]
    report  = db.query(ailyst_models.AilystReport)\
                .filter(ailyst_models.AilystReport.user_id == user_id)\
                .order_by(ailyst_models.AilystReport.created_at.desc())\
                .first()

    if not report:
        return _ok(None, {"message": "Nessun report ancora generato"})

    return _ok({
        "id":          report.id,
        "report_date": report.report_date.isoformat(),
        "content_html": report.content_html,
        "sent_email":  report.sent_email,
        "created_at":  report.created_at.isoformat(),
    })


@ailyst_router.post("/report/generate")
def generate_report_now(
    send_email:  bool    = True,
    db:          Session = Depends(get_db),
    user_data:   dict    = Depends(verify_token)
):
    """
    Genera e invia manualmente il report adesso (senza aspettare le 07:30).
    Utile per testare il sistema o per generare un report extra.

    Parametri URL:
      ?send_email=true  → invia anche via email (default: true)
    """
    user_id    = user_data["id"]
    user_email = user_data.get("email", "")

    # 1. Recupera watchlist
    watchlist = db.query(ailyst_models.AilystWatchlist)\
                  .filter(ailyst_models.AilystWatchlist.user_id == user_id)\
                  .all()
    symbols   = [w.symbol for w in watchlist]

    if not watchlist:
        raise HTTPException(
            status_code=400,
            detail="Watchlist vuota. Aggiungi prima degli asset da monitorare."
        )

    # 2. Raccoglie notizie fresche
    ailyst_news.run_collection_pipeline(db, symbols)

    # 3. Recupera dati per il report
    watchlist_data = [
        {"symbol": w.symbol, "name": w.name, "asset_type": w.asset_type}
        for w in watchlist
    ]
    prices     = ailyst_news.get_all_prices_for_watchlist(watchlist)
    news       = ailyst_news.get_recent_news(db, hours=24, limit=20)
    fear_greed = ailyst_news.get_fear_greed_index()

    # 4. Controlla impostazioni utente (email di destinazione)
    settings = db.query(ailyst_models.AilystSettings)\
                  .filter(ailyst_models.AilystSettings.user_id == user_id)\
                  .first()
    dest_email = (settings.email_address if settings and settings.email_address else user_email)

    # 5. Costruisce l'HTML del report
    now         = datetime.utcnow()
    html_content = ailyst_email.build_html_report(
        user_email   = dest_email,
        watchlist    = watchlist_data,
        prices       = prices,
        news         = news,
        fear_greed   = fear_greed,
        report_date  = now,
    )

    # 6. Salva il report nel database
    report_record = ailyst_models.AilystReport(
        user_id      = user_id,
        report_date  = now,
        content_html = html_content,
        content_json = json.dumps({
            "prices":     prices,
            "fear_greed": fear_greed,
            "news_count": len(news),
        }),
        sent_email   = False,
    )
    db.add(report_record)
    db.commit()
    db.refresh(report_record)

    # 7. Invia via email se richiesto e configurato
    email_sent = False
    if send_email and dest_email:
        email_sent = ailyst_email.send_gmail_report(
            to_email     = dest_email,
            html_content = html_content,
            report_date  = now,
        )
        if email_sent:
            report_record.sent_email = True
            db.commit()

    return _ok({
        "report_id":  report_record.id,
        "email_sent": email_sent,
        "email_to":   dest_email if email_sent else None,
        "news_count": len(news),
        "assets_count": len(watchlist),
    }, {"message": "Report generato con successo!"})


# ==============================================================================
# ENDPOINT IMPOSTAZIONI
# ==============================================================================

@ailyst_router.get("/settings")
def get_settings(
    db:        Session = Depends(get_db),
    user_data: dict    = Depends(verify_token)
):
    """Restituisce le impostazioni Ailyst dell'utente."""
    user_id  = user_data["id"]
    settings = db.query(ailyst_models.AilystSettings)\
                  .filter(ailyst_models.AilystSettings.user_id == user_id)\
                  .first()

    if not settings:
        # Creiamo davvero la riga con i valori di default: così lo scheduler
        # vede l'utente (prima chi non salvava mai le impostazioni non riceveva
        # alcuna email, pur vedendo "email abilitate" nella pagina).
        settings = ailyst_models.AilystSettings(
            user_id       = user_id,
            email_address = user_data.get("email", "") or "",
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)

    return _ok({
        "email_enabled":  settings.email_enabled,
        "email_address":  settings.email_address,
        "report_hour":    settings.report_hour,
        "report_minute":  settings.report_minute,
    })


@ailyst_router.put("/settings")
def update_settings(
    payload:   SettingsUpdate,
    db:        Session = Depends(get_db),
    user_data: dict    = Depends(verify_token)
):
    """Aggiorna le impostazioni Ailyst dell'utente."""
    user_id  = user_data["id"]
    settings = db.query(ailyst_models.AilystSettings)\
                  .filter(ailyst_models.AilystSettings.user_id == user_id)\
                  .first()

    if not settings:
        settings = ailyst_models.AilystSettings(
            user_id       = user_id,
            email_address = user_data.get("email", ""),
        )
        db.add(settings)

    if payload.email_enabled  is not None: settings.email_enabled  = payload.email_enabled
    if payload.email_address  is not None: settings.email_address  = payload.email_address
    if payload.report_hour    is not None: settings.report_hour    = max(0, min(23, payload.report_hour))
    if payload.report_minute  is not None: settings.report_minute  = max(0, min(59, payload.report_minute))
    settings.updated_at = datetime.utcnow()

    db.commit()
    return _ok({"updated": True}, {"message": "Impostazioni salvate"})


# ==============================================================================
# SCHEDULER: REPORT AUTOMATICO MATTUTINO
# ==============================================================================

def _generate_report_for_user(user_id: str, user_email: str):
    """
    Genera e invia il report per un singolo utente.
    Questa funzione viene chiamata dallo scheduler alle 07:30.
    Usa una sessione DB propria (non quella FastAPI) perché gira in background.
    """
    db = SessionLocal()
    try:
        watchlist = db.query(ailyst_models.AilystWatchlist)\
                      .filter(ailyst_models.AilystWatchlist.user_id == user_id)\
                      .all()

        if not watchlist:
            logger.info(f"Ailyst scheduler: watchlist vuota per {user_id}, skip.")
            return

        symbols    = [w.symbol for w in watchlist]
        ailyst_news.run_collection_pipeline(db, symbols)

        watchlist_data = [{"symbol": w.symbol, "name": w.name, "asset_type": w.asset_type} for w in watchlist]
        prices         = ailyst_news.get_all_prices_for_watchlist(watchlist)
        news           = ailyst_news.get_recent_news(db, hours=24, limit=20)
        fear_greed     = ailyst_news.get_fear_greed_index()

        settings   = db.query(ailyst_models.AilystSettings)\
                       .filter(ailyst_models.AilystSettings.user_id == user_id)\
                       .first()
        dest_email = (settings.email_address if settings and settings.email_address else user_email)
        email_ok   = settings.email_enabled if settings else True

        now          = datetime.utcnow()
        html_content = ailyst_email.build_html_report(
            user_email  = dest_email,
            watchlist   = watchlist_data,
            prices      = prices,
            news        = news,
            fear_greed  = fear_greed,
            report_date = now,
        )

        report = ailyst_models.AilystReport(
            user_id      = user_id,
            report_date  = now,
            content_html = html_content,
            content_json = json.dumps({"prices": prices, "fear_greed": fear_greed}),
            sent_email   = False,
        )
        db.add(report)
        db.commit()
        db.refresh(report)

        if email_ok and dest_email:
            sent = ailyst_email.send_gmail_report(dest_email, html_content, report_date=now)
            if sent:
                report.sent_email = True
                db.commit()
                logger.info(f"Ailyst: report mattutino inviato a {dest_email}")

    except Exception as e:
        logger.error(f"Errore scheduler Ailyst per user {user_id}: {e}")
    finally:
        db.close()


def morning_report_job():
    """
    Job schedulato: ogni minuto controlla quali utenti hanno l'orario di invio
    corrispondente ad adesso e manda il report a chi ha le email attivate.
    """
    from zoneinfo import ZoneInfo

    now = datetime.now(ZoneInfo("Europe/Rome"))
    db = SessionLocal()
    try:
        # Trova tutti gli utenti con email abilitata
        all_settings = db.query(ailyst_models.AilystSettings)\
                         .filter(ailyst_models.AilystSettings.email_enabled == True)\
                         .all()

        # report_date è salvata in UTC (datetime.utcnow()): usiamo la mezzanotte
        # UTC per capire se il report di oggi è già stato inviato.
        today_utc = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        for s in all_settings:
            if not s.email_address:
                continue
            if s.report_hour != now.hour or s.report_minute != now.minute:
                continue

            # Evita doppioni se il job scatta due volte nello stesso minuto.
            already_sent = db.query(ailyst_models.AilystReport).filter(
                ailyst_models.AilystReport.user_id == s.user_id,
                ailyst_models.AilystReport.sent_email == True,
                ailyst_models.AilystReport.report_date >= today_utc,
            ).first()
            if already_sent:
                logger.info(f"Ailyst: report già inviato oggi per {s.user_id}, skip.")
                continue

            _generate_report_for_user(s.user_id, s.email_address)

    finally:
        db.close()


def start_ailyst_scheduler():
    """
    Avvia lo scheduler APScheduler per i report automatici.

    Di default è DISATTIVATO (AILYST_SCHEDULER_ENABLED=false) perché la pagina
    Ailyst al momento non è attiva nel frontend. Per riattivarlo basta mettere
    AILYST_SCHEDULER_ENABLED=true in backend/.env. Ogni utente riceve il report
    all'orario scelto nelle proprie impostazioni.
    """
    enabled = os.environ.get("AILYST_SCHEDULER_ENABLED", "false").strip().lower()
    if enabled not in ("1", "true", "yes", "on"):
        logger.info("Ailyst scheduler disattivato (AILYST_SCHEDULER_ENABLED=false).")
        return None

    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = BackgroundScheduler(timezone="Europe/Rome")
        scheduler.add_job(
            morning_report_job,
            CronTrigger(minute="*"),
            id="ailyst_morning_report",
            name="Ailyst Report Automatico",
            replace_existing=True,
        )
        scheduler.start()
        logger.info("Ailyst scheduler avviato: controllo ogni minuto degli orari utente (Europe/Rome)")
        return scheduler
    except Exception as e:
        logger.error(f"Impossibile avviare lo scheduler Ailyst: {e}")
        return None
