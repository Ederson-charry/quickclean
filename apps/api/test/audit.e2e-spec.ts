import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Auditoría admin (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET /admin/auditoria sin token → 401", () => {
    return request(app.getHttpServer()).get("/admin/auditoria").expect(401);
  });

  it("GET /admin/auditoria/verify sin token → 401", () => {
    return request(app.getHttpServer()).get("/admin/auditoria/verify").expect(401);
  });

  it("GET /admin/auditoria/export sin token → 401", () => {
    return request(app.getHttpServer()).get("/admin/auditoria/export?format=csv").expect(401);
  });
});
