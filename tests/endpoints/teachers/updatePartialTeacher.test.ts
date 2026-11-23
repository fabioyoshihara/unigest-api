import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { teachers } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("PATCH /api/v1/teachers/:id", () => {
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

  async function insertTeacher(suffix: string, digit = "50") {
    const numeric = String(Math.floor(100000000 + Math.random() * 900000000));
    const [teacher] = await db
      .insert(teachers)
      .values({
        name: `Prof. Parcial ${suffix}`,
        cpf: `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-${digit}`,
        rg: "55.666.777-8",
        email: `parcial.${suffix}@docente.test`,
        phone: "(11) 94567-8901",
        address: "Rua Oscar Freire, 500 - São Paulo, SP",
        employeeNumber: `DOC${suffix.toUpperCase()}`,
        degreeLevel: "specialization",
        isActive: false,
      })
      .returning();

    createdTeacherIds.push(teacher.id);
    return teacher;
  }

  it("should update only sent fields and preserve existing data", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await insertTeacher(suffix);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/teachers/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        degreeLevel: "doctorate",
        isActive: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Teacher updated" });

    const [updated] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.id, target.id));

    expect(updated.degreeLevel).toBe("doctorate");
    expect(updated.isActive).toBe(true);
    expect(updated.name).toBe(target.name);
    expect(updated.rg).toBe("55.666.777-8");
    expect(updated.employeeNumber).toBe(target.employeeNumber);
  });

  it("should return 400 when body is empty", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await insertTeacher(suffix);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/teachers/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 409 when updating employeeNumber to one already in use", async () => {
    const suffix = randomUUID().slice(0, 6);
    const teacherA = await insertTeacher(`${suffix}a`, "51");
    const teacherB = await insertTeacher(`${suffix}b`, "52");

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/teachers/${teacherB.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        employeeNumber: teacherA.employeeNumber,
      },
    });

    expect(response.statusCode).toBe(409);
  });

  it("should return 404 when teacher ID does not exist", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/teachers/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        phone: "(11) 91111-2222",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/teachers/${randomUUID()}`,
      payload: {
        phone: "(11) 91111-2222",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});