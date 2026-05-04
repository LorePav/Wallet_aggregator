# ============================================================
# CRYPTO_ANALYZER.PY
# "Cervello" dell'analisi tokenomics.
# Prende i dati grezzi di CoinGecko e:
#   1. Calcola le metriche per ogni sezione (valutazione,
#      tokenomics, developer activity, community)
#   2. Genera commenti automatici con giudizi testuali
#   3. Produce un sommario complessivo con verdict finale
#
# Struttura speculare a analyzer.py (analisi fondamentali),
# ma adattata al mondo crypto.
# ============================================================

from crypto_fetcher import safe_nested, format_large_number


# ============================================================
# SEZIONE 1: CALCOLO METRICHE PER CATEGORIA
# ============================================================

def get_valuation_metrics(data: dict) -> dict:
    """
    Metriche di VALUTAZIONE crypto.
    - Market Cap: dimensione totale del progetto
    - FDV: valore se tutta la supply fosse circolante
    - MC/FDV ratio: quanto della supply è già sul mercato
    - Distanza da ATH: quanto siamo lontani dal massimo storico
    """
    md = data.get("market_data", {})
    mc  = safe_nested(md, "market_cap", "usd")
    fdv = safe_nested(md, "fully_diluted_valuation", "usd")
    mc_fdv = (mc / fdv) if (mc and fdv and fdv > 0) else None

    ath       = safe_nested(md, "ath", "usd")
    ath_chg   = safe_nested(md, "ath_change_percentage", "usd")
    atl       = safe_nested(md, "atl", "usd")
    atl_chg   = safe_nested(md, "atl_change_percentage", "usd")
    price     = safe_nested(md, "current_price", "usd")

    return {
        "Prezzo Corrente (USD)":         price,
        "Market Cap (USD)":              mc,
        "Fully Diluted Valuation (USD)": fdv,
        "Rapporto MC / FDV":             mc_fdv,
        "Market Cap Rank":               data.get("market_cap_rank"),
        "ATH (USD)":                     ath,
        "Distanza da ATH (%)":           ath_chg,
        "ATL (USD)":                     atl,
        "Distanza da ATL (%)":           atl_chg,
        "Variazione 24h (%)":            safe_nested(md, "price_change_percentage_24h"),
        "Variazione 7gg (%)":            safe_nested(md, "price_change_percentage_7d"),
        "Variazione 30gg (%)":           safe_nested(md, "price_change_percentage_30d"),
        "Variazione 1 Anno (%)":         safe_nested(md, "price_change_percentage_1y"),
    }


def get_tokenomics_metrics(data: dict) -> dict:
    """
    Metriche di TOKENOMICS.
    - Supply: quanti token esistono e quanti circolano
    - Inflazione implicita: differenza tra supply totale e circolante
    - Volume / Market Cap: indicatore di liquidità
    """
    md = data.get("market_data", {})
    circ  = safe_nested(md, "circulating_supply")
    total = safe_nested(md, "total_supply")
    max_s = safe_nested(md, "max_supply")
    mc    = safe_nested(md, "market_cap", "usd")
    vol   = safe_nested(md, "total_volume", "usd")

    supply_pct     = (circ / total * 100)  if (circ and total and total > 0)  else None
    vol_mc_ratio   = (vol / mc)            if (vol and mc and mc > 0)         else None
    # Token non ancora circolanti (potenziale pressione venditrice futura)
    locked_pct     = (100 - supply_pct)    if supply_pct is not None          else None

    return {
        "Supply Circolante":              circ,
        "Supply Totale":                  total,
        "Supply Massima (Hard Cap)":      max_s,
        "% Supply Circolante / Totale":   supply_pct,
        "% Supply Bloccata / Futura":     locked_pct,
        "Volume 24h (USD)":               vol,
        "Rapporto Volume / Market Cap":   vol_mc_ratio,
        "High 24h (USD)":                 safe_nested(md, "high_24h", "usd"),
        "Low 24h (USD)":                  safe_nested(md, "low_24h", "usd"),
        "Data Genesi":                    data.get("genesis_date", "N/D"),
        "Categorie":                      ", ".join(data.get("categories", [])[:4]) or "N/D",
    }


