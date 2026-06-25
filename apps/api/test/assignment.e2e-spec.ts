import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Asignación (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET /admin/asignacion sin token → 401", () => {
    return request(app.getHttpServer()).get("/admin/asignacion").expect(401);
  });

  it("POST /admin/asignacion sin token → 401", () => {
    return request(app.getHttpServer()).post("/admin/asignacion").expect(401);
  });
});
