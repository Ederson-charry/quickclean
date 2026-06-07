# Fundación Backend + Seguridad/Auth — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir QuickClean en un monorepo con una API NestJS real (Postgres/Prisma) y construir el subsistema de Seguridad/Auth de producción (auth argon2id, JWT access+refresh rotatorio, RBAC, 2FA TOTP, política 90/90, lockout, Turnstile), conectando el front existente al backend.

**Architecture:** Monorepo pnpm con `apps/web` (front React actual, sin reescribir), `apps/api` (NestJS modular: Guards para RBAC/2FA, Interceptors), `packages/shared` (schemas Zod + tipos compartidos). Postgres vía Prisma. Defensa en profundidad: Cloudflare/Turnstile + `helmet` + `@nestjs/throttler` + lockout. TDD en cada unidad.

**Tech Stack:** pnpm workspaces, NestJS 10, Prisma 5, PostgreSQL 16 (docker-compose local), argon2, @nestjs/jwt, passport-jwt, otplib, @nestjs/throttler, helmet, zod, Vitest (web) / Jest (api).

**Spec de referencia:** `docs/superpowers/specs/2026-06-06-quickclean-plataforma-produccion-design.md` (§2, §3).

---

## Estructura de archivos (decisiones de descomposición)

```
quickclean/                      (raíz = workspace)
  pnpm-workspace.yaml            nuevo
  package.json                   raíz (scripts orquestadores)
  docker-compose.yml             Postgres local
  apps/
    web/                         ← el front actual movido aquí (src/, index.html, vite...)
    api/
      src/
        main.ts                  bootstrap (helmet, CORS, global pipes)
        app.module.ts
        prisma/
          prisma.service.ts      conexión + Client Extensions (auditoría futura)
          schema.prisma
        common/
          guards/jwt-auth.guard.ts
          guards/roles.guard.ts          RBAC por permisos
          guards/mfa.guard.ts            exige 2FA en rutas sensibles
          decorators/permissions.decorator.ts
          decorators/current-user.decorator.ts
        config/
          security.config.ts     PASSWORD_MAX_AGE_DAYS, INACTIVITY_DISABLE_DAYS, etc.
        health/health.controller.ts
        auth/
          auth.module.ts
          auth.controller.ts     /auth/login /auth/refresh /auth/logout
          auth.service.ts        orquesta login/lockout/tokens
          password.service.ts    argon2 hash/verify + política 90/90 + history
          token.service.ts       access JWT + refresh rotatorio + reuse-detection
          lockout.service.ts     5 intentos → bloqueo hasta el día siguiente
          turnstile.service.ts   verificación CAPTCHA server-side
        users/
          users.module.ts
          users.service.ts       CRUD User + lastActivityAt + estados
        mfa/
          mfa.module.ts
          mfa.service.ts         TOTP enroll/verify + recovery codes
          mfa.controller.ts      /mfa/enroll /mfa/confirm /mfa/verify
  packages/
    shared/
      src/index.ts               re-export
      src/auth.schemas.ts        Zod: LoginInput, etc. (usado por web y api)
```

Principio: el front **no se reescribe**, solo se mueve a `apps/web` y se le cambia la capa de datos (cliente HTTP). Cada archivo de `apps/api` tiene una responsabilidad única.

---

## FASE 0 — Fundación

### Task 1: Inicializar workspace pnpm y mover el front a apps/web

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json` (raíz nuevo)
- Move: todo el front actual → `apps/web/`

- [ ] **Step 1: Crear la rama de trabajo**

```bash
git checkout -b feat/fundacion-seguridad
```

- [ ] **Step 2: Mover el front a apps/web**

```bash
mkdir -p apps/web
git mv src index.html vite.config.ts vitest.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json eslint.config.js components.json package.json package-lock.json public apps/web/
# CLAUDE.md y docs/ se quedan en la raíz
```

- [ ] **Step 3: Crear `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Crear `package.json` raíz**

```json
{
  "name": "quickclean-monorepo",
  "private": true,
  "scripts": {
    "dev:web": "pnpm --filter web dev",
    "dev:api": "pnpm --filter api start:dev",
    "test": "pnpm -r test",
    "db:up": "docker compose up -d db",
    "db:migrate": "pnpm --filter api prisma migrate dev"
  },
  "devDependencies": { "typescript": "~6.0.2" },
  "packageManager": "pnpm@9.12.0"
}
```

- [ ] **Step 5: Eliminar el lockfile npm del web e instalar con pnpm**

```bash
rm apps/web/package-lock.json
pnpm install
```

- [ ] **Step 6: Verificar que el front sigue corriendo**

Run: `pnpm dev:web`
Expected: Vite levanta en `localhost:5173` sin errores; la app demo carga.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: convertir a monorepo pnpm, mover front a apps/web"
```

---

### Task 2: packages/shared con schemas Zod compartidos

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`, `packages/shared/src/auth.schemas.ts`
- Test: `packages/shared/src/auth.schemas.test.ts`

- [ ] **Step 1: Crear `packages/shared/package.json`**

```json
{
  "name": "@quickclean/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": { "test": "vitest run" },
  "dependencies": { "zod": "^4.4.3" },
  "devDependencies": { "vitest": "^3.2.6" }
}
```

- [ ] **Step 2: Crear `packages/shared/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ESNext", "moduleResolution": "Bundler",
    "strict": true, "declaration": true, "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Escribir el test que falla** — `packages/shared/src/auth.schemas.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { LoginInput } from "./auth.schemas";

