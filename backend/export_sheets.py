import gspread
from google.oauth2.service_account import Credentials
from datetime import datetime
import sys

# FIX terminale windows
sys.stdout.reconfigure(encoding='utf-8')

SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
]
SERVICE_ACCOUNT_FILE = r'C:\Users\Lorenzo\.gemini\antigravity\scratch\ESPERIMENTO\credentials.json'
SHEET_NAME = "PORTAFOGLIO_AGGIORNATO"
EXPORT_WORKSHEET = "Backup App"


def export_portfolio(portfolio_data: list, liquidity_data: dict):
    """
    Esporta il portafoglio corrente su Google Sheets.
    Crea (o sovrascrive) un foglio chiamato 'Backup App'.
    """
    credentials = Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    gc = gspread.authorize(credentials)

    sh = gc.open(SHEET_NAME)

    # Cerca il foglio "Backup App", se non esiste lo crea
    try:
        worksheet = sh.worksheet(EXPORT_WORKSHEET)
        worksheet.clear()  # Pulisce i dati vecchi
    except gspread.WorksheetNotFound:
        worksheet = sh.add_worksheet(title=EXPORT_WORKSHEET, rows=100, cols=15)

    # --- SEZIONE 1: INTESTAZIONE ---
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    worksheet.update('A1', [[f"📊 BACKUP PORTAFOGLIO - Generato il {now}"]])
    worksheet.format('A1', {
        'textFormat': {'bold': True, 'fontSize': 14},
    })

    # --- SEZIONE 2: PORTAFOGLIO ASSET ---
    header_row = 3
    worksheet.update(f'A{header_row}', [["PORTAFOGLIO ASSET CORRENTE"]])
    worksheet.format(f'A{header_row}', {
        'textFormat': {'bold': True, 'fontSize': 12},
    })

    asset_header = ["Simbolo", "Nome", "Categoria", "Quantità", "PMC (€)", 
                     "Prezzo Live (€)", "Valore Attuale (€)", "Investito (€)",
                     "Profitto/Perdita (€)", "P/L (%)"]
    
    worksheet.update(f'A{header_row + 1}', [asset_header])
    worksheet.format(f'A{header_row + 1}:J{header_row + 1}', {
        'textFormat': {'bold': True},
        'backgroundColor': {'red': 0.2, 'green': 0.2, 'blue': 0.3},
        'textFormat': {'bold': True, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}},
    })

    asset_rows = []
    total_value = 0
    total_invested = 0

    for item in portfolio_data:
        if item.get('quantity', 0) < 0.000001:
            continue
        
        current_value = item.get('current_value', 0)
        invested = item.get('total_invested', 0)
        gain = current_value - invested
        gain_pct = (gain / invested * 100) if invested > 0 else 0

        total_value += current_value
        total_invested += invested

        asset_rows.append([
            item.get('symbol', ''),
            item.get('name', ''),
            item.get('category', ''),
            round(item.get('quantity', 0), 6),
            round(item.get('pmc', 0), 4),
            round(item.get('live_price', 0), 4),
            round(current_value, 2),
            round(invested, 2),
            round(gain, 2),
            round(gain_pct, 2)
        ])

    if asset_rows:
        worksheet.update(f'A{header_row + 2}', asset_rows)

    # --- SEZIONE 3: LIQUIDITÀ ---
    liq_start = header_row + 2 + len(asset_rows) + 2
    worksheet.update(f'A{liq_start}', [["LIQUIDITÀ PER CONTO"]])
    worksheet.format(f'A{liq_start}', {
        'textFormat': {'bold': True, 'fontSize': 12},
    })

    liq_header = ["Conto - Valuta", "Importo (€)"]
    worksheet.update(f'A{liq_start + 1}', [liq_header])
    worksheet.format(f'A{liq_start + 1}:B{liq_start + 1}', {
        'textFormat': {'bold': True},
        'backgroundColor': {'red': 0.2, 'green': 0.2, 'blue': 0.3},
        'textFormat': {'bold': True, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}},
    })

    liq_rows = []
    total_liquidity = 0
    for key, amount in liquidity_data.items():
        liq_rows.append([key, round(amount, 2)])
        if amount > 0:
            total_liquidity += amount

    if liq_rows:
        worksheet.update(f'A{liq_start + 2}', liq_rows)

    # --- SEZIONE 4: TOTALI ---
    totals_start = liq_start + 2 + len(liq_rows) + 2
    worksheet.update(f'A{totals_start}', [["RIEPILOGO GLOBALE"]])
    worksheet.format(f'A{totals_start}', {
        'textFormat': {'bold': True, 'fontSize': 12},
    })

    total_net_worth = total_value + total_liquidity
    total_gain = total_net_worth - (total_invested + total_liquidity)

    summary_data = [
        ["Valore Totale MTM (€)", round(total_net_worth, 2)],
        ["Totale Investito (€)", round(total_invested + total_liquidity, 2)],
        ["Guadagno Netto (€)", round(total_gain, 2)],
        ["Liquidità Libera (€)", round(total_liquidity, 2)],
    ]
    worksheet.update(f'A{totals_start + 1}', summary_data)
    worksheet.format(f'A{totals_start + 1}:A{totals_start + 4}', {
        'textFormat': {'bold': True},
    })

    return {
        "status": "success",
        "message": f"Portafoglio esportato con successo su '{SHEET_NAME}' > '{EXPORT_WORKSHEET}'",
        "timestamp": now,
        "assets_exported": len(asset_rows),
        "liquidity_entries": len(liq_rows)
    }
