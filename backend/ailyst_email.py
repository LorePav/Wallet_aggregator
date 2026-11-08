# ==============================================================================
# ailyst_email.py
#
# Il "Postino" di Ailyst: invia il report mattutino via Gmail.
#
# COME CONFIGURARE GMAIL (da fare una sola volta):
#   1. Vai su: https://myaccount.google.com/security
#   2. Attiva la "Verifica in due passaggi" (2FA) se non è già attiva
#   3. Vai su: https://myaccount.google.com/apppasswords
#   4. Crea una nuova "Password per app" → scegli "App: Altra" → nome: "Ailyst"
#   5. Google ti darà una password di 16 caratteri (es: abcd efgh ijkl mnop)
#   6. Aggiungila nel file backend/.env:
#        GMAIL_USER=la-tua-email@gmail.com
#        GMAIL_APP_PASSWORD=abcdefghijklmnop   (senza spazi)
#
# ANALOGIA: Pensa a questo modulo come a una stampante e un postino
#           combinate: costruisce il documento e lo spedisce.
# ==============================================================================

import os
import json
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime

logger = logging.getLogger("ailyst_email")

# Assicura che le variabili .env siano caricate
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv non installato: usa variabili d'ambiente di sistema


# ==============================================================================
# COSTRUZIONE DEL REPORT HTML
# ==============================================================================

def _sentiment_emoji(score: float) -> str:
    """Converte il sentiment score in emoji visiva."""
    if score >= 0.35:   return "🟢"
    elif score <= -0.35: return "🔴"
    else:                return "🟡"


def _change_emoji(change: float) -> str:
    """Arrow emoji per la variazione di prezzo."""
    if change is None:  return "➖"
    elif change >= 0:   return "▲"
    else:               return "▼"


def _format_price(price: float) -> str:
    """Formatta il prezzo in modo leggibile."""
    if price is None:
        return "N/D"
    if price >= 1000:
        return f"${price:,.2f}"
    elif price >= 1:
        return f"${price:.2f}"
    else:
        return f"${price:.6f}"


