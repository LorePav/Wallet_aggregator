# ============================================================
# ANALYZER.PY
# Questo modulo è il "cervello" dell'agente.
# Prende i dati grezzi scaricati da data_fetcher.py,
# calcola i ratios fondamentali e genera commenti automatici
# di valutazione per ogni sezione.
#
# Pensalo come un analista finanziario virtuale che legge
# i numeri e dà un giudizio: "buono", "nella media", "attenzione".
# ============================================================

import numpy as np
from data_fetcher import safe_get, format_large_number


# ============================================================
# SEZIONE 1: CALCOLO DEI RATIOS FONDAMENTALI
# ============================================================

def get_valuation_metrics(info: dict) -> dict:
    """
    Restituisce le metriche di VALUTAZIONE dell'azienda.
    Queste ci dicono se il titolo è caro o economico rispetto ai suoi utili.

    Metriche:
    - P/E (Price/Earnings): quanto si paga per ogni € di utile
    - P/B (Price/Book): quanto si paga rispetto al patrimonio netto
    - P/S (Price/Sales): quanto si paga rispetto ai ricavi
    - EV/EBITDA: valore d'impresa diviso per l'EBITDA
    - PEG Ratio: P/E corretto per la crescita attesa
    """
    return {
        "P/E Ratio (TTM)":      safe_get(info, "trailingPE"),
        "P/E Ratio (Forward)":  safe_get(info, "forwardPE"),
        "P/B Ratio":            safe_get(info, "priceToBook"),
        "P/S Ratio":            safe_get(info, "priceToSalesTrailing12Months"),
        "EV/EBITDA":            safe_get(info, "enterpriseToEbitda"),
        "EV/Revenue":           safe_get(info, "enterpriseToRevenue"),
        "PEG Ratio":            safe_get(info, "pegRatio"),
    }


def get_profitability_metrics(info: dict) -> dict:
    """
    Restituisce le metriche di REDDITIVITÀ.
    Ci dicono quanto è efficiente l'azienda nel generare profitti.

    Metriche:
    - ROE (Return on Equity): rendimento sul patrimonio netto
    - ROA (Return on Assets): rendimento sugli asset totali
    - Margine operativo: % di utile operativo sui ricavi
    - Margine netto: % di utile netto sui ricavi
    - EBITDA Margin: % di EBITDA sui ricavi
    """
    return {
        "ROE (Return on Equity)":       safe_get(info, "returnOnEquity"),
        "ROA (Return on Assets)":       safe_get(info, "returnOnAssets"),
        "Margine Lordo (Gross Margin)": safe_get(info, "grossMargins"),
        "Margine Operativo (Op. Margin)": safe_get(info, "operatingMargins"),
        "Margine Netto (Profit Margin)": safe_get(info, "profitMargins"),
        "EBITDA":                        safe_get(info, "ebitda"),
    }


def get_growth_metrics(info: dict) -> dict:
    """
    Restituisce le metriche di CRESCITA.
    Ci mostrano quanto sta crescendo l'azienda.

    Metriche:
    - Crescita ricavi (YoY): variazione percentuale ricavi anno su anno
    - Crescita utile per azione (EPS): variazione dell'EPS
    - Crescita ricavi futura stimata
    """
    return {
        "Crescita Ricavi (YoY)":         safe_get(info, "revenueGrowth"),
        "Crescita Utile Netto (YoY)":    safe_get(info, "earningsGrowth"),
        "Crescita EPS (5Y)":             safe_get(info, "earningsQuarterlyGrowth"),
        "Ricavi Totali (TTM)":           safe_get(info, "totalRevenue"),
        "Utile Netto (TTM)":             safe_get(info, "netIncomeToCommon"),
        "EPS (TTM)":                     safe_get(info, "trailingEps"),
        "EPS (Forward)":                 safe_get(info, "forwardEps"),
    }


