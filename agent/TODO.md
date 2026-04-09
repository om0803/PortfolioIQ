# PortfolioIQ — What's Remaining

> Updated after full codebase audit. See `WHAT_WORKS.md` for everything functional.

---

## 🐛 Bugs to Fix (Quick Wins)

### 1. Bearish Sentiment Hint Ignored
- **File:** `analytics_engine.js` — `classifyEvent()` sentiment loop
- **Issue:** The `raw_sentiment_hint` field on news events is never used. The loop body is empty — bearish events score identically to bullish ones with the same keywords.
- **Fix:** When `raw_sentiment_hint === "bearish"`, amplify negative sector impacts by ~1.3× and dampen positive ones by ~0.7×. Inverse for `"bullish"`.
- **Effort:** 15 min

### 2. Pipeline Run Counters Always Zero
- **File:** `pipeline.js`
- **Issue:** `alerts_created` and `insights_created` are initialized to `0` but never incremented. Dashboard Pipeline Runs tab always shows "0 alerts, 0 insights."
- **Fix:** After agent finishes, query DB for records created after `startedAt` and set the counts.
- **Effort:** 15 min

### 3. SSL Disabled Globally
- **File:** `agent.js` (line 9)
- **Issue:** `NODE_TLS_REJECT_UNAUTHORIZED = "0"` disables SSL for the entire Node process.
- **Fix:** Scope to a custom HTTPS agent used only for OpenRouter fetch calls, or remove once corporate proxy issue is resolved.
- **Effort:** 15 min

### 4. fetchPipelineRuns Limit Not Passed
- **File:** `dashboard/src/lib/api.ts` — `fetchPipelineRuns()`
- **Issue:** The function accepts a `limit` param but never appends it to the URL query string.
- **Fix:** Add `?limit=${limit}` to the fetch URL.
- **Effort:** 2 min

### 5. No `.env.example`
- **Issue:** Project requires `OPENROUTER_API_KEY` and `MONGODB_URI` but there's no example file.
- **Fix:** Create `agent/.env.example` with placeholder values.
- **Effort:** 2 min

---

## 🔧 Missing Quant Engines in Pipeline

> **Note:** Stress tests exist as a **chat tool** (5 scenarios via `run_stress_test` in `chat_tools.js`), but they are NOT part of the automated pipeline. The analytics engine never runs stress tests, Monte Carlo, or correlation shocks — the agent never sees these results during automated runs.

### 1. Stress Tests → Pipeline Integration
- **Status:** ✅ Available in chat, ❌ Missing from pipeline
- **What's needed:** Run stress tests in `analytics_engine.js` during pipeline, include results in the analytics output passed to the agent so it can proactively warn clients.
- **Effort:** 1 hr

### 2. Monte Carlo Simulation
- **Status:** ❌ Not implemented anywhere
- **What:** 1,000 random future paths per client using log-normal returns.
- **Math:** `drift = μ - σ²/2`, compound `exp(drift + σ × Z)` for `years × 252` days.
- **Output:** P10, P25, Median, P75, P90 terminal values, probability of positive outcome.
- **Where:** Add to `analytics_engine.js` + new chat tool.
- **Effort:** 1–2 hrs

### 3. Correlation Shock Analysis
- **Status:** ❌ Not implemented anywhere
- **What:** Test diversification failure when sector correlations spike.
- **Math:** Increase off-diagonal covariance entries (e.g., tech correlation 0.6 → 0.9), recompute portfolio volatility.
- **Output:** Portfolio vol change under stressed correlations.
- **Effort:** 1–2 hrs

### 4. Factor Exposure Analysis
- **Status:** ❌ Not implemented anywhere
- **What:** Fama-French style factor decomposition (market, value, momentum, size, quality).
- **Math:** OLS regression of portfolio returns on factor returns.
- **Output:** Factor loadings per client.
- **Effort:** 2–3 hrs

---

## 📊 Dashboard Features Missing

### 1. Charts & Visualizations
- **Issue:** No charts anywhere — KPI cards show numbers but no trends over time, no portfolio pie charts, no VaR distributions.
- **What's needed:** Recharts or Chart.js integration for:
  - Portfolio allocation pie/donut chart per client
  - Stress test impact bar chart
  - Monte Carlo fan chart (percentile bands over time)
  - Risk heatmap across clients
  - Alert trend over time
- **Effort:** 3–5 hrs

### 2. Chat Persistence
- **Issue:** Chat messages are lost on page refresh. Only server-side conversation history (last 10 turns per session) exists, but no persistence across browser reloads.
- **Fix:** Save messages to `localStorage` or a new MongoDB collection.
- **Effort:** 1 hr

### 3. Alert Filtering & Sorting
- **Issue:** AlertsTab shows all alerts unsorted with no filtering. No way to filter by severity, client, or date.
- **Fix:** Add filter chips (by severity, by client) and sort dropdown (newest, highest severity).
- **Effort:** 1 hr

### 4. Client Detail Page
- **Issue:** No dedicated view for a single client showing their full portfolio, all insights, alerts, and risk metrics in one place.
- **Fix:** New route or modal with portfolio breakdown, historical insights timeline, alert history.
- **Effort:** 2–3 hrs