def get_onchain_metrics(data: dict) -> dict:
    """
    Metriche ON-CHAIN e di mercato.
    - Numero di exchange che listano il token
    - Volume per exchange (liquidità distribuita)
    - Sentiment della community
    Note: whale concentration e holder count richiedono
    API blockchain-specifiche (es. Etherscan) non disponibili
    nel piano gratuito CoinGecko.
    """
    tickers = data.get("tickers", [])
    num_exchanges = len(set(t.get("market", {}).get("name") for t in tickers if t.get("market")))
    top_exchange  = tickers[0].get("market", {}).get("name") if tickers else None
    trust_scores  = [t.get("trust_score") for t in tickers[:10] if t.get("trust_score")]
    avg_trust     = (sum(1 for s in trust_scores if s == "green") / len(trust_scores) * 100) if trust_scores else None

    md = data.get("market_data", {})
    return {
        "Exchange che listano il token":  num_exchanges,
        "Exchange principale":            top_exchange,
        "% Exchange con Trust Score Verde": avg_trust,
        "Sentiment Positivo (%)":         data.get("sentiment_votes_up_percentage"),
        "Sentiment Negativo (%)":         data.get("sentiment_votes_down_percentage"),
        "Liquidity Score":                data.get("liquidity_score"),
        "Public Interest Score":          data.get("public_interest_score"),
        "Coingecko Score":                data.get("coingecko_score"),
        "Developer Score":                data.get("developer_score"),
        "Community Score":                data.get("community_score"),
    }


def get_developer_metrics(data: dict) -> dict:
    """
    Metriche di DEVELOPER ACTIVITY (da GitHub tramite CoinGecko).
    Un progetto con sviluppo attivo ha più probabilità di essere
    mantenuto e migliorato nel tempo.
    """
    dd = data.get("developer_data", {})
    return {
        "GitHub Stars":                   dd.get("stars"),
        "GitHub Forks":                   dd.get("forks"),
        "GitHub Subscribers (Watchers)":  dd.get("subscribers"),
        "Contributors al Pull Request":   dd.get("pull_request_contributors"),
        "Commit nelle ultime 4 settimane": dd.get("commit_count_4_weeks"),
        "Issues Totali":                  dd.get("total_issues"),
        "Issues Chiusi":                  dd.get("closed_issues"),
        "Pull Request Merged":            dd.get("pull_requests_merged"),
    }


def get_community_metrics(data: dict) -> dict:
    """
    Metriche di COMMUNITY e social presence.
    Una community forte supporta il valore del token nel tempo.
    """
    cd = data.get("community_data", {})
    return {
        "Twitter / X Followers":          cd.get("twitter_followers"),
        "Reddit Subscribers":             cd.get("reddit_subscribers"),
        "Reddit Post Attivi (48h)":       cd.get("reddit_average_posts_48h"),
        "Reddit Commenti Attivi (48h)":   cd.get("reddit_average_comments_48h"),
        "Account Reddit Attivi":          cd.get("reddit_active_accounts"),
        "Telegram Users":                 cd.get("telegram_channel_user_count"),
        "Facebook Likes":                 cd.get("facebook_likes"),
    }


# ============================================================
# SEZIONE 2: RATING HELPER
# ============================================================

def _rating(value, good_threshold, bad_threshold, higher_is_better=True) -> str:
    """Assegna 🟢 Buono / 🟡 Nella media / 🔴 Attenzione."""
    if value is None:
        return "⚪ N/D"
    if higher_is_better:
        if value >= good_threshold:   return "🟢 Buono"
        if value >= bad_threshold:    return "🟡 Nella media"
        return "🔴 Attenzione"
    else:
        if value <= good_threshold:   return "🟢 Buono"
        if value <= bad_threshold:    return "🟡 Nella media"
        return "🔴 Attenzione"


# ============================================================
# SEZIONE 3: COMMENTI AUTOMATICI PER SEZIONE
# ============================================================

