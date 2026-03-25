import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
from database import SessionLocal, engine
import sys
import models

# FIX terminale windows
sys.stdout.reconfigure(encoding='utf-8')

# Configura DB
models.Base.metadata.create_all(bind=engine)
db = SessionLocal()

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
]
SERVICE_ACCOUNT_FILE = r'C:\Users\Lorenzo\.gemini\antigravity\scratch\ESPERIMENTO\credentials.json'

try:
    credentials = Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    gc = gspread.authorize(credentials)
    
    SHEET_NAME = "PORTAFOGLIO_AGGIORNATO"
    print(f"Ricerca file: '{SHEET_NAME}'...")
    sh = gc.open(SHEET_NAME)
    
    worksheet_name = "registro commerciale Calc"
    print(f"Apertura scheda: '{worksheet_name}'...")
    worksheet = sh.worksheet(worksheet_name)
    
    dati = worksheet.get_all_values()
    print(f"Estratte {len(dati)} righe dal sheet.")

    db.query(models.Transaction).delete()
    db.query(models.Asset).delete()
    db.commit()
    print("Database SQLite inizializzato per l'import.")

    asset_creati = set()
    transazioni_da_salvare = []

    # Le vere transazioni su quel foglio iniziano da indice 5 (riga 6)
    for index, row in enumerate(dati[5:], start=6):
        # Indici Google Sheets API (0-based) per 'registro commerciale Calc'
        # [0] Vuoto
        # [1] Data
        # [2] Tipo (Buy/Sell)
        # [3] Simbolo
        # [4] Quantità
        # [5] Prezzo x Unità
        # [6] Totale (nessuna fee)
        # [7] Fee
        # [8] Account
        # [11] Valuta
        # [12] Categoria
        
        if len(row) < 13 or not row[1].strip() or not row[3].strip():
            continue
            
        try:
            data_str = row[1].strip()
            if "-" in data_str:
                data_obj = datetime.strptime(data_str, "%m-%d-%Y").date()
            elif "/" in data_str:
                data_obj = datetime.strptime(data_str, "%m/%d/%Y").date()
            else:
                data_obj = datetime.today().date()
                
            tipo = row[2].strip()
            simbolo = row[3].strip()
            # Non essendoci il nome esteso in questo foglio calcolato, impieghiamo il simbolo stesso all'inizio
            nome = simbolo 
            
            # Gestione formati float ITA (es. "10,08" -> 10.08) o stringhe vuote
            def clean_float(val):
                testo = val.replace('€', '').replace('$', '').replace(' ', '').strip()
                if not testo: return 0.0
                # Se c'è sia punto che virgola (es. 1.000,50)
                if '.' in testo and ',' in testo:
                    testo = testo.replace('.', '')
                testo = testo.replace(',', '.')
                return float(testo)
                
            quantita = clean_float(row[4])
            prezzo = clean_float(row[5])
            totale = clean_float(row[6])
            commissioni = clean_float(row[7])
            conto = row[8].strip()
            valuta = row[11].strip()
            categoria = row[12].strip()
            
            if simbolo not in asset_creati:
                nuovo_asset = models.Asset(
                    symbol=simbolo,
                    name=nome,
                    category=categoria,
                    currency=valuta
                )
                db.add(nuovo_asset)
                asset_creati.add(simbolo)
                
            nuova_tx = models.Transaction(
                date=data_obj,
                type=tipo,
                symbol=simbolo,
                quantity=quantita,
                price=prezzo,
                total=totale,
                fees=commissioni,
                account=conto
            )
            transazioni_da_salvare.append(nuova_tx)
            
        except Exception as row_error:
            print(f"Errore nella parificazione riga {index}: {row_error}")
            continue

    if transazioni_da_salvare:
        db.add_all(transazioni_da_salvare)
        db.commit()
        print(f"\n✅ IMPORTO COMPLETATO! Ricostruite storicamente {len(transazioni_da_salvare)} transazioni reali dal tuo account.")
    else:
        print("\n⚠️ Nessuna transazione trovata nei limiti previsti.")

except Exception as e:
    print(f"Errore Globale Importazione: {e}")
finally:
    db.close()
