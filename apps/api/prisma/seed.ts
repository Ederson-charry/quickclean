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

  console.log("Seed listo. admin@quickclean.co / CambiaEsto-2026! · catálogo + tarifa base sembrados");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