def generate_valuation_comment(data: dict) -> str:
    md      = data.get("market_data", {})
    mc      = safe_nested(md, "market_cap", "usd")
    fdv     = safe_nested(md, "fully_diluted_valuation", "usd")
    rank    = data.get("market_cap_rank")
    ath_chg = safe_nested(md, "ath_change_percentage", "usd")
    chg_30d = safe_nested(md, "price_change_percentage_30d")

    lines = ["📊 **Analisi Valutazione**", ""]

    # Market Cap rank
    if rank:
        if rank <= 10:
            lines.append(f"• **Rank #{rank}**: tra le prime 10 crypto al mondo — progetto di grandissima rilevanza.")
        elif rank <= 50:
            lines.append(f"• **Rank #{rank}**: nella top 50 — progetto consolidato con forte liquidità.")
        elif rank <= 200:
            lines.append(f"• **Rank #{rank}**: nella top 200 — visibilità significativa ma rischio maggiore rispetto ai big.")
        else:
            lines.append(f"• **Rank #{rank}**: fuori dalla top 200 — progetto di nicchia, liquidità e visibilità ridotte.")

    # MC/FDV
    if mc and fdv and fdv > 0:
        ratio = mc / fdv
        if ratio >= 0.8:
            lines.append(f"• **MC/FDV ({ratio:.0%})**: la maggior parte della supply è già circolante. "
                         "Bassa pressione inflattiva futura — segnale positivo.")
        elif ratio >= 0.5:
            lines.append(f"• **MC/FDV ({ratio:.0%})**: circa metà della supply è ancora da distribuire. "
                         "Monitorare il vesting schedule per potenziale sell pressure.")
        else:
            lines.append(f"• **MC/FDV ({ratio:.0%})**: meno della metà della supply circola. "
                         "Alta diluizione futura possibile — rischio significativo per i possessori attuali.")

    # ATH
    if ath_chg is not None:
        if ath_chg > -20:
            lines.append(f"• **Distanza da ATH ({ath_chg:.1f}%)**: vicino ai massimi storici — forte momentum.")
        elif ath_chg > -60:
            lines.append(f"• **Distanza da ATH ({ath_chg:.1f}%)**: in fase di recupero dalla correzione.")
        else:
            lines.append(f"• **Distanza da ATH ({ath_chg:.1f}%)**: molto lontano dai massimi — o mercato bear o progetto in difficoltà.")

    # Trend 30gg
    if chg_30d is not None:
        trend = "in rialzo" if chg_30d > 0 else "in ribasso"
        lines.append(f"• **Trend 30gg ({chg_30d:+.1f}%)**: il token è {trend} nell'ultimo mese.")

    return "\n".join(lines)


def generate_tokenomics_comment(data: dict) -> str:
    md    = data.get("market_data", {})
    circ  = safe_nested(md, "circulating_supply")
    total = safe_nested(md, "total_supply")
    max_s = safe_nested(md, "max_supply")
    vol   = safe_nested(md, "total_volume", "usd")
    mc    = safe_nested(md, "market_cap", "usd")

    lines = ["🪙 **Analisi Tokenomics**", ""]

    # Supply
    if circ and total and total > 0:
        pct = circ / total * 100
        if pct >= 80:
            lines.append(f"• **Supply circolante ({pct:.0f}%)**: la quasi totalità dei token è già sul mercato. "
                         "Bassa pressione inflattiva — caratteristica dei token maturi.")
        elif pct >= 50:
            lines.append(f"• **Supply circolante ({pct:.0f}%)**: metà dei token sono già distribuiti. "
                         "Attenzione alle date di sblocco del vesting per i token restanti.")
        else:
            lines.append(f"• **Supply circolante ({pct:.0f}%)**: solo {pct:.0f}% dei token circola. "
                         "Alta potenziale diluizione futura — verificare il vesting schedule prima di investire.")

    # Hard cap
    if max_s:
        lines.append(f"• **Hard Cap**: la supply massima è fissata a {format_large_number(max_s)} token. "
                     "Token deflazionario/a supply fissa — caratteristica di Bitcoin e simili.")
    elif total is None and max_s is None:
        lines.append("• **Supply**: nessun hard cap definito — token potenzialmente inflazionario senza limite.")

    # Volume/MC
    if vol and mc and mc > 0:
        ratio = vol / mc
        if ratio >= 0.1:
            lines.append(f"• **Volume/MC ({ratio:.1%})**: liquidità molto alta — facile entrare e uscire dalla posizione.")
        elif ratio >= 0.05:
            lines.append(f"• **Volume/MC ({ratio:.1%})**: liquidità buona per la dimensione del token.")
        else:
            lines.append(f"• **Volume/MC ({ratio:.1%})**: liquidità bassa — vendite significative potrebbero muovere il prezzo.")

    return "\n".join(lines)


