"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchClientDetails } from "@/lib/api";
import type { ClientDetails } from "@/types";
import {
  ArrowLeft,
  Shield,
  TrendingDown,
  BarChart3,
  AlertTriangle,
  Lightbulb,
  Activity,
  Target,
  Clock,
  DollarSign,
  Loader2,
} from "lucide-react";

/* ── Helpers ─────────────────────────────────────────────────────── */

function fmt$(n: number) {
  if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toLocaleString();
}

const RISK_COLORS: Record<string, string> = {
  LOW: "text-emerald-600 bg-emerald-50",
  MODERATE: "text-amber-600 bg-amber-50",
  HIGH: "text-red-500 bg-red-50",
  CRITICAL: "text-red-700 bg-red-100",
};

const SECTOR_COLORS: Record<string, string> = {
  tech: "#6366f1",
  financials: "#f59e0b",
  energy: "#ef4444",
  healthcare: "#10b981",
  bonds: "#3b82f6",
  commodities: "#f97316",
  international: "#8b5cf6",
  cash: "#94a3b8",
  other: "#64748b",
};

const SEVERITY_BADGE: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-200",
  WARNING: "bg-amber-50 text-amber-700 border-amber-200",
  MONITOR: "bg-blue-50 text-blue-700 border-blue-200",
};

const URGENCY_BADGE: Record<string, string> = {
  high: "bg-red-50 text-red-600",
  medium: "bg-amber-50 text-amber-600",
  low: "bg-emerald-50 text-emerald-600",
};