### 5. Responsive / Mobile Layout
- **Issue:** Dashboard is desktop-only. 65/35 split and horizontal tabs don't work on mobile.
- **Fix:** Tailwind responsive breakpoints, collapsible chat panel, stacked layout on small screens.
- **Effort:** 2 hrs

---

## 🤖 ML Models to Replace Simulated Logic

Currently rule-based. These are the real ML models described in `prompt.md`.

### 1. Event Impact Classifier (currently: keyword lookup)
- **Current:** `SECTOR_IMPACT_RULES` — string matching keywords to sector impacts.
- **Real:** XGBoost/GradientBoosting on TF-IDF features + historical price reactions.
- **Stack:** Python scikit-learn, deploy via API or SageMaker endpoint.

### 2. Volatility Forecasting (currently: seeded PRNG)
- **Current:** VaR uses synthetic seeded returns. No actual volatility forecast.
- **Real:** GARCH(1,1) / EGARCH on 1-year daily returns per ticker.
- **Stack:** Python `arch` library.

### 3. Risk Scoring (currently: threshold comparison)
- **Current:** Checks if impact exceeds risk tolerance threshold.
- **Real:** RandomForest on 12+ features (beta, sector exposure, drawdown, Sharpe, age, horizon, vol).
- **Output:** Risk score 0–100 per client + feature importances.

### 4. Anomaly Detection (not implemented)
- **Real:** Isolation Forest or Z-score on portfolio return residuals (30-day rolling).
- **Output:** Flag unusual moves — "Gold -4% today = 3σ event."

### 5. Regime Detection (currently: keyword rules)
- **Current:** `detectRegime()` matches trigger keywords to preset regimes.
- **Real:** Hidden Markov Model on returns + volatility (3 states: low/med/high vol).

---

## 📡 Production Data Feeds (Currently All Simulated)

| Feed | Current | Production |
|------|---------|------------|
| News | `NEWS_POOL` array (12 events) | Bloomberg, Reuters, Alpha Vantage News API |
| Market data | Seeded PRNG returns | Alpha Vantage, Yahoo Finance, Polygon.io |
| Portfolio holdings | Static `CLIENTS` array (5 clients) | Custodian API / Wealthbox / Orion CRM |
| Macro calendar | Not implemented | Fed API, economic calendar feeds |
| Earnings/events | Baked into news pool | Earnings whisper API, SEC EDGAR |

---

## 🛡️ Governance & Compliance (Not Started)

- [ ] **Audit log writer** — log every agent decision with reasoning
- [ ] **Source citation tracker** — attach news sources to every insight
- [ ] **Human approval workflow** — advisor approves before client-facing comms
- [ ] **Threshold and cooldown rules** — don't spam alerts on same event
- [ ] **Model monitoring and fallback** — detect when ML models degrade
- [ ] **Explainability layer** — show why each recommendation was made (FINRA req)

---

## 💬 Communication Tools (Not Started)

- [ ] **Advisor summary generator** — daily digest email/report
- [ ] **Client-friendly explanation generator** — plain English for clients
- [ ] **Meeting prep note generator** — pre-meeting brief per client
- [ ] **Compliance review draft generator** — reviewable notes for compliance team

---

## 🔐 Production Infrastructure (Not Started)

- [ ] **Authentication** — login for advisors (OAuth / SSO)
- [ ] **Authorization** — role-based access (advisor sees own clients only)
- [ ] **HTTPS / TLS** — proper SSL certificates
- [ ] **Rate limiting** — protect API from abuse
- [ ] **Error monitoring** — Sentry or similar
- [ ] **Database backups** — scheduled MongoDB snapshots
- [ ] **CI/CD** — automated testing + deployment pipeline
- [ ] **Docker** — containerize backend + frontend

---

## Priority Order (Recommended)

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Fix bugs (bearish sentiment, pipeline counters, fetchPipelineRuns) | 30 min | 🟢 Low effort, removes wrong data |
| 2 | Add `.env.example` | 2 min | 🟢 Dev experience |
| 3 | Add stress tests to pipeline (already in chat) | 1 hr | 🟡 Agent gives proactive warnings |
| 4 | Charts & visualizations (Recharts) | 3–5 hrs | 🔴 Major UX upgrade |
| 5 | Monte Carlo simulation | 1–2 hrs | 🟡 Key quant feature |
| 6 | Chat persistence | 1 hr | 🟡 UX improvement |
| 7 | Alert filtering & sorting | 1 hr | 🟡 UX improvement |
| 8 | Correlation shocks | 1–2 hrs | 🟡 Risk analysis depth |
| 9 | Factor exposure analysis | 2–3 hrs | 🟡 Portfolio decomposition |
| 10 | Client detail page | 2–3 hrs | 🟡 Single-client deep dive |
| 11 | ML model swap-in | Days/weeks | 🔴 Production quality |
| 12 | Governance/compliance | Days | 🔴 Production requirement |
| 13 | Production infrastructure | Days | 🔴 Deployment readiness |
