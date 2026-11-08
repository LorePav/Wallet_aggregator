# ⚡ AILYST — Frontend Brief per Antigravity
> **Progetto**: Portfolio Aggregator — Nuovo modulo "Ailyst"  
> **Stack esistente**: React 18 + Vite + TypeScript/JSX + React Router + Framer Motion + Axios  
> **Design system**: Dark theme, CSS variables, glassmorphism, Inter font  
> **Backend**: FastAPI già funzionante su `http://localhost:8000`

---

## 🎯 Cos'è Ailyst

Ailyst è il modulo di **Market Intelligence** integrato nel Portfolio Aggregator.  
Si trova nella sidebar sotto la sezione "Analisi", voce **"Ailyst"**, route `/ailyst`.

Il suo scopo è permettere all'utente di:
1. **Costruire una watchlist** di asset (crypto, azioni, forex, indici)
2. **Vedere i prezzi in tempo reale** degli asset monitorati
3. **Leggere le notizie** finanziarie filtrate per i propri asset, con sentiment scoring
4. **Ricevere un report mattutino** automatico via email alle 07:30
5. **Configurare le notifiche** (email, orario invio)

---

## 🎨 Design System dell'app esistente

### CSS Variables (da `src/index.css`)
```css
--bg-color:       #0b0f19   /* sfondo principale */
--surface:        #151b2b   /* card / pannelli */
--surface-hover:  #1e2638   /* hover state */
--text-primary:   #ffffff
--text-secondary: #94a3b8
--accent:         #3b82f6   /* blu primario */
--accent-glow:    rgba(59,130,246,0.4)
--success:        #10b981   /* verde */
--danger:         #ef4444   /* rosso */
--border:         rgba(255,255,255,0.08)
--glass-bg:       rgba(21,27,43,0.7)
--glass-border:   1px solid rgba(255,255,255,0.05)
```

### Patterns ricorrenti nelle pagine esistenti
- **Card**: `background: var(--surface)`, `border: var(--glass-border)`, `border-radius: 12px`
- **Glassmorphism**: `backdrop-filter: blur(12px)`, `background: var(--glass-bg)`
- **Animazioni**: Framer Motion (`motion.div`, `AnimatePresence`) — già installato
- **Font**: Inter per testo, Space Mono per numeri/prezzi
- **Badge sentiment**: colori `--success` (bullish), `--danger` (bearish), `#f59e0b` (neutral)
- **Icone**: Lucide React — già installato (`import { Zap, TrendingUp, ... } from 'lucide-react'`)

### Componenti già disponibili da riutilizzare
- `<SkeletonLoader />` — placeholder caricamento
- `<PageTransition />` — animazione entrata pagina
- `<SpotlightCard />` — card con effetto spotlight al hover

---

## 📐 Struttura UI consigliata

La pagina Ailyst si divide in **3 tab**:

```
┌─────────────────────────────────────────────────────┐
│  ⚡ Ailyst          [Watchlist] [News] [Report]      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Fear & Greed Index Widget  ────────────────────    │
│                                                     │
│  TAB CONTENT                                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Tab 1 — Watchlist & Prezzi
- Barra di ricerca con toggle **Crypto / Azioni**
- Dropdown risultati di ricerca con pulsante "+ Aggiungi"
- Griglia di card asset: simbolo, nome, prezzo, variazione 24h, pulsante rimozione
- Auto-refresh prezzi ogni 60 secondi

### Tab 2 — News Feed
- Filtro per asset (dropdown o tag clickabili dalla watchlist)
- Lista articoli con: fonte, data, titolo, summary, badge sentiment colorato
- Colori sentiment: 🟢 bullish `--success` | 🔴 bearish `--danger` | 🟡 neutral `#f59e0b`
- Pulsante "Aggiorna news" che chiama `?refresh=true`

### Tab 3 — Report & Impostazioni
- Preview dell'ultimo report generato (HTML in iframe o render custom)
- Pulsante **"Genera Report Ora"** con feedback toast
- Form impostazioni: toggle email on/off, campo email destinazione, orario invio (ore:minuti)

---

## 🔌 API Reference completa

> **Auth**: tutte le chiamate richiedono `Authorization: Bearer <supabase_token>` — axios lo manda già globalmente (configurato in `App.jsx`).  
> **Base URL**: `import.meta.env.VITE_API_URL || 'http://localhost:8000'`  
> **Formato risposta**: `{ data: <payload>, meta: { ... }, error: null }`

---

### WATCHLIST

