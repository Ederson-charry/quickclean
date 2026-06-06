import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/mocks/api";

export const useServices = () => useQuery({ queryKey: ["services"], queryFn: api.listServices });
export const useMyBookings = () => useQuery({ queryKey: ["bookings"], queryFn: api.getMyBookings });
export const useBooking = (id: string) => useQuery({ queryKey: ["booking", id], queryFn: () => api.getBooking(id) });
export const useQuickerToday = () => useQuery({ queryKey: ["assignments"], queryFn: api.quickerToday });
export const useQuickerBalance = () => useQuery({ queryKey: ["balance"], queryFn: api.quickerBalance });
export const useAssignment = (id: string) => useQuery({ queryKey: ["assignment", id], queryFn: () => api.getAssignment(id) });
export const useLeaveRequests = () => useQuery({ queryKey: ["leaves"], queryFn: api.getLeaveRequests });
export const useKpis = () => useQuery({ queryKey: ["kpis"], queryFn: api.adminKpis });
export const useQuickers = () => useQuery({ queryKey: ["quickers"], queryFn: api.adminQuickers });
export const usePayouts = () => useQuery({ queryKey: ["payouts"], queryFn: api.adminPayouts });
export const useInvoices = () => useQuery({ queryKey: ["invoices"], queryFn: api.adminInvoices });
export const useClients = () => useQuery({ queryKey: ["clients"], queryFn: api.adminClients });

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createBooking, onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }) });
}
export function useRateBooking() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.rateBooking, onSuccess: () => qc.invalidateQueries({ queryKey: ["bookings"] }) });
}
export function useFinishAssignment() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.finishAssignment, onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }) });
}
export function useSubmitLeave() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.submitLeave, onSuccess: () => qc.invalidateQueries({ queryKey: ["leaves"] }) });
}
export function useCreateQuicker() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createQuicker, onSuccess: () => qc.invalidateQueries({ queryKey: ["quickers"] }) });
}
export function usePayPayout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.payPayout, onSuccess: () => qc.invalidateQueries({ queryKey: ["payouts"] }) });
}
export function usePayAll() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.payAllPayouts, onSuccess: () => qc.invalidateQueries({ queryKey: ["payouts"] }) });
}
export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.createClient, onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }) });
}
export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof api.updateClient>[1] }) =>
      api.updateClient(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }),
  });
}
export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: api.deleteClient, onSuccess: () => qc.invalidateQueries({ queryKey: ["clients"] }) });
}
