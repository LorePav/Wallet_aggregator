import sys
import os
from datetime import date

from database import SessionLocal, engine
import models
import portfolio

# Assicuriamoci che le tabelle esistano
models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

def run_test():
    # Pulisci il DB per il test
    db.query(models.Transaction).delete()
    db.query(models.Asset).delete()
    db.commit()

    # Inserisci asset
    a1 = models.Asset(symbol="BTCUSD", name="Bitcoin", category="Crypto", currency="USD")
    a2 = models.Asset(symbol="AAPL", name="Apple Inc", category="Azioni", currency="USD")
    db.add_all([a1, a2])
    db.commit()

    # Inserisci transazioni
    t1 = models.Transaction(date=date(2023, 1, 15), type="Buy", symbol="BTCUSD", quantity=0.5, price=20000, total=10000, account="Crypto")
    t2 = models.Transaction(date=date(2023, 6, 1), type="Buy", symbol="AAPL", quantity=10, price=150, total=1500, account="Broker")
    t3 = models.Transaction(date=date(2023, 8, 1), type="Buy", symbol="BTCUSD", quantity=0.5, price=30000, total=15000, account="Crypto")
    db.add_all([t1, t2, t3])
    db.commit()

    print("Dati fittizi inseriti. Calcolo portafoglio...")
    res = portfolio.get_portfolio_data(db)
    
    print("\n--- RISULTATO PORTAFOGLIO ---")
    for r in res:
        print(f"Asset: {r['name']} ({r['symbol']})")
        print(f"  Quantità: {r['quantity']}")
        print(f"  PMC: {r['pmc']}")
        print(f"  Prezzo Live: {r['live_price']}")
        print(f"  Valore Attuale: {r['current_value']}")
        print(f"  Guadagno non realizzato: {r['unrealized_gain']} ({r.get('unrealized_gain_percent', 0):.2f}%)")
        print("-" * 30)

if __name__ == "__main__":
    run_test()