def build_html_report(
    user_email:    str,
    watchlist:     list[dict],
    prices:        dict,
    news:          list[dict],
    fear_greed:    dict,
    report_date:   datetime = None
) -> str:
    """
    Costruisce il report HTML completo da inviare via email.

    Args:
        user_email:  Email dell'utente (per personalizzazione)
        watchlist:   Lista asset in watchlist [{symbol, name, asset_type, ...}]
        prices:      Prezzi attuali {symbol: {price_usd, change_24h, ...}}
        news:        Lista notizie [{title, source, url, sentiment_score, ...}]
        fear_greed:  Indice Fear & Greed {value, label}
        report_date: Data/ora del report

    Returns:
        Stringa HTML completa pronta per l'invio
    """
    if report_date is None:
        report_date = datetime.utcnow()

    date_str     = report_date.strftime("%d %B %Y")
    weekday_it   = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"]
    weekday      = weekday_it[report_date.weekday()]

    # Fear & Greed value
    fg_value = fear_greed.get("value")
    fg_label = fear_greed.get("label", "N/D")
    fg_color = "#e74c3c" if fg_value and fg_value < 40 else ("#27ae60" if fg_value and fg_value > 60 else "#f39c12")
    fg_display = f"{fg_value}/100" if fg_value else "N/D"

    # === SEZIONE PREZZI WATCHLIST ===
    prices_rows_html = ""
    for item in watchlist:
        symbol = item.get("symbol", "")
        name   = item.get("name", symbol)
        price_data = prices.get(symbol, {})
        price      = price_data.get("price_usd")
        change     = price_data.get("change_24h")

        change_str   = f"{abs(change):.2f}%" if change is not None else "N/D"
        change_color = "#27ae60" if (change or 0) >= 0 else "#e74c3c"
        arrow        = _change_emoji(change)

        prices_rows_html += f"""
        <tr>
            <td style="padding:10px 16px; font-weight:600; color:#1a1a2e;">{symbol}</td>
            <td style="padding:10px 16px; color:#555;">{name}</td>
            <td style="padding:10px 16px; font-family:monospace; font-size:14px;">{_format_price(price)}</td>
            <td style="padding:10px 16px; color:{change_color}; font-weight:600;">
                {arrow} {change_str}
            </td>
        </tr>
        """

    if not prices_rows_html:
        prices_rows_html = """
        <tr>
            <td colspan="4" style="padding:16px; text-align:center; color:#888;">
                Nessun asset in watchlist. Aggiungine dalla sezione Ailyst.
            </td>
        </tr>
        """

    # === SEZIONE NOTIZIE ===
    # Prendiamo le top 8 notizie per rilevanza
    top_news = sorted(news, key=lambda x: x.get("relevance_score", 0), reverse=True)[:8]
    news_cards_html = ""

    for article in top_news:
        sentiment    = article.get("sentiment_score", 0)
        s_emoji      = _sentiment_emoji(sentiment)
        s_label_map  = {"bullish": "Positivo", "bearish": "Negativo", "neutral": "Neutro"}
        s_key        = article.get("sentiment_label", "neutral")
        s_label      = s_label_map.get(s_key, "Neutro")
        s_color      = "#27ae60" if s_key == "bullish" else ("#e74c3c" if s_key == "bearish" else "#777")
        assets       = ", ".join(article.get("assets_mentioned", []))
        assets_badge = f'<span style="background:#e8f4fd; color:#2980b9; padding:2px 8px; border-radius:12px; font-size:11px; margin-left:8px;">{assets}</span>' if assets else ""

        news_cards_html += f"""
        <div style="border:1px solid #eee; border-radius:8px; padding:14px 16px; margin-bottom:12px; background:#fafafa;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px;">
                <span style="font-size:11px; color:#999; text-transform:uppercase; letter-spacing:0.5px;">
                    {article.get('source', '')} &nbsp;·&nbsp; {article.get('published_at', '')[:10]}
                </span>
                <span style="font-size:12px; color:{s_color}; font-weight:600;">
                    {s_emoji} {s_label}
                </span>
            </div>
            <a href="{article.get('url', '#')}" style="color:#1a1a2e; text-decoration:none; font-size:15px; font-weight:600; line-height:1.4; display:block; margin-bottom:6px;">
                {article.get('title', '')}
            </a>
            <p style="color:#666; font-size:13px; margin:0; line-height:1.5;">
                {article.get('summary', '')[:180]}{"..." if len(article.get('summary', '')) > 180 else ""}
            </p>
            {assets_badge}
        </div>
        """

    if not news_cards_html:
        news_cards_html = '<p style="color:#888; text-align:center;">Nessuna notizia disponibile al momento.</p>'

    # === HTML COMPLETO ===
    html = f"""
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Ailyst Report — {date_str}</title>
    </head>
    <body style="margin:0; padding:0; background:#f0f2f5; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">

        <!-- WRAPPER -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5; padding:30px 0;">
        <tr><td align="center">
        <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px; width:100%;">

            <!-- HEADER -->
            <tr>
                <td style="background:linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
                            border-radius:12px 12px 0 0; padding:32px 36px; text-align:center;">
                    <div style="font-size:13px; color:#7b8eb0; text-transform:uppercase; letter-spacing:2px; margin-bottom:8px;">
                        {weekday}, {date_str}
                    </div>
                    <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700; letter-spacing:-0.5px;">
                        ⚡ Ailyst Report
                    </h1>
                    <p style="margin:8px 0 0; color:#94a3c4; font-size:14px;">
                        Market Intelligence · Portfolio Aggregator
                    </p>
                </td>
            </tr>

            <!-- BODY -->
            <tr>
                <td style="background:#ffffff; padding:32px 36px;">

                    <!-- FEAR & GREED -->
                    <div style="background:linear-gradient(135deg, {fg_color}18, {fg_color}08);
                                border:1px solid {fg_color}40; border-radius:10px;
                                padding:20px 24px; margin-bottom:28px; text-align:center;">
                        <div style="font-size:12px; color:#888; text-transform:uppercase; letter-spacing:1px; margin-bottom:8px;">
                            Crypto Fear &amp; Greed Index
                        </div>
                        <div style="font-size:42px; font-weight:800; color:{fg_color}; line-height:1;">
                            {fg_display}
                        </div>
                        <div style="font-size:16px; color:{fg_color}; font-weight:600; margin-top:6px;">
                            {fg_label}
                        </div>
                        {"<div style='font-size:12px; color:#aaa; margin-top:4px;'>Ieri: " + str(fear_greed.get('yesterday_value', 'N/D')) + "/100</div>" if fear_greed.get('yesterday_value') else ""}
                    </div>

                    <!-- PREZZI WATCHLIST -->
                    <h2 style="margin:0 0 16px; font-size:18px; color:#1a1a2e; font-weight:700;">
                        📊 La tua Watchlist
                    </h2>
                    <table width="100%" cellpadding="0" cellspacing="0"
                           style="border:1px solid #eee; border-radius:8px; overflow:hidden; margin-bottom:32px;">
                        <thead>
                            <tr style="background:#f8f9fa;">
                                <th style="padding:10px 16px; text-align:left; font-size:12px; color:#888; font-weight:600; text-transform:uppercase;">Simbolo</th>
                                <th style="padding:10px 16px; text-align:left; font-size:12px; color:#888; font-weight:600; text-transform:uppercase;">Nome</th>
                                <th style="padding:10px 16px; text-align:left; font-size:12px; color:#888; font-weight:600; text-transform:uppercase;">Prezzo</th>
                                <th style="padding:10px 16px; text-align:left; font-size:12px; color:#888; font-weight:600; text-transform:uppercase;">24h</th>
                            </tr>
                        </thead>
                        <tbody>
                            {prices_rows_html}
                        </tbody>
                    </table>

                    <!-- NOTIZIE -->
                    <h2 style="margin:0 0 16px; font-size:18px; color:#1a1a2e; font-weight:700;">
                        📰 Notizie di Rilevanza
                    </h2>
                    {news_cards_html}

                </td>
            </tr>

            <!-- FOOTER -->
            <tr>
                <td style="background:#f8f9fa; border-radius:0 0 12px 12px;
                            padding:20px 36px; text-align:center; border-top:1px solid #eee;">
                    <p style="margin:0; font-size:12px; color:#aaa; line-height:1.6;">
                        Questo report è generato automaticamente da <strong>Ailyst</strong>,
                        il modulo di Market Intelligence del tuo Portfolio Aggregator.<br>
                        ⚠️ <em>Non costituisce consulenza finanziaria.</em>
                    </p>
                </td>
            </tr>

        </table>
        </td></tr>
        </table>

    </body>
    </html>
    """

    return html