#### `GET /api/ailyst/watchlist`
Restituisce la watchlist dell'utente loggato.

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "symbol": "BTC",
      "name": "Bitcoin",
      "asset_type": "crypto",
      "coingecko_id": "bitcoin",
      "yahoo_ticker": "BTC-USD",
      "tags": ["DeFi"],
      "alert_above": null,
      "alert_below": null,
      "added_at": "2026-05-12T07:30:00"
    }
  ],
  "meta": { "count": 1 },
  "error": null
}
```

---

#### `POST /api/ailyst/watchlist`
Aggiunge un asset alla watchlist.

**Body:**
```json
{
  "symbol": "ETH",
  "name": "Ethereum",
  "asset_type": "crypto",
  "coingecko_id": "ethereum",
  "yahoo_ticker": "ETH-USD",
  "tags": [],
  "alert_above": null,
  "alert_below": null
}
```
- `asset_type`: `"crypto"` | `"stock"` | `"forex"` | `"index"`
- `coingecko_id`: necessario per crypto (es. `"bitcoin"`, `"ethereum"`)
- `yahoo_ticker`: necessario per azioni (es. `"AAPL"`, `"ENI.MI"`)

**Response:**
```json
{ "data": { "id": 2, "symbol": "ETH" }, "meta": {}, "error": null }
```

---

#### `DELETE /api/ailyst/watchlist/{id}`
Rimuove un asset dalla watchlist.

**Response:**
```json
{ "data": { "removed": 2 }, "meta": {}, "error": null }
```

---

### RICERCA ASSET

#### `GET /api/ailyst/search/crypto?q={query}`
Cerca crypto su CoinGecko. Minimo 2 caratteri.

**Response:**
```json
{
  "data": [
    {
      "id": "bitcoin",
      "symbol": "BTC",
      "name": "Bitcoin",
      "thumb": "https://assets.coingecko.com/.../bitcoin.png",
      "market_cap_rank": 1,
      "coingecko_id": "bitcoin",
      "yahoo_ticker": "BTC-USD",
      "asset_type": "crypto"
    }
  ]
}
```

---

#### `GET /api/ailyst/search/stock?q={query}`
Cerca azioni/ETF su Yahoo Finance.

**Response:**
```json
{
  "data": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "exchange": "NMS",
      "type": "EQUITY"
    }
  ]
}
```
> ⚠️ Per azioni italiane usare il suffisso `.MI` (es: `ENI.MI`, `ENEL.MI`)

---

### PREZZI & MERCATO

#### `GET /api/ailyst/prices`
Prezzi correnti di tutti gli asset in watchlist + Fear & Greed Index.

**Response:**
```json
{
  "data": {
    "prices": {
      "BTC": {
        "price_usd": 65420.50,
        "price_eur": 60100.20,
        "change_24h": 2.35,
        "market_cap": 1280000000000,
        "source": "CoinGecko"
      },
      "AAPL": {
        "price_usd": 189.50,
        "price_eur": null,
        "change_24h": -0.82,
        "market_cap": null,
        "source": "Yahoo Finance"
      }
    },
    "fear_greed": {
      "value": 68,
      "label": "Greed",
      "timestamp": "1715500800",
      "yesterday_value": 62,
      "change": 6
    },
    "updated_at": "2026-05-12T07:30:00"
  }
}
```

---

#### `GET /api/ailyst/fear-greed`
Solo Fear & Greed Index.

**Response:**
```json
{
  "data": {
    "value": 68,
    "label": "Greed",
    "timestamp": "1715500800",
    "yesterday_value": 62,
    "change": 6
  }
}
```
- Valori: `0-24` = Extreme Fear | `25-49` = Fear | `50-74` = Greed | `75-100` = Extreme Greed

---

### NEWS

#### `GET /api/ailyst/news`
Ultime notizie finanziarie con sentiment scoring.

**Parametri URL:**
| Parametro | Tipo | Default | Descrizione |
|---|---|---|---|
| `hours` | int | 24 | Considera notizie delle ultime N ore |
| `asset` | string | null | Filtra per simbolo (es: `BTC`) |
| `limit` | int | 30 | Numero massimo di risultati |
| `refresh` | bool | false | Se `true`, fa un nuovo fetch RSS prima di rispondere |

**Response:**
```json
{
  "data": [
    {
      "id": 42,
      "title": "Bitcoin surges past $65,000 as ETF inflows accelerate",
      "summary": "Bitcoin rose sharply on Monday driven by...",
      "source": "CoinDesk",
      "url": "https://coindesk.com/...",
      "sentiment_score": 0.72,
      "sentiment_label": "bullish",
      "relevance_score": 95,
      "assets_mentioned": ["BTC"],
      "published_at": "2026-05-12T06:15:00"
    }
  ],
  "meta": { "count": 1, "hours_range": 24 }
}
```

- `sentiment_score`: da `-1.0` (bearish estremo) a `+1.0` (bullish estremo)
- `sentiment_label`: `"bullish"` | `"bearish"` | `"neutral"`
- `relevance_score`: da `0` a `100` (già ordinato per rilevanza decrescente)

---

### REPORT

#### `GET /api/ailyst/report/latest`
Ultimo report generato per l'utente.

**Response (se esiste):**
```json
{
  "data": {
    "id": 5,
    "report_date": "2026-05-12T07:30:00",
    "content_html": "<html>...</html>",
    "sent_email": true,
    "created_at": "2026-05-12T07:30:01"
  }
}
```

**Response (se non esiste ancora):**
```json
{ "data": null, "meta": { "message": "Nessun report ancora generato" } }
```

---

#### `POST /api/ailyst/report/generate?send_email=true`
Genera e invia il report manualmente (non aspetta le 07:30).

**Parametri URL:**
| Parametro | Default | Descrizione |
|---|---|---|
| `send_email` | `true` | Se `true` invia anche via email |

**Response:**
```json
{
  "data": {
    "report_id": 6,
    "email_sent": true,
    "email_to": "lorenzo@gmail.com",
    "news_count": 18,
    "assets_count": 5
  },
  "meta": { "message": "Report generato con successo!" }
}
```

> ⚠️ Errore 400 se la watchlist è vuota.

---

### IMPOSTAZIONI

#### `GET /api/ailyst/settings`
**Response:**
```json
{
  "data": {
    "email_enabled": true,
    "email_address": "lorenzo@gmail.com",
    "report_hour": 7,
    "report_minute": 30
  }
}
```

---

#### `PUT /api/ailyst/settings`
**Body (tutti i campi sono opzionali):**
```json
{
  "email_enabled": true,
  "email_address": "lorenzo@gmail.com",
  "report_hour": 8,
  "report_minute": 0
}
```

**Response:**
```json
{ "data": { "updated": true }, "meta": { "message": "Impostazioni salvate" } }
```

---

## 🧩 File già presenti da NON riscrivere

```
frontend/src/pages/Ailyst.jsx        ← placeholder funzionante (watchlist base)
frontend/src/App.jsx                  ← route /ailyst già aggiunta
frontend/src/components/Sidebar.jsx  ← voce "Ailyst" con icona Zap già aggiunta
```

Il file `Ailyst.jsx` esistente ha già la logica di base per watchlist e prezzi.  
Antigravity può **estenderlo** oppure **riscriverlo completamente** rispettando le API sopra.

---

## 💡 UX Notes & Dettagli importanti

**Ricerca con debounce** — non chiamare l'API ad ogni keystroke: aspettare ~400ms di pausa prima di fare la fetch (lo fa già il placeholder, da mantenere).

**Aggiunta alla watchlist** — dopo `POST /watchlist`, ri-fetchare sia watchlist che prezzi per mostrare subito il nuovo asset con il suo prezzo.

**Sentiment colori**:
- `bullish` → `var(--success)` = `#10b981`
- `bearish` → `var(--danger)` = `#ef4444`  
- `neutral` → `#f59e0b` (amber)

