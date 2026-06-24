import { useState } from "react";
import {
  Archive,
  Bath,
  Brush,
  Building2,
  HardHat,
  type LucideIcon,
  Plus,
  Sofa,
  Sparkles,
  Tag,
  Wind,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/States";
import {
  type ServiceCategory,
  useAllCategories,
  useArchiveCategory,
  useCreateCategory,
} from "@/hooks/catalog";
import { cn } from "@/lib/utils";
import { useSession } from "@/stores/session";

const ICONS: Record<string, LucideIcon> = {
  Sparkles,
  Wind,
  HardHat,
  Sofa,
  Bath,
  Brush,
  Building2,
  Tag,
};

function CatIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Tag;
  return <Icon className={className} aria-hidden="true" />;
}

const createSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/, "minúsculas y guiones").min(2),
  name: z.string().min(2),
  description: z.string().optional(),
  iconName: z.string().min(1),
  colorToken: z.string().min(1),
  sortOrder: z.coerce.number().int().min(0),
});

function CreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateCategory();
  const [form, setForm] = useState({
    slug: "",
    name: "",
    description: "",
    iconName: "Sparkles",
    colorToken: "brand-600",
    sortOrder: "0",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    const parsed = createSchema.safeParse(form);
    if (!parsed.success) {
      toast.error("Revisa el slug, nombre, icono y color.");
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: () => {
        toast.success("Categoría creada");
        setForm({ slug: "", name: "", description: "", iconName: "Sparkles", colorToken: "brand-600", sortOrder: "0" });
        onClose();
      },
      onError: () => toast.error("No se pudo crear (¿slug repetido o permiso?)"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Nueva categoría de servicio</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="s-name" className="text-xs text-ink-2">Nombre</Label>
              <Input id="s-name" placeholder="Limpieza de oficinas" value={form.name} onChange={(e) => set("name")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-slug" className="text-xs text-ink-2">Slug</Label>
              <Input id="s-slug" placeholder="limpieza-oficinas" value={form.slug} onChange={(e) => set("slug")(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-desc" className="text-xs text-ink-2">Descripción (opcional)</Label>
            <Textarea id="s-desc" rows={2} value={form.description} onChange={(e) => set("description")(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="s-icon" className="text-xs text-ink-2">Icono (lucide)</Label>
              <Input id="s-icon" placeholder="Sparkles" value={form.iconName} onChange={(e) => set("iconName")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-color" className="text-xs text-ink-2">Color (token)</Label>
              <Input id="s-color" placeholder="brand-600" value={form.colorToken} onChange={(e) => set("colorToken")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="s-order" className="text-xs text-ink-2">Orden</Label>
              <Input id="s-order" type="number" min={0} value={form.sortOrder} onChange={(e) => set("sortOrder")(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button
              type="button"
              className="bg-brand-600 text-white hover:bg-brand-700"
              onClick={submit}
              disabled={create.isPending}
            >
              {create.isPending ? "Creando…" : "Crear categoría"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryCard({ cat }: { cat: ServiceCategory }) {
  const archive = useArchiveCategory();
  const archived = cat.archivedAt != null || !cat.active;

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-sm",
        archived && "opacity-70",
      )}
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
        <CatIcon name={cat.iconName} className="size-5 text-brand-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-semibold text-ink">{cat.name}</span>
          <Badge className={archived ? "bg-bg text-faint" : "bg-success/10 text-success"}>
            {archived ? "Archivada" : "Activa"}
          </Badge>
        </div>
        <p className="font-mono text-xs text-faint">{cat.slug}</p>
        {cat.description && <p className="mt-1 line-clamp-2 text-sm text-ink-2">{cat.description}</p>}
        {!archived && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 text-ink-2 hover:text-danger"
            onClick={() =>
              archive.mutate(cat.id, {
                onSuccess: () => toast.success(`"${cat.name}" archivada`),
                onError: () => toast.error("No se pudo archivar"),
              })
            }
            disabled={archive.isPending}
          >
            <Archive className="size-4" /> Archivar
          </Button>
        )}
      </div>
    </li>
  );
}

export default function Servicios() {
  const enabled = !!useSession((s) => s.accessToken);
  const { data, isLoading, isError, refetch } = useAllCategories(enabled);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold leading-tight text-ink">Servicios</h1>
          <p className="mt-1 text-sm text-ink-2">Catálogo de categorías de servicio.</p>
        </div>
        {enabled && (
          <Button
            type="button"
            className="shrink-0 bg-brand-600 text-white hover:bg-brand-700"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="size-4" /> <span className="hidden sm:inline">Nueva categoría</span>
          </Button>
        )}
      </header>

      {!enabled ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Acceso restringido" hint="Inicia sesión como administrador (service.read)." />
        </div>
      ) : isLoading ? (
        <LoadingState rows={4} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <div className="rounded-xl border border-line bg-surface">
          <EmptyState title="Sin categorías" hint="Crea la primera categoría de servicio." />
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((cat) => (
            <CategoryCard key={cat.id} cat={cat} />
          ))}
        </ul>
      )}

      <CreateDialog open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
