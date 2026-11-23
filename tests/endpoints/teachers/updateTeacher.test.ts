import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { teachers } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("PUT /api/v1/teachers/:id", () => {
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

  async function insertTeacher(suffix: string, digit = "40") {
    const numeric = String(Math.floor(100000000 + Math.random() * 900000000));
    const [teacher] = await db
      .insert(teachers)
      .values({
        name: `Prof. Original ${suffix}`,
        cpf: `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-${digit}`,
        rg: "11.222.333-4",
        email: `orig.${suffix}@docente.test`,
        phone: "(11) 93456-7890",
        address: "Rua Bela Cintra, 100 - São Paulo, SP",
        employeeNumber: `DOC${suffix.toUpperCase()}`,
        degreeLevel: "undergraduate",
      })
      .returning();

    createdTeacherIds.push(teacher.id);
    return teacher;
  }

  it("should replace teacher fields and set omitted rg to null", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await insertTeacher(suffix);

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/teachers/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        name: `Prof. Substituido ${suffix}`,
        cpf: target.cpf,
        email: `atualizado.${suffix}@docente.test`,
        phone: "(11) 99999-8888",
        address: "Av. Faria Lima, 2000 - São Paulo, SP",
        employeeNumber: target.employeeNumber,
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

    expect(updated.name).toBe(`Prof. Substituido ${suffix}`);
    expect(updated.email).toBe(`atualizado.${suffix}@docente.test`);
    expect(updated.degreeLevel).toBe("doctorate");
    expect(updated.rg).toBeNull();
  });

  it("should return 409 when updating CPF or employeeNumber to one already in use", async () => {
    const suffix = randomUUID().slice(0, 6);
    const teacherA = await insertTeacher(`${suffix}a`, "41");
    const teacherB = await insertTeacher(`${suffix}b`, "42");

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/teachers/${teacherB.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        name: teacherB.name,
        cpf: teacherA.cpf,
        email: teacherB.email,
        phone: teacherB.phone,
        address: teacherB.address,
        employeeNumber: teacherB.employeeNumber,
        degreeLevel: "master",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: "CPF, email or employee number already in use.",
    });
  });

  it("should return 404 when teacher ID does not exist", async () => {
    const suffix = randomUUID().slice(0, 6);

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/teachers/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        name: "Docente Inexistente",
        cpf: "111.222.333-44",
        email: `inexistente.${suffix}@docente.test`,
        phone: "(11) 90000-0000",
        address: "Rua Teste, 1",
        employeeNumber: `DOC${suffix.toUpperCase()}`,
        degreeLevel: "master",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 when Authorization header is missing", async () => {
  const response = await server.inject({
    method: "PUT",
    url: `/api/v1/teachers/${randomUUID()}`,
    payload: {
      name: "Prof. Sem Token",
      cpf: "123.456.789-00",
      email: "sem.token@docente.test",
      phone: "(11) 90000-0000",
      address: "Rua Teste, 1",
      employeeNumber: "DOC000001",
      degreeLevel: "master",
    },
  });

  expect(response.statusCode).toBe(401);
});
});