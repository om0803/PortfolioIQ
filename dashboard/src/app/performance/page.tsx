"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchClients, fetchClientSnapshots } from "@/lib/api";
import type { Client, AnalyticsSnapshot } from "@/types";
import TopBar from "@/components/TopBar";
import type { TabId } from "@/types";
import { useRouter } from "next/navigation";
import { Loader2, TrendingUp, Users } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from "recharts";

/* ── Helpers ─────────────────────────────────────────────────────── */

function fmt$(n: number) {
  if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
  return "$" + n.toLocaleString();
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

const RISK_COLOR: Record<string, string> = {
  LOW: "#10b981",
  MODERATE: "#f59e0b",
  HIGH: "#ef4444",
  CRITICAL: "#991b1b",
};

/* ── Chart Tooltip ───────────────────────────────────────────────── */

interface TooltipPayloadEntry {
  color: string;
  name: string;
  value: number;
  unit?: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  prefix = "",
  suffix = "",
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
  prefix?: string;
  suffix?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-xs">
      <p className="mb-1 font-medium text-slate-600">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="font-mono">
          {entry.name}: {prefix}
          {typeof entry.value === "number" ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : entry.value}
          {suffix}
        </p>
      ))}
    </div>
  );
}

/* ── Page Component ──────────────────────────────────────────────── */

