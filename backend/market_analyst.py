import yfinance as yf
import pandas as pd
import numpy as np

# ==============================================================================
# market_analyst.py
# 
# CIAO! Questo file è il "Cervello Analitico" della nuova sezione.
# Il suo compito è andare su internet (usando Yahoo Finance), prendere
# tutti i numeri noiosi e complicati di un'azienda (come Apple, Tesla, ecc.)
# e tradurli in parole semplici e comprensibili.
#
# Pensa a questo file come a un tuo amico commercialista che ti spiega 
# le cose davanti a un caffè, senza usare paroloni.
# ==============================================================================

def safe_get(info_dict, key, default=None):
    """
    Una piccola funzione di servizio. Serve a evitare errori se per caso
    un'azienda non ha un dato disponibile. Se non c'è, restituiamo un valore
    vuoto o zero, invece di far bloccare il programma.
    """
    val = info_dict.get(key, default)
    if val is None or (isinstance(val, float) and np.isnan(val)):
        return default
    return val

def format_large_number(numero):
    """
    Trasforma numeri enormi e illeggibili (es. 1000000000)
    in qualcosa di facile (es. 1 Miliardo).
    """
    if numero is None:
        return "Non disponibile"
    try:
        n = float(numero)
    except:
        return "Non disponibile"

    if np.isnan(n):
        return "Non disponibile"

    if abs(n) >= 1_000_000_000_000:
        return f"{n / 1_000_000_000_000:.2f} Trilioni"
    elif abs(n) >= 1_000_000_000:
        return f"{n / 1_000_000_000:.2f} Miliardi"
    elif abs(n) >= 1_000_000:
        return f"{n / 1_000_000:.2f} Milioni"
    else:
        return f"{n:.2f}"

# ------------------------------------------------------------------------------
# 1. FUNZIONE PRINCIPALE: L'ANALISI
# ------------------------------------------------------------------------------
def analizza_azienda(ticker_symbol: str) -> dict:
    """
    Questa è la funzione principale che viene chiamata quando cerchi un ticker.
    Scarica i dati e crea una "pagella" facile da leggere.
    """
    # 1. Scarichiamo i dati dall'azienda
    ticker = yf.Ticker(ticker_symbol.upper())
    info = ticker.info

    # Se l'azienda non esiste o non troviamo il nome, fermiamo tutto.
    if not info or safe_get(info, "shortName") is None:
        return {"errore": f"Non sono riuscito a trovare i dati per {ticker_symbol}. Controlla di aver scritto bene il codice."}

    # Estraiamo i dati di base
    nome = safe_get(info, "shortName", ticker_symbol)
    prezzo = safe_get(info, "currentPrice", 0)
    valuta = safe_get(info, "currency", "USD")
    descrizione = safe_get(info, "longBusinessSummary", "Descrizione non disponibile.")

    # Prepariamo la "Pagella" finale che manderemo al computer dell'utente (frontend)
    risultato = {
        "successo": True,
        "ticker": ticker_symbol.upper(),
        "nome": nome,
        "prezzo": prezzo,
        "valuta": valuta,
        "descrizione": descrizione,
        "settore": safe_get(info, "sector", "Sconosciuto"),
        
        # Le sezioni con le spiegazioni semplici
        "valutazione": valuta_prezzo(info),
        "salute": valuta_salute_finanziaria(info),
        "redditivita": valuta_guadagni(info),
        "dividendi": valuta_dividendi(info)
    }

    # Creiamo un riassunto finale (Il Voto Globale)
    risultato["sommario"] = genera_giudizio_globale(risultato)

    return risultato


