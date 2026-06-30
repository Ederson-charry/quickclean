import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiUrl } from "@/lib/http";
import { useSession } from "@/stores/session";

// ─── Conciliación ERP/GAF ─────────────────────────────────────────────────────
export interface ReconItem {
  bookingId: string;
  scheduledAt: string;
  client: string | null;
  service: string | null;
  quicker: string | null;
  cobro: number;
  pago: number;
  comision: number;
  liquidacion: "liquidado" | "pendiente";
}

export interface ReconReport {
  from: string | null;
  to: string | null;
  summary: { count: number; totalCobro: number; totalPago: number; totalComision: number };
  items: ReconItem[];
}

function reconAuthHeaders(): Record<string, string> {
  const token = useSession.getState().accessToken;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useReconciliation(from: string | undefined, to: string | undefined, enabled: boolean) {
  const p = new URLSearchParams();
  if (from) p.set("from", from);
  if (to) p.set("to", to);
  const qs = p.toString() ? `?${p.toString()}` : "";
  return useQuery({
    queryKey: ["conciliacion", from, to],
    enabled,
    queryFn: () => apiFetch<ReconReport>(`/admin/conciliacion${qs}`, { headers: reconAuthHeaders() }),
  });
}

export async function downloadReconciliation(
  from: string | undefined,
  to: string | undefined,
  format: "csv" | "json",
): Promise<void> {
  const p = new URLSearchParams({ format });
  if (from) p.set("from", from);
  if (to) p.set("to", to);
  const res = await fetch(apiUrl(`/admin/conciliacion/export?${p.toString()}`), {
    credentials: "include",
    headers: reconAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `conciliacion.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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

export interface UpdateCategoryInput {
  name?: string;
  description?: string;
  iconName?: string;
  colorToken?: string;
  sortOrder?: number;
  active?: boolean;
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & UpdateCategoryInput) =>
      apiFetch<ServiceCategory>(`/admin/servicios/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(patch),
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

// ─── Compensación ─────────────────────────────────────────────────────────────
export interface PendingCompensation {
  quickerId: string;
  name: string;
  zone: string;
  amount: number;
  bookingCount: number;
}

export interface PayoutRecord {
  id: string;
  amount: number;
  bookingCount: number;
  status: "pendiente" | "pagado";
  createdAt: string;
  paidAt: string | null;
  quicker?: { name: string; zone: string };
}

export function usePendingCompensation(enabled: boolean) {
  return useQuery({
    queryKey: ["compensacion"],
    enabled,
    queryFn: () => apiFetch<PendingCompensation[]>("/admin/compensacion", { headers: authHeaders() }),
  });
}

export function useCompensationHistory(enabled: boolean) {
  return useQuery({
    queryKey: ["compensacion-historial"],
    enabled,
    queryFn: () => apiFetch<PayoutRecord[]>("/admin/compensacion/historial", { headers: authHeaders() }),
  });
}

export function useLiquidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quickerId: string) =>
      apiFetch("/admin/compensacion/liquidar", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ quickerId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compensacion"] });
      qc.invalidateQueries({ queryKey: ["compensacion-historial"] });
    },
  });
}

export function useMarkPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payoutId: string) =>
      apiFetch(`/admin/compensacion/${payoutId}/pagar`, { method: "POST", headers: authHeaders() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["compensacion-historial"] }),
  });
}

// ─── Panel del quicker ────────────────────────────────────────────────────────
export interface QuickerBooking {
  id: string;
  scheduledAt: string;
  status: "agendado" | "en_curso" | "completado" | "cancelado";
  address: string;
  duration: number;
  priceTotal: number;
  payout: number;
  category?: { name: string };
  client?: { email: string };
}

export function useQuickerBookings(enabled: boolean) {
  return useQuery({
    queryKey: ["quicker-reservas"],
    enabled,
    queryFn: () => apiFetch<QuickerBooking[]>("/quicker/reservas", { headers: authHeaders() }),
  });
}

export interface QuickerMovement {
  id: string;
  date: string;
  service: string | null;
  amount: number;
  estado: "por_liquidar" | "por_pagar" | "pagado";
}

