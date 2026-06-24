import { Injectable } from "@nestjs/common";
import { security } from "../config/security.config";
import { PrismaService } from "../prisma/prisma.service";

export type AssignableStatus = "active" | "locked" | "inactive" | "suspended";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: { credential: true } });
  }

  async permissionsOf(userId: string): Promise<string[]> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    const set = new Set<string>();
    row?.roles.forEach((ur) =>
      ur.role.permissions.forEach((rp) => set.add(rp.permission.key)),
    );
    return [...set];
  }

  /** Perfil para el front: identidad + roles + permisos (un solo query). */
  async profile(
    userId: string,
  ): Promise<{ id: string; email: string; roles: string[]; permissions: string[] } | null> {
    const row = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
      },
    });
    if (!row) {
      return null;
    }
    const permissions = new Set<string>();
    const roles = row.roles.map((ur) => {
      ur.role.permissions.forEach((rp) => permissions.add(rp.permission.key));
      return ur.role.key;
    });
    return { id: row.id, email: row.email, roles, permissions: [...permissions] };
  }

  async isInactive(userId: string): Promise<boolean> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) {
      return false;
    }
    const ageMs = Date.now() - u.lastActivityAt.getTime();
    return ageMs > security.inactivityDisableDays * 86_400_000;
  }

  touchActivity(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastActivityAt: new Date() },
    });
  }

  setStatus(userId: string, status: AssignableStatus) {
    return this.prisma.user.update({ where: { id: userId }, data: { status } });
  }
}
