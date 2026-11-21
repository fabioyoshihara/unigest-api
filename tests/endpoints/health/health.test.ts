import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { server } from "../../../src/index.ts";
import { db } from "../../../src/database/client.ts";

describe("GET / — Health Check", () => {
  beforeAll(async () => {
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it("should return 200 and connected status when database is reachable", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/",
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      status: "ok",
      service: "gestao_universidade_server",
      version: "1.0.0",
      database: "connected",
      docs: "/docs",
    });
    expect(typeof body.uptimeSeconds).toBe("number");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });

  it("should return 503 when database connection fails", async () => {
    const dbSpy = vi
      .spyOn(db, "execute")
      .mockRejectedValueOnce(new Error("Simulated database outage"));

    const response = await server.inject({
      method: "GET",
      url: "/",
    });

    const body = response.json();

    expect(response.statusCode).toBe(503);
    expect(body.status).toBe("error");
    expect(body.database).toBe("disconnected");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);

    dbSpy.mockRestore();
  });
});