def get_financial_health_metrics(info: dict) -> dict:
    """
    Restituisce le metriche di SALUTE FINANZIARIA.
    Ci dicono se l'azienda è solida o rischia problemi di liquidità.

    Metriche:
    - Debt/Equity: rapporto debito/patrimonio (più basso = meglio)
    - Current Ratio: attivo corrente / passivo corrente (> 1 è buono)
    - Quick Ratio: liquidità immediata
    - Free Cash Flow: cassa disponibile dopo le spese operative
    """
    return {
        "Debito Totale":                 safe_get(info, "totalDebt"),
        "Cassa Totale":                  safe_get(info, "totalCash"),
        "Debt/Equity Ratio":             safe_get(info, "debtToEquity"),
        "Current Ratio":                 safe_get(info, "currentRatio"),
        "Quick Ratio":                   safe_get(info, "quickRatio"),
        "Free Cash Flow":                safe_get(info, "freeCashflow"),
        "Operating Cash Flow":           safe_get(info, "operatingCashflow"),
    }


def get_dividend_metrics(info: dict) -> dict:
    """
    Restituisce le metriche sui DIVIDENDI.
    Per gli investitori che cercano reddito passivo.

    Metriche:
    - Dividend Yield: dividendo annuo / prezzo azione (%)
    - Dividend Rate: valore assoluto del dividendo annuo
    - Payout Ratio: % degli utili distribuita come dividendo
    - Ex-Dividend Date: data di stacco cedola
    """
    return {
        "Dividend Yield (%)":    safe_get(info, "dividendYield"),
        "Dividend Rate (annuo)": safe_get(info, "dividendRate"),
        "Payout Ratio":          safe_get(info, "payoutRatio"),
        "Ex-Dividend Date":      safe_get(info, "exDividendDate"),
        "5Y Avg Dividend Yield": safe_get(info, "fiveYearAvgDividendYield"),
    }


def get_market_metrics(info: dict) -> dict:
    """
    Restituisce i dati di MERCATO generali.
    Informazioni sul prezzo corrente e la capitalizzazione.
    """
    return {
        "Prezzo Corrente":          safe_get(info, "currentPrice"),
        "Prezzo Precedente (52W Max)": safe_get(info, "fiftyTwoWeekHigh"),
        "Prezzo Precedente (52W Min)": safe_get(info, "fiftyTwoWeekLow"),
        "Media Mobile 50 giorni":   safe_get(info, "fiftyDayAverage"),
        "Media Mobile 200 giorni":  safe_get(info, "twoHundredDayAverage"),
        "Market Cap":               safe_get(info, "marketCap"),
        "Enterprise Value":         safe_get(info, "enterpriseValue"),
        "Volume (media 10gg)":      safe_get(info, "averageVolume10days"),
        "Beta (volatilità vs mercato)": safe_get(info, "beta"),
        "Numero Azioni in Circolazione": safe_get(info, "sharesOutstanding"),
        "Float (azioni liberamente scambiabili)": safe_get(info, "floatShares"),
        "Short Ratio (% azioni vendute allo scoperto)": safe_get(info, "shortRatio"),
    }


# ============================================================
# SEZIONE 2: GENERAZIONE COMMENTI AUTOMATICI
# I commenti usano soglie standard dell'analisi fondamentale.
# ============================================================

def _rating(value, good_threshold, bad_threshold, higher_is_better=True) -> str:
    """
    Funzione interna: assegna un rating (🟢 Buono / 🟡 Nella media / 🔴 Attenzione)
    confrontando un valore con due soglie.

    Parametri:
        value:              il valore da valutare
        good_threshold:     soglia "buona"
        bad_threshold:      soglia "negativa"
        higher_is_better:   True se valori alti sono positivi (es. ROE),
                            False se valori bassi sono positivi (es. Debt/Equity)
    """
    if value is None:
        return "⚪ N/D"

    if higher_is_better:
        if value >= good_threshold:
            return "🟢 Buono"
        elif value >= bad_threshold:
            return "🟡 Nella media"
        else:
            return "🔴 Attenzione"
    else:
        if value <= good_threshold:
            return "🟢 Buono"
        elif value <= bad_threshold:
            return "🟡 Nella media"
        else:
            return "🔴 Attenzione"


