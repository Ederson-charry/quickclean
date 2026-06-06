import { db } from "./db";
import type { Booking, Rating, LeaveRequest } from "./types";

const delay = (ms = 450) => new Promise((r) => setTimeout(r, ms));

export const api = {
  async listServices() { await delay(); return db.services; },
  async getMyBookings() { await delay(); return db.bookings; },
  async getBooking(id: string) { await delay(); return db.bookings.find((b) => b.id === id) ?? null; },
  async createBooking(draft: Omit<Booking, "id" | "status" | "rated" | "quickerId"> & { quickerId?: string }) {
    await delay(700);
    const b: Booking = { ...draft, id: crypto.randomUUID(), status: "agendado", rated: false, quickerId: draft.quickerId ?? "q2" };
    db.bookings.push(b);
    return b;
  },
  async rateBooking(input: Omit<Rating, "id">) {
    await delay();
    db.ratings.push({ ...input, id: crypto.randomUUID() });
    const b = db.bookings.find((x) => x.id === input.bookingId);
    if (b) b.rated = true;
    return { ok: true as const };
  },

  async quickerToday() { await delay(); return db.assignments; },
  async quickerBalance() { await delay(); return db.balance; },
  async getAssignment(id: string) { await delay(); return db.assignments.find((a) => a.id === id) ?? null; },
  async finishAssignment(id: string) {
    await delay(600);
    const a = db.assignments.find((x) => x.id === id);
    if (a) a.status = "completado";
    return { ok: true as const };
  },
  async getLeaveRequests() { await delay(); return db.leaveRequests; },
  async submitLeave(input: Omit<LeaveRequest, "id" | "status">) {
    await delay(700);
    const r: LeaveRequest = { ...input, id: crypto.randomUUID(), status: "en_revision" };
    db.leaveRequests.push(r);
    return r;
  },

  async adminKpis() { await delay(); return db.kpis; },
  async adminQuickers() { await delay(); return db.quickers; },
  async createQuicker(input: Omit<import("./types").Quicker, "id">) {
    await delay(700);
    const q = { ...input, id: crypto.randomUUID() };
    db.quickers.push(q);
    return q;
  },
  async adminPayouts() { await delay(); return db.payouts; },
  async payPayout(id: string) {
    await delay(600);
    const p = db.payouts.find((x) => x.id === id);
    if (p) p.status = "pagado";
    return { ok: true as const };
  },
  async payAllPayouts() {
    await delay(900);
    db.payouts.forEach((p) => (p.status = "pagado"));
    return { ok: true as const };
  },
  async adminInvoices() { await delay(); return db.invoices; },
};