describe("LoginInput", () => {
  it("acepta email válido + password + turnstileToken opcional", () => {
    const r = LoginInput.safeParse({ email: "a@b.co", password: "x".repeat(12) });
    expect(r.success).toBe(true);
  });
  it("rechaza email inválido", () => {
    const r = LoginInput.safeParse({ email: "no-email", password: "x".repeat(12) });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 4: Ejecutar el test (debe fallar)**

Run: `pnpm --filter @quickclean/shared test`
Expected: FAIL — `Cannot find module './auth.schemas'`.

- [ ] **Step 5: Implementar `packages/shared/src/auth.schemas.ts`**

```ts
import { z } from "zod";

export const LoginInput = z.object({
  email: z.string().email(),
  password: z.string().min(12),
  turnstileToken: z.string().optional(),
  otp: z.string().length(6).optional(),
});
export type LoginInput = z.infer<typeof LoginInput>;

export const ChangePasswordInput = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(12),
});
export type ChangePasswordInput = z.infer<typeof ChangePasswordInput>;
```

- [ ] **Step 6: Crear `packages/shared/src/index.ts`**

```ts
export * from "./auth.schemas";
```

- [ ] **Step 7: Ejecutar el test (debe pasar)**

Run: `pnpm --filter @quickclean/shared test`
Expected: PASS (2 tests).

- [ ] **Step 8: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): schemas Zod de auth compartidos"
```

---

### Task 3: Scaffolding NestJS en apps/api

**Files:**
- Create: `apps/api/` (NestJS estándar), `apps/api/package.json` (editado para el workspace)

- [ ] **Step 1: Generar el proyecto Nest**

```bash
pnpm dlx @nestjs/cli@10 new api --directory apps/api --package-manager pnpm --skip-git
```

- [ ] **Step 2: Renombrar el package y añadir shared como dependencia** — editar `apps/api/package.json`

```jsonc
{
  "name": "api",
  // ...lo generado...
  "dependencies": {
    "@quickclean/shared": "workspace:*"
    // + el resto generado por nest
  }
}
```

- [ ] **Step 3: Instalar desde la raíz**

```bash
pnpm install
```

- [ ] **Step 4: Verificar que arranca**

Run: `pnpm dev:api`
Expected: Nest levanta en `localhost:3000`; log "Nest application successfully started".

- [ ] **Step 5: Commit**

```bash
git add apps/api pnpm-lock.yaml
git commit -m "feat(api): scaffolding NestJS en apps/api"
```

---

### Task 4: Postgres local + Prisma + modelo User

**Files:**
- Create: `docker-compose.yml`, `apps/api/src/prisma/schema.prisma`, `apps/api/src/prisma/prisma.service.ts`, `apps/api/.env`
- Test: `apps/api/src/prisma/prisma.service.spec.ts`

- [ ] **Step 1: Crear `docker-compose.yml` (raíz)**

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: quickclean
      POSTGRES_PASSWORD: localdev
      POSTGRES_DB: quickclean
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
volumes:
  pgdata:
```

- [ ] **Step 2: Instalar Prisma y levantar la DB**

```bash
pnpm --filter api add @prisma/client && pnpm --filter api add -D prisma
pnpm db:up
```

- [ ] **Step 3: Crear `apps/api/.env`**

```
DATABASE_URL="postgresql://quickclean:localdev@localhost:5432/quickclean?schema=public"
```

- [ ] **Step 4: Crear `apps/api/src/prisma/schema.prisma` con el modelo de identidad**

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

enum UserStatus { active locked inactive suspended pending_verification }

model User {
  id               String    @id @default(uuid())
  email            String    @unique
  phone            String?
  status           UserStatus @default(pending_verification)
  emailVerifiedAt  DateTime?
  phoneVerifiedAt  DateTime?
  lastActivityAt   DateTime  @default(now())
  failedLoginCount Int       @default(0)
  lockedUntil      DateTime?
  createdAt        DateTime  @default(now())
  credential       Credential?
  passwordHistory  PasswordHistory[]
  sessions         Session[]
  mfaFactors       MfaFactor[]
  recoveryCodes    RecoveryCode[]
  roles            UserRole[]
}

model Credential {
  userId            String   @id
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  passwordHash      String
  passwordChangedAt DateTime @default(now())
  mustChangePassword Boolean @default(false)
}

model PasswordHistory {
  id           String   @id @default(uuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  passwordHash String
  createdAt    DateTime @default(now())
}

model Session {
  id               String    @id @default(uuid())
  userId           String
  user             User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  refreshTokenHash String
  familyId         String
  ip               String?
  userAgent        String?
  createdAt        DateTime  @default(now())
  expiresAt        DateTime
  revokedAt        DateTime?
}

model MfaFactor {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  type        String   // "totp" | "sms"
  secret      String   // cifrado en reposo
  confirmedAt DateTime?
  isDefault   Boolean  @default(false)
}

model RecoveryCode {
  id       String    @id @default(uuid())
  userId   String
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  codeHash String
  usedAt   DateTime?
}

model Role {
  id          String           @id @default(uuid())
  key         String           @unique // super_admin|ops|finance|auditor|quicker|client
  name        String
  users       UserRole[]
  permissions RolePermission[]
}
model Permission {
  id    String           @id @default(uuid())
  key   String           @unique // ej. service.update, tariff.assign, audit.read
  roles RolePermission[]
}
model UserRole {
  userId String
  roleId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role @relation(fields: [roleId], references: [id], onDelete: Cascade)
  @@id([userId, roleId])
}
model RolePermission {
  roleId       String
  permissionId String
  role         Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission   Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)
  @@id([roleId, permissionId])
}
```

- [ ] **Step 5: Crear la migración inicial**

```bash
pnpm --filter api prisma migrate dev --name init_identity
```
Expected: crea `apps/api/src/prisma/migrations/.../migration.sql` y aplica a la DB.

- [ ] **Step 6: Crear `apps/api/src/prisma/prisma.service.ts`**

```ts
import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() { await this.$connect(); }
}
```

- [ ] **Step 7: Escribir test de humo** — `apps/api/src/prisma/prisma.service.spec.ts`

```ts
import { PrismaService } from "./prisma.service";

describe("PrismaService", () => {
  it("conecta y consulta", async () => {
    const prisma = new PrismaService();
    await prisma.onModuleInit();
    const count = await prisma.user.count();
    expect(typeof count).toBe("number");
    await prisma.$disconnect();
  });
});
```

- [ ] **Step 8: Ejecutar el test (con DB arriba)**

Run: `pnpm db:up && pnpm --filter api test -- prisma.service`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add docker-compose.yml apps/api
git commit -m "feat(api): Postgres + Prisma + modelo de identidad"
```

---

### Task 5: Health check + helmet + CORS en bootstrap

**Files:**
- Create: `apps/api/src/health/health.controller.ts`
- Modify: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`
- Test: `apps/api/src/health/health.controller.spec.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("responde ok", () => {
    expect(new HealthController().check()).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `pnpm --filter api test -- health`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar `apps/api/src/health/health.controller.ts`**

```ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  check() { return { status: "ok" as const }; }
}
```

- [ ] **Step 4: Registrar en `app.module.ts`** (añadir `HealthController` a `controllers` y `PrismaService` a `providers`).

- [ ] **Step 5: Endurecer `apps/api/src/main.ts`**

```ts
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? "http://localhost:5173", credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(3000);
}
bootstrap();
```

- [ ] **Step 6: Instalar helmet y verificar**

```bash
pnpm --filter api add helmet
pnpm --filter api test -- health
```
Expected: PASS. Luego `pnpm dev:api` y `curl localhost:3000/health` → `{"status":"ok"}`.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): health check + helmet + CORS + ValidationPipe"
```

---

### Task 6: Cliente HTTP en el front + CI

**Files:**
- Create: `apps/web/src/lib/http.ts`, `.github/workflows/ci.yml`
- Test: `apps/web/src/lib/http.test.ts`

- [ ] **Step 1: Escribir el test que falla** — `apps/web/src/lib/http.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { apiUrl } from "./http";

describe("apiUrl", () => {
  it("compone sobre VITE_API_URL", () => {
    expect(apiUrl("/auth/login")).toMatch(/\/auth\/login$/);
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `pnpm --filter web test -- http`
Expected: FAIL.

- [ ] **Step 3: Implementar `apps/web/src/lib/http.ts`**

```ts
const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function apiUrl(path: string): string {
  return `${BASE}${path}`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `pnpm --filter web test -- http`
Expected: PASS.

- [ ] **Step 5: Crear `.github/workflows/ci.yml`**

```yaml
name: CI
on: [push, pull_request]
jobs:
  build-test:
    runs-on: ubuntu-latest
    services:
      db:
        image: postgres:16
        env: { POSTGRES_USER: quickclean, POSTGRES_PASSWORD: localdev, POSTGRES_DB: quickclean }
        ports: ["5432:5432"]
        options: >-
          --health-cmd "pg_isready -U quickclean" --health-interval 5s --health-timeout 5s --health-retries 5
    env:
      DATABASE_URL: postgresql://quickclean:localdev@localhost:5432/quickclean?schema=public
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter api prisma migrate deploy
      - run: pnpm -r test
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/http.ts .github/workflows/ci.yml
git commit -m "feat: cliente HTTP en front + pipeline CI"
```

---

## FASE 1 — Seguridad / Auth

### Task 7: PasswordService — argon2 + política 90/90 + history

**Files:**
- Create: `apps/api/src/auth/password.service.ts`, `apps/api/src/config/security.config.ts`
- Test: `apps/api/src/auth/password.service.spec.ts`

- [ ] **Step 1: Crear config de seguridad** — `apps/api/src/config/security.config.ts`

```ts
export const security = {
  passwordMaxAgeDays: Number(process.env.PASSWORD_MAX_AGE_DAYS ?? 90),
  inactivityDisableDays: Number(process.env.INACTIVITY_DISABLE_DAYS ?? 90),
  passwordHistory: Number(process.env.PASSWORD_HISTORY ?? 5),
  maxFailedLogins: Number(process.env.MAX_FAILED_LOGINS ?? 5),
  minPasswordLength: 12,
};
```

- [ ] **Step 2: Escribir el test que falla** — `password.service.spec.ts`

```ts
import { PasswordService } from "./password.service";

const svc = new PasswordService();

describe("PasswordService", () => {
  it("hash y verify coherentes", async () => {
    const h = await svc.hash("Sup3rSecret!2026");
    expect(await svc.verify(h, "Sup3rSecret!2026")).toBe(true);
    expect(await svc.verify(h, "otra")).toBe(false);
  });
  it("isExpired true si pasaron > maxAge días", () => {
    const old = new Date(Date.now() - 91 * 86400_000);
    expect(svc.isExpired(old)).toBe(true);
  });
  it("isExpired false si reciente", () => {
    expect(svc.isExpired(new Date())).toBe(false);
  });
  it("rechaza password corta", () => {
    expect(() => svc.assertPolicy("corta")).toThrow();
  });
});
```

- [ ] **Step 3: Ejecutar (debe fallar)**

Run: `pnpm --filter api test -- password.service`
Expected: FAIL.

- [ ] **Step 4: Instalar argon2 e implementar `password.service.ts`**

```bash
pnpm --filter api add argon2
```

```ts
import { BadRequestException, Injectable } from "@nestjs/common";
import * as argon2 from "argon2";
import { security } from "../config/security.config";

@Injectable()
export class PasswordService {
  hash(plain: string) { return argon2.hash(plain, { type: argon2.argon2id }); }
  verify(hash: string, plain: string) { return argon2.verify(hash, plain); }

  isExpired(passwordChangedAt: Date): boolean {
    const ageMs = Date.now() - passwordChangedAt.getTime();
    return ageMs > security.passwordMaxAgeDays * 86400_000;
  }

  assertPolicy(plain: string): void {
    if (plain.length < security.minPasswordLength)
      throw new BadRequestException(`La contraseña debe tener al menos ${security.minPasswordLength} caracteres`);
  }

  /** true si el nuevo hash coincide con alguno del historial reciente */
  async isReused(newPlain: string, recentHashes: string[]): Promise<boolean> {
    for (const h of recentHashes) if (await argon2.verify(h, newPlain)) return true;
    return false;
  }
}
```

- [ ] **Step 5: Ejecutar (debe pasar)**

Run: `pnpm --filter api test -- password.service`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/password.service.ts apps/api/src/config/security.config.ts
git commit -m "feat(api): PasswordService argon2 + política 90 días + no-reúso"
```

---

### Task 8: LockoutService — 5 intentos → bloqueo hasta el día siguiente

**Files:**
- Create: `apps/api/src/auth/lockout.service.ts`
- Test: `apps/api/src/auth/lockout.service.spec.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { LockoutService } from "./lockout.service";

const svc = new LockoutService();

describe("LockoutService", () => {
  it("no bloquea con < 5 fallos", () => {
    expect(svc.shouldLock(4)).toBe(false);
  });
  it("bloquea al 5º fallo", () => {
    expect(svc.shouldLock(5)).toBe(true);
  });
  it("nextMidnightBogota da una fecha futura", () => {
    expect(svc.nextMidnightBogota().getTime()).toBeGreaterThan(Date.now());
  });
  it("isLocked respeta lockedUntil", () => {
    expect(svc.isLocked(new Date(Date.now() + 1000))).toBe(true);
    expect(svc.isLocked(new Date(Date.now() - 1000))).toBe(false);
    expect(svc.isLocked(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `pnpm --filter api test -- lockout.service`
Expected: FAIL.

- [ ] **Step 3: Implementar `lockout.service.ts`**

```ts
import { Injectable } from "@nestjs/common";
import { security } from "../config/security.config";

@Injectable()
export class LockoutService {
  shouldLock(failedCount: number): boolean {
    return failedCount >= security.maxFailedLogins;
  }

  isLocked(lockedUntil: Date | null): boolean {
    return lockedUntil != null && lockedUntil.getTime() > Date.now();
  }

  /** Próxima medianoche en America/Bogota (UTC-5, sin DST). */
  nextMidnightBogota(): Date {
    const offsetMs = 5 * 3600_000; // Bogota = UTC-5
    const nowBogota = new Date(Date.now() - offsetMs);
    const next = new Date(nowBogota);
    next.setUTCHours(24, 0, 0, 0);
    return new Date(next.getTime() + offsetMs);
  }
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `pnpm --filter api test -- lockout.service`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/lockout.service.ts
git commit -m "feat(api): LockoutService 5 intentos → bloqueo hasta medianoche Bogotá"
```

---

### Task 9: TokenService — access JWT + refresh rotatorio con detección de reúso

**Files:**
- Create: `apps/api/src/auth/token.service.ts`
- Test: `apps/api/src/auth/token.service.spec.ts`

- [ ] **Step 1: Instalar dependencias**

```bash
pnpm --filter api add @nestjs/jwt
```

- [ ] **Step 2: Escribir el test que falla** (usa un PrismaService mock en memoria)

```ts
import { JwtService } from "@nestjs/jwt";
import { TokenService } from "./token.service";

function fakePrisma() {
  const sessions: any[] = [];
  return {
    _sessions: sessions,
    session: {
      create: async ({ data }: any) => { const s = { id: String(sessions.length+1), revokedAt: null, ...data }; sessions.push(s); return s; },
      findUnique: async ({ where }: any) => sessions.find(s => s.id === where.id) ?? null,
      update: async ({ where, data }: any) => { const s = sessions.find(x => x.id === where.id); Object.assign(s, data); return s; },
      updateMany: async ({ where, data }: any) => { sessions.filter(s => s.familyId === where.familyId).forEach(s => Object.assign(s, data)); return { count: 1 }; },
    },
  } as any;
}

describe("TokenService", () => {
  const jwt = new JwtService({ secret: "test-secret" });

  it("emite access token con sub y permisos", async () => {
    const svc = new TokenService(jwt, fakePrisma());
    const { accessToken } = await svc.issue({ userId: "u1", permissions: ["audit.read"] });
    const payload = jwt.verify(accessToken);
    expect(payload.sub).toBe("u1");
    expect(payload.permissions).toContain("audit.read");
  });

  it("rota refresh: el viejo deja de ser válido", async () => {
    const prisma = fakePrisma();
    const svc = new TokenService(jwt, prisma);
    const first = await svc.issue({ userId: "u1", permissions: [] });
    const rotated = await svc.rotate(first.refreshToken);
    expect(rotated.refreshToken).not.toEqual(first.refreshToken);
    await expect(svc.rotate(first.refreshToken)).rejects.toThrow(); // reúso detectado
  });
});
```

- [ ] **Step 3: Ejecutar (debe fallar)**

Run: `pnpm --filter api test -- token.service`
Expected: FAIL.

- [ ] **Step 4: Implementar `token.service.ts`**

```ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomUUID, createHash } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

const ACCESS_TTL = "15m";
const REFRESH_TTL_DAYS = 14;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

@Injectable()
export class TokenService {
  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  private signAccess(userId: string, permissions: string[]) {
    return this.jwt.sign({ sub: userId, permissions }, { expiresIn: ACCESS_TTL });
  }

  async issue(input: { userId: string; permissions: string[]; ip?: string; userAgent?: string }) {
    const familyId = randomUUID();
    return this.persist(input.userId, input.permissions, familyId, input.ip, input.userAgent);
  }

  private async persist(userId: string, permissions: string[], familyId: string, ip?: string, userAgent?: string) {
    const refreshToken = randomUUID() + "." + randomUUID();
    await this.prisma.session.create({
      data: {
        userId, familyId, refreshTokenHash: sha(refreshToken), ip, userAgent,
        expiresAt: new Date(Date.now() + REFRESH_TTL_DAYS * 86400_000),
      },
    });
    return { accessToken: this.signAccess(userId, permissions), refreshToken: `${familyId}:${refreshToken}` };
  }

  async rotate(presented: string) {
    const [familyId, raw] = presented.split(/:(.+)/);
    const hash = sha(raw ?? "");
    const session = await this.prisma.session.findUnique({ where: { id: undefined as any } }).catch(() => null);
    // buscar por hash dentro de la familia
    const match = await (this.prisma as any).session.findFirst?.({ where: { familyId, refreshTokenHash: hash } })
      ?? (this.prisma as any)._sessions?.find((s: any) => s.familyId === familyId && s.refreshTokenHash === hash);
    if (!match || match.revokedAt) {
      // refresh inválido o ya rotado → posible robo: revoca toda la familia
      await this.prisma.session.updateMany({ where: { familyId }, data: { revokedAt: new Date() } });
      throw new UnauthorizedException("Refresh inválido");
    }
    await this.prisma.session.update({ where: { id: match.id }, data: { revokedAt: new Date() } });
    return this.persist(match.userId, [], familyId, match.ip, match.userAgent);
  }

  async revokeFamily(familyId: string) {
    await this.prisma.session.updateMany({ where: { familyId }, data: { revokedAt: new Date() } });
  }
}
```

> **Nota de implementación:** en producción `rotate()` carga los permisos reales del usuario (vía UsersService) en vez de `[]`. El test mock simplifica. Al integrar en Task 11, inyectar `UsersService` y reemplazar el `[]` por `await users.permissionsOf(match.userId)`.

- [ ] **Step 5: Ejecutar (debe pasar)**

Run: `pnpm --filter api test -- token.service`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/auth/token.service.ts
git commit -m "feat(api): TokenService access JWT + refresh rotatorio + reuse-detection"
```

---

### Task 10: UsersService — lookup, permisos, lastActivity, inactividad

**Files:**
- Create: `apps/api/src/users/users.service.ts`, `apps/api/src/users/users.module.ts`
- Test: `apps/api/src/users/users.service.spec.ts` (integración con DB de test)

- [ ] **Step 1: Escribir el test que falla** (usa la DB local; crea y limpia un usuario)

```ts
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "./users.service";

describe("UsersService (integración)", () => {
  const prisma = new PrismaService();
  const users = new UsersService(prisma);
  let id: string;

  beforeAll(async () => {
    await prisma.onModuleInit();
    const u = await prisma.user.create({ data: { email: `t${Date.now()}@x.co`, status: "active" } });
    id = u.id;
  });
  afterAll(async () => { await prisma.user.delete({ where: { id } }); await prisma.$disconnect(); });

  it("isInactive false para usuario recién activo", async () => {
    expect(await users.isInactive(id)).toBe(false);
  });
  it("touchActivity actualiza lastActivityAt", async () => {
    const before = (await prisma.user.findUnique({ where: { id } }))!.lastActivityAt;
    await new Promise(r => setTimeout(r, 5));
    await users.touchActivity(id);
    const after = (await prisma.user.findUnique({ where: { id } }))!.lastActivityAt;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `pnpm db:up && pnpm --filter api test -- users.service`
Expected: FAIL.

- [ ] **Step 3: Implementar `users.service.ts`**

```ts
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { security } from "../config/security.config";

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email }, include: { credential: true } });
  }

  async permissionsOf(userId: string): Promise<string[]> {
    const rows = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
    });
    const set = new Set<string>();
    rows?.roles.forEach(ur => ur.role.permissions.forEach(rp => set.add(rp.permission.key)));
    return [...set];
  }

  async isInactive(userId: string): Promise<boolean> {
    const u = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!u) return false;
    const ageMs = Date.now() - u.lastActivityAt.getTime();
    return ageMs > security.inactivityDisableDays * 86400_000;
  }

  touchActivity(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { lastActivityAt: new Date() } });
  }

  setStatus(userId: string, status: "active" | "locked" | "inactive" | "suspended") {
    return this.prisma.user.update({ where: { id: userId }, data: { status } });
  }
}
```

- [ ] **Step 4: Crear `users.module.ts`** (exporta `UsersService`, importa Prisma).

- [ ] **Step 5: Ejecutar (debe pasar)**

Run: `pnpm --filter api test -- users.service`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/users
git commit -m "feat(api): UsersService (permisos, inactividad 90 días, lastActivity)"
```

