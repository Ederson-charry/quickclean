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

export interface BookingResponse {
  id: string;
  priceTotal: number;
  payout: number;
  status: string;
  tariffId: string;
}

export interface CreateReservationInput {
  serviceCategoryId: string;
  duration: number;
  frequency: string;
  size: string;
  supplies: boolean;
  scheduledAt: string;
  address: string;
  notes?: string;
  pets?: boolean;
}

/** Crea una reserva real (POST /reservas, cliente autenticado). */
export function useCreateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReservationInput) =>
      apiFetch<BookingResponse>("/reservas", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservas"] }),
  });
}

/** Lista las reservas del cliente autenticado (GET /reservas). */
export interface ClientBooking {
  id: string;
  serviceCategoryId: string;
  duration: number;
  frequency: string;
  size: string;
  supplies: boolean;
  scheduledAt: string;
  address: string;
  priceTotal: number;
  status: "agendado" | "en_curso" | "completado" | "cancelado";
  ratedAt: string | null;
  category?: { name: string; slug: string; iconName: string };
}

export function useMyReservations(enabled: boolean) {
  return useQuery({
    queryKey: ["reservas"],
    enabled,
    queryFn: () => apiFetch<ClientBooking[]>("/reservas", { headers: authHeaders() }),
  });
}

export interface AdminBooking {
  id: string;
  scheduledAt: string;
  status: "agendado" | "en_curso" | "completado" | "cancelado";
  priceTotal: number;
  payout: number;
  duration: number;
  frequency: string;
  size: string;
  supplies: boolean;
  address: string;
  category?: { name: string };
  client?: { email: string };
}

export interface ClientBookingDetail extends ClientBooking {
  ratedAt: string | null;
  rating: number | null;
}

/** Detalle de una reserva propia (GET /reservas/:id). */
export function useClientBooking(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["reserva", id],
    enabled,
    queryFn: () => apiFetch<ClientBookingDetail>(`/reservas/${id}`, { headers: authHeaders() }),
  });
}

/** Califica una reserva completada (POST /reservas/:id/calificar). */
export function useRateReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment?: string }) =>
      apiFetch(`/reservas/${id}/calificar`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ rating, comment }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservas"] }),
  });
}

/** Cancela una reserva propia (cliente). */
export function useCancelReservation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/reservas/${id}/cancelar`, { method: "POST", headers: authHeaders() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reservas"] }),
  });
}

/** Cambia el estado de una reserva (admin, booking.manage). */
export function useTransitionBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/admin/reservas/${id}/estado`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reservas"] }),
  });
}

// ─── Torre de Control / asignación ────────────────────────────────────────────
export interface AssignmentCandidate {
  quickerId: string;
  name: string;
  zone: string;
  rating: number;
  hasSkill: boolean;
  load: number;
  zoneMatch: boolean;
  clash: boolean;
  score: number;
}

export interface BoardBooking {
  id: string;
  scheduledAt: string;
  status: "agendado" | "en_curso" | "completado" | "cancelado";
  address: string;
  duration: number;
  priceTotal: number;
  category?: { name: string };
  client?: { email: string };
  assignment?: { quicker: { name: string; zone: string } } | null;
}

export function useAssignmentBoard(enabled: boolean) {
  return useQuery({
    queryKey: ["asignacion"],
    enabled,
    queryFn: () => apiFetch<BoardBooking[]>("/admin/asignacion", { headers: authHeaders() }),
  });
}

export function useCandidates(bookingId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["candidatos", bookingId],
    enabled: enabled && !!bookingId,
    queryFn: () =>
      apiFetch<AssignmentCandidate[]>(`/admin/asignacion/candidatos?bookingId=${bookingId}`, {
        headers: authHeaders(),
      }),
  });
}

export function useAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { bookingId: string; quickerId: string; reason?: string }) =>
      apiFetch("/admin/asignacion", { method: "POST", headers: authHeaders(), body: JSON.stringify(input) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["asignacion"] });
      qc.invalidateQueries({ queryKey: ["candidatos"] });
      qc.invalidateQueries({ queryKey: ["admin-reservas"] });
    },
  });
}

/** Reservas (admin, requiere booking.read), filtrable por estado. */
export function useAdminReservations(status: string, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-reservas", status],
    enabled,
    queryFn: () =>
      apiFetch<AdminBooking[]>(`/admin/reservas${status ? `?status=${status}` : ""}`, {
        headers: authHeaders(),
      }),
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