def generate_valuation_comment(info: dict) -> str:
    """
    Genera un commento testuale sulla valutazione del titolo,
    basandosi sul P/E, P/B e altri multipli.
    """
    pe = safe_get(info, "trailingPE")
    pb = safe_get(info, "priceToBook")
    peg = safe_get(info, "pegRatio")
    sector = safe_get(info, "sector", "N/D")

    lines = []
    lines.append(f"📊 **Analisi Valutazione** — Settore: {sector}")
    lines.append("")

    # Commento P/E
    if pe is not None:
        if pe < 0:
            lines.append(f"• **P/E ({pe:.1f})**: negativo → l'azienda è attualmente in perdita.")
        elif pe < 15:
            lines.append(f"• **P/E ({pe:.1f})**: basso → il titolo sembra sottovalutato rispetto agli utili. "
                         f"Potrebbe essere un'opportunità o segnalare problemi strutturali.")
        elif pe < 25:
            lines.append(f"• **P/E ({pe:.1f})**: nella norma → valutazione in linea con la media storica dei mercati.")
        elif pe < 40:
            lines.append(f"• **P/E ({pe:.1f})**: elevato → il mercato sconta una forte crescita futura. "
                         f"Verificare se le aspettative sono realistiche.")
        else:
            lines.append(f"• **P/E ({pe:.1f})**: molto elevato → il titolo tratta a multipli da crescita aggressiva. "
                         f"Alto rischio in caso di delusione sugli utili.")
    else:
        lines.append("• **P/E**: dato non disponibile.")

    # Commento P/B
    if pb is not None:
        if pb < 1:
            lines.append(f"• **P/B ({pb:.2f})**: sotto 1 → il titolo quota sotto il valore contabile. "
                         f"Possibile occasione, ma verificare la qualità degli asset.")
        elif pb < 3:
            lines.append(f"• **P/B ({pb:.2f})**: ragionevole → il mercato paga un premio moderato sul patrimonio netto.")
        else:
            lines.append(f"• **P/B ({pb:.2f})**: elevato → alto premio sul patrimonio. "
                         f"Giustificato solo da ROE molto alto o brand forte.")

    # Commento PEG
    if peg is not None and peg > 0:
        if peg < 1:
            lines.append(f"• **PEG ({peg:.2f})**: sotto 1 → il titolo potrebbe essere sottovalutato "
                         f"rispetto alla sua crescita attesa. Segnale positivo.")
        elif peg < 2:
            lines.append(f"• **PEG ({peg:.2f})**: accettabile → valutazione corretta rispetto alla crescita.")
        else:
            lines.append(f"• **PEG ({peg:.2f})**: alto → il titolo potrebbe essere caro rispetto alla crescita attesa.")

    return "\n".join(lines)


def generate_profitability_comment(info: dict) -> str:
    """
    Genera un commento testuale sulla redditività dell'azienda.
    """
    roe = safe_get(info, "returnOnEquity")
    roa = safe_get(info, "returnOnAssets")
    net_margin = safe_get(info, "profitMargins")
    op_margin = safe_get(info, "operatingMargins")

    lines = []
    lines.append("💰 **Analisi Redditività**")
    lines.append("")

    if roe is not None:
        roe_pct = roe * 100
        if roe_pct > 20:
            lines.append(f"• **ROE ({roe_pct:.1f}%)**: eccellente → l'azienda genera rendimenti molto elevati "
                         f"sul patrimonio degli azionisti. Segno di forte vantaggio competitivo.")
        elif roe_pct > 10:
            lines.append(f"• **ROE ({roe_pct:.1f}%)**: buono → rendimento sano e superiore alla media.")
        elif roe_pct > 0:
            lines.append(f"• **ROE ({roe_pct:.1f}%)**: basso → l'azienda è profittevole ma con efficienza ridotta.")
        else:
            lines.append(f"• **ROE ({roe_pct:.1f}%)**: negativo → l'azienda ha perso valore per gli azionisti.")

    if roa is not None:
        roa_pct = roa * 100
        if roa_pct > 10:
            lines.append(f"• **ROA ({roa_pct:.1f}%)**: ottimo → uso molto efficiente degli asset.")
        elif roa_pct > 5:
            lines.append(f"• **ROA ({roa_pct:.1f}%)**: buono → gli asset generano un buon rendimento.")
        else:
            lines.append(f"• **ROA ({roa_pct:.1f}%)**: basso → gli asset vengono sfruttati poco.")

    if net_margin is not None:
        nm_pct = net_margin * 100
        lines.append(f"• **Margine Netto ({nm_pct:.1f}%)**: "
                     + ("eccellente." if nm_pct > 20 else
                        "buono." if nm_pct > 10 else
                        "nella media." if nm_pct > 5 else
                        "basso — l'azienda trattiene pochi centesimi per ogni euro di fatturato."))

    if op_margin is not None:
        om_pct = op_margin * 100
        lines.append(f"• **Margine Operativo ({om_pct:.1f}%)**: "
                     + ("ottimo." if om_pct > 25 else
                        "buono." if om_pct > 15 else
                        "nella media." if om_pct > 5 else
                        "sotto pressione."))

    return "\n".join(lines)


