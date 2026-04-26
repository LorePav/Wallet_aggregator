# 🤖 CLAUDE.md - Contratto Operativo & Linee Guida AI
> **Progetto**: Portfolio Aggregator  
> **Versione**: 1.0  
> **Stack**: FastAPI (Backend) + React/Vite (Frontend)  
> **Ambiente dev**: `start_app.bat` → Backend: `:8000` | Frontend: `:5173`  

## 🛠️ 1. Stack Tecnologico & Convenzioni di Codice
- **Backend**: Python 3.10+, FastAPI, Uvicorn (`--reload`), Pydantic v2, SQLAlchemy/SQLModel, async/await nativo.
- **Frontend**: React 18+, Vite, TypeScript, React Router, Tailwind/shadcn o libreria UI coerente, gestione stato via Zustand/Redux/Context.
- **Tooling**: `start_app.bat` per avvio parallelo, hot-reload abilitato, `.env` per variabili sensibili, git conventional commits.
- **Convenzioni**:
  - Python: `ruff` + `black`, type hints obbligatori, docstring per endpoint complessi.
  - Frontend: ESLint + Prettier, componenti funzionali, prop typing, naming `PascalCase` per componenti, `camelCase` per variabili.
  - API: RESTful, versioning `/api/v1/`, risposte standardizzate `{ data, meta, error }`, codici HTTP corretti.
  - Commit: `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.

## 🔒 2. Regole di Sicurezza (ASSOLUTE)
- ❌ **MAI** loggare, stampare o generare codice che contenga: seed phrase, private key, API key, token di accesso in chiaro.
- 🔐 Tutti i dati sensibili devono risiedere in `.env`, variabili d'ambiente criptate o vault esterno.
- 🌐 Claude/Agent possono elaborare **solo dati aggregati, anonimizzati o metadati di transazione**. Mai dati raw di signing o autenticazione.
- ✅ Validazione input lato server (Pydantic) e client (Zod/TypeScript). CORS limitato agli origin consentiti.
- 🛑 Nessun prompt o funzione AI deve generare, suggerire o simulare transazioni on-chain senza esplicita approvazione utente e firma hardware/software dedicata.
- 📦 Logging: mascherare indirizzi wallet (`0x1234...abcd`), timestamp UTC, livelli `info/warn/error`.

## 🎯 3. Obiettivi di Prodotto & User Persona
- **Core Value**: Unificare in tempo reale saldi, performance e esposizioni across chain/exchange in un'unica dashboard leggibile e sicura.
- **User Persona**: 
  - `Trader/Investor Retail` (25-45 anni): cerca semplicità, aggiornamenti rapidi, zero frizioni nella configurazione.
  - `Power User/DeFi Native`: vuole granularità sui protocolli, export CSV/API, alert personalizzati.
- **Roadmap a 60 gg**: 
  1. Stabilizzare fetch multi-chain & caching intelligente
  2. Integrazione Claude per analisi natural language dei bilanci
  3. Onboarding guidato < 60s + dark/light mode
  4. Preparazione tier freemium vs premium (analytics avanzati, alert, API rate)
- **Metriche di Successo**: Tasso di completamento onboarding > 70%, tempo di caricamento dashboard < 2s, churn < 5% mensile.

## ⚖️ 4. Limiti Etici, Legal & Compliance
- 📜 **NON È CONSIGLIO FINANZIARIO**: ogni output analitico o predittivo deve riportare disclaimer chiaro.
- 🇪🇺 **GDPR & Privacy by Design**: dati utente processati localmente o anonimizzati prima di qualsiasi chiamata esterna. Diritto all'oblio implementato.
- 🔍 **Trasparenza AI**: specificare quando un'informazione è generata da LLM vs calcolata deterministicamente.
- 🏛️ **Compliance**: allineamento a MiCA (UE) e best practice PSD2 per aggregazione read-only. Nessun custody, nessun moving fund.
- 🚫 **Bias & Allucinazioni**: Claude deve rifiutare richieste di previsione di prezzo, suggerimenti di trading o ottimizzazioni non basate su dati verificabili.

## 💬 5. Esempi di Prompt & Risposte Attese (Agent/LLM)
| Prompt Utente | Comportamento Atteso | Formato Risposta |
|---------------|----------------------|------------------|
| `"Perché il mio portfolio è sceso del 12% questa settimana?"` | Analizza solo asset detenuti, cross-referencia dati storici pubblici, isola chain/protocollo con perdita maggiore. | `"📉 Variazione -12% guidata da [Asset/Chain]. Esposizione attuale: X%. Fattori principali: Y. Nota: analisi basata su dati pubblici, non è consulenza."` |
| `"Sposta 0.5 ETH su Arbitrum per risparmiare fee"` | ❌ Rifiuto sicuro. Spiega che l'AI non esegue né suggerisce transazioni non autorizzate. | `"🔒 Non posso avviare o suggerire movimenti di fondi. Puoi farlo manualmente via wallet. Ecco un confronto fee storico tra chain."` |
| `"Genera un report PDF delle mie posizioni per la dichiarazione fiscale"` | Estrae solo dati aggregati, applica template standard, esporta senza chiavi/seed. | `"✅ Report generato. Contiene solo importi, date, chain. Nessun dato sensibile incluso. Scarica qui: [link]` |

