import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import { BookingService } from "./booking.service";
import { CreateBookingInput } from "./booking.schemas";

describe("BookingService (integración) — snapshot de tarifa", () => {
  const prisma = new PrismaService();
  const bookings = new BookingService(prisma, new AuditService(prisma));
  let categoryId: string;
  let clientId: string;
  let tariffV1Id: string;
  let bookingId: string;

  beforeAll(async () => {
    await prisma.onModuleInit();
    const cat = await prisma.serviceCategory.create({
      data: { slug: `bk-${Date.now()}`, name: "Reserva test", iconName: "Sparkles", colorToken: "brand-600" },
    });
    categoryId = cat.id;
    const v1 = await prisma.tariff.create({
      data: {
        serviceCategoryId: categoryId,
        name: "v1",
        effectiveFrom: new Date(Date.now() - 1000),
        status: "active",
        rules: {
          create: [
            { dimension: "duration", key: "4", modifierType: "base", value: 80_000 },
            { dimension: "platform_fee", key: "", modifierType: "flat", value: 6_900 },
          ],
        },
      },
    });
    tariffV1Id = v1.id;
    const client = await prisma.user.create({ data: { email: `cli-${Date.now()}@x.co`, status: "active" } });
    clientId = client.id;
  });

  afterAll(async () => {
    await prisma.booking.deleteMany({ where: { clientId } });
    await prisma.tariff.deleteMany({ where: { serviceCategoryId: categoryId } });
    await prisma.serviceCategory.delete({ where: { id: categoryId } });
    await prisma.user.delete({ where: { id: clientId } });
    await prisma.$disconnect();
  });

  it("crea la reserva con el precio calculado y snapshot de tariffId", async () => {
    const input = CreateBookingInput.parse({
      serviceCategoryId: categoryId,
      duration: 4,
      frequency: "unica",
      size: "S",
      supplies: false,
      scheduledAt: new Date(Date.now() + 86_400_000),
      address: "Calle 123",
    });
    const b = await bookings.create(clientId, input);
    bookingId = b.id;
    expect(b.tariffId).toBe(tariffV1Id);
    expect(b.priceTotal).toBe(86_900); // 80000 base + 6900 fee
    expect(b.status).toBe("agendado");
  });

  it("la reserva conserva su precio aunque se publique una tarifa nueva", async () => {
    // nueva versión: expira v1, v2 activa con base distinta
    await prisma.tariff.update({ where: { id: tariffV1Id }, data: { status: "expired", effectiveTo: new Date() } });
    await prisma.tariff.create({
      data: {
        serviceCategoryId: categoryId,
        name: "v2",
        effectiveFrom: new Date(),
        status: "active",
        rules: { create: [{ dimension: "duration", key: "4", modifierType: "base", value: 120_000 }] },
      },
    });
    const b = await prisma.booking.findUnique({ where: { id: bookingId } });
    expect(b?.tariffId).toBe(tariffV1Id); // sigue apuntando a v1
    expect(b?.priceTotal).toBe(86_900); // precio intacto
  });

  it("cancela una reserva y rechaza cancelar una completada", async () => {
    const cancelled = await bookings.cancel(bookingId, clientId);
    expect(cancelled.status).toBe("cancelado");

    const done = await prisma.booking.create({
      data: {
        clientId,
        serviceCategoryId: categoryId,
        tariffId: tariffV1Id,
        duration: 4,
        frequency: "unica",
        size: "S",
        supplies: false,
        scheduledAt: new Date(),
        address: "Calle 1",
        priceLabor: 1,
        priceTotal: 1,
        payout: 1,
        status: "completado",
      },
    });
    await expect(bookings.cancel(done.id, clientId)).rejects.toThrow();
  });

  it("transiciona agendado → en_curso → completado y rechaza saltos inválidos", async () => {
    const b = await bookings.create(
      clientId,
      CreateBookingInput.parse({
        serviceCategoryId: categoryId,
        duration: 4,
        frequency: "unica",
        size: "S",
        supplies: false,
        scheduledAt: new Date(Date.now() + 86_400_000),
        address: "Calle 9",
      }),
    );
    // salto inválido agendado → completado
    await expect(bookings.transition(b.id, "completado", clientId)).rejects.toThrow();
    const a = await bookings.transition(b.id, "en_curso", clientId);
    expect(a.status).toBe("en_curso");
    const c = await bookings.transition(b.id, "completado", clientId);
    expect(c.status).toBe("completado");
    // ya completada: no admite más transiciones
    await expect(bookings.transition(b.id, "cancelado", clientId)).rejects.toThrow();
  });
});