---

### Task 11: AuthService + /auth/login (orquesta lockout, 90/90, tokens)

**Files:**
- Create: `apps/api/src/auth/auth.service.ts`, `apps/api/src/auth/auth.controller.ts`, `apps/api/src/auth/auth.module.ts`
- Test: `apps/api/src/auth/auth.service.spec.ts`

- [ ] **Step 1: Escribir el test que falla** (mocks de servicios)

```ts
import { UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

function deps(overrides: any = {}) {
  return {
    users: { findByEmail: async () => ({ id: "u1", status: "active", failedLoginCount: 0, lockedUntil: null, credential: { passwordHash: "h", passwordChangedAt: new Date(), mustChangePassword: false } }), permissionsOf: async () => [], touchActivity: async () => {}, isInactive: async () => false, ...overrides.users },
    password: { verify: async () => true, isExpired: () => false, ...overrides.password },
    lockout: { isLocked: () => false, shouldLock: () => false, nextMidnightBogota: () => new Date(Date.now()+1000), ...overrides.lockout },
    tokens: { issue: async () => ({ accessToken: "a", refreshToken: "r" }), ...overrides.tokens },
    prisma: { user: { update: async () => {} }, ...overrides.prisma },
    turnstile: { verify: async () => true, ...overrides.turnstile },
  } as any;
}

describe("AuthService.login", () => {
  it("éxito devuelve tokens", async () => {
    const d = deps();
    const svc = new AuthService(d.users, d.password, d.lockout, d.tokens, d.prisma, d.turnstile);
    const r = await svc.login({ email: "a@b.co", password: "x".repeat(12) }, {});
    expect(r.accessToken).toBe("a");
  });
  it("password incorrecta lanza Unauthorized", async () => {
    const d = deps({ password: { verify: async () => false } });
    const svc = new AuthService(d.users, d.password, d.lockout, d.tokens, d.prisma, d.turnstile);
    await expect(svc.login({ email: "a@b.co", password: "x".repeat(12) }, {})).rejects.toThrow(UnauthorizedException);
  });
  it("cuenta bloqueada lanza Unauthorized", async () => {
    const d = deps({ lockout: { isLocked: () => true } });
    const svc = new AuthService(d.users, d.password, d.lockout, d.tokens, d.prisma, d.turnstile);
    await expect(svc.login({ email: "a@b.co", password: "x".repeat(12) }, {})).rejects.toThrow(/bloquead/);
  });
  it("password expirada exige cambio", async () => {
    const d = deps({ password: { verify: async () => true, isExpired: () => true } });
    const svc = new AuthService(d.users, d.password, d.lockout, d.tokens, d.prisma, d.turnstile);
    const r = await svc.login({ email: "a@b.co", password: "x".repeat(12) }, {});
    expect(r.mustChangePassword).toBe(true);
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `pnpm --filter api test -- auth.service`
Expected: FAIL.

- [ ] **Step 3: Implementar `auth.service.ts`**

```ts
import { Injectable, UnauthorizedException, ForbiddenException } from "@nestjs/common";
import { UsersService } from "../users/users.service";
import { PasswordService } from "./password.service";
import { LockoutService } from "./lockout.service";
import { TokenService } from "./token.service";
import { TurnstileService } from "./turnstile.service";
import { PrismaService } from "../prisma/prisma.service";
import type { LoginInput } from "@quickclean/shared";