def generate_health_comment(info: dict) -> str:
    """
    Genera un commento sulla solidità finanziaria (debiti, liquidità).
    """
    de = safe_get(info, "debtToEquity")
    cr = safe_get(info, "currentRatio")
    qr = safe_get(info, "quickRatio")
    fcf = safe_get(info, "freeCashflow")

    lines = []
    lines.append("🏦 **Analisi Salute Finanziaria**")
    lines.append("")

    if de is not None:
        if de < 0.5:
            lines.append(f"• **Debt/Equity ({de:.2f})**: molto basso → azienda scarsamente indebitata. "
                         f"Bilancio molto solido.")
        elif de < 1.5:
            lines.append(f"• **Debt/Equity ({de:.2f})**: moderato → debito gestibile. "
                         f"Livello comune in molti settori.")
        elif de < 3:
            lines.append(f"• **Debt/Equity ({de:.2f})**: elevato → attenzione al livello di debito, "
                         f"specialmente in caso di aumento dei tassi di interesse.")
        else:
            lines.append(f"• **Debt/Equity ({de:.2f})**: molto alto → rischio finanziario significativo. "
                         f"Monitorare attentamente la capacità di rimborso.")

    if cr is not None:
        if cr > 2:
            lines.append(f"• **Current Ratio ({cr:.2f})**: ottima liquidità a breve termine.")
        elif cr > 1:
            lines.append(f"• **Current Ratio ({cr:.2f})**: buono → l'azienda può coprire i debiti a breve.")
        else:
            lines.append(f"• **Current Ratio ({cr:.2f})**: sotto 1 → potenziale difficoltà nel coprire "
                         f"i debiti a breve termine.")

    if fcf is not None:
        fcf_str = format_large_number(fcf)
        if fcf > 0:
            lines.append(f"• **Free Cash Flow ({fcf_str})**: positivo → l'azienda genera cassa reale "
                         f"che può usare per dividendi, buyback o investimenti.")
        else:
            lines.append(f"• **Free Cash Flow ({fcf_str})**: negativo → l'azienda consuma più cassa "
                         f"di quanta ne generi. Da monitorare.")

    return "\n".join(lines)


def generate_dividend_comment(info: dict) -> str:
    """
    Genera un commento sulla politica dei dividendi.
    """
    yield_ = safe_get(info, "dividendYield")
    payout = safe_get(info, "payoutRatio")
    rate = safe_get(info, "dividendRate")

    lines = []
    lines.append("💵 **Analisi Dividendi**")
    lines.append("")

    if yield_ is None or yield_ == 0:
        lines.append("• Questo titolo **non paga dividendi**. "
                     "L'azienda preferisce reinvestire gli utili nella crescita.")
        return "\n".join(lines)

    yield_pct = yield_ * 100
    if yield_pct < 1:
        lines.append(f"• **Dividend Yield ({yield_pct:.2f}%)**: molto basso. "
                     f"Il dividendo è simbolico rispetto al prezzo del titolo.")
    elif yield_pct < 3:
        lines.append(f"• **Dividend Yield ({yield_pct:.2f}%)**: moderato. "
                     f"Buon bilanciamento tra crescita e reddito.")
    elif yield_pct < 6:
        lines.append(f"• **Dividend Yield ({yield_pct:.2f}%)**: generoso. "
                     f"Interessante per investitori orientati al reddito.")
    else:
        lines.append(f"• **Dividend Yield ({yield_pct:.2f}%)**: molto alto → verificare la sostenibilità. "
                     f"Yield elevati possono nascondere problemi se il prezzo è crollato.")

    if payout is not None:
        payout_pct = payout * 100
        if payout_pct < 50:
            lines.append(f"• **Payout Ratio ({payout_pct:.1f}%)**: sostenibile → l'azienda distribuisce "
                         f"meno della metà degli utili. Il dividendo è sicuro.")
        elif payout_pct < 80:
            lines.append(f"• **Payout Ratio ({payout_pct:.1f}%)**: moderato → controllare che gli utili "
                         f"restino stabili nel tempo.")
        else:
            lines.append(f"• **Payout Ratio ({payout_pct:.1f}%)**: elevato → rischio taglio dividendo "
                         f"in caso di calo degli utili.")

    if rate is not None:
        lines.append(f"• Il dividendo annuo corrente è di **${rate:.2f} per azione**.")

    return "\n".join(lines)


