import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const required =
      this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]) ?? [];
    if (required.length === 0) {
      return true;
    }
    const { user } = ctx.switchToHttp().getRequest();
    const perms: string[] = user?.permissions ?? [];
    const ok = required.every((p) => perms.includes(p));
    if (!ok) {
      throw new ForbiddenException("Permisos insuficientes");
    }
    return true;
  }
}