# ------------------------------------------------------------------------------
# 2. SEZIONE VALUTAZIONE (È un buon momento per comprare?)
# ------------------------------------------------------------------------------
def valuta_prezzo(info: dict) -> dict:
    """
    Questa funzione guarda quanto costa l'azione rispetto a quanto l'azienda
    guadagna realmente (il famoso rapporto P/E, che noi chiameremo "Costo vs Utili").
    """
    pe = safe_get(info, "trailingPE")
    
    giudizio = "Non disponibile"
    spiegazione = "Non abbiamo abbastanza dati per capire se il prezzo è alto o basso."
    colore = "grigio"

    if pe is not None:
        if pe < 0:
            giudizio = "L'azienda è in perdita"
            spiegazione = "Attualmente l'azienda sta perdendo soldi invece di guadagnarli. Molto rischioso per un neofita."
            colore = "rosso"
        elif pe < 15:
            giudizio = "Sembra Economica"
            spiegazione = "Il prezzo dell'azione è basso rispetto a quanto l'azienda guadagna. Potrebbe essere un buon affare."
            colore = "verde"
        elif pe < 25:
            giudizio = "Prezzo Giusto"
            spiegazione = "Il prezzo è normale e in linea con il mercato. Paghi il giusto."
            colore = "giallo"
        else:
            giudizio = "Molto Costosa"
            spiegazione = "Il prezzo è molto alto rispetto a quello che guadagna oggi. Si compra sperando che cresca tantissimo in futuro."
            colore = "rosso"

    return {
        "titolo_sezione": "Il Prezzo è Giusto?",
        "metrica_principale": f"Costo vs Utili (P/E): {round(pe, 1) if pe else 'N/D'}",
        "giudizio": giudizio,
        "spiegazione": spiegazione,
        "colore": colore
    }


# ------------------------------------------------------------------------------
# 3. SEZIONE SALUTE FINANZIARIA (L'azienda rischia di fallire?)
# ------------------------------------------------------------------------------
def valuta_salute_finanziaria(info: dict) -> dict:
    """
    Guarda quanti debiti ha l'azienda. Avere troppi debiti è pericoloso!
    """
    debiti_su_patrimonio = safe_get(info, "debtToEquity")
    cassa = safe_get(info, "totalCash")
    
    giudizio = "Non disponibile"
    spiegazione = ""
    colore = "grigio"

    if debiti_su_patrimonio is not None:
        if debiti_su_patrimonio < 1.0:
            giudizio = "Ottima e Sicura"
            spiegazione = "L'azienda ha pochi debiti ed è molto solida. Dormi sonni tranquilli: se ci fosse una crisi, sopravviverebbe bene."
            colore = "verde"
        elif debiti_su_patrimonio < 2.5:
            giudizio = "Normale"
            spiegazione = "Ha un livello di debiti normale e gestibile. Niente di preoccupante."
            colore = "giallo"
        else:
            giudizio = "Troppi Debiti"
            spiegazione = "L'azienda è pesantemente indebitata. Se le cose dovessero andar male (es. meno vendite), potrebbe andare in crisi."
            colore = "rosso"

    return {
        "titolo_sezione": "L'Azienda è Solida?",
        "metrica_principale": f"Cassa disponibile: {format_large_number(cassa)}",
        "giudizio": giudizio,
        "spiegazione": spiegazione,
        "colore": colore
    }


# ------------------------------------------------------------------------------
# 4. SEZIONE REDDITIVITÀ (L'azienda fa affari d'oro o no?)
# ------------------------------------------------------------------------------
def valuta_guadagni(info: dict) -> dict:
    """
    Verifica se l'azienda guadagna bene da ciò che vende (i margini di profitto).
    """
    margine_netto = safe_get(info, "profitMargins")
    
    giudizio = "Non disponibile"
    spiegazione = ""
    colore = "grigio"

    if margine_netto is not None:
        percentuale = margine_netto * 100
        if percentuale > 15:
            giudizio = "Eccellente"
            spiegazione = f"Questa azienda è una macchina da soldi. Per ogni 100€ che incassa, se ne tiene in tasca ben {round(percentuale)}€ puliti."
            colore = "verde"
        elif percentuale > 5:
            giudizio = "Buona"
            spiegazione = f"I guadagni sono buoni e nella media ({round(percentuale)}€ puliti su 100€ incassati)."
            colore = "giallo"
        elif percentuale > 0:
            giudizio = "Debole"
            spiegazione = "L'azienda fatica a fare veri profitti. I costi sono alti rispetto a quello che incassa."
            colore = "rosso"
        else:
            giudizio = "In Perdita"
            spiegazione = "L'azienda sta perdendo soldi. Spende più di quanto guadagna."
            colore = "rosso"

    return {
        "titolo_sezione": "Capacità di Guadagno",
        "metrica_principale": f"Margine di Guadagno: {round(margine_netto * 100, 1)}%" if margine_netto else "N/D",
        "giudizio": giudizio,
        "spiegazione": spiegazione,
        "colore": colore
    }