def generate_overall_summary(info: dict) -> str:
    """
    Genera un riassunto complessivo dell'azienda combinando tutti i fattori.
    Questo è il "giudizio finale" dell'agente.
    """
    name = safe_get(info, "shortName", "N/D")
    sector = safe_get(info, "sector", "N/D")
    industry = safe_get(info, "industry", "N/D")
    market_cap = safe_get(info, "marketCap")
    pe = safe_get(info, "trailingPE")
    roe = safe_get(info, "returnOnEquity")
    de = safe_get(info, "debtToEquity")
    yield_ = safe_get(info, "dividendYield")
    fcf = safe_get(info, "freeCashflow")
    net_margin = safe_get(info, "profitMargins")

    # Contiamo i punti "positivi" e "negativi"
    positive = 0
    negative = 0
    neutral = 0

    # Valutiamo il P/E
    if pe is not None:
        if 0 < pe < 25:   positive += 1
        elif pe > 40:     negative += 1
        else:             neutral += 1

    # Valutiamo il ROE
    if roe is not None:
        roe_pct = roe * 100
        if roe_pct > 15:  positive += 1
        elif roe_pct < 5: negative += 1
        else:             neutral += 1

    # Valutiamo il Debt/Equity
    if de is not None:
        if de < 1:        positive += 1
        elif de > 3:      negative += 1
        else:             neutral += 1

    # Valutiamo il Free Cash Flow
    if fcf is not None:
        if fcf > 0:       positive += 1
        else:             negative += 1

    # Valutiamo il margine netto
    if net_margin is not None:
        nm_pct = net_margin * 100
        if nm_pct > 10:   positive += 1
        elif nm_pct < 3:  negative += 1
        else:             neutral += 1

    # Decidiamo il giudizio finale
    total = positive + negative + neutral
    if total == 0:
        verdict = "⚪ Dati insufficienti per un giudizio."
    elif positive >= 3 and negative == 0:
        verdict = "🟢 **POSITIVO** — L'azienda mostra fondamentali solidi su più fronti."
    elif positive > negative:
        verdict = "🟡 **NELLA MEDIA** — Fondamentali discreti, con alcuni punti di forza e qualche area da monitorare."
    elif negative > positive:
        verdict = "🔴 **ATTENZIONE** — Diversi indicatori segnalano debolezze. Analisi approfondita raccomandata."
    else:
        verdict = "🟡 **MISTO** — Luci e ombre. Valutare caso per caso in base al contesto di settore."

    summary_lines = [
        f"## 📋 Sintesi Fondamentale: {name}",
        "",
        f"**Settore:** {sector} | **Industria:** {industry}",
        f"**Market Cap:** {format_large_number(market_cap)}",
        "",
        f"### Giudizio complessivo: {verdict}",
        "",
        f"✅ Punti di forza rilevati: **{positive}**",
        f"⚠️  Aree nella media: **{neutral}**",
        f"❌ Punti critici: **{negative}**",
        "",
        "---",
        "*⚠️ Nota: questa analisi è generata automaticamente a scopo informativo.*",
        "*Non costituisce consulenza finanziaria. Prima di investire consulta un professionista.*",
    ]

    return "\n".join(summary_lines)
