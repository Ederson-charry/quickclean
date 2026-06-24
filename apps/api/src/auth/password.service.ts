import { BadRequestException, Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { security } from "../config/security.config";

@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  verify(hash: string, plain: string): Promise<boolean> {
    return argon2.verify(hash, plain);
  }

  isExpired(passwordChangedAt: Date): boolean {
    const ageMs = Date.now() - passwordChangedAt.getTime();
    return ageMs > security.passwordMaxAgeDays * 86_400_000;
  }

  assertPolicy(plain: string): void {
    if (plain.length < security.minPasswordLength) {
      throw new BadRequestException(
        `La contraseña debe tener al menos ${security.minPasswordLength} caracteres`,
      );
    }
  }

  /** true si el nuevo password coincide con alguno del historial reciente. */
  async isReused(newPlain: string, recentHashes: string[]): Promise<boolean> {
    for (const h of recentHashes) {
      if (await argon2.verify(h, newPlain)) {
        return true;
      }
    }
    return false;
  }
}