## 🤖 6. Istruzioni Operative per Claude/Agent
- ✅ Prima di modificare codice: leggi `ARCHITECTURE.md`, `SECURITY.md` e questo file.
- ✅ Usa sempre type-safe responses, evita `any` in TS o `dict` non tipato in Python.
- ✅ Testa localmente con `python -m uvicorn main:app --reload` e `npm run dev`.
- ✅ Documenta ogni nuova feature in `ROADMAP.md` con `[ ] → [x]`.
- 🛑 Se una richiesta viola sicurezza, compliance o etica: rispondi con `[⚠️ VIOLAZIONE SICUREZZA/COMPLIANCE]` + spiegazione breve + alternativa sicura.
- 🔄 Mantieni coerenza con lo stile esistente. Non riscrivere interi moduli senza approvazione.

## 🔄 7. Aggiornamento e Manutenzione del File
- Questo file è **live**. Aggiornalo a ogni major decision architetturale, cambio di compliance o nuova integrazione agentica.
- Versiona con changelog interno in fondo al file.
- Condividi con tutti gli agenti/LLM coinvolti nel ciclo di sviluppo.

CORE FUNCTIONALITIES TO IMPLEMENT:

1. MULTICHAIN ACCOUNT AGGREGATION
Users will link wallets from 5+ chains to the platform. The system will fetch all token balances (including LP positions and staking rewards) and present a unified Net Worth dashboard.

2. TRANSACTION HISTORY & COST BASIS TRACKING
For each asset held, the system must reconstruct the acquisition cost by analyzing the historical transaction log. This enables accurate Unrealized P&L, Long-Term vs Short-Term Capital Gains categorization, and a "Wash Sale" prevention flag.

3. INTELLIGENT FEE ANALYSIS & ROUTING (OPTIONAL INITIATION)
By querying local or public data providers (e.g., Etherscan, Arbiscan APIs), the system will compare estimated gas costs for common transactions (e.g., Native Swap) across different L1s/L2s. If a user initiates a swap via the platform, the backend should propose the chain/method with the lowest fee based on current network congestion.

4. DYNAMIC TAX LOT SELECTION
If a user decides to sell only a portion of their holdings, the system must support granular tax lot selection. The user should be able to select specific lots (FIFO, LIFO, or HIFO) to optimize their tax burden. The UI should visualize the tax impact (estimated LTCG vs STCG) before confirmation.

5. REPORT GENERATION
Generate exportable reports (CSV/PDF) containing:
- Total Portfolio Value (Daily/Weekly snapshots)
- Transaction History with Cost Basis
- Capital Gains Realized (Annual)
- Unrealized Gains/Losses
- Cost Basis Adjustments

CONSIDERAZOINI PERSONALI Considera che non sono uno sviluppatore e ho posizionato le mie sensi informatiche. Quindi mi piacerebbe che ragionassi passo a passo, che mi spiegassi le cose in maniera semplice e che mi aiutassi a capire meglio il codice Python, magari con dei tracce detti in programmazione, per avere possibilità di capirlo meglio e avere miglior visione di quello che sto facendo. 