# ==============================================================================
# INVIO EMAIL VIA GMAIL SMTP
# ==============================================================================

def send_gmail_report(
    to_email:     str,
    html_content: str,
    subject:      str = None,
    report_date:  datetime = None
) -> bool:
    """
    Invia il report HTML via Gmail SMTP.

    Args:
        to_email:     Email del destinatario
        html_content: Contenuto HTML del report
        subject:      Oggetto dell'email (generato automaticamente se None)
        report_date:  Data del report per l'oggetto

    Returns:
        True se inviata con successo, False altrimenti
    """
    GMAIL_USER         = os.environ.get("GMAIL_USER", "")
    GMAIL_APP_PASSWORD = os.environ.get("GMAIL_APP_PASSWORD", "")

    if not GMAIL_USER or not GMAIL_APP_PASSWORD:
        logger.error(
            "Credenziali Gmail mancanti. "
            "Aggiungi GMAIL_USER e GMAIL_APP_PASSWORD in backend/.env"
        )
        return False

    if not subject:
        date_str = (report_date or datetime.utcnow()).strftime("%d/%m/%Y")
        subject  = f"⚡ Ailyst Report — {date_str}"

    try:
        # Crea il messaggio email
        msg = MIMEMultipart("alternative")
        msg["From"]    = f"Ailyst Portfolio <{GMAIL_USER}>"
        msg["To"]      = to_email
        msg["Subject"] = subject

        # Versione testo semplice (fallback per client che non supportano HTML)
        text_part = MIMEText(
            "Apri questa email in un client che supporta HTML per visualizzare il report Ailyst.",
            "plain",
            "utf-8"
        )
        html_part = MIMEText(html_content, "html", "utf-8")

        # L'ordine è importante: prima il testo, poi l'HTML
        # Il client sceglierà la versione migliore supportata
        msg.attach(text_part)
        msg.attach(html_part)

        # Connessione SMTP con STARTTLS (porta 587)
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
            server.ehlo()
            server.starttls()       # Attiva la cifratura TLS
            server.ehlo()
            server.login(GMAIL_USER, GMAIL_APP_PASSWORD)
            server.sendmail(GMAIL_USER, to_email, msg.as_string())

        logger.info(f"Ailyst report inviato a {to_email}")
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error(
            "Autenticazione Gmail fallita. "
            "Controlla GMAIL_USER e GMAIL_APP_PASSWORD in .env. "
            "Ricorda: devi usare una 'Password per app', non la tua password normale."
        )
        return False
    except smtplib.SMTPException as e:
        logger.error(f"Errore SMTP: {e}")
        return False
    except Exception as e:
        logger.error(f"Errore invio email: {e}")
        return False
