# PortfolioIQ — Detailed Project Summary

## 🎯 What It Is

**PortfolioIQ** is an **AI-powered portfolio intelligence platform** that monitors real-time financial news, quantifies its impact on client portfolios using ML models, and proactively alerts wealth managers with actionable insights. It combines a **Next.js dashboard**, an **Express API server**, an **autonomous AI agent**, and **ML models deployed on HuggingFace Spaces**.

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│  Next.js Dashboard │◄──►│  Express Server    │◄──►│  MongoDB Atlas       │
│  (dashboard/)      │    │  (Server/)         │    │  (market data, news) │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
                              ▲
                              │ API calls
                              ▼
                    ┌─────────────────────┐
                    │  AI Agent (agent/)    │
                    │  - News Ingestion     │
                    │  - Analytics Engine   │
                    │  - GPT-4 Agent Loop   │
                    │  - Alert Generation   │
                    └────────┬────────────┘
                             │ ML inference
                             ▼
                    ┌─────────────────────┐
                    │  HuggingFace Spaces   │
                    │  3 ML Models:         │
                    │  • Event Impact       │
                    │  • Risk Scorer        │
                    │  • Volatility/VaR     │
                    └─────────────────────┘
```

---

## 🔧 Component-by-Component Breakdown

### 1. AI Agent — `agent/`

The autonomous brain of the system. Key files:

| File | Purpose |
|------|---------|
| `agent/agent.js` | Core agent loop — receives analytics, reasons via GPT-4, calls tools, generates alerts |
| `agent/analytics_engine.js` | ML + quant layer — event classification, portfolio impact, VaR, risk scoring |
| `agent/news_ingestion.js` | Fetches & deduplicates news from APIs (NewsData, Finnhub, etc.) |
| `agent/pipeline.js` | Orchestrates the full pipeline: ingest → analyze → agent → alerts |
| `agent/run_pipeline.js` | Entry point to trigger the pipeline |
| `agent/tools.js` | Tool definitions the agent can call (portfolio lookup, risk check, etc.) |
| `agent/chat_tools.js` | Interactive chat tools for the advisor-facing chat interface |
| `agent/server.js` | Express server exposing agent APIs and the chat interface |
| `agent/db.js` | Database layer for persisting events, alerts, analytics |
| `agent/utils.js` | Shared helpers |

### 2. Analytics Engine — `agent/analytics_engine.js`

This is the quantitative core. It has **5 layers**:

#### Layer 1: Event Classification (ML)
- Calls `callMLModel()` → HuggingFace Space `pranavdeshmukh-event-impact`
- **Input**: headline + description
- **Output**: per-sector impact scores + confidence (0–100)
- **Fallback**: `keywordFallback()` — a rule-based system with 30+ keyword→sector mappings in `SECTOR_IMPACT_RULES`, including sentiment amplification

#### Layer 2: Portfolio Impact — `computePortfolioImpact()`
- Maps sector-level impacts to each client's actual holdings
- Uses ticker→sector mapping from `TICKERS` (imported from sample data)
- Computes:
  - Per-holding dollar impact
  - Confidence-weighted effective impact
  - Threshold breach detection per client risk tolerance

#### Layer 3: Risk Metrics — `computeVaR()`
Calls **2 ML models in parallel** + local simulation fallback:

| Metric | ML Source | Fallback |
|--------|-----------|----------|
| **VaR (95%, 99%)** | GARCH model on HF Spaces (`callVolatilityML`) | Historical simulation on 500 synthetic daily returns |
| **CVaR / Expected Shortfall** | CVaR₉₅ ≈ VaR₉₅ × 1.16 | Mean of tail losses below 5th percentile |
| **Volatility** | GARCH daily vol → σ_annual = σ_daily × √252 | Sample std of simulated returns × √252 |
| **Risk Score (0–100)** | Portfolio Risk Scorer ML (`callRiskScorerML`) | Composite rule: vol + VaR + drawdown |
| **Beta** | — | β = Cov(Rp, Rm) / Var(Rm) from simulated returns |
| **Max Drawdown** | — | Cumulative peak-to-trough on simulated returns |
| **Concentration** | — | HHI, effective assets count (1/HHI), top-3 weight, sector exposure |

The simulated returns use a **seeded PRNG** (`seededRand`) for reproducibility, with each holding modeled as:

```
R_holding = w × (β × R_market + ε_idiosyncratic)
```

where `R_market ~ U(-0.01, 0.01)` (~16% annualized) and `ε ~ U(-0.008, 0.008)`.

#### Layer 4: Quant Aggregation — `aggregateSectorImpacts()`
Prevents unrealistic impact explosions when multiple correlated events hit:

1. **Dampened Sum** (`dampenedSum`): Uses `sign(s) × √|s| × 0.7` — diminishing returns for correlated signals
2. **Macro Regime Detection** (`detectRegime`): Identifies dominant regime (risk-off, rate tightening, rate easing, energy shock) from keywords → overrides conflicting sector signals
3. **Sector Caps** (`SECTOR_CAPS`): Hard limits (e.g., tech ±15%, bonds ±8%) to keep outputs realistic

#### Layer 5: Full Pipeline — `runAnalytics()`
Orchestrates everything:
1. Classify all events in parallel (ML with fallback)
2. Aggregate sector impacts with quant normalization
3. Compute per-client portfolio impacts + VaR metrics (3 ML model calls per client)
4. Identify alert candidates (clients exceeding risk thresholds)
5. Return structured JSON for the AI agent

---

### 3. Express API Server — `Server/`

Built with Express + TypeScript (`Server/src/server.ts`):

| Route Module | Endpoint Prefix | Purpose |
|-------------|----------------|---------|
| `portfolio.routes` | `/api` | Client portfolio CRUD, holdings |
| `news.routes` | `/api` | News feed endpoints |
| `risk.routes` | `/api` | Risk metrics & VaR data |
| `macro.routes` | `/api` | Macroeconomic indicators (FRED API) |
| `performance.routes` | `/api` | Portfolio performance tracking |
| `dataSync.routes` | `/api` | Sync market data from external APIs |

**External APIs** used:
- **Twelve Data** — real-time stock prices
- **Finnhub** — market news & sentiment
- **FRED** — macro indicators (GDP, CPI, rates)
- **NewsData** — global news feed
- **MongoDB Atlas** — persistent storage
- **OpenRouter** — LLM API access

### 4. Next.js Dashboard — `dashboard/`

Frontend built with Next.js + TypeScript + TailwindCSS:
- Portfolio overview & holdings visualization
- Real-time news feed with impact annotations
- Risk metrics dashboard (VaR, volatility, concentration)
- Alert management interface
- Chat interface to query the AI agent

### 5. ML Notebooks — `ml_notebooks/`

Jupyter notebooks for training the 3 deployed models:

| Notebook | Model | Deployment |
|----------|-------|------------|
| `event_impact_classifier.ipynb` | News headline → sector impacts + confidence | HF Space: `pranavdeshmukh-event-impact` |
| `portfolio_risk_scorer.ipynb` | Sector weights → risk score (0–100) + category | HF Space: `pranavdeshmukh-portfolio-risk-score` |
| *(volatility notebook)* | Sector weights + portfolio value → GARCH VaR | HF Space: `pranavdeshmukh-volatility-var` |

---

## 🔄 End-to-End Data Flow

```
1. NEWS INGESTION
   External APIs → Deduplicate → Normalize → Store in DB

