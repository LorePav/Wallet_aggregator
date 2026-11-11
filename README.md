# 💼 My Portfolio — Wallet Aggregator

> Dashboard personale per unificare portafoglio, transazioni, rendite passive (dividendi/farming DeFi) e analisi degli asset in un'unica app web.

---

## 📑 Indice

- [Cos'è](#-cosè)
- [Funzionalità](#-funzionalità)
- [Stack tecnologico](#-stack-tecnologico)
- [Architettura](#-architettura)
- [Avvio in locale](#-avvio-in-locale)
- [Variabili d'ambiente](#-variabili-dambiente)
- [Come pubblicare online](#-come-pubblicare-online)
- [Struttura del progetto](#-struttura-del-progetto)
- [Database](#-database)
- [Note chiave sul funzionamento](#-note-chiave-sul-funzionamento)
- [Sicurezza](#-sicurezza)
- [Documentazione correlata](#-documentazione-correlata)

---

## 🎯 Cos'è

**My Portfolio** è un'applicazione web personale che aggrega in un'unica dashboard:

- il **valore del portafoglio** (azioni, ETF, crypto, liquidità) con prezzi live;
- lo **storico delle transazioni** e le **rendite passive** (dividendi e farming DeFi);
- l'**andamento storico** del patrimonio e benchmark;
- **analisi avanzate** (drawdown, correlazioni, rischio), **fondamentali** azioni e **tokenomics** crypto.

Gli asset sono valutati in tempo reale tramite `yfinance`, con conversione multi-valuta (EUR/USD/GBP/CHF/JPY).

---

## ✨ Funzionalità

| Sezione | Cosa fa |
|---|---|
| **Dashboard** | KPI (valore totale, investito, guadagno), grafico storico del patrimonio, torte di allocazione, totale dividendi/farming |
| **Portafoglio** | Tabella asset con prezzi live, PMC, guadagno/perdita, sparkline; badge APR per le posizioni in farming |
| **Transazioni** | Cronologia con filtri (periodo, tipo, asset), modifica/eliminazione; gestione **dividendi** e **farming DeFi** |
| **Farming DeFi** | Rendita collegata a un asset *o* a una valuta; **rendimento in valuta** (es. SOL → USD) o **in asset** (es. SOL → SOL, compound); percentuale **APR/APY** informativa |
| **Analisi Avanzate** | Drawdown, heatmap di correlazione, metriche di rischio |
| **Analisi Fondamentali** | Dati e indicatori per azioni/ETF (multipli, redditività, salute, crescita, dividendi, bilanci) |
| **Analisi Tokenomics** | Metriche crypto (valutazione, supply, on-chain, community, exchange, news) |
| **Impostazioni** | Tema, valuta di visualizzazione, intervallo di refresh, export Google Sheets |
| **Login / Auth** | Autenticazione Supabase (email/password + OAuth Google/X) |

> ℹ️ Il modulo **Ailyst** (market intelligence, watchlist + news) ha il backend pronto (`/api/ailyst/*`) ma la UI è temporaneamente disattivata (route e voce sidebar commentate).

---

## 🧰 Stack tecnologico

**Frontend**
- React 19 + Vite
- React Router 7
- Recharts (grafici), Framer Motion (animazioni)
- Axios, `@supabase/supabase-js`
- CSS custom (design system scuro, glassmorphism)

**Backend**
- Python + FastAPI + Uvicorn
- SQLAlchemy (ORM)
- Pydantic v2 (validazione)
- `yfinance` (prezzi live/storici), `pandas`/`numpy`
- `feedparser` + `vaderSentiment` (Ailyst)

**Infrastruttura**
- Database: **Supabase** (PostgreSQL)
- Frontend online: **Vercel**
- Backend online: **Render**

---

## 🏗️ Architettura

```
Browser (React/Vite)
      │  HTTP + Bearer token (Supabase)
      ▼
Backend FastAPI (Render)
      │  SQLAlchemy
      ▼
Supabase PostgreSQL  ──  yfinance / CoinGecko (prezzi e dati)
```

- Il frontend chiama il backend tramite `VITE_API_URL` (in locale `http://127.0.0.1:8000`).
- Il backend verifica il token Supabase sull'endpoint `/auth/v1/user`.
- I dati sono **multi-utente**: ogni tabella ha `user_id` e le query filtrano sull'utente autenticato.

---

## 🚀 Avvio in locale

### Metodo rapido (Windows)

Doppio click su **`start_app.bat`**: avvia backend (`:8000`) e frontend (`:5173`) e apre il browser.

### Metodo manuale

**Backend**
```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Apri `http://localhost:5173`.

> Il backend al primo avvio crea le tabelle mancanti e applica le migrazioni delle colonne nuove (`_run_migrations()` in `backend/main.py`).

---

## 🔑 Variabili d'ambiente

I file `.env` **non vanno committati** (sono in `.gitignore`). Usa i file `.env.example` come modello.

**`backend/.env`**

| Variabile | Descrizione |
|---|---|
| `DATABASE_URL` | Connessione PostgreSQL Supabase |
| `SUPABASE_URL` | URL del progetto Supabase |
| `SUPABASE_ANON_KEY` | Chiave pubblica (anon/publishable) per verificare i token |
| `GMAIL_USER` | Email Gmail per l'invio dei report Ailyst |
| `GMAIL_APP_PASSWORD` | App password Gmail |
| `CORS_ORIGINS` | *(opzionale)* origini consentite, separate da virgola |

**`frontend/.env`**

| Variabile | Descrizione |
|---|---|
| `VITE_SUPABASE_URL` | URL del progetto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chiave pubblica Supabase |
| `VITE_API_URL` | *(solo deploy)* URL del backend Render; in locale è `http://127.0.0.1:8000` |

---

## ☁️ Come pubblicare online

Il repository è collegato a Vercel e Render: **basta un push su `main`** e i due servizi ricostruiscono e ridistribuiscono automaticamente.

```bash
git add -A
git commit -m "feat: descrizione della modifica"
git push origin main
```

| Servizio | Root directory | Build / Start |
|---|---|---|
| **Vercel** (frontend) | `frontend` | `npm run build` → output `dist` |
| **Render** (backend) | `backend` | `uvicorn main:app --host 0.0.0.0 --port $PORT` |

- Le variabili d'ambiente si impostano nei **pannelli** di Vercel/Render (non nel repo).
- Se l'auto-deploy è disattivato: pulsante **"Redeploy"** nel pannello.
- Il database Supabase è condiviso tra locale e online: le migrazioni sono **idempotenti** (non creano duplicati).

**URL attuali**
- Frontend: `https://wallet-aggregator-two.vercel.app`
- Backend: `https://wallet-aggregator.onrender.com`

---

## 📁 Struttura del progetto

```
wallet aggregator/
├── backend/                  # API FastAPI
│   ├── main.py               # App, endpoint, CORS, migrazioni
│   ├── models.py             # Modelli SQLAlchemy (Asset, Transaction, DailySnapshot)
│   ├── schemas.py            # Schemi Pydantic
│   ├── portfolio.py          # Calcolo portafoglio, liquidità, rendite/farming
│   ├── finance.py            # Prezzi live/storici, tassi di cambio (yfinance)
│   ├── analytics.py          # Drawdown, correlazioni, risk metrics
│   ├── analyzer.py           # Analisi fondamentali
│   ├── crypto_analyzer.py    # Analisi tokenomics
│   ├── ailyst_*              # Modulo Ailyst (watchlist, news, report, email)
│   ├── database.py           # Engine/ sessione SQLAlchemy
│   ├── supabase_config.py    # Config Supabase
│   └── requirements.txt
├── frontend/                 # App React/Vite
│   └── src/
│       ├── pages/            # Dashboard, Portfolio, Transactions, Analytics, ...
│       ├── components/       # Layout, Sidebar, sidebar, modali, grafici
│       ├── context/          # PortfolioContext (stato globale)
│       ├── hooks/            # usePortfolioData, useUIState, ...
│       └── utils/
├── start_app.bat             # Avvio locale backend + frontend
├── CLAUDE.md                 # Regole operative per agenti AI
├── AILYST_FRONTEND_BRIEF.md  # Brief del modulo Ailyst
└── README.md
```

---

## 🗄️ Database

Tabelle principali (PostgreSQL / Supabase):

| Tabella | Contenuto |
|---|---|
| `assets` | Anagrafica asset (simbolo, nome, categoria, valuta) |
| `transactions` | Movimenti: `Buy`, `Sell`, `Dividend`, `Farming DeFi`, `Deposit`, `Withdrawal` (+ `reward_currency`, `yield_percent`) |
| `daily_snapshots` | Snapshot giornaliero di valore/investito (storico patrimonio) |
| `ailyst_watchlist` | Watchlist del modulo Ailyst |
| `ailyst_news_cache` | Cache delle notizie con sentiment |
| `ailyst_reports` | Report generati |
| `ailyst_settings` | Impostazioni notifiche/email |

Tutte le tabelle hanno `user_id` per l'isolamento multi-utente.

---

## 📌 Note chiave sul funzionamento

- **PMC (Prezzo Medio di Carico)**: calcolato per `(simbolo, conto)`. Vendite e acquisti aggiornano quantità e costo.
- **Guadagno realizzato**: vendite chiuse + dividendi + farming in valuta.
- **Farming DeFi** (tipo transazione):
  - **Rendimento in valuta** (es. SOL → USD): guadagno realizzato + accredito in liquidità.
  - **Rendimento in asset** (es. SOL → SOL): **compound**, aumenta la quantità dell'asset; il valore diventa guadagno non realizzato finché non vendi.
  - **Asset collegato** = valuta di cassa (es. USD → USD): il guadagno va solo in liquidità, senza creare asset fantasma.
  - **APR/APY** (`yield_percent`): solo informativo, non influisce sui calcoli.
- **Liquidità**: le valute di cassa non sono asset di portafoglio; vengono sommate come "cassa" per conto.
- **Categorie "FARMING"**: valutate al costo di acquisto (nessun prezzo di mercato).

---

## 🔒 Sicurezza

- Nessun segreto (chiavi private, seed, password) nel codice o nei log.
- `.env` esclusi dal versionamento.
- Il backend valida ogni richiesta con il token Supabase; nessun endpoint dati è pubblico.
- CORS limitato alle origini consentite.
- **Nota**: l'app è un aggregatore **read-only** di dati, non esegue transazioni né custodisce fondi.

---

## 📚 Documentazione correlata

- **`CLAUDE.md`** — contratto operativo e linee guida per gli agenti AI che lavorano sul progetto.
- **`AILYST_FRONTEND_BRIEF.md`** — specifiche del modulo Ailyst.
- **`note.txt` / `task e idee.txt`** — appunti e idee/roadmap informali.

---

> ⚠️ **Disclaimer**: questo progetto è uno strumento personale di visualizzazione dati. Non è consulenza finanziaria.