def generate_developer_comment(data: dict) -> str:
    dd      = data.get("developer_data", {})
    commits = dd.get("commit_count_4_weeks")
    stars   = dd.get("stars")
    forks   = dd.get("forks")
    issues_c = dd.get("closed_issues")
    issues_t = dd.get("total_issues")

    lines = ["👨‍💻 **Analisi Developer Activity**", ""]

    if commits is not None:
        if commits >= 100:
            lines.append(f"• **Commit (4 settimane): {commits}** — sviluppo molto attivo. Il team è chiaramente al lavoro.")
        elif commits >= 30:
            lines.append(f"• **Commit (4 settimane): {commits}** — attività di sviluppo regolare.")
        elif commits >= 5:
            lines.append(f"• **Commit (4 settimane): {commits}** — sviluppo lento. Monitorare se il progetto è ancora attivo.")
        else:
            lines.append(f"• **Commit (4 settimane): {commits}** — sviluppo quasi fermo. Rischio di progetto abbandonato.")
    else:
        lines.append("• Repository GitHub non pubblico o non disponibile tramite CoinGecko.")

    if stars is not None and forks is not None:
        lines.append(f"• **GitHub Stars: {stars:,} | Forks: {forks:,}** — "
                     + ("interesse ecosistema molto alto." if stars >= 5000 else
                        "interesse ecosistema buono." if stars >= 1000 else
                        "interesse ecosistema limitato."))

    if issues_c is not None and issues_t is not None and issues_t > 0:
        close_rate = issues_c / issues_t * 100
        lines.append(f"• **Issue risolti: {close_rate:.0f}%** — "
                     + ("team molto reattivo." if close_rate >= 70 else
                        "team abbastanza reattivo." if close_rate >= 40 else
                        "backlog di issue significativo."))

    return "\n".join(lines)


def generate_community_comment(data: dict) -> str:
    cd        = data.get("community_data", {})
    twitter   = cd.get("twitter_followers")
    reddit    = cd.get("reddit_subscribers")
    telegram  = cd.get("telegram_channel_user_count")
    sent_up   = data.get("sentiment_votes_up_percentage")

    lines = ["🌐 **Analisi Community**", ""]

    if twitter is not None:
        if twitter >= 1_000_000:
            lines.append(f"• **Twitter/X: {format_large_number(twitter)} follower** — community enorme, visibilità mainstream.")
        elif twitter >= 100_000:
            lines.append(f"• **Twitter/X: {format_large_number(twitter)} follower** — community solida e consolidata.")
        elif twitter >= 10_000:
            lines.append(f"• **Twitter/X: {format_large_number(twitter)} follower** — community in crescita.")
        else:
            lines.append(f"• **Twitter/X: {format_large_number(twitter)} follower** — community ancora piccola.")

    if reddit is not None:
        lines.append(f"• **Reddit: {format_large_number(reddit)} iscritti** — "
                     + ("community Reddit molto attiva." if reddit >= 500_000 else
                        "buona presenza su Reddit." if reddit >= 50_000 else
                        "presenza Reddit limitata."))

    if telegram is not None:
        lines.append(f"• **Telegram: {format_large_number(telegram)} utenti**.")

    if sent_up is not None:
        sent_down = 100 - sent_up
        lines.append(f"• **Sentiment: {sent_up:.0f}% positivo / {sent_down:.0f}% negativo** — "
                     + ("community molto fiduciosa." if sent_up >= 75 else
                        "opinioni divise." if sent_up >= 50 else
                        "community prevalentemente scettica."))

    return "\n".join(lines)


# ============================================================
# SEZIONE 4: SOMMARIO COMPLESSIVO
# ============================================================

