import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Gestión de personas (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET /admin/quickers sin token → 401", () => {
    return request(app.getHttpServer()).get("/admin/quickers").expect(401);
  });

  it("POST /admin/quickers sin token → 401", () => {
    return request(app.getHttpServer()).post("/admin/quickers").expect(401);
  });

  it("GET /admin/clientes sin token → 401", () => {
    return request(app.getHttpServer()).get("/admin/clientes").expect(401);
  });

  it("POST /auth/cambiar-password con email desconocido → 401 (anti-enumeración)", () => {
    return request(app.getHttpServer())
      .post("/auth/cambiar-password")
      .send({ email: "nadie@quickclean.co", currentPassword: "x", newPassword: "y".repeat(12) })
      .expect(401);
  });
});
