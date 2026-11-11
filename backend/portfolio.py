from sqlalchemy.orm import Session
import models
import datetime

# Valute di cassa: non sono asset di portafoglio. Quando un'operazione di
# rendita (Dividend/Farming) è collegata a una di queste, il guadagno va
# esclusivamente in liquidità e non crea asset fantasma.
CASH_SYMBOLS = {"EUR", "USD", "GBP", "CHF", "JPY"}


def _convert_currency(amount: float, from_curr: str, to_curr: str, fx_rates: dict) -> float:
    """Converte un importo da from_curr a to_curr usando i tassi rispetto all'EUR."""
    if not from_curr or not to_curr or from_curr == to_curr:
        return amount
    eur = amount / (fx_rates.get(from_curr, 1.0) or 1.0)
    return eur * (fx_rates.get(to_curr, 1.0) or 1.0)


def get_portfolio_data(db: Session, user_id: str, fx_rates: dict = None):
    if fx_rates is None:
        import finance
        fx_rates = finance.get_exchange_rates()

    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == user_id).order_by(models.Transaction.date).all()
    assets = db.query(models.Asset).filter(models.Asset.user_id == user_id).all()

    # Crea una mappa veloce degli asset
    asset_map = {a.symbol: a for a in assets}

    # Aggreghiamo per (simbolo, conto): lo stesso asset può essere detenuto su
    # conti diversi e i guadagni/quantità non vanno mescolati.
    portfolio_dict = {}

    for t in transactions:
        symbol = t.symbol
        account = t.account or "Default"
        key = (symbol, account)

        # Le rendite (Dividend/Farming) collegate a una valuta di cassa
        # (es. farming su USD per avere USD) non creano un asset nel
        # portafoglio: vanno solo ad accrescere la liquidità del conto.
        if t.type in ("Dividend", "Farming DeFi") and symbol.upper() in CASH_SYMBOLS:
            continue

        if key not in portfolio_dict:
            asset_info = asset_map.get(symbol)
            portfolio_dict[key] = {
                "symbol": symbol,
                "account": account,
                "name": asset_info.name if asset_info else "Sconosciuto",
                "category": asset_info.category if asset_info else "Altro",
                "currency": asset_info.currency if asset_info else "EUR",
                "quantity": 0.0,
                "total_invested": 0.0,
                "realized_gain": 0.0,
                "pmc": 0.0,
                "yield_percent": None
            }

        p = portfolio_dict[key]

        if t.type == "Buy":
            p["quantity"] += t.quantity
            p["total_invested"] += t.total

        elif t.type == "Sell":
            if p["quantity"] > 0:
                # Calcola il PMC corrente prima di vendere
                current_pmc = p["total_invested"] / p["quantity"]
                # Non permettere quantità negative (oversell): vendiamo al massimo il disponibile
                sold_quantity = min(t.quantity, p["quantity"])
                p["quantity"] -= sold_quantity
                # Sottraiamo l'investito proporzionale basato sul PMC originario
                p["total_invested"] -= (current_pmc * sold_quantity)
                # Calcoliamo il guadagno netto
                p["realized_gain"] += (t.price - current_pmc) * sold_quantity - (t.fees or 0.0)
                if p["quantity"] <= 0.000001:
                    p["quantity"] = 0.0
                    p["total_invested"] = 0.0

        elif t.type in ("Dividend", "Farming DeFi"):
            reward_curr = (t.reward_currency or p["currency"] or "EUR").upper()

            if reward_curr in CASH_SYMBOLS:
                # Rendimento in valuta: guadagno realizzato (convertito nella
                # valuta dell'asset) + cassa nella valuta del rendimento.
                gain = _convert_currency(t.total, reward_curr, p["currency"], fx_rates)
                p["realized_gain"] += gain
            else:
                # Rendimento in asset (compound, es. SOL -> SOL): aumenta la
                # quantità della posizione del token ricevuto. Nessun guadagno
                # realizzato né cassa: il valore emerge come guadagno non
                # realizzato (quantità x prezzo) finché non si vende.
                reward_key = (reward_curr, account)
                if reward_key not in portfolio_dict:
                    asset_info = asset_map.get(reward_curr)
                    portfolio_dict[reward_key] = {
                        "symbol": reward_curr,
                        "account": account,
                        "name": asset_info.name if asset_info else "Sconosciuto",
                        "category": asset_info.category if asset_info else "Altro",
                        "currency": asset_info.currency if asset_info else "EUR",
                        "quantity": 0.0,
                        "total_invested": 0.0,
                        "realized_gain": 0.0,
                        "pmc": 0.0,
                        "yield_percent": None
                    }
                portfolio_dict[reward_key]["quantity"] += t.total

            # L'ultima percentuale di farming indicata diventa quella "corrente"
            # dell'asset collegato (le transazioni sono ordinate per data).
            if t.yield_percent is not None:
                p["yield_percent"] = t.yield_percent

    # Fase 2: Recupero prezzi live (una sola volta per simbolo)
    # Evitiamo di scaricare prezzi per la categoria Farming
    symbols_to_fetch = sorted({
        sym for (sym, _account), data in portfolio_dict.items()
        if data["quantity"] > 0.000001 and (data.get("category", "").strip().upper() != "FARMING")
    })

    import finance
    live_prices = finance.get_live_prices(symbols_to_fetch)
    if fx_rates is None:
        fx_rates = finance.get_exchange_rates()

    # Fase 3: Calcolo finale del PMC e dei Valori Correnti
    result = []
    for (sym, _account), data in portfolio_dict.items():
        is_closed = data["quantity"] <= 0.000001

        # Le posizioni chiuse restano nel risultato per non perdere il guadagno
        # realizzato (es. dopo una vendita totale), ma senza valore corrente.
        if is_closed and abs(data.get("realized_gain", 0.0)) <= 0.000001:
            continue

        data["is_closed"] = is_closed

        if is_closed:
            data["quantity"] = 0.0
            data["total_invested"] = 0.0
            data["pmc"] = 0.0
        else:
            data["pmc"] = data["total_invested"] / data["quantity"]

        if is_closed:
            data["live_price"] = 0.0
        elif data.get("category", "").strip().upper() == "FARMING":
            # Le posizioni Farming/DeFi non hanno un prezzo di mercato su Yahoo:
            # le valutiamo al costo di acquisto (PMC) invece di assumere 1:1.
            # Così quantità in token e prezzi diversi da 1 non generano guadagni
            # o perdite fittizie. I rendimenti si registrano come "Farming DeFi".
            data["live_price"] = data["pmc"]
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
        
        if t.type in ["Deposit", "Withdrawal"]:
            # Per i flussi di cassa il simbolo è direttamente la valuta
            currency = t.symbol.upper()
        elif t.type in ["Dividend", "Farming DeFi"]:
            # Per dividendi/farming la ricompensa è espressa nella valuta
            # indicata (reward_currency); se assente si ripiega sulla valuta
            # dell'asset (comportamento precedente).
            if t.reward_currency:
                currency = t.reward_currency.upper()
            else:
                asset = asset_map.get(t.symbol)
                if acc.upper() in ["TRADE REP", "TRADE REPUBLIC", "SCALABLE", "SCALABLE CAPITAL", "DIRECTA"]:
                    currency = "EUR"
                else:
                    currency = asset.currency if asset else "EUR"
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
            # Solo i rendimenti in valuta accrescono la liquidità di cassa.
            # I rendimenti in asset (compound, es. SOL -> SOL) aumentano la
            # quantità del token, non la cassa: qui non vanno accreditati.
            reward_curr = (t.reward_currency or "").upper()
            if reward_curr in CASH_SYMBOLS:
                liquidity_by_account_currency[key] += t.total
            
    return {k: round(v, 2) for k, v in liquidity_by_account_currency.items()}