def generate_overall_summary(data: dict) -> str:
    """
    Genera il giudizio complessivo combinando tutti i fattori.
    Usa un sistema a punti (positivi / negativi / neutri) identico
    a quello dell'analisi fondamentale tradizionale.
    """
    name    = data.get("name", "N/D")
    symbol  = data.get("symbol", "").upper()
    rank    = data.get("market_cap_rank")
    md      = data.get("market_data", {})

    mc      = safe_nested(md, "market_cap", "usd")
    fdv     = safe_nested(md, "fully_diluted_valuation", "usd")
    circ    = safe_nested(md, "circulating_supply")
    total   = safe_nested(md, "total_supply")
    commits = data.get("developer_data", {}).get("commit_count_4_weeks")
    sent_up = data.get("sentiment_votes_up_percentage")
    chg_30d = safe_nested(md, "price_change_percentage_30d")
    vol     = safe_nested(md, "total_volume", "usd")

    positive_reasons = []
    negative_reasons = []
    neutral_reasons  = []

    # 1. Market Cap Rank
    if rank:
        if rank <= 20:
            positive_reasons.append(f"Alta Rilevanza (Rank #{rank}): progetto tra i più capitalizzati al mondo.")
        elif rank <= 100:
            neutral_reasons.append(f"Rilevanza Media (Rank #{rank}): buona posizione nel panorama crypto.")
        else:
            negative_reasons.append(f"Bassa Rilevanza (Rank #{rank}): fuori dalla top 100, rischio liquidità.")

    # 2. MC/FDV ratio
    if mc and fdv and fdv > 0:
        ratio = mc / fdv
        if ratio >= 0.75:
            positive_reasons.append(f"Supply Matura (MC/FDV {ratio:.0%}): poca diluizione futura attesa.")
        elif ratio >= 0.5:
            neutral_reasons.append(f"Diluizione Moderata (MC/FDV {ratio:.0%}): supply parzialmente bloccata.")
        else:
            negative_reasons.append(f"Alta Diluizione (MC/FDV {ratio:.0%}): molta supply ancora da sbloccare.")

    # 3. Supply circolante
    if circ and total and total > 0:
        pct = circ / total * 100
        if pct >= 70:
            positive_reasons.append(f"Supply Circolante Alta ({pct:.0f}%): bassa pressione inflattiva.")
        elif pct >= 40:
            neutral_reasons.append(f"Supply Circolante Media ({pct:.0f}%): monitorare sblocchi futuri.")
        else:
            negative_reasons.append(f"Supply Circolante Bassa ({pct:.0f}%): rischio alta inflazione futura.")

    # 4. Developer activity
    if commits is not None:
        if commits >= 50:
            positive_reasons.append(f"Sviluppo Attivo ({commits} commit/4 settimane): team operativo.")
        elif commits >= 10:
            neutral_reasons.append(f"Sviluppo Moderato ({commits} commit/4 settimane).")
        else:
            negative_reasons.append(f"Sviluppo Scarso ({commits} commit/4 settimane): rischio progetto dormiente.")

    # 5. Sentiment
    if sent_up is not None:
        if sent_up >= 70:
            positive_reasons.append(f"Sentiment Positivo ({sent_up:.0f}%): community fiduciosa.")
        elif sent_up >= 50:
            neutral_reasons.append(f"Sentiment Misto ({sent_up:.0f}% positivo).")
        else:
            negative_reasons.append(f"Sentiment Negativo ({sent_up:.0f}% positivo): community scettica.")

    # 6. Trend 30gg
    if chg_30d is not None:
        if chg_30d > 10:
            positive_reasons.append(f"Trend Positivo (+{chg_30d:.1f}% in 30gg): forte momentum di mercato.")
        elif chg_30d < -20:
            negative_reasons.append(f"Trend Negativo ({chg_30d:.1f}% in 30gg): forte correzione in atto.")
        else:
            neutral_reasons.append(f"Trend Laterale ({chg_30d:+.1f}% in 30gg): movimento contenuto.")

    # Verdetto finale
    pos = len(positive_reasons)
    neg = len(negative_reasons)
    neu = len(neutral_reasons)
    total_factors = pos + neg + neu

    if total_factors == 0:
        verdict = "⚪ Dati insufficienti per un giudizio."
    elif pos >= 4 and neg == 0:
        verdict = "🟢 **MOLTO POSITIVO** — Fondamentali crypto solidi su tutti i fronti."
    elif pos > neg and pos >= 2:
        verdict = "🟡 **POSITIVO CON RISERVE** — Buoni fondamentali con alcune aree da monitorare."
    elif neg > pos:
        verdict = "🔴 **ATTENZIONE** — Diversi segnali di rischio. Analisi approfondita raccomandata."
    else:
        verdict = "🟡 **MISTO** — Luci e ombre. Valutare in base al contesto di mercato."

    lines = [
        f"📋 **Sintesi Tokenomics: {name} ({symbol})**",
        f"**Market Cap Rank:** #{rank}" if rank else "**Market Cap Rank:** N/D",
        f"**Market Cap:** {format_large_number(mc)}",
        "",
        f"**Giudizio complessivo:** {verdict}",
        "",
    ]

    if pos > 0:
        lines.append(f"✅ **Punti di forza ({pos}):**")
        for r in positive_reasons:
            lines.append(f"  • {r}")
    if neu > 0:
        lines.append(f"⚠️ **Aree nella media ({neu}):**")
        for r in neutral_reasons:
            lines.append(f"  • {r}")
    if neg > 0:
        lines.append(f"❌ **Punti critici ({neg}):**")
        for r in negative_reasons:
            lines.append(f"  • {r}")

    lines.extend([
        "",
        "⚠️ Analisi generata automaticamente a scopo informativo.",
        "Non costituisce consulenza finanziaria. Il mercato crypto è altamente volatile.",
    ])

    return "\n".join(lines)