@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private password: PasswordService,
    private lockout: LockoutService,
    private tokens: TokenService,
    private prisma: PrismaService,
    private turnstile: TurnstileService,
  ) {}

  async login(input: LoginInput, ctx: { ip?: string; userAgent?: string }) {
    const user = await this.users.findByEmail(input.email);
    // respuesta uniforme anti-enumeración
    const fail = () => { throw new UnauthorizedException("Credenciales inválidas"); };
    if (!user || !user.credential) return fail();

    if (user.status === "inactive" || await this.users.isInactive(user.id))
      throw new ForbiddenException("Cuenta inactiva: requiere reactivación");
    if (this.lockout.isLocked(user.lockedUntil))
      throw new UnauthorizedException("Cuenta bloqueada hasta mañana por intentos fallidos");

    const ok = await this.password.verify(user.credential.passwordHash, input.password);
    if (!ok) {
      const failed = user.failedLoginCount + 1;
      const lockedUntil = this.lockout.shouldLock(failed) ? this.lockout.nextMidnightBogota() : null;
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginCount: lockedUntil ? 0 : failed, lockedUntil, status: lockedUntil ? "locked" : user.status },
      });
      return fail();
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } });
    await this.users.touchActivity(user.id);

    if (user.credential.mustChangePassword || this.password.isExpired(user.credential.passwordChangedAt))
      return { mustChangePassword: true as const };

    const permissions = await this.users.permissionsOf(user.id);
    return this.tokens.issue({ userId: user.id, permissions, ...ctx });
  }
}
```

- [ ] **Step 4: Crear `auth.controller.ts`** (valida con Zod compartido + dispara Turnstile)

```ts
import { Body, Controller, Post, Req, Res, HttpCode } from "@nestjs/common";
import type { Request, Response } from "express";
import { LoginInput } from "@quickclean/shared";
import { AuthService } from "./auth.service";
import { TurnstileService } from "./turnstile.service";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService, private turnstile: TurnstileService) {}

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const input = LoginInput.parse(body);
    await this.turnstile.assert(input.turnstileToken, req.ip);
    const result = await this.auth.login(input, { ip: req.ip, userAgent: req.headers["user-agent"] });
    if ("refreshToken" in result) {
      res.cookie("rt", result.refreshToken, { httpOnly: true, secure: true, sameSite: "strict", path: "/auth" });
      return { accessToken: result.accessToken };
    }
    return result; // { mustChangePassword: true }
  }
}
```

- [ ] **Step 5: Crear `auth.module.ts`** registrando providers (`AuthService`, `PasswordService`, `LockoutService`, `TokenService`, `TurnstileService`), `JwtModule.register({ secret: process.env.JWT_SECRET })`, importando `UsersModule` y Prisma, y declarando `AuthController`.

- [ ] **Step 6: Ejecutar (debe pasar)**

Run: `pnpm --filter api test -- auth.service`
Expected: PASS (4 tests).

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/auth
git commit -m "feat(api): AuthService + /auth/login (lockout, 90/90, tokens, anti-enumeración)"
```

