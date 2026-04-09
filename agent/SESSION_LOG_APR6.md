# PortfolioIQ — Session Log: April 6, 2026

## ML Models Built (Colab Notebooks)

### 1. Event Impact Classifier (started previous session, iterated today)
- **File:** `ml_notebooks/event_impact_classifier.ipynb`
- **What:** Predicts % impact on 7 sectors from news headlines
- **V1 (TF-IDF):** Failed — all novel headlines predicted neutral (0% generalization)
- **V2 (Sentence Embeddings):** Switched to `all-MiniLM-L6-v2` (384-dim vectors) + XGBoost
- **Result:** ~60-70% useful — correct directions, dampened magnitudes. Real data will improve.
- **Exports:** `impact_model.joblib`, `confidence_model.joblib`, `metadata.json`

### 2. Portfolio Risk Scorer ✅ NEW
- **File:** `ml_notebooks/portfolio_risk_scorer.ipynb`
- **What:** Given sector allocations → risk score 0-100, category, risk drivers, rebalancing suggestions
- **Formula:** Portfolio variance (Markowitz) + HHI concentration (vol-weighted) + correlation penalty + drawdown + bond hedge bonus + dominance penalty
- **Key fix:** Initial formula was too compressed (max ~45 points). Rewrote to additive scoring with vol-weighted concentration — 100% bonds ≠ 100% energy
- **Event Exposure integration:** Connects Model 1 → Model 2 (sector impacts × portfolio weights = exposure)
- **Exports:** `risk_score_model.joblib`, `risk_category_model.joblib`, `sector_data.json`, `metadata.json`

### 3. Volatility Forecasting (GARCH) ✅ NEW
- **File:** `ml_notebooks/volatility_forecasting.ipynb`
- **What:** GARCH(1,1) on real market data → forward-looking vol forecasts → portfolio VaR
- **Data:** 2 years of daily ETF returns (XLK, XLF, XLE, XLV, AGG, DJP, VEA) via yfinance
- **Features:** Parametric + Monte Carlo VaR, CVaR, stressed VaR (event-adjusted), backtest validation
- **Replaces:** The fake `seededRand(1337)` × 0.018 hardcoded noise in `analytics_engine.js`
- **Key advantage:** Updates daily on fresh data, uses Student-t distribution for fat tails
- **Exports:** `garch_params.json`, `vol_forecasts.json`, `correlation_data.json`, `metadata.json`

## Bugs Fixed

### 1. Bearish Sentiment Hint Ignored ✅
- **File:** `agent/analytics_engine.js`
- **Was:** Empty loop body — bearish events scored identically to bullish
- **Fix:** Bearish → amplify negative impacts ×1.3, dampen positive ×0.7. Bullish → inverse.

### 2. Pipeline Run Counters Always Zero ✅
- **File:** `agent/pipeline.js`
- **Was:** `alerts_created` and `insights_created` initialized to 0, never incremented
- **Fix:** After agent finishes, query DB for records created after `startedAt`

### 3. fetchPipelineRuns Limit Not Passed ✅
- **File:** `dashboard/src/lib/api.ts`
- **Was:** `limit` param accepted but never appended to fetch URL
- **Fix:** Added `?limit=${limit}` to the URL

### 4. Missing .env.example ✅
- **File:** `agent/.env.example`
- **Created:** Placeholder values for `OPENROUTER_API_KEY`, `MONGODB_URI`, `PORT`, `PIPELINE_INTERVAL_HOURS`

## Files Changed/Created Today
```
CREATED:
  ml_notebooks/portfolio_risk_scorer.ipynb    — Risk scoring model notebook
  ml_notebooks/volatility_forecasting.ipynb   — GARCH vol forecasting notebook
  agent/.env.example                          — Environment variable template

MODIFIED:
  agent/analytics_engine.js                   — Fixed bearish sentiment handling
  agent/pipeline.js                           — Fixed pipeline run counters
  dashboard/src/lib/api.ts                    — Fixed fetchPipelineRuns limit param
```

## How the 3 Models Chain Together
```
News headline → Model 1 (Event Impact)  → sector impacts + severity
                                              ↓
Market data   → Model 3 (GARCH Vol)     → base vol forecasts
                                              ↓
                                    stressed vol = base × severity multiplier
                                              ↓
Portfolio     → Model 2 (Risk Score)    → risk_score + risk_drivers
              → Model 3 (GARCH VaR)    → VaR 95/99%, CVaR, stressed VaR
                                              ↓
                                    Dashboard shows combined picture
```

## What's Next
- [ ] Test Model 3 (GARCH) in Colab
- [ ] Remaining models: Regime Detection (HMM), Anomaly Detection (Isolation Forest)
- [ ] Deploy Models 1-3 to AWS SageMaker endpoints
- [ ] Integrate endpoints into `analytics_engine.js` (replace keyword rules + fake VaR)
- [ ] Dashboard charts & visualizations (Recharts)
