import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { students } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("PATCH /api/v1/students/:id", () => {
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

  async function createTargetStudent(suffix: string, digit = "61") {
    const numeric = String(Math.floor(100000000 + Math.random() * 900000000));
    const [student] = await db
      .insert(students)
      .values({
        name: `Aluno Parcial ${suffix}`,
        cpf: `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-${digit}`,
        email: `parcial.${suffix}@estudante.test`,
        phone: "(11) 94444-0000",
        secondaryPhone: "(11) 95555-0000",
        address: "Rua Vergueiro, 400 - São Paulo, SP",
        registrationNumber: `RA${suffix.toUpperCase()}`,
        admissionDate: new Date("2026-02-01T00:00:00.000Z"),
        nationality: "Brasileira",
      })
      .returning();

    createdStudentIds.push(student.id);
    return student;
  }

  it("should update only sent fields and clear a nullable field when null is passed", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await createTargetStudent(suffix);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/students/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        phone: "(11) 98888-7777",
        secondaryPhone: null,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Student updated" });

    const [updated] = await db
      .select()
      .from(students)
      .where(eq(students.id, target.id));

    expect(updated.phone).toBe("(11) 98888-7777");
    expect(updated.secondaryPhone).toBeNull();
    expect(updated.name).toBe(target.name);
    expect(updated.nationality).toBe("Brasileira");
  });

  it("should return 400 when body is empty", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await createTargetStudent(suffix);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/students/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 409 when updating email to one already in use", async () => {
    const suffix = randomUUID().slice(0, 6);
    const studentA = await createTargetStudent(`${suffix}a`, "62");
    const studentB = await createTargetStudent(`${suffix}b`, "63");

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/students/${studentB.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        email: studentA.email,
      },
    });

    expect(response.statusCode).toBe(409);
  });

  it("should return 404 when student ID does not exist", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/students/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        phone: "(11) 90000-1111",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/students/${randomUUID()}`,
      payload: {
        phone: "(11) 90000-1111",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});