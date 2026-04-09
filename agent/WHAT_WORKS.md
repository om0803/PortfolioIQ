# PortfolioIQ — What Works

Everything listed here is **functional, tested, and usable** in the current codebase.

---

## 1. End-to-End Pipeline (Fully Working)

The complete 3-step pipeline runs reliably via manual trigger or 3-hour scheduler:

```
News Ingestion → Analytics Engine → AI Agent → MongoDB → Dashboard
```

- **Trigger:** `POST /api/pipeline/run` or automatic every 3 hours
- **Duration:** ~60–270s depending on LLM speed (free-tier model)
- **Output:** Per-client insights + alerts saved to MongoDB, visible in dashboard

### Pipeline Components

| Component | File | Status | What It Does |
|-----------|------|--------|--------------|
| News Ingestion | `news_ingestion.js` | ✅ Working (simulated) | Pool of 12 realistic financial events, random batch of 2–4 per run |
| Analytics Engine | `analytics_engine.js` | ✅ Working | Keyword→sector classification, per-client portfolio impact, VaR, quant aggregation |
| AI Agent | `agent.js` | ✅ Working | OpenRouter LLM with tool-calling loop (up to 15 iterations), creates insights + alerts |
| Pipeline Tools | `tools.js` | ✅ Working | 3 tools: `get_client_portfolio`, `save_client_insight`, `create_alert` |
| Pipeline Orchestrator | `pipeline.js` | ✅ Working | Chains all steps, saves run metadata, handles errors |

---

## 2. Analytics Engine — Quant Layer (Fully Working)

All pre-computation happens before the LLM sees any data:

### Event Classification (`classifyEvent`)
- 30+ keyword→sector impact rules (oil, fed, china, tariff, tech, pandemic, etc.)
- Confidence scoring (0–95%) based on keyword match count + event category
- Severity assignment (HIGH / MEDIUM / LOW)
- Sentiment classification (BULLISH / BEARISH / MIXED)

### Portfolio Impact (`computePortfolioImpact`)
- Maps sector impacts to each client's specific holdings (weighted sum)
- Computes raw impact, confidence-weighted effective impact, and dollar impact
- Per-holding breakdown (which ticker contributed how much)
- Risk threshold breach detection per client risk tolerance (conservative ±2%, moderate ±5%, aggressive ±10%)

### Value at Risk (`computeVaR`)
- Parametric VaR with seeded PRNG (500 simulated returns per holding)
- VaR(95%), VaR(99%), and CVaR(95%) per client
- Per-holding beta-adjusted return simulation

### Quant Aggregation (in `runAnalytics`)
- **Square-root dampening** — prevents sector impact explosion from correlated events (realistic diminishing marginal impact)
- **Regime detection** — identifies macro states: risk_off, rate_tightening, rate_easing, energy_shock (with conflict resolution)
- **Sector caps** — no sector can exceed 15–18% impact from one batch
- **Client sorting** — orders clients by absolute impact (most affected first)

---

## 3. AI Agent — LLM with Tools (Fully Working)

### Pipeline Agent (`agent.js`)
- Agentic tool-calling loop using OpenRouter (`nvidia/nemotron-3-super-120b-a12b:free`)
- Rich system prompt with alert guidelines (CRITICAL >8%, WARNING 3–8%, MONITOR 1–3%)
- `buildPrompt()` constructs detailed context from analytics: event metrics, sector impacts, per-client breakdowns, VaR, threshold violations
- Agent fetches portfolios, writes per-client insights, and creates alerts when thresholds are breached
- Max 15 iterations with graceful termination

### Chat Agent (SSE — `server.js` + `chat_tools.js`)
- **Agentic chat** with Server-Sent Events streaming over POST `/api/chat`
- LLM picks tools on-demand based on advisor's question
- **6 tools available:**

| Tool | What It Does |
|------|-------------|
| `get_client_portfolio` | Full holdings with sector breakdown + VaR metrics |
| `get_client_insights` | Latest AI-generated insights from MongoDB |
| `get_client_alerts` | Active alerts for a client |
| `get_all_clients_summary` | All 5 clients at a glance (AUM, risk, top sectors) |
| `get_recent_news` | Most recent ingested news events from DB |
| `run_stress_test` | 5 historical scenarios (2008, COVID, 2022, oil spike, tech selloff) or all at once |

- **SSE event stream:** `tool_call` → `tool_result` → `response` → `done`
- Supports conversation history (last 10 turns)
- Client context hint when advisor has a client selected

---

## 4. Database Layer (Fully Working)

MongoDB with 4 collections, all indexed:

| Collection | Indexes | CRUD |
|-----------|---------|------|
| `insights` | client_id, created_at | ✅ save, query (with client filter + limit) |
| `alerts` | client_id, status, created_at | ✅ save, query (active/all), dismiss |
| `pipeline_runs` | started_at | ✅ save, query (sorted by recency) |
| `news_events` | batch_id, timestamp | ✅ save, query (sorted by recency) |

- Singleton connection pattern with lazy initialization
- Proper ObjectId handling for dismiss operations