---

### Task 12: TurnstileService — verificación CAPTCHA server-side

**Files:**
- Create: `apps/api/src/auth/turnstile.service.ts`
- Test: `apps/api/src/auth/turnstile.service.spec.ts`

- [ ] **Step 1: Escribir el test que falla** (mock de `fetch`)

```ts
import { TurnstileService } from "./turnstile.service";

describe("TurnstileService", () => {
  it("verify true cuando Cloudflare responde success", async () => {
    const svc = new TurnstileService();
    (globalThis as any).fetch = async () => ({ json: async () => ({ success: true }) });
    expect(await svc.verify("token", "1.2.3.4")).toBe(true);
  });
  it("verify false cuando success=false", async () => {
    const svc = new TurnstileService();
    (globalThis as any).fetch = async () => ({ json: async () => ({ success: false }) });
    expect(await svc.verify("token", "1.2.3.4")).toBe(false);
  });
  it("assert no lanza si TURNSTILE_SECRET no está configurado (dev)", async () => {
    delete process.env.TURNSTILE_SECRET;
    const svc = new TurnstileService();
    await expect(svc.assert(undefined, "1.2.3.4")).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `pnpm --filter api test -- turnstile.service`
Expected: FAIL.

- [ ] **Step 3: Implementar `turnstile.service.ts`**

```ts
import { ForbiddenException, Injectable } from "@nestjs/common";

