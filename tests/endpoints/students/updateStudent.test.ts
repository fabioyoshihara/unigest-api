import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { students } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("PUT /api/v1/students/:id", () => {
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

  async function createTargetStudent(suffix: string, digit = "44") {
    const numeric = String(Math.floor(100000000 + Math.random() * 900000000));
    const [student] = await db
      .insert(students)
      .values({
        name: `Aluno Original ${suffix}`,
        cpf: `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-${digit}`,
        email: `orig.${suffix}@estudante.test`,
        phone: "(11) 91111-0000",
        secondaryPhone: "(11) 92222-0000",
        address: "Rua Original, 10 - São Paulo, SP",
        registrationNumber: `RA${suffix.toUpperCase()}`,
        admissionDate: new Date("2026-02-01T00:00:00.000Z"),
        nationality: "Brasileira",
      })
      .returning();

    createdStudentIds.push(student.id);
    return student;
  }

  it("should replace student fields and clear omitted optional fields to null", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await createTargetStudent(suffix);

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/students/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        name: `Aluno Substituido ${suffix}`,
        cpf: target.cpf,
        email: `atualizado.${suffix}@estudante.test`,
        phone: "(11) 93333-4444",
        address: "Av. Brigadeiro Luís Antônio, 900 - São Paulo, SP",
        registrationNumber: target.registrationNumber,
        admissionDate: "2026-08-01T00:00:00.000Z",
        birthDate: "1998-04-12",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Student updated" });

    const [updated] = await db
      .select()
      .from(students)
      .where(eq(students.id, target.id));

    expect(updated.name).toBe(`Aluno Substituido ${suffix}`);
    expect(updated.email).toBe(`atualizado.${suffix}@estudante.test`);
    expect(updated.phone).toBe("(11) 93333-4444");
    expect(updated.birthDate).toBe("1998-04-12");
    expect(updated.secondaryPhone).toBeNull();
    expect(updated.nationality).toBeNull();
  });

  it("should return 409 when updating CPF or RA to one already used by another student", async () => {
    const suffix = randomUUID().slice(0, 6);
    const studentA = await createTargetStudent(`${suffix}a`, "51");
    const studentB = await createTargetStudent(`${suffix}b`, "52");

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/students/${studentB.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        name: studentB.name,
        cpf: studentA.cpf,
        email: studentB.email,
        phone: studentB.phone,
        address: studentB.address,
        registrationNumber: studentB.registrationNumber,
        admissionDate: "2026-02-01T00:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: "CPF, email or registration number already in use.",
    });
  });

  it("should return 404 when student ID does not exist", async () => {
    const suffix = randomUUID().slice(0, 6);

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/students/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        name: "Aluno Inexistente",
        cpf: "123.456.789-99",
        email: `inexistente.${suffix}@estudante.test`,
        phone: "(11) 90000-0000",
        address: "Rua Teste, 1",
        registrationNumber: `RA${suffix.toUpperCase()}`,
        admissionDate: "2026-02-01T00:00:00.000Z",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 when Authorization header is missing", async () => {
  const response = await server.inject({
    method: "PUT",
    url: `/api/v1/students/${randomUUID()}`,
    payload: {
      name: "Aluno Sem Token",
      cpf: "123.456.789-00",
      email: "sem.token@estudante.test",
      phone: "(11) 90000-0000",
      address: "Rua Teste, 1",
      registrationNumber: "RA000001",
      admissionDate: "2026-02-01T00:00:00.000Z",
    },
  });

  expect(response.statusCode).toBe(401);
});
});