export default function PerformancePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<AnalyticsSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  // Load clients on mount
  useEffect(() => {
    fetchClients()
      .then((cls) => {
        setClients(cls);
        if (cls.length > 0 && !selectedClientId) {
          setSelectedClientId(cls[0].client_id);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load snapshots when selected client changes
  useEffect(() => {
    if (!selectedClientId) return;
    setChartLoading(true);
    fetchClientSnapshots(selectedClientId, 20)
      .then((snaps) => {
        // Sort oldest first for chronological chart
        setSnapshots([...snaps].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
      })
      .catch(() => setSnapshots([]))
      .finally(() => setChartLoading(false));
  }, [selectedClientId]);

  const handleTabChange = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      router.push("/");
    },
    [router]
  );

  // Build chart data from snapshots
  const chartData = snapshots.map((s, i) => ({
    run: `Run ${i + 1}`,
    date: fmtDate(s.created_at),
    var_95: s.var_metrics.var_95,
    var_99: s.var_metrics.var_99,
    cvar_95: s.var_metrics.cvar_95,
    volatility: s.var_metrics.volatility_pct,
    beta: s.var_metrics.beta,
    risk_score: s.var_metrics.risk_score,
    max_drawdown: Math.abs(s.var_metrics.max_drawdown_pct),
    impact_pct: s.total_impact_pct,
    impact_dollar: s.total_impact_dollar,
    hhi: s.var_metrics.hhi,
    top3: s.var_metrics.top_3_concentration_pct,
  }));

  const selectedClient = clients.find((c) => c.client_id === selectedClientId);
  const latestSnap = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <TopBar
        status="Ready"
        running={false}
        onRun={() => {}}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <div className="flex h-[calc(100vh-44px)]">
        {/* ── Left Sidebar: Client List ──────────────────────────── */}
        <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              <Users className="h-3.5 w-3.5" /> Clients
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
            </div>
          ) : (
            <nav className="py-1">
              {clients.map((c) => (
                <button
                  key={c.client_id}
                  onClick={() => setSelectedClientId(c.client_id)}
                  className={`w-full px-4 py-3 text-left transition-all border-l-[3px] ${
                    selectedClientId === c.client_id
                      ? "border-l-indigo-500 bg-indigo-50/60"
                      : "border-l-transparent hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`text-sm font-medium ${
                      selectedClientId === c.client_id ? "text-indigo-700" : "text-slate-700"
                    }`}
                  >
                    {c.name}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="font-mono">{c.client_id}</span>
                    <span>·</span>
                    <span>{fmt$(c.portfolio_value)}</span>
                    <span>·</span>
                    <span className="capitalize">{c.risk_tolerance}</span>
                  </div>
                </button>
              ))}
            </nav>
          )}
        </aside>

        {/* ── Right: Charts ──────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto px-6 py-5">
          {!selectedClientId ? (
            <div className="flex h-full items-center justify-center text-slate-400">
              Select a client to view performance
            </div>
          ) : chartLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
              <span className="ml-2 text-slate-500">Loading data...</span>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <TrendingUp className="h-10 w-10 mb-3 text-slate-300" />
              <p className="text-sm">No pipeline run data yet for {selectedClient?.name}.</p>
              <p className="text-xs mt-1">Run the pipeline to generate analytics snapshots.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {selectedClient?.name}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {snapshots.length} pipeline run{snapshots.length !== 1 ? "s" : ""} tracked
                    {latestSnap && (
                      <span>
                        {" "}· Latest: {fmtDate(latestSnap.created_at)}
                        {" "}· Risk Score:{" "}
                        <span
                          className="font-semibold"
                          style={{ color: RISK_COLOR[latestSnap.var_metrics.risk_category] || "#64748b" }}
                        >
                          {latestSnap.var_metrics.risk_score} ({latestSnap.var_metrics.risk_category})
                        </span>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid gap-5 lg:grid-cols-2">

                {/* 1. Risk Score Over Time */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    ML Risk Score
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <Tooltip content={<ChartTooltip suffix="/100" />} />
                      <Area type="monotone" dataKey="risk_score" stroke="#6366f1" strokeWidth={2} fill="url(#riskGrad)" name="Risk Score" dot={{ r: 3, fill: "#6366f1" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 2. VaR Over Time */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Value at Risk ($)
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v: number) => fmt$(v)} />
                      <Tooltip content={<ChartTooltip prefix="$" />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="var_95" stroke="#ef4444" strokeWidth={2} name="VaR 95%" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="var_99" stroke="#991b1b" strokeWidth={2} name="VaR 99%" dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="cvar_95" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" name="CVaR" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 3. Volatility & Beta */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Volatility & Beta
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis yAxisId="vol" tick={{ fontSize: 10 }} stroke="#8b5cf6" tickFormatter={(v: number) => v + "%"} />
                      <YAxis yAxisId="beta" orientation="right" tick={{ fontSize: 10 }} stroke="#0ea5e9" domain={[0, 2]} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line yAxisId="vol" type="monotone" dataKey="volatility" stroke="#8b5cf6" strokeWidth={2} name="Volatility %" dot={{ r: 3 }} />
                      <Line yAxisId="beta" type="monotone" dataKey="beta" stroke="#0ea5e9" strokeWidth={2} name="Beta" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 4. Portfolio Impact */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Portfolio Impact per Run
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="impactPos" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v: number) => v + "%"} />
                      <Tooltip content={<ChartTooltip suffix="%" />} />
                      <Area type="monotone" dataKey="impact_pct" stroke="#10b981" strokeWidth={2} fill="url(#impactPos)" name="Impact %" dot={{ r: 3, fill: "#10b981" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 5. Max Drawdown */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Max Drawdown
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" tickFormatter={(v: number) => v + "%"} />
                      <Tooltip content={<ChartTooltip suffix="%" />} />
                      <Area type="monotone" dataKey="max_drawdown" stroke="#ef4444" strokeWidth={2} fill="url(#ddGrad)" name="Max Drawdown %" dot={{ r: 3, fill: "#ef4444" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* 6. Concentration */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                    Concentration Metrics
                  </h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94a3b8" />
                      <YAxis yAxisId="pct" tick={{ fontSize: 10 }} stroke="#f59e0b" domain={[0, 100]} tickFormatter={(v: number) => v + "%"} />
                      <YAxis yAxisId="hhi" orientation="right" tick={{ fontSize: 10 }} stroke="#64748b" domain={[0, 0.5]} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line yAxisId="pct" type="monotone" dataKey="top3" stroke="#f59e0b" strokeWidth={2} name="Top 3 %" dot={{ r: 3 }} />
                      <Line yAxisId="hhi" type="monotone" dataKey="hhi" stroke="#64748b" strokeWidth={2} name="HHI" dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
