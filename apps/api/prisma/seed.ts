import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

const PERMS = [
  "audit.read",
  "service.read",
  "service.update",
  "tariff.read",
  "tariff.assign",
  "user.manage",
  "assignment.manage",
  "booking.read",
  "booking.manage",
  "compensation.manage",
  "erp.read",
  "leave.manage",
];

async function main(): Promise<void> {
  for (const key of PERMS) {
    await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }
  const perms = await prisma.permission.findMany();

  const admin = await prisma.role.upsert({
    where: { key: "super_admin" },
    update: {},
    create: { key: "super_admin", name: "Super Admin" },
  });
  for (const p of perms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: admin.id, permissionId: p.id } },
      update: {},
      create: { roleId: admin.id, permissionId: p.id },
    });
  }

  const email = "admin@quickclean.co";
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, status: "active", emailVerifiedAt: new Date() },
  });
  await prisma.credential.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      passwordHash: await argon2.hash("CambiaEsto-2026!", { type: argon2.argon2id }),
      mustChangePassword: true,
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: admin.id } },
    update: {},
    create: { userId: user.id, roleId: admin.id },
  });

  // ── Usuario cliente de ejemplo (sin roles → rol derivado = client → /app) ───
  const clientUser = await prisma.user.upsert({
    where: { email: "cliente@quickclean.co" },
    update: {},
    create: { email: "cliente@quickclean.co", status: "active", emailVerifiedAt: new Date() },
  });
  await prisma.credential.upsert({
    where: { userId: clientUser.id },
    update: {},
    create: {
      userId: clientUser.id,
      passwordHash: await argon2.hash("Cliente-2026!", { type: argon2.argon2id }),
      mustChangePassword: false,
    },
  });

  // ── Catálogo de servicios + tarifa vigente ──────────────────────────────────
  const CATEGORIES = [
    { slug: "limpieza-general", name: "Limpieza general", iconName: "Sparkles", colorToken: "brand-600", sortOrder: 1 },
    { slug: "limpieza-profunda", name: "Limpieza profunda", iconName: "Wind", colorToken: "brand-700", sortOrder: 2 },
    { slug: "post-obra", name: "Post-obra", iconName: "HardHat", colorToken: "amber-600", sortOrder: 3 },
  ];
  for (const c of CATEGORIES) {
    await prisma.serviceCategory.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }

  const general = await prisma.serviceCategory.findUnique({ where: { slug: "limpieza-general" } });
  if (general) {
    const hasTariff = await prisma.tariff.findFirst({ where: { serviceCategoryId: general.id } });
    if (!hasTariff) {
      await prisma.tariff.create({
        data: {
          serviceCategoryId: general.id,
          name: "Tarifa base 2026",
          effectiveFrom: new Date(),
          status: "active",
          publishedBy: user.id,
          publishedAt: new Date(),
          rules: {
            create: [
              { dimension: "duration", key: "4", modifierType: "base", value: 79_900 },
              { dimension: "duration", key: "6", modifierType: "base", value: 109_900 },
              { dimension: "duration", key: "8", modifierType: "base", value: 139_900 },
              { dimension: "frequency", key: "unica", modifierType: "percent", value: 0 },
              { dimension: "frequency", key: "semanal", modifierType: "percent", value: 0.2 },
              { dimension: "frequency", key: "quincenal", modifierType: "percent", value: 0.12 },
              { dimension: "frequency", key: "mensual", modifierType: "percent", value: 0.08 },
              { dimension: "size", key: "S", modifierType: "multiplier", value: 1 },
              { dimension: "size", key: "M", modifierType: "multiplier", value: 1.15 },
              { dimension: "size", key: "L", modifierType: "multiplier", value: 1.3 },
              { dimension: "supplies", key: "", modifierType: "flat", value: 15_000 },
              { dimension: "platform_fee", key: "", modifierType: "flat", value: 6_900 },
              { dimension: "payout_pct", key: "", modifierType: "percent", value: 0.7 },
            ],
          },
        },
      });
    }
  }

  // ── Quickers + skills (Torre de Control) ────────────────────────────────────
  const quickerRole = await prisma.role.upsert({
    where: { key: "quicker" },
    update: {},
    create: { key: "quicker", name: "Quicker" },
  });
  const cats = await prisma.serviceCategory.findMany();
  const bySlug = (s: string) => cats.find((c) => c.slug === s)?.id;
  const QUICKERS = [
    { email: "carolina@quickclean.co", name: "Carolina Méndez", zone: "Chapinero", rating: 4.9, skills: ["limpieza-general", "limpieza-profunda"] },
    { email: "jorge@quickclean.co", name: "Jorge Patiño", zone: "Suba", rating: 4.7, skills: ["limpieza-general", "post-obra"] },
    { email: "diana@quickclean.co", name: "Diana Rojas", zone: "Engativá", rating: 5.0, skills: ["limpieza-general"] },
  ];
  for (const q of QUICKERS) {
    const u = await prisma.user.upsert({
      where: { email: q.email },
      update: {},
      create: { email: q.email, status: "active", emailVerifiedAt: new Date() },
    });
    await prisma.credential.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId: u.id,
        passwordHash: await argon2.hash("Quicker-2026!", { type: argon2.argon2id }),
        mustChangePassword: false,
      },
    });
    await prisma.userRole.upsert({
      where: { userId_roleId: { userId: u.id, roleId: quickerRole.id } },
      update: {},
      create: { userId: u.id, roleId: quickerRole.id },
    });
    const quicker = await prisma.quicker.upsert({
      where: { userId: u.id },
      update: { name: q.name, zone: q.zone, rating: q.rating },
      create: { userId: u.id, name: q.name, zone: q.zone, rating: q.rating },
    });
    for (const slug of q.skills) {
      const catId = bySlug(slug);
      if (catId) {
        await prisma.quickerSkill.upsert({
          where: { quickerId_serviceCategoryId: { quickerId: quicker.id, serviceCategoryId: catId } },
          update: {},
          create: { quickerId: quicker.id, serviceCategoryId: catId },
        });
      }
    }
  }

  // ── Vinculación laboral (clientes empresa/persona + contratos) ──────────────
  // cliente@quickclean.co = persona
  await prisma.client.upsert({
    where: { userId: clientUser.id },
    update: {},
    create: { userId: clientUser.id, name: "Laura Gómez", kind: "persona", requiresDirectHire: false },
  });

  // empresa@quickclean.co = empresa (exige contratación directa)
  const empUser = await prisma.user.upsert({
    where: { email: "empresa@quickclean.co" },
    update: {},
    create: { email: "empresa@quickclean.co", status: "active", emailVerifiedAt: new Date() },
  });
  await prisma.credential.upsert({
    where: { userId: empUser.id },
    update: {},
    create: {
      userId: empUser.id,
      passwordHash: await argon2.hash("Empresa-2026!", { type: argon2.argon2id }),
      mustChangePassword: false,
    },
  });
  const empresaClient = await prisma.client.upsert({
    where: { userId: empUser.id },
    update: { kind: "empresa", requiresDirectHire: true },
    create: { userId: empUser.id, name: "Oficinas Andinas SAS", kind: "empresa", requiresDirectHire: true },
  });

  // Carolina tiene contrato laboral (employee) con la empresa → es la única idónea
  const carolinaUser = await prisma.user.findUnique({ where: { email: "carolina@quickclean.co" } });
  const carolinaQuicker = carolinaUser
    ? await prisma.quicker.findUnique({ where: { userId: carolinaUser.id } })
    : null;
  if (carolinaQuicker) {
    const existing = await prisma.workContract.findFirst({
      where: { quickerId: carolinaQuicker.id, clientId: empresaClient.id, engagementType: "employee" },
    });
    if (!existing) {
      await prisma.workContract.create({
        data: {
          quickerId: carolinaQuicker.id,
          clientId: empresaClient.id,
          engagementType: "employee",
          position: "Operaria de aseo",
          contractKind: "indefinido",
          status: "activo",
        },
      });
    }

    // Solicitud de ausencia de ejemplo (en revisión) para la Torre de Control
    const hasLeave = await prisma.leaveRequest.findFirst({ where: { quickerId: carolinaQuicker.id } });
    if (!hasLeave) {
      await prisma.leaveRequest.create({
        data: {
          quickerId: carolinaQuicker.id,
          kind: "incapacidad",
          startDate: new Date("2026-07-01"),
          endDate: new Date("2026-07-03"),
          reason: "Incapacidad médica por EPS (3 días)",
        },
      });
    }
  }

  console.log("Seed listo. admin/cliente/empresa + catálogo + tarifa + 3 quickers (Carolina con contrato laboral empresa)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
