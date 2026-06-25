import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Conciliación ERP (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET /admin/conciliacion sin token → 401", () => {
    return request(app.getHttpServer()).get("/admin/conciliacion").expect(401);
  });

  it("GET /admin/conciliacion/export sin token → 401", () => {
    return request(app.getHttpServer()).get("/admin/conciliacion/export?format=csv").expect(401);
  });
});
