import { useState, useMemo } from "react";
import { useQuickers } from "@/hooks/queries";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/States";
import { DataTable } from "@/components/shared/DataTable";
import { RatingStars } from "@/components/shared/RatingStars";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import { Search, Plus, Eye } from "lucide-react";
import { cop } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Quicker } from "@/mocks/types";
import type { ColumnDef } from "@tanstack/react-table";

const STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  incapacidad: "Incapacidad",
};

const STATUS_VARIANT: Record<string, "default" | "outline" | "destructive" | "secondary"> = {
  activo: "default",
  inactivo: "outline",
  incapacidad: "secondary",
};

const STATUS_FILTERS = ["todos", "activo", "inactivo", "incapacidad"] as const;

const columns: ColumnDef<Quicker, unknown>[] = [
  {
    id: "quicker",
    header: "Quicker",
    accessorFn: (row) => row.name,
    enableSorting: true,
    cell: ({ row }) => {
      const q = row.original;
      const initials = q.name.split(" ").map((n) => n[0]).slice(0, 2).join("");
      return (
        <div className="flex items-center gap-3 min-w-[160px]">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-brand-100 text-brand-700 text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink text-sm">{q.name}</p>
            <p className="truncate text-xs text-ink-2">{q.doc}</p>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "zone",
    header: "Zona",
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-sm text-ink-2">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Estado",
    enableSorting: true,
    cell: ({ getValue }) => {
      const status = getValue() as string;
      return (
        <Badge variant={STATUS_VARIANT[status] ?? "outline"}>
          {STATUS_LABELS[status] ?? status}
        </Badge>
      );
    },
  },
  {
    accessorKey: "rating",
    header: "Calificación",
    enableSorting: true,
    cell: ({ getValue }) => {
      const rating = getValue() as number;
      return (
        <div className="flex items-center gap-2">
          <RatingStars value={Math.round(rating)} readOnly size="sm" />
          <span className="text-xs text-ink-2">{rating.toFixed(1)}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "monthlyServices",
    header: "Svc/mes",
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-sm text-ink tabular-nums">{getValue() as number}</span>
    ),
  },
  {
    accessorKey: "hourlyRate",
    header: "Tarifa/h",
    enableSorting: true,
    cell: ({ getValue }) => (
      <span className="text-sm text-ink tabular-nums">
        {cop(getValue() as number)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "Acciones",
    enableSorting: false,
    cell: () => (
      <div className="flex items-center gap-1">
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          aria-label="Ver Quicker"
          title="Ver"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>
    ),
  },
];

export default function Quickers() {
  const { data: quickers, isLoading, isError, refetch } = useQuickers();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  const filtered = useMemo(() => {
    if (!quickers) return [];
    return quickers.filter((q) => {
      const matchSearch =
        search === "" ||
        q.name.toLowerCase().includes(search.toLowerCase()) ||
        q.doc.includes(search) ||
        q.zone.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "todos" || q.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [quickers, search, statusFilter]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-display)] text-ink">
            Gestionar Quickers
          </h1>
          <p className="mt-0.5 text-sm text-faint">
            {quickers?.length ?? 0} profesionales registrados
          </p>
        </div>
        <Link
          to="/admin/quickers/nuevo"
          className={cn(
            buttonVariants({ variant: "default", size: "default" }),
            "bg-brand-600 hover:bg-brand-700 text-white shrink-0",
          )}
        >
          <Plus className="h-4 w-4" />
          Crear Quicker
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-faint pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Buscar por nombre, doc o zona…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Buscar Quicker"
          />
        </div>

        {/* Status filter pills */}
        <div
          className="flex gap-1 flex-wrap"
          role="group"
          aria-label="Filtrar por estado"
        >
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
              className={cn(
                "rounded-full px-3 py-1.5 min-h-[36px] text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                statusFilter === s
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-surface border border-line text-ink-2 hover:border-brand-300 hover:text-ink",
              )}
            >
              {s === "todos" ? "Todos" : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingState rows={5} />
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No hay Quickers"
          hint={search || statusFilter !== "todos" ? "Ajusta los filtros para ver resultados." : "Crea el primer Quicker con el botón de arriba."}
          action={
            <Link
              to="/admin/quickers/nuevo"
              className={cn(buttonVariants({ variant: "default" }), "bg-brand-600 text-white hover:bg-brand-700")}
            >
              <Plus className="h-4 w-4 mr-1" />
              Crear Quicker
            </Link>
          }
        />
      ) : (
        <DataTable columns={columns} data={filtered} pageSize={8} />
      )}
    </div>
  );
}
