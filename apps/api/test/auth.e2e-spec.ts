import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("Auth (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it("GET /auth/me sin token → 401", () => {
    return request(app.getHttpServer()).get("/auth/me").expect(401);
  });

  it("POST /auth/refresh sin cookie → 401", () => {
    return request(app.getHttpServer()).post("/auth/refresh").expect(401);
  });
});
