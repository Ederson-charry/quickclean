import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/http";
import { useSession } from "@/stores/session";

export interface ServiceCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconName: string;
  colorToken: string;
  active: boolean;
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
}

export interface TariffRule {
  id: string;
  dimension: string;
  key: string;
  modifierType: string;
  value: number;
}

export interface Tariff {
  id: string;
  serviceCategoryId: string;
  name: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: "draft" | "scheduled" | "active" | "expired";
  publishedBy: string | null;
  publishedAt: string | null;
  rules: TariffRule[];
}

export interface PriceBreakdown {
  base: number;
  sizeMultiplier: number;
  frequencyDiscount: number;
  suppliesCost: number;
  platformFee: number;
  labor: number;
  total: number;
  payout: number;
}

export interface PreviewInput {
  serviceCategoryId: string;
  duration: number;
  frequency: string;
  size: string;
  supplies: boolean;
}

function authHeaders(): Record<string, string> {
  const token = useSession.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Catálogo público de categorías activas. */
export function useServiceCategories() {
  return useQuery({
    queryKey: ["catalogo"],
    queryFn: () => apiFetch<ServiceCategory[]>("/catalogo"),
  });
}

export interface CreateCategoryInput {
  slug: string;
  name: string;
  description?: string;
  iconName: string;
  colorToken: string;
  sortOrder?: number;
}

/** Todas las categorías incl. archivadas (admin, requiere service.read). */
export function useAllCategories(enabled: boolean) {
  return useQuery({
    queryKey: ["servicios"],
    enabled,
    queryFn: () => apiFetch<ServiceCategory[]>("/admin/servicios", { headers: authHeaders() }),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      apiFetch<ServiceCategory>("/admin/servicios", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicios"] });
      qc.invalidateQueries({ queryKey: ["catalogo"] });
    },
  });
}

export function useArchiveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ServiceCategory>(`/admin/servicios/${id}/archivar`, {
        method: "POST",
        headers: authHeaders(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["servicios"] });
      qc.invalidateQueries({ queryKey: ["catalogo"] });
    },
  });
}

/** Tarifa vigente + historial de una categoría (requiere tariff.read). */
export function useTariffs(categoryId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["tarifas", categoryId],
    enabled: enabled && !!categoryId,
    queryFn: () =>
      apiFetch<{ active: Tariff | null; history: Tariff[] }>(
        `/admin/tarifas?categoryId=${categoryId}`,
        { headers: authHeaders() },
      ),
  });
}

export interface PublishInput {
  serviceCategoryId: string;
  name: string;
  effectiveFrom: string;
  rules: { dimension: string; key: string; modifierType: string; value: number }[];
  otp?: string;
}

/** Publica una nueva versión de tarifa (requiere tariff.assign; step-up 2FA si aplica). */
export function usePublishTariff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PublishInput) =>
      apiFetch<Tariff>("/admin/tarifas", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarifas"] });
      qc.invalidateQueries({ queryKey: ["precio"] });
    },
  });
}

/** Previsualiza el precio con la tarifa vigente (endpoint público). */
export function usePricePreview(input: PreviewInput | null) {
  return useQuery({
    queryKey: ["precio", input],
    enabled: !!input,
    queryFn: () =>
      apiFetch<PriceBreakdown>("/catalogo/precio", {
        method: "POST",
        body: JSON.stringify(input),
      }),
  });
}
