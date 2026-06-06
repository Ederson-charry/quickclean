import { useState, useMemo } from "react";
import { useClients, useDeleteClient } from "@/hooks/queries";
import { LoadingState, ErrorState, EmptyState } from "@/components/shared/States";
import { DataTable } from "@/components/shared/DataTable";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import { Search, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { cop } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Client } from "@/mocks/types";
import type { ColumnDef } from "@tanstack/react-table";

const TYPE_LABELS: Record<string, string> = {
  persona: "Persona",
  empresa: "Empresa",
};

const TYPE_VARIANT: Record<string, "default" | "outline" | "secondary"> = {
  persona: "secondary",
  empresa: "default",
};

const STATUS_LABELS: Record<string, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
};

const STATUS_VARIANT: Record<string, "default" | "outline"> = {
  activo: "default",
  inactivo: "outline",
};

const TYPE_FILTERS = ["todos", "persona", "empresa"] as const;

function DeleteDialog({
  client,
  onConfirm,
  onClose,
  isPending,
}: {
  client: Client;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar cliente</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-ink-2">
          ¿Seguro que deseas eliminar a <strong className="text-ink">{client.name}</strong>?
          Esta acción no se puede deshacer.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
            className="min-w-[100px]"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Eliminar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Clientes() {
  const { data: clients, isLoading, isError, refetch } = useClients();
  const { mutateAsync: deleteClient, isPending: isDeleting } = useDeleteClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("todos");
  const [toDelete, setToDelete] = useState<Client | null>(null);

  const filtered = useMemo(() => {
    if (!clients) return [];
    return clients.filter((c) => {
      const matchSearch =
        search === "" ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.doc.includes(search) ||
        c.email.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "todos" || c.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [clients, search, typeFilter]);

  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteClient(toDelete.id);
      toast.success(`Cliente "${toDelete.name}" eliminado`);
      setToDelete(null);
    } catch {
      toast.error("Error al eliminar el cliente. Inténtalo de nuevo.");
    }
  };

  const columns: ColumnDef<Client, unknown>[] = [
    {
      id: "cliente",
      header: "Cliente",
      accessorFn: (row) => row.name,
      enableSorting: true,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="min-w-[160px]">
            <p className="font-medium text-ink text-sm truncate">{c.name}</p>
            <p className="text-xs text-muted truncate">{c.doc}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "type",
      header: "Tipo",
      enableSorting: true,
      cell: ({ getValue }) => {
        const type = getValue() as string;
        return (
          <Badge variant={TYPE_VARIANT[type] ?? "outline"}>
            {TYPE_LABELS[type] ?? type}
          </Badge>
        );
      },
    },
    {
      accessorKey: "city",
      header: "Ciudad",
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="text-sm text-ink-2">{getValue() as string}</span>
      ),
    },
    {
      id: "contacto",
      header: "Contacto",
      enableSorting: false,
      accessorFn: (row) => row.email,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="min-w-[160px]">
            <p className="text-sm text-ink truncate">{c.email}</p>
            <p className="text-xs text-muted">{c.phone}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "bookingsCount",
      header: "Servicios",
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="text-sm text-ink tabular-nums">{getValue() as number}</span>
      ),
    },
    {
      accessorKey: "totalSpent",
      header: "Total gastado",
      enableSorting: true,
      cell: ({ getValue }) => (
        <span className="text-sm text-ink tabular-nums">
          {cop(getValue() as number)}
        </span>
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
      id: "actions",
      header: "Acciones",
      enableSorting: false,
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-1">
            <Link
              to="/admin/clientes/$id"
              params={{ id: c.id }}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-brand-50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
              aria-label={`Editar ${c.name}`}
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setToDelete(c)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
              aria-label={`Eliminar ${c.name}`}
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-[var(--font-display)] text-ink">
            Gestionar Clientes
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {clients?.length ?? 0} clientes registrados
          </p>
        </div>
        <Link
          to="/admin/clientes/nuevo"
          className={cn(
            buttonVariants({ variant: "default", size: "default" }),
            "bg-brand-600 hover:bg-brand-700 text-white shrink-0",
          )}
        >
          <Plus className="h-4 w-4" />
          Crear cliente
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none"
            aria-hidden="true"
          />
          <Input
            type="search"
            placeholder="Buscar por nombre, doc o correo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Buscar cliente"
          />
        </div>

        {/* Type filter pills */}
        <div
          className="flex gap-1 flex-wrap"
          role="group"
          aria-label="Filtrar por tipo"
        >
          {TYPE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              aria-pressed={typeFilter === t}
              className={cn(
                "rounded-full px-3 py-1.5 min-h-[36px] text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
                typeFilter === t
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-surface border border-line text-ink-2 hover:border-brand-300 hover:text-ink",
              )}
            >
              {t === "todos" ? "Todos" : TYPE_LABELS[t]}
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
          title="No hay clientes"
          hint={
            search || typeFilter !== "todos"
              ? "Ajusta los filtros para ver resultados."
              : "Crea el primer cliente con el botón de arriba."
          }
          action={
            <Link
              to="/admin/clientes/nuevo"
              className={cn(buttonVariants({ variant: "default" }), "bg-brand-600 text-white hover:bg-brand-700")}
            >
              <Plus className="h-4 w-4 mr-1" />
              Crear cliente
            </Link>
          }
        />
      ) : (
        <DataTable columns={columns} data={filtered} pageSize={8} />
      )}

      {/* Delete confirm dialog */}
      {toDelete && (
        <DeleteDialog
          client={toDelete}
          onConfirm={handleDelete}
          onClose={() => setToDelete(null)}
          isPending={isDeleting}
        />
      )}
    </div>
  );
}
