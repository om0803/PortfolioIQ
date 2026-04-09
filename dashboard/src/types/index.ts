// ── TypeScript types for the LPL Advisor Dashboard ──────────────────

export interface Alert {
  _id: string;
  client_id: string;
  severity: "CRITICAL" | "WARNING" | "MONITOR";
  title: string;
  description: string;
  suggested_action?: string;
  related_event?: string;
  status: "active" | "dismissed";
  created_at: string;
}

export interface Insight {
  _id: string;
  client_id: string;
  summary: string;
  impact_analysis: string;
  risk_assessment: string;
  recommendations: string;
  talking_points: string[] | string;
  urgency: "high" | "medium" | "low";
  created_at: string;
}

export interface PipelineRun {
  _id: string;
  started_at: string;
  completed_at?: string;
  status: "running" | "completed" | "failed";
  news_count: number;
  alerts_created: number;
  insights_created: number;
  agent_summary?: string;
  agent_iterations?: number;
  duration_seconds?: number;
  error?: string;
}

export interface Client {
  client_id: string;
  name: string;
  portfolio_value: number;
  risk_tolerance: string;
}

export interface Holding {
  ticker: string;
  name: string;
  sector: string;
  weight_pct: number;
  value: number;
  beta: number;
}

export interface RiskMetrics {
  var_95: number;
  var_99: number;
  cvar_95: number;
  volatility_pct: number;
  vol_source: string;
  beta: number;
  max_drawdown_pct: number;
  risk_score: number;
  risk_category: string;
  risk_level: string;
  risk_source: string;
  risk_drivers: string[];
  hhi: number;
  effective_assets: number;
  top_3_concentration_pct: number;
  sector_exposure: Record<string, number>;
}

export interface ClientDetails {
  client_id: string;
  name: string;
  age: number;
  portfolio_value: number;
  risk_tolerance: string;
  time_horizon_years: number;
  holdings: Holding[];
  sector_breakdown: Record<string, number>;
  risk_metrics: RiskMetrics;
  alerts: Alert[];
  insights: Insight[];
}

export type TabId = "dashboard" | "alerts" | "insights" | "runs";

export interface AnalyticsSnapshot {
  _id: string;
  client_id: string;
  client_name: string;
  portfolio_value: number;
  risk_tolerance: string;
  total_impact_pct: number;
  total_impact_dollar: number;
  effective_impact_pct: number;
  exceeds_threshold: boolean;
  var_metrics: {
    var_95: number;
    var_99: number;
    cvar_95: number;
    volatility_pct: number;
    vol_source: string;
    beta: number;
    max_drawdown_pct: number;
    risk_score: number;
    risk_category: string;
    risk_level: string;
    risk_source: string;
    risk_drivers: string[];
    hhi: number;
    effective_assets: number;
    top_3_concentration_pct: number;
    sector_exposure: Record<string, number>;
  };
  created_at: string;
}