export interface QuickerWallet {
  servicios: number;
  porLiquidar: number;
  porPagar: number;
  pagado: number;
  disponible: number;
  total: number;
  movements: QuickerMovement[];
}

export function useQuickerWallet(enabled: boolean) {
  return useQuery({
    queryKey: ["quicker-balance"],
    enabled,
    queryFn: () => apiFetch<QuickerWallet>("/quicker/balance", { headers: authHeaders() }),
  });
}

export function useQuickerTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch(`/quicker/reservas/${id}/estado`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quicker-reservas"] }),
  });
}

// ─── Solicitudes de ausencia (incapacidad / licencia / vacaciones) ────────────
export type LeaveKind = "incapacidad" | "licencia" | "vacaciones";
export type LeaveStatus = "en_revision" | "aprobada" | "rechazada";

export interface LeaveRequestDTO {
  id: string;
  quickerId: string;
  kind: LeaveKind;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: LeaveStatus;
  createdAt: string;
  reviewedById: string | null;
  reviewedAt: string | null;
}

export interface AdminLeaveDTO extends LeaveRequestDTO {
  quicker: { name: string; zone: string };
}

export interface SubmitLeaveInput {
  kind: LeaveKind;
  startDate: string;
  endDate: string;
  reason?: string;
}

export function useMyLeaves(enabled: boolean) {
  return useQuery({
    queryKey: ["quicker-solicitudes"],
    enabled,
    queryFn: () => apiFetch<LeaveRequestDTO[]>("/quicker/solicitudes", { headers: authHeaders() }),
  });
}

export function useSubmitLeaveReal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SubmitLeaveInput) =>
      apiFetch<LeaveRequestDTO>("/quicker/solicitudes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quicker-solicitudes"] }),
  });
}

export function useAdminLeaves(status: string, enabled: boolean) {
  return useQuery({
    queryKey: ["admin-solicitudes", status],
    enabled,
    queryFn: () =>
      apiFetch<AdminLeaveDTO[]>(`/admin/solicitudes${status ? `?status=${status}` : ""}`, {
        headers: authHeaders(),
      }),
  });
}

export function useDecideLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: "aprobada" | "rechazada" }) =>
      apiFetch(`/admin/solicitudes/${id}/decidir`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-solicitudes"] }),
  });
}

export interface LeaveQuickerOption {
  id: string;
  name: string;
  zone: string;
}

export function useLeaveQuickerOptions(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-solicitudes-quickers"],
    enabled,
    queryFn: () => apiFetch<LeaveQuickerOption[]>("/admin/solicitudes/quickers", { headers: authHeaders() }),
  });
}

export interface CreateAdminLeaveInput {
  quickerId: string;
  kind: LeaveKind;
  startDate: string;
  endDate: string;
  reason?: string;
  approve?: boolean;
}

