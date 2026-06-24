import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Catálogo / tarifas (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET /catalogo es público → 200", () => {
    return request(app.getHttpServer()).get("/catalogo").expect(200);
  });

  it("GET /admin/tarifas sin token → 401", () => {
    return request(app.getHttpServer()).get("/admin/tarifas?categoryId=x").expect(401);
  });

  it("GET /admin/servicios sin token → 401", () => {
    return request(app.getHttpServer()).get("/admin/servicios").expect(401);
  });
});