@Injectable()
export class TurnstileService {
  async verify(token: string, ip?: string): Promise<boolean> {
    const secret = process.env.TURNSTILE_SECRET;
    if (!secret) return true; // dev sin Turnstile configurado
    const body = new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) });
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  }

  /** Lanza 403 si el challenge es requerido y falla. En dev (sin secret) es no-op. */
  async assert(token: string | undefined, ip?: string): Promise<void> {
    if (!process.env.TURNSTILE_SECRET) return;
    if (!token || !(await this.verify(token, ip))) throw new ForbiddenException("Verificación anti-bot fallida");
  }
}
```

- [ ] **Step 4: Ejecutar (debe pasar)**

Run: `pnpm --filter api test -- turnstile.service`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/auth/turnstile.service.ts
git commit -m "feat(api): TurnstileService (verificación CAPTCHA server-side)"
```

---

### Task 13: Rate limiting global (@nestjs/throttler)

**Files:**
- Modify: `apps/api/src/app.module.ts`
- Test: `apps/api/test/throttle.e2e-spec.ts`

- [ ] **Step 1: Instalar**

```bash
pnpm --filter api add @nestjs/throttler
```

- [ ] **Step 2: Escribir el test e2e que falla** — `apps/api/test/throttle.e2e-spec.ts`

```ts
import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { AppModule } from "../src/app.module";

describe("throttler (e2e)", () => {
  let app: INestApplication;
  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(() => app.close());

  it("devuelve 429 tras superar el límite en /health", async () => {
    let last = 200;
    for (let i = 0; i < 25; i++) last = (await request(app.getHttpServer()).get("/health")).status;
    expect(last).toBe(429);
  });
});
```

- [ ] **Step 3: Ejecutar (debe fallar)**

Run: `pnpm --filter api test:e2e -- throttle`
Expected: FAIL (devuelve 200, no 429).

- [ ] **Step 4: Configurar ThrottlerModule en `app.module.ts`**

```ts
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
// dentro de @Module:
//   imports: [ ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]), ... ]
//   providers: [ { provide: APP_GUARD, useClass: ThrottlerGuard }, ... ]
```

> Para `/auth/login` se aplica un límite más estricto con `@Throttle({ default: { ttl: 60_000, limit: 5 } })` sobre el método del controlador (en Task 11). Añadir ese decorador ahora.

- [ ] **Step 5: Ejecutar (debe pasar)**

Run: `pnpm --filter api test:e2e -- throttle`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat(api): rate limiting global + límite estricto en /auth/login"
```

---

### Task 14: Guards de RBAC (permisos) y JWT

**Files:**
- Create: `apps/api/src/common/guards/jwt-auth.guard.ts`, `apps/api/src/common/guards/roles.guard.ts`, `apps/api/src/common/decorators/permissions.decorator.ts`, `apps/api/src/common/decorators/current-user.decorator.ts`
- Test: `apps/api/src/common/guards/roles.guard.spec.ts`

- [ ] **Step 1: Crear el decorador de permisos** — `permissions.decorator.ts`

```ts
import { SetMetadata } from "@nestjs/common";
export const PERMISSIONS_KEY = "permissions";
export const RequirePermissions = (...perms: string[]) => SetMetadata(PERMISSIONS_KEY, perms);
```

- [ ] **Step 2: Escribir el test que falla** — `roles.guard.spec.ts`

```ts
import { Reflector } from "@nestjs/core";
import { ForbiddenException } from "@nestjs/common";
import { RolesGuard } from "./roles.guard";