2. ANALYTICS ENGINE
   News Events → [ML Event Classifier] → Sector Impacts per event
                                        ↓
   Sector Impacts → [Quant Aggregation] → Dampened + Regime-adjusted signals
                                        ↓
   Per Client → [Portfolio Impact] → Dollar/% impact per holding
             → [ML GARCH Model]   → VaR 95/99, CVaR, Volatility
             → [ML Risk Scorer]   → Risk Score 0-100, Category
             → [Simulated Returns] → Beta, Max Drawdown, Concentration

3. AI AGENT (GPT-4)
   Receives structured analytics JSON
   → Reasons about which clients need attention
   → Calls tools (lookup portfolio, check risk, draft email)
   → Generates prioritized alerts with specific recommendations

4. DASHBOARD
   Displays alerts, risk metrics, portfolio impacts
   Advisor can chat with agent for deeper analysis
```

---

## 🧠 Key Technical Highlights

1. **ML-First with Graceful Degradation**: Every ML call has a rule-based fallback — the system never fails, just degrades gracefully
2. **3 Custom ML Models** deployed as Gradio APIs on HuggingFace Spaces, called via async 2-step (submit → poll) pattern
3. **Quant-Grade Aggregation**: Square-root dampening + macro regime detection prevents unrealistic compounding of correlated signals
4. **Realistic Risk Modeling**: Proper financial formulas — historical VaR with interpolation, CAPM beta, HHI concentration, max drawdown
5. **Autonomous Agent Loop**: GPT-4 with tool-calling decides what actions to take based on structured analytics (not raw text)
6. **Full-Stack**: Next.js dashboard ↔ Express API ↔ MongoDB ↔ AI Agent ↔ HuggingFace ML models

---

## 📊 Suggested PPT Slide Structure

1. **Problem Statement** — Wealth managers can't monitor 100s of portfolios against breaking news in real-time
2. **Solution Overview** — PortfolioIQ: AI agent that watches news, quantifies impact, and alerts proactively
3. **Architecture Diagram** — (use the diagram above)
4. **ML Models** — 3 models, training approach, deployment on HF Spaces
5. **Analytics Engine** — Event classification → Portfolio impact → VaR/Risk → Aggregation
6. **AI Agent** — GPT-4 tool-calling loop, structured reasoning
7. **Dashboard Demo** — Screenshots of the Next.js frontend
8. **Technical Stack** — Node.js, Next.js, Express, MongoDB, HuggingFace, OpenRouter/GPT-4
9. **Results / Demo** — Live pipeline run showing news → alerts
10. **Future Work** — Real brokerage integration, more ML models, backtesting

---

## ✅ What's Working

- Full news ingestion pipeline with deduplication
- ML event classification with keyword fallback
- Quant aggregation with dampening and regime detection
- Per-client portfolio impact calculation
- VaR, CVaR, volatility, beta, drawdown, concentration metrics
- 3 ML models deployed on HuggingFace Spaces (Event Impact, Risk Scorer, Volatility/VaR)
- GPT-4 agent loop with tool calling
- Interactive chat with advisor-facing tools (stress tests, portfolio lookup, risk analysis)
- MongoDB persistence for events, alerts, insights, pipeline runs
- Next.js dashboard with tabs for portfolio, news, alerts, risk, chat
- Express API server with portfolio, news, risk, macro, performance routes

---

## 🚧 Known Limitations & Future Work

See `TODO.md` for the full list. Key items:

- **Bugs**: Bearish sentiment hint ignored in fallback, pipeline run counters always zero, SSL disabled globally
- **Missing Quant Features**: Monte Carlo simulation, correlation shock analysis, factor exposure analysis
- **Dashboard**: No charts/visualizations yet, no chat persistence, no alert filtering
- **Production**: No authentication, no CI/CD, no Docker containerization
- **Governance**: No audit logging, no compliance review workflow, no explainability layer

---

## 🛠️ Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js, TypeScript, TailwindCSS |
| Backend API | Express.js, TypeScript |
| AI Agent | Node.js, OpenRouter (GPT-4), Tool-calling |
| ML Models | Python, scikit-learn, GARCH, Gradio, HuggingFace Spaces |
| Database | MongoDB Atlas |
| External Data | Twelve Data, Finnhub, FRED, NewsData |
| Deployment | HuggingFace Spaces (ML), local dev (app) |