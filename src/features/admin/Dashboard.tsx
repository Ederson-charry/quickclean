import { useKpis, useQuickers } from "@/hooks/queries";
import { StatCard } from "@/components/shared/StatCard";
import { LoadingState, ErrorState } from "@/components/shared/States";
import { RatingStars } from "@/components/shared/RatingStars";
import { cop } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DollarSign, CheckCircle2, Users, Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const DONUT_COLORS = ["#0B5BD6", "#6FA4FF", "#E0453B"];

export default function Dashboard() {
  const { data: kpis, isLoading: kpisLoading, isError: kpisError, refetch: kpisRefetch } = useKpis();
  const { data: quickers, isLoading: quickersLoading } = useQuickers();

  if (kpisLoading) return <LoadingState rows={4} />;
  if (kpisError) return <ErrorState onRetry={kpisRefetch} />;
  if (!kpis) return null;

  const topQuickers = quickers
    ? [...quickers]
        .filter((q) => q.status === "activo")
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 3)
    : [];

  const maxZoneValue = Math.max(...kpis.byZone.map((z) => z.value));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold font-[var(--font-display)] text-ink">
          Indicadores
        </h1>
        <p className="mt-0.5 text-sm text-muted">Panel de control — QuickClean</p>
      </div>

      {/* KPI grid: 4→2→1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={DollarSign}
          value={cop(kpis.revenue)}
          label="Ingresos del mes"
          delta={kpis.revenueDelta}
        />
        <StatCard
          icon={CheckCircle2}
          value={kpis.completed.toLocaleString("es-CO")}
          label="Servicios completados"
          delta={kpis.completedDelta}
        />
        <StatCard
          icon={Users}
          value={kpis.activeQuickers.toLocaleString("es-CO")}
          label="Quickers activos"
        />
        <StatCard
          icon={Star}
          value={kpis.avgRating.toFixed(1)}
          label="Calificación media"
          iconColor="text-yellow-500"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Revenue bar chart */}
        <div className="col-span-1 lg:col-span-2 rounded-xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink mb-4">
            Ingresos por mes <span className="text-xs text-muted font-normal">(millones COP)</span>
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={kpis.revenueByMonth} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6ECF4" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#7B89A3" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#7B89A3" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}M`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #E6ECF4",
                  fontSize: 13,
                  boxShadow: "0 4px 12px rgba(14,27,51,.08)",
                }}
                formatter={(value) => [`$${value}M`, "Ingresos"]}
              />
              <Bar
                dataKey="value"
                fill="#0B5BD6"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink mb-4">Servicios por estado</h2>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={kpis.byStatus}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={76}
                dataKey="value"
                paddingAngle={2}
              >
                {kpis.byStatus.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2">
            {kpis.byStatus.map((item, index) => (
              <div key={item.status} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }}
                    aria-hidden="true"
                  />
                  <span className="text-ink-2">{item.status}</span>
                </div>
                <span className="font-medium text-ink">
                  {item.value.toLocaleString("es-CO")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top Quickers */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink mb-4">Top Quickers</h2>
          {quickersLoading ? (
            <LoadingState rows={3} />
          ) : (
            <ol className="space-y-3" aria-label="Top 3 Quickers mejor calificados">
              {topQuickers.map((q, index) => (
                <li key={q.id} className="flex items-center gap-3">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-600"
                    aria-label={`Puesto ${index + 1}`}
                  >
                    {index + 1}
                  </span>
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-semibold">
                      {q.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{q.name}</p>
                    <p className="text-xs text-muted">{q.zone} · {q.monthlyServices} svc/mes</p>
                  </div>
                  <div className="shrink-0">
                    <RatingStars value={Math.round(q.rating)} readOnly size="sm" />
                    <p className="text-right text-xs text-muted mt-0.5">{q.rating.toFixed(1)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Servicios por zona */}
        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink mb-4">Servicios por zona</h2>
          <div className="space-y-4" role="list" aria-label="Servicios por zona">
            {kpis.byZone.map((item) => {
              const pct = Math.round((item.value / maxZoneValue) * 100);
              return (
                <div key={item.zone} role="listitem">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{item.zone}</span>
                    <span className="text-muted">{item.value.toLocaleString("es-CO")} svc</span>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-brand-50"
                    role="progressbar"
                    aria-label={`${item.zone}: ${pct}%`}
                    aria-valuenow={pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-brand-600 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
