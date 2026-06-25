import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Solicitudes de ausencia (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET /quicker/solicitudes sin token → 401", () => {
    return request(app.getHttpServer()).get("/quicker/solicitudes").expect(401);
  });

  it("POST /quicker/solicitudes sin token → 401", () => {
    return request(app.getHttpServer()).post("/quicker/solicitudes").expect(401);
  });

  it("GET /admin/solicitudes sin token → 401", () => {
    return request(app.getHttpServer()).get("/admin/solicitudes").expect(401);
  });
});