# ------------------------------------------------------------------------------
# 5. SEZIONE DIVIDENDI (Ti pagano per possedere l'azione?)
# ------------------------------------------------------------------------------
def valuta_dividendi(info: dict) -> dict:
    """
    I dividendi sono i "premi" (una parte degli utili) che l'azienda regala 
    ai suoi azionisti ogni anno, solo per il fatto di possedere l'azione.
    """
    dividendo = safe_get(info, "dividendYield")
    
    giudizio = "Nessun Premio"
    spiegazione = "Questa azienda non regala soldi extra ai suoi azionisti. Preferisce usare i soldi guadagnati per ingrandire l'azienda stessa."
    colore = "grigio"

    if dividendo is not None and dividendo > 0:
        percentuale = dividendo * 100
        if percentuale < 1.5:
            giudizio = "Piccolo Premio"
            spiegazione = f"Ti pagano circa il {round(percentuale, 1)}% annuo extra sul valore delle tue azioni."
            colore = "giallo"
        elif percentuale < 5.0:
            giudizio = "Ottimo Premio"
            spiegazione = f"Regalano ai soci un succoso {round(percentuale, 1)}% all'anno! Ideale se cerchi una rendita fissa."
            colore = "verde"
        else:
            giudizio = "Premio Sospetto"
            spiegazione = f"Ti promettono ben il {round(percentuale, 1)}% all'anno. Sembra troppo bello per essere vero: forse l'azienda è in difficoltà."
            colore = "rosso"

    return {
        "titolo_sezione": "Dividendi (Rendita Fissa)",
        "metrica_principale": f"Premio Annuo (Yield): {round(dividendo * 100, 2)}%" if dividendo else "0%",
        "giudizio": giudizio,
        "spiegazione": spiegazione,
        "colore": colore
    }


# ------------------------------------------------------------------------------
# 6. IL GIUDIZIO FINALE DELL'AGENTE
# ------------------------------------------------------------------------------
def genera_giudizio_globale(risultato: dict) -> dict:
    """
    Questa funzione conta quanti semafori verdi e quanti rossi ci sono
    nelle valutazioni precedenti, e dà un verdetto finale semplicissimo.
    """
    punteggio = 0
    
    sezioni = [risultato["valutazione"], risultato["salute"], risultato["redditivita"]]
    
    for sez in sezioni:
        if sez["colore"] == "verde": punteggio += 1
        elif sez["colore"] == "rosso": punteggio -= 1
        
    if punteggio > 0:
        verdetto = "Azienda Solida 🚀"
        testo = "Questa sembra una scelta fantastica e poco rischiosa per iniziare!"
    elif punteggio < 0:
        verdetto = "Fai Attenzione ⚠️"
        testo = "C'è qualcosa che scricchiola. Essendo tu alle prime armi, forse è meglio cercare aziende più sicure."
    else:
        verdetto = "Nella Media ⚖️"
        testo = "Un'azienda senza lodi né infamie. Non è male, ma neanche straordinaria."
        
    return {
        "verdetto": verdetto,
        "testo": testo
    }
