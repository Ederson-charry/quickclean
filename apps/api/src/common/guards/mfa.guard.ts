import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { MfaService } from "../../mfa/mfa.service";

@Injectable()
export class MfaGuard implements CanActivate {
  constructor(private readonly mfa: MfaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const { user } = ctx.switchToHttp().getRequest();
    if (!user?.id) {
      throw new ForbiddenException("No autenticado");
    }
    if (!(await this.mfa.isEnrolled(user.id))) {
      throw new ForbiddenException("2FA requerido para esta acción");
    }
    return true;
  }
}