/* ── Page Component ──────────────────────────────────────────────── */

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    fetchClientDetails(clientId)
      .then((data) => {
        setClient(data);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-3 text-slate-500">Loading portfolio...</span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <p className="text-red-500">{error || "Client not found"}</p>
        <button onClick={() => router.push("/")} className="mt-4 text-indigo-600 hover:underline">
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  const rm = client.risk_metrics;
  const sortedHoldings = [...client.holdings].sort((a, b) => b.weight_pct - a.weight_pct);
  const sortedSectors = Object.entries(client.sector_breakdown).sort((a, b) => b[1] - a[1]);
  const activeAlerts = client.alerts.filter((a) => a.status === "active");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <button
            onClick={() => router.push("/")}
            className="mb-3 flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-indigo-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{client.name}</h1>
              <div className="mt-1 flex items-center gap-4 text-sm text-slate-500">
                <span className="font-mono text-xs text-slate-400">{client.client_id}</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Age {client.age}</span>
                <span className="flex items-center gap-1"><Target className="h-3.5 w-3.5" /> {client.time_horizon_years}yr horizon</span>
                <span className="capitalize flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> {client.risk_tolerance}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-800">{fmt$(client.portfolio_value)}</div>
              <div className="text-xs text-slate-400">Portfolio Value</div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {/* ── Risk Score + KPI Row ───────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          {/* Risk Score */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">ML Risk Score</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-800">{rm.risk_score}</span>
              <span className="text-sm text-slate-400">/ 100</span>
            </div>
            <span className={`mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase ${RISK_COLORS[rm.risk_category] || "text-slate-500 bg-slate-50"}`}>
              {rm.risk_category}
            </span>
            <div className="mt-1 text-[10px] text-slate-400">via {rm.risk_source === "ml_model" ? "ML Model" : "Rule Fallback"}</div>
          </div>

          {/* VaR 95% */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">VaR (95%)</div>
            <div className="mt-2 text-2xl font-bold text-red-600">{fmt$(rm.var_95)}</div>
            <div className="mt-1 text-[10px] text-slate-400">Daily potential loss</div>
          </div>

          {/* Volatility */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Volatility</div>
            <div className="mt-2 text-2xl font-bold text-amber-600">{rm.volatility_pct}%</div>
            <div className="mt-1 text-[10px] text-slate-400">
              Annualized · {rm.vol_source === "ml_garch" ? "GARCH ML" : "simulated"}
            </div>
          </div>

          {/* Beta */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Beta</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{rm.beta}</div>
            <div className="mt-1 text-[10px] text-slate-400">vs S&P 500</div>
          </div>

          {/* Max Drawdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Max Drawdown</div>
            <div className="mt-2 text-2xl font-bold text-red-500">{rm.max_drawdown_pct}%</div>
            <div className="mt-1 text-[10px] text-slate-400">peak to trough</div>
          </div>
        </div>

        {/* ── Risk Drivers ───────────────────────────────────────────── */}
        {rm.risk_drivers.length > 0 && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" /> Risk Drivers
            </div>
            <div className="flex flex-wrap gap-2">
              {rm.risk_drivers.map((d, i) => (
                <span key={i} className="rounded-full bg-white px-3 py-1 text-xs text-amber-800 shadow-sm border border-amber-200">
                  {d}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Holdings Table ──────────────────────────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-slate-400" />
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Holdings ({client.holdings.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Ticker</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Name</th>
                    <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">Sector</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Weight</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Value</th>
                    <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-400">Beta</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedHoldings.map((h) => (
                    <tr key={h.ticker} className="border-b border-slate-50 transition hover:bg-slate-50">
                      <td className="px-5 py-2.5 font-mono text-sm font-semibold text-indigo-600">{h.ticker}</td>
                      <td className="px-4 py-2.5 text-sm text-slate-600">{h.name}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase text-white"
                          style={{ backgroundColor: SECTOR_COLORS[h.sector] || "#64748b" }}
                        >
                          {h.sector}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-slate-700">{h.weight_pct}%</td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-slate-600">{fmt$(h.value)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-sm text-slate-500">{h.beta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Sector Allocation + Concentration ──────────────────── */}
          <div className="space-y-6">
            {/* Sector Bars */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-400" />
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Sector Allocation</h3>
              </div>
              <div className="space-y-2.5">
                {sortedSectors.map(([sector, pct]) => (
                  <div key={sector}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-medium capitalize text-slate-600">{sector}</span>
                      <span className="font-mono text-xs text-slate-500">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: SECTOR_COLORS[sector] || "#64748b",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Concentration Metrics */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4 text-slate-400" />
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Concentration</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold text-slate-800">{rm.hhi.toFixed(3)}</div>
                  <div className="text-[10px] text-slate-400">HHI Index</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-800">{rm.effective_assets}</div>
                  <div className="text-[10px] text-slate-400">Effective Assets</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-slate-800">{rm.top_3_concentration_pct}%</div>
                  <div className="text-[10px] text-slate-400">Top 3 Holdings</div>
                </div>
              </div>
            </div>

            {/* Advanced Risk Metrics */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-400" />
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Value at Risk</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-red-600">{fmt$(rm.var_95)}</div>
                  <div className="text-[10px] text-slate-400">VaR 95%</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-700">{fmt$(rm.var_99)}</div>
                  <div className="text-[10px] text-slate-400">VaR 99%</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-red-500">{fmt$(rm.cvar_95)}</div>
                  <div className="text-[10px] text-slate-400">CVaR (ES)</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Alerts & Insights Row ──────────────────────────────────── */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Active Alerts */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Alerts ({activeAlerts.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {activeAlerts.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">
                  No active alerts for this client
                </div>
              ) : (
                activeAlerts.map((a) => (
                  <div key={a._id} className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${SEVERITY_BADGE[a.severity] || ""}`}>
                        {a.severity}
                      </span>
                      <span className="text-sm font-medium text-slate-700">{a.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{a.description}</p>
                    {a.suggested_action && (
                      <p className="mt-1 text-xs text-indigo-600">→ {a.suggested_action}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Latest Insights */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                Latest Insights ({client.insights.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              {client.insights.length === 0 ? (
                <div className="px-5 py-8 text-center text-sm text-slate-400">
                  No insights yet. Run the pipeline to generate.
                </div>
              ) : (
                client.insights.slice(0, 3).map((ins) => (
                  <div key={ins._id} className="px-5 py-3.5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${URGENCY_BADGE[ins.urgency] || ""}`}>
                        {ins.urgency}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(ins.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{ins.summary}</p>
                    {ins.recommendations && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">{ins.recommendations}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
