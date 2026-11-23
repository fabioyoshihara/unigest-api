import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { teachers } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("DELETE /api/v1/teachers/:id", () => {
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

  async function insertTeacher(suffix: string, isActive = true) {
    const numeric = String(Math.floor(100000000 + Math.random() * 900000000));
    const [teacher] = await db
      .insert(teachers)
      .values({
        name: `Prof. Excluir ${suffix}`,
        cpf: `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-60`,
        rg: null,
        email: `excluir.${suffix}@docente.test`,
        phone: "(11) 95678-9012",
        address: "Rua Teodoro Sampaio, 700 - São Paulo, SP",
        employeeNumber: `DOC${suffix.toUpperCase()}`,
        degreeLevel: "master",
        isActive,
      })
      .returning();

    createdTeacherIds.push(teacher.id);
    return teacher;
  }

  it("should logically deactivate an active teacher and return 200", async () => {
    const suffix = randomUUID().slice(0, 6);
    const activeTeacher = await insertTeacher(suffix, true);

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/teachers/${activeTeacher.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      message: "Teacher deleted",
    });

    const [updated] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.id, activeTeacher.id));

    expect(updated.isActive).toBe(false);
  });

  it("should return 404 when teacher is already inactive or does not exist", async () => {
    const suffix = randomUUID().slice(0, 6);
    const inactiveTeacher = await insertTeacher(suffix, false);

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/teachers/${inactiveTeacher.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "Teacher not found, verify ID and try again",
    });
  });

  it("should return 400 when ID parameter is not a valid UUID", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: "/api/v1/teachers/id-invalido",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/teachers/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
  });
});