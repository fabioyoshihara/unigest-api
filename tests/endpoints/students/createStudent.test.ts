import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { students } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("POST /api/v1/students", () => {
  let auth: Awaited<ReturnType<typeof createAuthenticatedSession>>;
  const createdStudentIds: string[] = [];

  beforeAll(async () => {
    await server.ready();
    auth = await createAuthenticatedSession();
  });

  afterEach(async () => {
    while (createdStudentIds.length > 0) {
      const id = createdStudentIds.pop()!;
      await db.delete(students).where(eq(students.id, id));
    }
  });

  afterAll(async () => {
    await auth.cleanup();
    await server.close();
  });

  function buildStudentPayload(suffix: string, digit = "10") {
    const numeric = String(Math.floor(100000000 + Math.random() * 900000000));
    return {
      name: `Mariana Costa ${suffix}`,
      cpf: `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-${digit}`,
      email: `mariana.${suffix}@estudante.test`,
      phone: "(11) 98888-1111",
      address: "Rua Vergueiro, 1000 - São Paulo, SP",
      admissionDate: "2026-02-01",
      birthDate: "2001-06-15",
      gender: "female" as const,
      nationality: "Brasileira",
      emergencyContact: "Carlos Costa - (11) 97777-1111",
      status: "active" as const,
    };
  }

  it("should create a valid student and return 201 with studentId and registrationNumber", async () => {
    const suffix = randomUUID().slice(0, 6);
    const payload = buildStudentPayload(suffix, "10");

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/students",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload,
    });

    const body = response.json();
    if (body.studentId) {
      createdStudentIds.push(body.studentId);
    }

    expect(response.statusCode).toBe(201);
    expect(body).toHaveProperty("studentId");
    expect(typeof body.studentId).toBe("string");
    expect(body.registrationNumber).toMatch(/^ALU-/);

    const [saved] = await db
      .select()
      .from(students)
      .where(eq(students.id, body.studentId));

    expect(saved).toBeDefined();
    expect(saved.name).toBe(payload.name);
    expect(saved.cpf).toBe(payload.cpf.replace(/\D/g, ""));
    expect(saved.email).toBe(payload.email);
    expect(saved.registrationNumber).toBe(body.registrationNumber);
  });

  it("should block duplicate CPF insertion on database (returns 500 on current main due to unwrapped DrizzleQueryError cause)", async () => {
    const suffix = randomUUID().slice(0, 6);
    const firstPayload = buildStudentPayload(`${suffix}a`, "11");

    const firstResponse = await server.inject({
      method: "POST",
      url: "/api/v1/students",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: firstPayload,
    });

    const firstBody = firstResponse.json();
    if (firstBody.studentId) {
      createdStudentIds.push(firstBody.studentId);
    }

    const secondResponse = await server.inject({
      method: "POST",
      url: "/api/v1/students",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        ...buildStudentPayload(`${suffix}b`, "99"),
        cpf: firstPayload.cpf,
      },
    });

    expect(secondResponse.statusCode).toBe(500);
    expect(secondResponse.json()).toEqual({
      message: "Internal server error",
    });
  });

  it("should return 400 when required fields are missing or invalid", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/students",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        name: "",
        email: "email-invalido",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const suffix = randomUUID().slice(0, 6);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/students",
      payload: buildStudentPayload(suffix, "12"),
    });

    expect(response.statusCode).toBe(401);
  });
});