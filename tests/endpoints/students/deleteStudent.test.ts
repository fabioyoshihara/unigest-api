import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { students } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("DELETE /api/v1/students/:id", () => {
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

  function buildStudentRecord(suffix: string, isActive = true) {
    const numeric = String(Math.floor(100000000 + Math.random() * 900000000));
    return {
      name: `Bruno Teixeira ${suffix}`,
      cpf: `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-33`,
      email: `bruno.${suffix}@estudante.test`,
      phone: "(11) 96666-3333",
      address: "Rua Pamplona, 300 - São Paulo, SP",
      registrationNumber: `RA${suffix.toUpperCase()}`,
      admissionDate: new Date("2026-02-01T00:00:00.000Z"),
      isActive,
    };
  }

  it("should logically deactivate an active student and return 200", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [student] = await db
      .insert(students)
      .values(buildStudentRecord(suffix, true))
      .returning();

    createdStudentIds.push(student.id);

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/students/${student.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      message: "Student deleted",
    });

    const [updatedStudent] = await db
      .select()
      .from(students)
      .where(eq(students.id, student.id));

    expect(updatedStudent).toBeDefined();
    expect(updatedStudent.isActive).toBe(false);
  });

  it("should return 404 when student does not exist or is already inactive", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [inactiveStudent] = await db
      .insert(students)
      .values(buildStudentRecord(suffix, false))
      .returning();

    createdStudentIds.push(inactiveStudent.id);

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/students/${inactiveStudent.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "Student not Found, verify ID and try again",
    });
  });

  it("should return 400 when ID parameter is not a valid UUID", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: "/api/v1/students/id-invalido",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/students/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
  });
});