export function useCreateAdminLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateAdminLeaveInput) =>
      apiFetch("/admin/solicitudes", { method: "POST", headers: authHeaders(), body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-solicitudes"] }),
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
  eligible: boolean;
  eligibilityReason?: string;
  available: boolean;
  unavailableReason?: string;
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

// ─── Contratos (vinculación laboral) ──────────────────────────────────────────
export type EngagementType = "contractor" | "employee";
export type ContractKind = "prestacion" | "fijo" | "indefinido";

export interface ContractDTO {
  id: string;
  engagementType: EngagementType;
  contractKind: ContractKind;
  position: string | null;
  monthlySalary: number | null;
  status: "activo" | "finalizado";
  startDate: string;
  endDate: string | null;
  quicker: { id: string; name: string; zone: string };
  client: { id: string; name: string; kind: string } | null;
}

export interface ContractOptions {
  quickers: { id: string; name: string; zone: string }[];
  clients: { id: string; name: string; kind: string; requiresDirectHire: boolean }[];
}

export interface CreateContractInput {
  quickerId: string;
  clientId?: string;
  engagementType: EngagementType;
  contractKind: ContractKind;
  position?: string;
  monthlySalary?: number;
}

export function useContracts(enabled: boolean) {
  return useQuery({
    queryKey: ["contratos"],
    enabled,
    queryFn: () => apiFetch<ContractDTO[]>("/admin/contratos", { headers: authHeaders() }),
  });
}

export function useContractOptions(enabled: boolean) {
  return useQuery({
    queryKey: ["contratos-opciones"],
    enabled,
    queryFn: () => apiFetch<ContractOptions>("/admin/contratos/opciones", { headers: authHeaders() }),
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateContractInput) =>
      apiFetch<ContractDTO>("/admin/contratos", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contratos"] }),
  });
}

export function useFinalizeContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/contratos/${id}/finalizar`, { method: "POST", headers: authHeaders() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contratos"] }),
  });
}

// ─── Nómina (motor de pago employee, conceptos CST) ───────────────────────────
export interface PayrollContract {
  id: string;
  position: string | null;
  monthlySalary: number | null;
  contractKind: string;
  quicker: { id: string; name: string; zone: string };
  client: { id: string; name: string } | null;
}

export interface PayrollItem {
  concepto: string;
  tipo: "devengado" | "deduccion";
  monto: number;
}

export interface PayrollBreakdown {
  days: number;
  baseSalary: number;
  transportAllowance: number;
  bonuses: number;
  grossEarnings: number;
  healthDeduction: number;
  pensionDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  items: PayrollItem[];
}

export interface PayrollExtra {
  concept: string;
  kind: "bono" | "deduccion";
  amount: number;
}

export interface PayrollRunDTO {
  id: string;
  periodFrom: string;
  periodTo: string;
  baseSalary: number;
  transportAllowance: number;
  grossEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: "calculada" | "pagada";
  paidAt: string | null;
  createdAt: string;
  contract: {
    position: string | null;
    quicker: { name: string; zone: string };
    client: { name: string } | null;
  };
}

export interface PayrollInput {
  contractId: string;
  periodFrom: string;
  periodTo: string;
  extras?: PayrollExtra[];
}

export function usePayrollContracts(enabled: boolean) {
  return useQuery({
    queryKey: ["nomina-contratos"],
    enabled,
    queryFn: () => apiFetch<PayrollContract[]>("/admin/nomina/contratos", { headers: authHeaders() }),
  });
}

export function usePayrollHistory(enabled: boolean) {
  return useQuery({
    queryKey: ["nomina-historial"],
    enabled,
    queryFn: () => apiFetch<PayrollRunDTO[]>("/admin/nomina/historial", { headers: authHeaders() }),
  });
}

export function usePayrollPreview() {
  return useMutation({
    mutationFn: (input: PayrollInput) =>
      apiFetch<PayrollBreakdown>("/admin/nomina/preview", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(input),
      }),
  });
}

export function useRunPayroll() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PayrollInput) =>
      apiFetch<PayrollRunDTO>("/admin/nomina", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nomina-historial"] }),
  });
}

export function useMarkPayrollPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/nomina/${id}/pagar`, { method: "POST", headers: authHeaders() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nomina-historial"] }),
  });
}

// ─── Gestión de personas (alta/edición de quickers y clientes) ────────────────
export interface AdminQuicker {
  id: string;
  name: string;
  zone: string;
  rating: number;
  active: boolean;
  user: { email: string; status: string; phone: string | null };
  skills: { serviceCategory: { id: string; name: string } }[];
}

export type DocType = "cc" | "nit" | "ce" | "pasaporte";

export interface AdminClient {
  id: string;
  name: string;
  kind: "persona" | "empresa";
  docType: DocType | null;
  docNumber: string | null;
  requiresDirectHire: boolean;
  user: { email: string; status: string; phone: string | null };
}

export interface CreateQuickerInput {
  email: string;
  name: string;
  zone: string;
  phone?: string;
  rating?: number;
  skills: string[];
}

export interface CreateClientInput {
  email: string;
  name: string;
  kind: "persona" | "empresa";
  docType?: DocType;
  docNumber?: string;
  requiresDirectHire?: boolean;
  phone?: string;
}

export interface CreatedAccount<T> {
  tempPassword: string;
  quicker?: T;
  client?: T;
}

export function useAdminQuickers(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-quickers"],
    enabled,
    queryFn: () => apiFetch<AdminQuicker[]>("/admin/quickers", { headers: authHeaders() }),
  });
}

export function useCreateQuicker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateQuickerInput) =>
      apiFetch<{ tempPassword: string; quicker: AdminQuicker }>("/admin/quickers", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quickers"] }),
  });
}

