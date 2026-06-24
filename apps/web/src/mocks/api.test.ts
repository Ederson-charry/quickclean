import { describe, it, expect } from "vitest";
import { api } from "@/mocks/api";
import { db } from "@/mocks/db";

describe("api mutations", () => {
  it("createBooking appends an agendado booking", async () => {
    const before = db.bookings.length;
    const b = await api.createBooking({
      serviceType: "hogar", size: "1-2", frequency: "unico", duration: 6,
      supplies: false, date: "2026-06-12", time: "08:00", address: "Cra 7 #45-10",
      pets: false, total: 116800,
    });
    expect(b.id).toBeTruthy();
    expect(b.status).toBe("agendado");
    expect(db.bookings.length).toBe(before + 1);
  });
  it("payPayout flips status to pagado", async () => {
    const id = db.payouts[0].id;
    await api.payPayout(id);
    expect(db.payouts.find(p => p.id === id)!.status).toBe("pagado");
  });
  it("submitLeave appends an en_revision request", async () => {
    const before = db.leaveRequests.length;
    const r = await api.submitLeave({
      quickerId: "q2", kind: "incapacidad", reason: "Gripa", from: "2026-06-10", to: "2026-06-12",
    });
    expect(r.status).toBe("en_revision");
    expect(db.leaveRequests.length).toBe(before + 1);
  });
  it("rateBooking marks booking rated", async () => {
    const target = db.bookings.find(b => !b.rated)!;
    await api.rateBooking({ bookingId: target.id, stars: 5, tags: ["Puntualidad"], tip: 5000 });
    expect(db.bookings.find(b => b.id === target.id)!.rated).toBe(true);
  });
});
