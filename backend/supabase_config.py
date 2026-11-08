# ==============================================================================
# supabase_config.py
#
# Configurazione Supabase condivisa da main.py e ailyst_router.py.
#
# Le variabili d'ambiente (backend/.env oppure pannello Render/Vercel) hanno
# sempre la precedenza. Se non sono impostate usiamo i valori PUBBLICI del
# progetto: la chiave "publishable/anon" è visibile anche nel bundle frontend,
# quindi non è un segreto. Il fallback serve solo a evitare che un deploy
# dimentichi le variabili e vada in errore all'avvio.
# ==============================================================================

import os

DEFAULT_SUPABASE_URL = "https://awyfpccnnbwfxumjzenc.supabase.co"
DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_UCTWV4dBLfdkHC0sB2_M0g_A0Q_hATC"

# Nota: questo modulo viene importato dopo database.py, che ha già caricato .env.
SUPABASE_URL = os.environ.get("SUPABASE_URL") or DEFAULT_SUPABASE_URL
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY") or DEFAULT_SUPABASE_ANON_KEY

USING_DEFAULT_SUPABASE_CONFIG = not (
    os.environ.get("SUPABASE_URL") and os.environ.get("SUPABASE_ANON_KEY")
)

if USING_DEFAULT_SUPABASE_CONFIG:
    print(
        "[auth] ATTENZIONE: SUPABASE_URL e/o SUPABASE_ANON_KEY non impostate. "
        "Uso i valori pubblici predefiniti del progetto."
    )
