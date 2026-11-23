import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { teachers } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("GET /api/v1/teachers", () => {
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

  it("should return 200 with array of teachers formatted with ISO timestamps", async () => {
    const suffix = randomUUID().slice(0, 6);
    const numeric = String(Math.floor(100000000 + Math.random() * 900000000));

    const [inserted] = await db
      .insert(teachers)
      .values({
        name: `Profa. Helena Martins ${suffix}`,
        cpf: `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-20`,
        rg: null,
        email: `helena.${suffix}@docente.test`,
        phone: "(11) 91234-5678",
        address: "Alameda Santos, 100 - São Paulo, SP",
        employeeNumber: `DOC${suffix.toUpperCase()}`,
        degreeLevel: "doctorate",
        isActive: true,
      })
      .returning();

    createdTeacherIds.push(inserted.id);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/teachers",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    const body = response.json() as Array<Record<string, unknown>>;

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(body)).toBe(true);

    const found = body.find((t) => t.id === inserted.id);
    expect(found).toBeDefined();
    expect(found).toMatchObject({
      id: inserted.id,
      name: inserted.name,
      cpf: inserted.cpf,
      rg: null,
      email: inserted.email,
      employeeNumber: inserted.employeeNumber,
      degreeLevel: "doctorate",
      isActive: true,
    });
    expect(typeof found?.createdAt).toBe("string");
    expect(typeof found?.updatedAt).toBe("string");
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/teachers",
    });

    expect(response.statusCode).toBe(401);
  });
});