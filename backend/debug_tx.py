import sys
sys.path.append('.')
import database
import models
import portfolio

db = database.SessionLocal()

transactions = db.query(models.Transaction).order_by(models.Transaction.id.desc()).limit(10).all()
print("ULTIME 10 TRANSAZIONI:")
for t in transactions:
    print(f"ID={t.id} Data={t.date} Tipo={t.type} Symbol={t.symbol} Q={t.quantity} P={t.price} Tot={t.total} Acc={t.account}")

print("\nLIQUIDITA FINALE:")
print(portfolio.get_liquidity(db))

db.close()
