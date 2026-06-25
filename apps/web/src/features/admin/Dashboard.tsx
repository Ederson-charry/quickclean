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
import { DollarSign, CheckCircle2, Users, Star, Building2, Banknote, Receipt, UserRound } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMetrics } from "@/hooks/catalog";
import { EmptyState } from "@/components/shared/States";
import { useSession } from "@/stores/session";

const DONUT_COLORS = ["#0B5BD6", "#6FA4FF", "#E0453B", "#F5A623"];

function MockDashboard() {
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
        <p className="mt-0.5 text-sm text-faint">Panel de control — QuickClean</p>
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
            Ingresos por mes <span className="text-xs text-faint font-normal">(millones COP)</span>
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
                    <p className="text-xs text-ink-2">{q.zone} · {q.monthlyServices} svc/mes</p>
                  </div>
                  <div className="shrink-0">
                    <RatingStars value={Math.round(q.rating)} readOnly size="sm" />
                    <p className="text-right text-xs text-ink-2 mt-0.5">{q.rating.toFixed(1)}</p>
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
                    <span className="text-ink-2">{item.value.toLocaleString("es-CO")} svc</span>
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

// ── Dashboard real (datos del backend) ──────────────────────────────────────────
function MiniStat({ icon: Icon, label, value }: { icon: typeof Banknote; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-faint">
        <Icon className="size-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums text-ink">{value}</p>
    </div>
  );
}

function RealDashboard() {
  const { data: m, isLoading, isError, refetch } = useMetrics(true);

  if (isLoading) return <LoadingState rows={4} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;
  if (!m) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink">Indicadores</h1>
        <p className="mt-0.5 text-sm text-faint">Panel de control — QuickClean</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} value={cop(m.revenueMonth)} label="Ingresos del mes" delta={m.revenueMonthDelta} />
        <StatCard icon={CheckCircle2} value={m.completedMonth.toLocaleString("es-CO")} label="Servicios completados" delta={m.completedDelta} />
        <StatCard icon={Users} value={m.activeQuickers.toLocaleString("es-CO")} label="Quickers activos" />
        <StatCard icon={Star} value={m.avgRating.toFixed(1)} label="Calificación media" iconColor="text-yellow-500" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat icon={UserRound} label="Clientes" value={m.totalClients.toLocaleString("es-CO")} />
        <MiniStat icon={Building2} label="Empresas" value={m.empresas.toLocaleString("es-CO")} />
        <MiniStat icon={Banknote} label="Pendiente por liquidar" value={cop(m.pendingPayout)} />
        <MiniStat icon={Receipt} label="Nómina liquidada" value={cop(m.payrollNet)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface p-5 lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold text-ink">
            Ingresos por mes <span className="text-xs font-normal text-faint">(millones COP)</span>
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={m.revenueByMonth} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E6ECF4" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#7B89A3" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#7B89A3" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}M`} />
              <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6ECF4" }} formatter={(v) => [`$${v}M`, "Ingresos"]} />
              <Bar dataKey="value" fill="#0B5BD6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-4 text-base font-semibold text-ink">Reservas por estado</h2>
          {m.byStatus.length === 0 ? (
            <EmptyState title="Sin reservas" hint="Aún no hay reservas registradas." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={m.byStatus} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={2}>
                    {m.byStatus.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1">
                {m.byStatus.map((s, i) => (
                  <li key={s.name} className="flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-2 text-ink-2">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      {s.name}
                    </span>
                    <span className="font-medium tabular-nums text-ink">{s.value}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-3 text-base font-semibold text-ink">Mejores quickers</h2>
          {m.topQuickers.length === 0 ? (
            <EmptyState title="Sin quickers" hint="Crea trabajadoras en la sección Quickers." />
          ) : (
            <ul className="space-y-2">
              {m.topQuickers.map((q) => (
                <li key={q.name} className="flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-2">
                    <Avatar className="size-8"><AvatarFallback>{q.name.slice(0, 1)}</AvatarFallback></Avatar>
                    <span>
                      <span className="block text-sm font-medium text-ink">{q.name}</span>
                      <span className="block text-xs text-faint">{q.zone}</span>
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-ink">
                    <Star className="size-3.5 text-yellow-500" /> {q.rating}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-line bg-surface p-5">
          <h2 className="mb-3 text-base font-semibold text-ink">Quickers por zona</h2>
          {m.byZone.length === 0 ? (
            <EmptyState title="Sin zonas" hint="Aún no hay quickers." />
          ) : (
            <ul className="space-y-2">
              {m.byZone.map((z) => {
                const max = Math.max(...m.byZone.map((x) => x.value));
                return (
                  <li key={z.name} className="text-sm">
                    <div className="mb-1 flex justify-between">
                      <span className="text-ink-2">{z.name}</span>
                      <span className="font-medium text-ink">{z.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg">
                      <div className="h-full rounded-full bg-brand-500" style={{ width: `${(z.value / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const useReal = !!useSession((s) => s.accessToken);
  return useReal ? <RealDashboard /> : <MockDashboard />;
}
