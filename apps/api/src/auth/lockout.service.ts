import { Injectable } from "@nestjs/common";
import { security } from "../config/security.config";

const BOGOTA_OFFSET_MS = 5 * 3_600_000; // America/Bogota = UTC-5 (sin horario de verano)

@Injectable()
export class LockoutService {
  shouldLock(failedCount: number): boolean {
    return failedCount >= security.maxFailedLogins;
  }

  isLocked(lockedUntil: Date | null): boolean {
    return lockedUntil != null && lockedUntil.getTime() > Date.now();
  }

  /** Próxima medianoche en America/Bogota, devuelta como instante UTC. */
  nextMidnightBogota(): Date {
    const nowBogota = new Date(Date.now() - BOGOTA_OFFSET_MS);
    const nextBogota = new Date(nowBogota);
    nextBogota.setUTCHours(24, 0, 0, 0);
    return new Date(nextBogota.getTime() + BOGOTA_OFFSET_MS);
  }
}
