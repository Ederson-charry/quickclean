import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Habeas Data (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET /legal/politica-datos es público (200)", () => {
    return request(app.getHttpServer()).get("/legal/politica-datos").expect(200);
  });

  it("GET /me/datos sin token → 401", () => {
    return request(app.getHttpServer()).get("/me/datos").expect(401);
  });

  it("DELETE /me/cuenta sin token → 401", () => {
    return request(app.getHttpServer()).delete("/me/cuenta").expect(401);
  });
});