export function useUpdateQuicker() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<{ name: string; zone: string; phone: string; rating: number; active: boolean; skills: string[] }>) =>
      apiFetch(`/admin/quickers/${id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-quickers"] }),
  });
}

export function useResetQuickerPassword() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ tempPassword: string }>(`/admin/quickers/${id}/reset-password`, { method: "POST", headers: authHeaders() }),
  });
}

export function useAdminClients(enabled: boolean) {
  return useQuery({
    queryKey: ["admin-clients"],
    enabled,
    queryFn: () => apiFetch<AdminClient[]>("/admin/clientes", { headers: authHeaders() }),
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) =>
      apiFetch<{ tempPassword: string; client: AdminClient }>("/admin/clientes", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-clients"] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & Partial<{ name: string; kind: "persona" | "empresa"; docType: DocType; docNumber: string; phone: string; requiresDirectHire: boolean; active: boolean }>) =>
      apiFetch(`/admin/clientes/${id}`, { method: "PATCH", headers: authHeaders(), body: JSON.stringify(patch) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-clients"] }),
  });
}

export function useResetClientPassword() {
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ tempPassword: string }>(`/admin/clientes/${id}/reset-password`, { method: "POST", headers: authHeaders() }),
  });
}

// ─── Notificaciones (bandeja de salida) ───────────────────────────────────────
export interface NotificationDTO {
  id: string;
  userId: string | null;
  channel: "email" | "sms";
  to: string;
  kind: string;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
}

export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: ["notificaciones"],
    enabled,
    queryFn: () => apiFetch<NotificationDTO[]>("/admin/notificaciones", { headers: authHeaders() }),
  });
}

// ─── Habeas Data (derechos del titular) ───────────────────────────────────────
export interface DataPolicy {
  version: string;
  updatedAt: string;
  title: string;
  summary: string;
  rights: string[];
  retentionNote: string;
  contact: string;
}

export interface ConsentStatus {
  currentVersion: string;
  acceptedVersion: string | null;
  acceptedAt: string | null;
  needsConsent: boolean;
}

export function useDataPolicy() {
  return useQuery({
    queryKey: ["politica-datos"],
    queryFn: () => apiFetch<DataPolicy>("/legal/politica-datos"),
  });
}

export function useConsentStatus(enabled: boolean) {
  return useQuery({
    queryKey: ["consentimiento"],
    enabled,
    queryFn: () => apiFetch<ConsentStatus>("/me/consentimiento", { headers: authHeaders() }),
  });
}

export function useGiveConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/me/consentimiento", { method: "POST", headers: authHeaders() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consentimiento"] }),
  });
}

export function useWithdrawConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch("/me/consentimiento", { method: "DELETE", headers: authHeaders() }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["consentimiento"] }),
  });
}

export function useRectifyProfile() {
  return useMutation({
    mutationFn: (patch: { phone?: string; name?: string }) =>
      apiFetch("/me/perfil", { method: "PATCH", headers: authHeaders(), body: JSON.stringify(patch) }),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => apiFetch("/me/cuenta", { method: "DELETE", headers: authHeaders() }),
  });
}

/** Descarga el export de datos personales como archivo JSON. */
export async function downloadMyData() {
  const data = await apiFetch<unknown>("/me/datos", { headers: authHeaders() });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mis-datos-quickclean.json";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Indicadores (dashboard real) ─────────────────────────────────────────────
export interface MetricsOverview {
  revenueMonth: number;
  revenueMonthDelta: number;
  completedMonth: number;
  completedDelta: number;
  activeQuickers: number;
  avgRating: number;
  totalClients: number;
  empresas: number;
  pendingPayout: number;
  paidPayout: number;
  payrollNet: number;
  payrollRuns: number;
  revenueByMonth: { month: string; value: number }[];
  byStatus: { name: string; value: number }[];
  byZone: { name: string; value: number }[];
  topQuickers: { name: string; zone: string; rating: number }[];
}

export function useMetrics(enabled: boolean) {
  return useQuery({
    queryKey: ["indicadores"],
    enabled,
    queryFn: () => apiFetch<MetricsOverview>("/admin/indicadores", { headers: authHeaders() }),
  });
}
