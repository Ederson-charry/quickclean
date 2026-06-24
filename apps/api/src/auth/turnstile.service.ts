import { ForbiddenException, Injectable } from "@nestjs/common";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

@Injectable()
export class TurnstileService {
  async verify(token: string, ip?: string): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET;
    if (!secret) {
      return true; // dev sin Turnstile configurado
    }
    const body = new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) });
    const res = await fetch(SITEVERIFY_URL, { method: "POST", body });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  }

  /** Lanza 403 si el challenge es requerido y falla. En dev (sin secret) es no-op. */
  async assert(token: string | undefined, ip?: string): Promise<void> {
    if (!process.env.TURNSTILE_SECRET) {
      return;
    }
    if (!token || !(await this.verify(token, ip))) {
      throw new ForbiddenException("Verificación anti-bot fallida");
    }
  }
}
