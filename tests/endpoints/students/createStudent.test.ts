import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../../src/index.ts";
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

  function buildStudentPayload(suffix: string) {
    const numeric = String(Math.floor(100000000 + Math.random() * 900000000));
    return {
      nome: `Fernanda Costa ${suffix}`,
      cpf: `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-00`,
      email: `aluno.${suffix}@estudante.test`,
      telefone: "(11) 99999-0000",
      endereco: "Rua Vergueiro, 1000 - São Paulo, SP",
      ra: `RA${suffix.toUpperCase()}`,
      dataIngresso: "2026-02-01T00:00:00.000Z",
    };
  }

  it("should create a valid student and return 201 with studentId", async () => {
    const suffix = randomUUID().slice(0, 6);
    const payload = buildStudentPayload(suffix);

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

    const [savedStudent] = await db
      .select()
      .from(students)
      .where(eq(students.id, body.studentId));

    expect(savedStudent).toBeDefined();
    expect(savedStudent.name).toBe(payload.nome);
    expect(savedStudent.cpf).toBe(payload.cpf);
    expect(savedStudent.registrationNumber).toBe(payload.ra);
    expect(savedStudent.isActive).toBe(true);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const suffix = randomUUID().slice(0, 6);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/students",
      payload: buildStudentPayload(suffix),
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 400 when required fields are missing or invalid", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/students",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        nome: "",
        email: "email-invalido",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 409 when registering a student with duplicate CPF or RA", async () => {
    const suffix = randomUUID().slice(0, 6);
    const payload = buildStudentPayload(suffix);

    const firstResponse = await server.inject({
      method: "POST",
      url: "/api/v1/students",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload,
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
      payload,
    });

    expect(secondResponse.statusCode).toBe(409);
  });
});