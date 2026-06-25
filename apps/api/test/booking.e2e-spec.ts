import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Reservas (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET /reservas sin token → 401", () => {
    return request(app.getHttpServer()).get("/reservas").expect(401);
  });

  it("POST /reservas sin token → 401", () => {
    return request(app.getHttpServer()).post("/reservas").expect(401);
  });

  it("GET /admin/reservas sin token → 401", () => {
    return request(app.getHttpServer()).get("/admin/reservas").expect(401);
  });

  it("GET /quicker/reservas sin token → 401", () => {
    return request(app.getHttpServer()).get("/quicker/reservas").expect(401);
  });

  it("GET /quicker/balance sin token → 401", () => {
    return request(app.getHttpServer()).get("/quicker/balance").expect(401);
  });
});
