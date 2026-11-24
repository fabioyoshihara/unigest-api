import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { students } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("GET /api/v1/students", () => {
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

  it("should return 200 with students list matching response schema", async () => {
    const suffix = randomUUID().slice(0, 6);
    const numeric = String(Math.floor(100000000 + Math.random() * 900000000));

    const [inserted] = await db
      .insert(students)
      .values({
        name: `Rafael Almeida ${suffix}`,
        cpf: `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-11`,
        email: `rafael.${suffix}@estudante.test`,
        phone: "(11) 98888-1111",
        address: "Av. Paulista, 500 - São Paulo, SP",
        registrationNumber: `RA${suffix.toUpperCase()}`,
        admissionDate: new Date("2026-02-01T00:00:00.000Z"),
      })
      .returning();

    createdStudentIds.push(inserted.id);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/students",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    const body = response.json() as {
      students: Array<Record<string, unknown>>;
    };

    expect(response.statusCode).toBe(200);
    expect(body).toHaveProperty("students");
    expect(Array.isArray(body.students)).toBe(true);

    const found = body.students.find((s) => s.id === inserted.id);
    expect(found).toBeDefined();
    expect(found).toMatchObject({
      id: inserted.id,
      name: inserted.name,
      cpf: inserted.cpf,
      email: inserted.email,
      phone: inserted.phone,
      address: inserted.address,
      registrationNumber: inserted.registrationNumber,
      isActive: true,
    });
    expect(typeof found?.admissionDate).toBe("string");
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/students",
    });

    expect(response.statusCode).toBe(401);
  });
});