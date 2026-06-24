import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { AppModule } from "../src/app.module";

describe("throttler (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("devuelve 429 tras superar el límite global en /health", async () => {
    let last = 200;
    for (let i = 0; i < 25; i++) {
      last = (await request(app.getHttpServer()).get("/health")).status;
    }
    expect(last).toBe(429);
  });
});
