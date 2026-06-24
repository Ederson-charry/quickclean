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

  console.log("Seed listo. admin@quickclean.co / CambiaEsto-2026! (cambio forzado al primer login)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
