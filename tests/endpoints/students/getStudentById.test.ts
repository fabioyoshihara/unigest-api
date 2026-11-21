import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../../src/index.ts";
import { db } from "../../../src/database/client.ts";
import { students } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("GET /api/v1/students/:studentId", () => {
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
      name: `Camila Nogueira ${suffix}`,
      cpf: `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-22`,
      email: `camila.${suffix}@estudante.test`,
      phone: "(11) 97777-2222",
      address: "Rua Augusta, 200 - São Paulo, SP",
      registrationNumber: `RA${suffix.toUpperCase()}`,
      admissionDate: new Date("2026-02-01T00:00:00.000Z"),
      isActive,
    };
  }

  it("should return 200 and student details when active student exists", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [inserted] = await db
      .insert(students)
      .values(buildStudentRecord(suffix, true))
      .returning();

    createdStudentIds.push(inserted.id);

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/students/${inserted.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toHaveProperty("student");
    expect(body.student).toMatchObject({
      id: inserted.id,
      name: inserted.name,
      cpf: inserted.cpf,
      email: inserted.email,
      registrationNumber: inserted.registrationNumber,
      isActive: true,
    });
  });

  it("should return 404 when student ID does not exist", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/students/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "Student not found.",
    });
  });

  it("should return 404 when student is inactive", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [inactiveStudent] = await db
      .insert(students)
      .values(buildStudentRecord(suffix, false))
      .returning();

    createdStudentIds.push(inactiveStudent.id);

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/students/${inactiveStudent.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 400 when studentId is not a valid UUID", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/students/id-invalido",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/students/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
  });
});