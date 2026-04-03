from sqlalchemy.orm import Session
import models
import datetime

def get_portfolio_data(db: Session, user_id: str):
    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).order_by(models.Transaction.date).all()
    assets = db.query(models.Asset).filter(models.Asset.user_id == user_id).all()
    
    # Crea una mappa veloce degli asset
    asset_map = {a.symbol: a for a in assets}
    
    portfolio_dict = {}
    
    for t in transactions:
        symbol = t.symbol
        if symbol not in portfolio_dict:
            asset_info = asset_map.get(symbol)
            portfolio_dict[symbol] = {
                "symbol": symbol,
                "name": asset_info.name if asset_info else "Sconosciuto",
                "category": asset_info.category if asset_info else "Altro",
                "currency": asset_info.currency if asset_info else "EUR",
                "quantity": 0.0,
                "total_invested": 0.0,
                "realized_gain": 0.0,
                "pmc": 0.0
            }
            
        p = portfolio_dict[symbol]
        
        if t.type == "Buy":
            p["quantity"] += t.quantity
            p["total_invested"] += t.total
            
        elif t.type == "Sell":
            if p["quantity"] > 0:
                # Calcola il PMC corrente prima di vendere
                current_pmc = p["total_invested"] / p["quantity"]
                # Sottraiamo la quantità venduta
                p["quantity"] -= t.quantity
                # Sottraiamo l'investito proporzionale basato sul PMC originario
                p["total_invested"] -= (current_pmc * t.quantity)
                # Calcoliamo il guadagno netto
                p["realized_gain"] += (t.price - current_pmc) * t.quantity - t.fees
                
        elif t.type == "Dividend":
             p["realized_gain"] += t.total
             
    # Fase 2: Recupero prezzi live
    # Evitiamo di scaricare prezzi per la categoria Farming
    symbols_to_fetch = [
        sym for sym, data in portfolio_dict.items() 
        if data["quantity"] > 0.000001 and (data.get("category", "").strip().upper() != "FARMING")
    ]
    
    import finance
    live_prices = finance.get_live_prices(symbols_to_fetch)
    fx_rates = finance.get_exchange_rates()
             
    # Fase 3: Calcolo finale del PMC e dei Valori Correnti
    result = []
    for sym, data in portfolio_dict.items():
        if data["quantity"] <= 0.000001:
            continue
            
        data["pmc"] = data["total_invested"] / data["quantity"]
            
        if data.get("category", "").strip().upper() == "FARMING":
            data["live_price"] = 1.0
        else:
            data["live_price"] = live_prices.get(sym, 0.0)
            
        data["current_value"] = data["quantity"] * data["live_price"]
        
        # Convert to EUR using FX rate
        currency = data["currency"]
        fx_rate = fx_rates.get(currency, 1.0)
        usd_rate = fx_rates.get("USD", 1.0)
        
        data["current_value_eur"] = data["current_value"] / fx_rate if fx_rate else data["current_value"]
        data["current_value_usd"] = data["current_value_eur"] * usd_rate
        
        data["total_invested_eur"] = data["total_invested"] / fx_rate if fx_rate else data["total_invested"]
        data["total_invested_usd"] = data["total_invested_eur"] * usd_rate
        
        data["unrealized_gain"] = data["current_value"] - data["total_invested"]
        data["unrealized_gain_eur"] = data["unrealized_gain"] / fx_rate if fx_rate else data["unrealized_gain"]
        data["unrealized_gain_usd"] = data["unrealized_gain_eur"] * usd_rate
        
        if data["total_invested"] > 0:
            data["unrealized_gain_percent"] = (data["unrealized_gain"] / data["total_invested"]) * 100
        else:
            data["unrealized_gain_percent"] = 0.0
            
        result.append(data)
        
    return result

def update_daily_snapshot(db: Session, portfolio_data: list, liquidity_data: dict, user_id: str, fx_rates: dict = None):
    if fx_rates is None:
        import finance
        fx_rates = finance.get_exchange_rates()

    total_invested_assets_eur = sum(
        item['total_invested'] / fx_rates.get(item['currency'], 1.0) 
        for item in portfolio_data
    )
    total_value_assets_eur = sum(item['current_value_eur'] for item in portfolio_data)

    total_liquidity_eur = 0.0
    for key, amt in liquidity_data.items():
        if amt != 0:
            currency = key.split(' - ')[1] if ' - ' in key else 'EUR'
            total_liquidity_eur += amt / fx_rates.get(currency, 1.0)

    net_worth_eur = total_value_assets_eur + total_liquidity_eur
    total_invested_all_eur = total_invested_assets_eur + total_liquidity_eur
    today = datetime.date.today()

    snapshot = db.query(models.DailySnapshot).filter(
        models.DailySnapshot.date == today, 
        models.DailySnapshot.user_id == user_id
    ).first()
    
    if snapshot:
        snapshot.total_value = net_worth_eur
        snapshot.total_invested = total_invested_all_eur
    else:
        snapshot = models.DailySnapshot(
            user_id=user_id,
            date=today,
            total_value=net_worth_eur,
            total_invested=total_invested_all_eur
        )
        db.add(snapshot)
        
    db.commit()

def get_liquidity(db: Session, user_id: str):
    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).order_by(models.Transaction.date).all()
    assets = db.query(models.Asset).filter(models.Asset.user_id == user_id).all()
    
    asset_map = {a.symbol: a for a in assets}
    liquidity_by_account_currency = {}
    
    for t in transactions:
        acc = t.account or "Default"
        
        if t.type in ["Deposit", "Withdrawal", "Dividend", "Farming DeFi"]:
            currency = t.symbol.upper()
        else:
            asset = asset_map.get(t.symbol)
            if acc.upper() in ["TRADE REP", "TRADE REPUBLIC", "SCALABLE", "SCALABLE CAPITAL", "DIRECTA"]:
                currency = "EUR"
            else:
                currency = asset.currency if asset else "EUR"
            
        key = f"{acc} - {currency}"
            
        if key not in liquidity_by_account_currency:
            liquidity_by_account_currency[key] = 0.0
            
        if t.type == "Deposit":
            liquidity_by_account_currency[key] += t.total
        elif t.type == "Withdrawal":
            liquidity_by_account_currency[key] -= t.total
        elif t.type == "Buy":
            cash_spent = (t.quantity * t.price) + (t.fees or 0.0)
            liquidity_by_account_currency[key] -= cash_spent
        elif t.type == "Sell":
            cash_gained = (t.quantity * t.price) - (t.fees or 0.0)
            liquidity_by_account_currency[key] += cash_gained
        elif t.type in ["Dividend", "Farming DeFi"]:
            # Per i dividendi/farming, accresce direttamente la liquidità indicata
            liquidity_by_account_currency[key] += t.total
            
    return {k: round(v, 2) for k, v in liquidity_by_account_currency.items()}