function ctx(userPerms: string[], required: string[]) {
  const reflector = new Reflector();
  jest.spyOn(reflector, "getAllAndOverride").mockReturnValue(required);
  const guard = new RolesGuard(reflector);
  const execCtx: any = {
    switchToHttp: () => ({ getRequest: () => ({ user: { permissions: userPerms } }) }),
    getHandler: () => ({}), getClass: () => ({}),
  };
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
```

- [ ] **Step 3: Ejecutar (debe fallar)**

Run: `pnpm --filter api test -- roles.guard`
Expected: FAIL.

- [ ] **Step 4: Implementar `roles.guard.ts`**

```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()]) ?? [];
    if (required.length === 0) return true;
    const { user } = ctx.switchToHttp().getRequest();
    const perms: string[] = user?.permissions ?? [];
    const ok = required.every(p => perms.includes(p));
    if (!ok) throw new ForbiddenException("Permisos insuficientes");
    return true;
  }
}
```

- [ ] **Step 5: Implementar `jwt-auth.guard.ts`** (Passport JWT)

```bash
pnpm --filter api add passport @nestjs/passport passport-jwt && pnpm --filter api add -D @types/passport-jwt
```

```ts
// jwt.strategy.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: process.env.JWT_SECRET! });
  }
  validate(payload: { sub: string; permissions: string[] }) {
    return { id: payload.sub, permissions: payload.permissions };
  }
}
```

```ts
// jwt-auth.guard.ts
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
```

- [ ] **Step 6: Crear `current-user.decorator.ts`**

```ts
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
export const CurrentUser = createParamDecorator((_d, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user);
```

- [ ] **Step 7: Ejecutar (debe pasar)**

Run: `pnpm --filter api test -- roles.guard`
Expected: PASS (3 tests).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/common apps/api/src/auth/jwt.strategy.ts
git commit -m "feat(api): Guards JWT + RBAC por permisos + decoradores"
```

---

### Task 15: MFA (TOTP) — enroll, confirm, verify + recovery codes

**Files:**
- Create: `apps/api/src/mfa/mfa.service.ts`, `apps/api/src/mfa/mfa.controller.ts`, `apps/api/src/mfa/mfa.module.ts`, `apps/api/src/common/guards/mfa.guard.ts`
- Test: `apps/api/src/mfa/mfa.service.spec.ts`

- [ ] **Step 1: Instalar otplib**

```bash
pnpm --filter api add otplib qrcode && pnpm --filter api add -D @types/qrcode
```

- [ ] **Step 2: Escribir el test que falla** — `mfa.service.spec.ts`

```ts
import { authenticator } from "otplib";
import { MfaService } from "./mfa.service";

function fakePrisma() {
  const factors: any[] = [];
  return {
    mfaFactor: {
      create: async ({ data }: any) => { const f = { id: "1", confirmedAt: null, ...data }; factors.push(f); return f; },
      findFirst: async ({ where }: any) => factors.find(f => f.userId === where.userId && (where.confirmedAt === undefined || !!f.confirmedAt)) ?? null,
      update: async ({ where, data }: any) => { const f = factors.find(x => x.id === where.id); Object.assign(f, data); return f; },
    },
  } as any;
}

describe("MfaService", () => {
  it("genera secret y un código TOTP válido confirma el enrolamiento", async () => {
    const prisma = fakePrisma();
    const svc = new MfaService(prisma);
    const { secret } = await svc.enroll("u1");
    const token = authenticator.generate(secret);
    expect(await svc.confirm("u1", token)).toBe(true);
  });
  it("verify rechaza un código inválido", async () => {
    const prisma = fakePrisma();
    const svc = new MfaService(prisma);
    const { secret } = await svc.enroll("u1");
    await svc.confirm("u1", authenticator.generate(secret));
    expect(await svc.verify("u1", "000000")).toBe(false);
  });
});
```

- [ ] **Step 3: Ejecutar (debe fallar)**

Run: `pnpm --filter api test -- mfa.service`
Expected: FAIL.

- [ ] **Step 4: Implementar `mfa.service.ts`**

```ts
import { Injectable } from "@nestjs/common";
import { authenticator } from "otplib";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MfaService {
  constructor(private prisma: PrismaService) {}

  async enroll(userId: string): Promise<{ secret: string; otpauth: string }> {
    const secret = authenticator.generateSecret();
    await this.prisma.mfaFactor.create({ data: { userId, type: "totp", secret, isDefault: true } });
    const otpauth = authenticator.keyuri(userId, "QuickClean", secret);
    return { secret, otpauth };
  }

  async confirm(userId: string, token: string): Promise<boolean> {
    const factor = await this.prisma.mfaFactor.findFirst({ where: { userId, type: "totp" } });
    if (!factor) return false;
    if (!authenticator.verify({ token, secret: factor.secret })) return false;
    await this.prisma.mfaFactor.update({ where: { id: factor.id }, data: { confirmedAt: new Date() } });
    return true;
  }

  async verify(userId: string, token: string): Promise<boolean> {
    const factor = await this.prisma.mfaFactor.findFirst({ where: { userId, type: "totp", confirmedAt: { not: null } } });
    if (!factor) return false;
    return authenticator.verify({ token, secret: factor.secret });
  }

  async isEnrolled(userId: string): Promise<boolean> {
    return !!(await this.prisma.mfaFactor.findFirst({ where: { userId, type: "totp", confirmedAt: { not: null } } }));
  }
}
```

> **Nota:** el `secret` se guarda cifrado en reposo en producción (envolver con un `EncryptionService` AES-GCM usando `MFA_ENC_KEY`). Para este plan se persiste directo; el cifrado es una mejora de la Task de hardening (fuera de alcance de esta fase, anotada en el spec §3.6).

- [ ] **Step 5: Implementar `mfa.controller.ts`** con rutas protegidas por `JwtAuthGuard`:

```ts
import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { MfaService } from "./mfa.service";

@Controller("mfa")
@UseGuards(JwtAuthGuard)
export class MfaController {
  constructor(private mfa: MfaService) {}
  @Post("enroll") enroll(@CurrentUser() u: { id: string }) { return this.mfa.enroll(u.id); }
  @Post("confirm") async confirm(@CurrentUser() u: { id: string }, @Body() b: { token: string }) {
    return { confirmed: await this.mfa.confirm(u.id, b.token) };
  }
}
```

- [ ] **Step 6: Crear `mfa.guard.ts`** que exige 2FA enrolada para roles sensibles (lee `user.permissions`/rol y usa `MfaService.isEnrolled`). Aplicarlo en rutas críticas (placeholder de uso: se conecta en el Sub-proyecto 3 al publicar tarifas).

```ts
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { MfaService } from "../../mfa/mfa.service";

@Injectable()
export class MfaGuard implements CanActivate {
  constructor(private mfa: MfaService) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const { user } = ctx.switchToHttp().getRequest();
    if (!user?.id) throw new ForbiddenException("No autenticado");
    if (!(await this.mfa.isEnrolled(user.id))) throw new ForbiddenException("2FA requerido para esta acción");
    return true;
  }
}
```

- [ ] **Step 7: Crear `mfa.module.ts`** (providers `MfaService`, `MfaGuard`; exporta ambos; declara `MfaController`).

- [ ] **Step 8: Ejecutar (debe pasar)**

Run: `pnpm --filter api test -- mfa.service`
Expected: PASS (2 tests).

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/mfa apps/api/src/common/guards/mfa.guard.ts
git commit -m "feat(api): MFA TOTP (enroll/confirm/verify) + MfaGuard"
```

---

### Task 16: Pantalla de Login real en el front (reemplaza el mock)

**Files:**
- Modify: `apps/web/src/features/auth/Login.tsx`, `apps/web/src/stores/session.ts`
- Create: `apps/web/src/hooks/useAuth.ts`
- Test: `apps/web/src/hooks/useAuth.test.ts`

- [ ] **Step 1: Escribir el test que falla** — `useAuth.test.ts` (mock de `apiFetch`)

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@/lib/http", () => ({ apiFetch: vi.fn(async () => ({ accessToken: "jwt-123" })) }));
import { useAuth } from "./useAuth";
import { useSession } from "@/stores/session";

describe("useAuth.login", () => {
  beforeEach(() => useSession.getState().logout());
  it("guarda el access token al hacer login", async () => {
    const { result } = renderHook(() => useAuth());
    await act(() => result.current.login({ email: "a@b.co", password: "x".repeat(12) }));
    expect(useSession.getState().accessToken).toBe("jwt-123");
  });
});
```

- [ ] **Step 2: Ejecutar (debe fallar)**

Run: `pnpm --filter web test -- useAuth`
Expected: FAIL.

- [ ] **Step 3: Extender `session.ts`** para guardar `accessToken` en memoria (sin romper el `setRole` usado por el demo)

```ts
import { create } from "zustand";

type SessionState = {
  accessToken: string | null;
  user: { id: string } | null;
  setSession: (accessToken: string) => void;
  logout: () => void;
};

export const useSession = create<SessionState>((set) => ({
  accessToken: null,
  user: null,
  setSession: (accessToken) => set({ accessToken }),
  logout: () => set({ accessToken: null, user: null }),
}));
```

> **Nota de migración:** el `RoleSwitcher` del demo usaba `setRole`. En esta fase el rol pasa a derivarse del JWT. Conservar un `setRole` de compatibilidad temporal si algún componente del demo aún lo importa, o actualizar esos imports (buscar `useSession` con `grep`). Anotar los componentes tocados en el commit.

- [ ] **Step 4: Implementar `useAuth.ts`**

```ts
import { apiFetch } from "@/lib/http";
import { useSession } from "@/stores/session";
import type { LoginInput } from "@quickclean/shared";

export function useAuth() {
  const setSession = useSession((s) => s.setSession);
  async function login(input: LoginInput) {
    const { accessToken } = await apiFetch<{ accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setSession(accessToken);
  }
  return { login };
}
```

- [ ] **Step 5: Ejecutar (debe pasar)**

Run: `pnpm --filter web test -- useAuth`
Expected: PASS.

- [ ] **Step 6: Conectar `Login.tsx`** al `useAuth().login` con formulario shadcn + `react-hook-form` + `zodResolver(LoginInput)` (cumple CLAUDE.md: nada de `<input>` casero). Mostrar error de credenciales y el caso `mustChangePassword`.

- [ ] **Step 7: Verificación manual end-to-end**

```bash
pnpm db:up && pnpm dev:api   # terminal 1
pnpm dev:web                  # terminal 2
```
Crear un usuario semilla (script Prisma) y hacer login desde la UI. Expected: el front recibe `accessToken` y navega a la app.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/auth/Login.tsx apps/web/src/stores/session.ts apps/web/src/hooks/useAuth.ts
git commit -m "feat(web): login real contra la API (reemplaza selector de rol mock)"
```

---

### Task 17: Seed de roles/permisos + usuario admin con 2FA obligatoria

**Files:**
- Create: `apps/api/prisma/seed.ts`
- Modify: `apps/api/package.json` (script `prisma.seed`)

- [ ] **Step 1: Escribir el seed** — `apps/api/prisma/seed.ts`

```ts
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();
const PERMS = ["audit.read", "service.read", "service.update", "tariff.read", "tariff.assign", "user.manage"];

async function main() {
  for (const key of PERMS) await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  const perms = await prisma.permission.findMany();
  const admin = await prisma.role.upsert({
    where: { key: "super_admin" }, update: {}, create: { key: "super_admin", name: "Super Admin" },
  });
  for (const p of perms)
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: admin.id, permissionId: p.id } },
      update: {}, create: { roleId: admin.id, permissionId: p.id },
    });

  const email = "admin@quickclean.co";
  const user = await prisma.user.upsert({
    where: { email }, update: {},
    create: { email, status: "active", emailVerifiedAt: new Date() },
  });
  await prisma.credential.upsert({
    where: { userId: user.id }, update: {},
    create: { userId: user.id, passwordHash: await argon2.hash("CambiaEsto-2026!"), mustChangePassword: true },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: admin.id } },
    update: {}, create: { userId: user.id, roleId: admin.id },
  });
  console.log("Seed listo. admin@quickclean.co / CambiaEsto-2026! (cambio forzado al primer login)");
}
main().finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Registrar el script en `apps/api/package.json`**

