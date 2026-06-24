import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { RolesGuard } from "./roles.guard";

function ctx(userPerms: string[], required: string[]) {
  const reflector = new Reflector();
  vi.spyOn(reflector, "getAllAndOverride").mockReturnValue(required);
  const guard = new RolesGuard(reflector);
  const execCtx = {
    switchToHttp: () => ({ getRequest: () => ({ user: { permissions: userPerms } }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
  return { guard, execCtx };
}

describe("RolesGuard", () => {
  it("permite si el usuario tiene el permiso", () => {
    const { guard, execCtx } = ctx(["tariff.assign"], ["tariff.assign"]);
    expect(guard.canActivate(execCtx)).toBe(true);
  });

  it("niega si falta el permiso", () => {
    const { guard, execCtx } = ctx(["service.read"], ["tariff.assign"]);
    expect(() => guard.canActivate(execCtx)).toThrow(ForbiddenException);
  });

  it("permite si la ruta no exige permisos", () => {
    const { guard, execCtx } = ctx([], []);
    expect(guard.canActivate(execCtx)).toBe(true);
  });
});