---

## 5. REST API (Fully Working)

All endpoints work and are consumed by the dashboard:

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| GET | `/api/insights?client_id=&limit=` | Fetch insights (filterable) |
| GET | `/api/alerts?all=true` | Fetch alerts (active or all) |
| POST | `/api/alerts/:id/dismiss` | Dismiss an alert |
| GET | `/api/clients` | List all clients |
| GET | `/api/pipeline-runs` | Pipeline run history |
| POST | `/api/pipeline/run` | Trigger pipeline manually |
| POST | `/api/chat` | SSE agentic chat (streamed) |

---

## 6. Next.js Dashboard (Fully Working)

**Stack:** Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + lucide-react + react-markdown

### Pages & Components

| Component | What It Does |
|-----------|-------------|
| `TopBar` | Blue navbar with logo, tab navigation, status dot, "Run Pipeline" button |
| `DashboardTab` | 4 KPI cards (active alerts, high risk clients, total AUM, last pipeline) + Client Risk Leaderboard table |
| `AlertsTab` | All alerts with severity badges, descriptions, suggested actions, dismiss buttons |
| `InsightsTab` | 65/35 split — insight cards (left) + AI chat panel (right). Client filter chips. Article-style insight cards with icons for Impact/Risk/Recommendations/Talking Points |
| `PipelineRunsTab` | Pipeline run history with status, event count, duration, agent summary |
| `ChatPanel` | Full agentic chat: SSE streaming, tool-call visualization (spinner → checkmark), Markdown rendering, suggested prompts, context-switch dividers |
| `EmptyState` | Placeholder when no data exists |

### Dashboard Features
- **Auto-refresh** every 30 seconds
- **Pipeline trigger** with 2s polling until completion (max 2 min)
- **Client filter chips** on insights tab — control both insights feed and chat context
- **Markdown rendering** of AI responses (headers, bold, lists, code, blockquotes)
- **Tool step visualization** — while the agent works, each tool call shows with an icon + summary + spinner → checkmark
- **SSE proxy** — `dashboard/src/app/api/chat/route.ts` pipes SSE stream unbuffered from Express backend (bypasses Next.js rewrite buffering)

### API Client (`api.ts`)
- Typed fetch wrappers for all REST endpoints
- `streamChatMessage()` — SSE ReadableStream consumer with callbacks: `onToolCall`, `onToolResult`, `onResponse`, `onError`, `onDone`
- Returns AbortController for cancellation

---

## 7. Data Layer (Simulated but Complete)

### Clients (`sample_data.js`)
5 diverse client profiles:

| Client | Age | AUM | Risk | Time Horizon | Key Holdings |
|--------|-----|-----|------|-------------|-------------|
| C001 Margaret Chen | 58 | $1M | Moderate | 12yr | Balanced across 10 sectors |
| C002 Robert Mitchell | 45 | $550K | Aggressive | 20yr | 55% tech heavy |
| C003 James & Patricia Wong | 68 | $2.2M | Conservative | 5yr | Bond/healthcare heavy |
| C004 Marcus Johnson | 35 | $220K | Aggressive | 30yr | 71% tech concentrated |
| C005 Sarah Navarro | 52 | $875K | Moderate | 15yr | Well diversified |

### Tickers
15 securities across 8 sectors with realistic beta values (MSFT, AAPL, NVDA, AMZN, JPM, GS, JNJ, PFE, XOM, CVX, BND, AGG, GLD, VEA, VWO)

### News Pool
12 diverse financial events: China-Taiwan conflict, JPMorgan lending pullback, Treasury inversion, Pfizer drug breakthrough, India Russia sanctions, Microsoft cloud miss, Fed emergency cut, OPEC production cut, Gold surge, German depression, US tech tariffs, Exxon oil discovery

---

## 8. Stress Testing (Working via Chat Tool)

5 predefined historical crisis scenarios available through the chat agent:

| Scenario | Tech | Finance | Healthcare | Energy | Bonds | Intl | Commodities |
|----------|------|---------|-----------|--------|-------|------|------------|
| 2008 Financial Crisis | -40% | -55% | -20% | -35% | +8% | -45% | -25% |
| COVID Crash (Mar 2020) | -25% | -30% | +5% | -50% | +5% | -35% | -20% |
| 2022 Rate Shock | -30% | -20% | -8% | +15% | -15% | -25% | +5% |
| Oil Spike (+50%) | -8% | -5% | -3% | +40% | -5% | -15% | +25% |
| Tech Selloff (-25%) | -25% | -10% | 0% | +5% | +3% | -8% | +2% |

- Computes per-client portfolio impact ($) for each scenario
- Can run individual scenario or all 5 at once

---

## 9. Developer Experience

- `npm start` — runs the Express server
- `npm run dev` — runs with `--watch` for auto-reload
- `npm run pipeline` — one-off pipeline run via CLI
- `npx next dev` (in dashboard/) — starts the Next.js dev server
- CORS enabled for local development
- Clean console logging throughout pipeline and chat