```json
{ "prisma": { "seed": "ts-node prisma/seed.ts" } }
```

- [ ] **Step 3: Ejecutar el seed**

Run: `pnpm --filter api prisma db seed`
Expected: imprime "Seed listo".

- [ ] **Step 4: Verificación**

Run: `pnpm --filter api prisma studio` → confirmar `super_admin` con 6 permisos y el usuario admin con credential `mustChangePassword=true`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/seed.ts apps/api/package.json
git commit -m "feat(api): seed de roles/permisos + admin con cambio de contraseña forzado"
```

---

## Self-review (cobertura del spec §2–§3)

- §2.1 Stack NestJS+Prisma+Postgres → Tasks 3–4 ✅ · Monorepo+shared → Tasks 1–2 ✅
- §3.1 Modelo de identidad → Task 4 ✅ (User, Credential, PasswordHistory, Session, MfaFactor, RecoveryCode, RBAC)
- §3.2 access JWT + refresh rotatorio + reuse-detection → Task 9 ✅ · cookie HttpOnly → Task 11 ✅
- §3.3 2FA TOTP enroll/confirm/verify + MfaGuard → Task 15 ✅
- §3.4 90/90: cambio a 90 días → Tasks 7,11 ✅ · inactividad 90 días → Task 10 ✅ · `mustChangePassword` → Tasks 11,17 ✅
  - **Gap conocido (siguiente plan):** job programado que marca `inactive` automáticamente y el flujo de reactivación con `ReactivationToken` no están en este plan (el modelo ya existe; el endpoint/cron va en el plan de "Reactivación y jobs"). Anotado.
- §3.5 lockout 5/día → Tasks 8,11 ✅ · throttler → Task 13 ✅ · Turnstile → Task 12 ✅ · helmet/CORS → Task 5 ✅
- §3.5 RBAC por permisos → Task 14 ✅
- §3.7 login real en front + token en memoria → Task 16 ✅
- **No incluido a propósito (fases posteriores):** auditoría (Sub-proyecto 2), recovery codes UI, SMS OTP vía Twilio, cifrado del secreto MFA, derechos ARCO. Listados en el spec.

---

## Handoff de ejecución

Plan guardado. Sub-skill requerida para ejecutar: **superpowers:subagent-driven-development** (recomendada) o **superpowers:executing-plans**.
