import sys
sys.path.append('.')
import database
import models

db = database.SessionLocal()
transactions = db.query(models.Transaction).order_by(models.Transaction.date).all()
assets = db.query(models.Asset).all()
asset_map = {a.symbol: a for a in assets}

liquidity_by_account_currency = {}
for t in transactions:
    acc = t.account or "Default"
    if t.type in ["Deposit", "Withdrawal"]:
        currency = t.symbol.upper()
    else:
        asset = asset_map.get(t.symbol)
        currency = asset.currency if asset else "EUR"
        
    key = f"{acc} - {currency}"
    if 'TRADE REP' in acc:
        print(f"[{t.date}] {t.type} {t.symbol} | Costo/Valore: {t.total} | Tass: {t.fees} -> Valuta: {currency}")
    
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
        
print("RISULTATO FINALE:", liquidity_by_account_currency['TRADE REP - EUR'])
db.close()
