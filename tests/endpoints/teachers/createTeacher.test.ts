import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { teachers } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("POST /api/v1/teachers", () => {
  let auth: Awaited<ReturnType<typeof createAuthenticatedSession>>;
  const createdTeacherIds: string[] = [];

  beforeAll(async () => {
    await server.ready();
    auth = await createAuthenticatedSession();
  });

  afterEach(async () => {
    while (createdTeacherIds.length > 0) {
      const id = createdTeacherIds.pop()!;
      await db.delete(teachers).where(eq(teachers.id, id));
    }
  });

  afterAll(async () => {
    await auth.cleanup();
    await server.close();
  });

  function buildTeacherPayload(suffix: string) {
    const numeric = String(Math.floor(100000000 + Math.random() * 900000000));
    return {
      name: `Prof. Ricardo Almeida ${suffix}`,
      cpf: `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-10`,
      rg: "12.345.678-9",
      email: `ricardo.${suffix}@docente.test`,
      phone: "(11) 98765-4321",
      address: "Rua Haddock Lobo, 595 - São Paulo, SP",
      employeeNumber: `DOC${suffix.toUpperCase()}`,
      degreeLevel: "master" as const,
      isActive: true,
    };
  }

  it("should create a valid teacher and return 201 with id and message", async () => {
    const suffix = randomUUID().slice(0, 6);
    const payload = buildTeacherPayload(suffix);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/teachers",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload,
    });

    const body = response.json();
    if (body.id) {
      createdTeacherIds.push(body.id);
    }

    expect(response.statusCode).toBe(201);
    expect(body).toMatchObject({
      message: "Teacher created",
    });
    expect(typeof body.id).toBe("string");

    const [saved] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.id, body.id));

    expect(saved).toBeDefined();
    expect(saved.name).toBe(payload.name);
    expect(saved.cpf).toBe(payload.cpf);
    expect(saved.rg).toBe(payload.rg);
    expect(saved.employeeNumber).toBe(payload.employeeNumber);
    expect(saved.degreeLevel).toBe("master");
  });

  it("should store rg as null when omitted in payload", async () => {
    const suffix = randomUUID().slice(0, 6);
    const { rg: _omitted, ...payloadWithoutRg } = buildTeacherPayload(suffix);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/teachers",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: payloadWithoutRg,
    });

    const body = response.json();
    if (body.id) {
      createdTeacherIds.push(body.id);
    }

    expect(response.statusCode).toBe(201);

    const [saved] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.id, body.id));

    expect(saved.rg).toBeNull();
  });

  it("should return 409 when CPF, email or employeeNumber is already in use", async () => {
    const suffix = randomUUID().slice(0, 6);
    const payload = buildTeacherPayload(suffix);

    const first = await server.inject({
      method: "POST",
      url: "/api/v1/teachers",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload,
    });

    const firstBody = first.json();
    if (firstBody.id) {
      createdTeacherIds.push(firstBody.id);
    }

    const duplicate = await server.inject({
      method: "POST",
      url: "/api/v1/teachers",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload,
    });

    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toEqual({
      message: "CPF, email or employee number already in use.",
    });
  });

  it("should return 400 when degreeLevel or required fields are invalid", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/teachers",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        name: "",
        degreeLevel: "pos_doutorado_invalido",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const suffix = randomUUID().slice(0, 6);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/teachers",
      payload: buildTeacherPayload(suffix),
    });

    expect(response.statusCode).toBe(401);
  });
});