**Fear & Greed colori**:
- `0-29` Extreme Fear → `#ef4444`
- `30-49` Fear → `#f97316`
- `50-69` Greed → `#f59e0b`
- `70-100` Extreme Greed → `#10b981`

**Report HTML** — `content_html` è un documento HTML completo. Renderizzarlo in un `<iframe srcDoc={html}>` con `sandbox="allow-same-origin"` è l'approccio più sicuro. Altezza suggerita: 600px con scroll.

**Toast notifications** — usare lo stesso sistema già presente nell'app (o creare un componente `<Toast>` riutilizzabile).

**Auto-refresh prezzi** — `setInterval(fetchPrices, 60_000)` — ricordarsi di pulire con `clearInterval` nel `useEffect` cleanup.

**Errori API** — se l'endpoint prezzi fallisce, mostrare comunque la watchlist con prezzi `—` invece di bloccare tutto.

---

## 📁 Struttura file suggerita per Antigravity

```
frontend/src/
├── pages/
│   └── Ailyst.jsx                    ← componente principale (già esiste)
├── components/ailyst/
│   ├── WatchlistCard.jsx             ← card singolo asset con prezzo
│   ├── AssetSearch.jsx               ← barra ricerca + dropdown risultati
│   ├── NewsFeed.jsx                  ← lista notizie con sentiment
│   ├── NewsArticle.jsx               ← singola card notizia
│   ├── FearGreedWidget.jsx           ← widget indice paura/avidità
│   ├── ReportViewer.jsx              ← iframe report + pulsante genera
│   └── AilystSettings.jsx           ← form impostazioni email
└── hooks/
    └── useAilyst.js                  ← hook custom per fetch watchlist/prezzi/news
```

---

## ✅ Checklist deliverable

- [ ] Tab "Watchlist": ricerca crypto + azioni, aggiunta/rimozione, prezzi live con variazione %
- [ ] Tab "News": lista filtrata, sentiment badge, pulsante refresh
- [ ] Tab "Report": preview ultimo report + pulsante genera ora + feedback email inviata
- [ ] Tab "Impostazioni": toggle email, campo indirizzo, orario report
- [ ] Fear & Greed widget (sempre visibile in cima)
- [ ] Auto-refresh prezzi ogni 60s
- [ ] Toast per azioni utente (aggiunta, rimozione, report generato)
- [ ] Skeleton loader durante il caricamento iniziale
- [ ] Mobile responsive (la sidebar collassa già su mobile)
- [ ] Rispetto del dark theme e CSS variables dell'app esistente
