import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { hash } from "argon2";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { users } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("PUT /api/v1/users/:id", () => {
  let auth: Awaited<ReturnType<typeof createAuthenticatedSession>>;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    await server.ready();
    auth = await createAuthenticatedSession();
  });

  afterEach(async () => {
    while (createdUserIds.length > 0) {
      const id = createdUserIds.pop()!;
      await db.delete(users).where(eq(users.id, id));
    }
  });

  afterAll(async () => {
    await auth.cleanup();
    await server.close();
  });

  async function createTargetUser(suffix: string) {
    const [user] = await db
      .insert(users)
      .values({
        firstName: "Original",
        lastName: `User${suffix}`,
        email: `orig.${suffix}@unigest.test`,
        personalEmail: `orig.${suffix}@gmail.com`,
        passwordHash: await hash("Senha@123"),
        role: "secretary",
        isActive: true,
      })
      .returning();

    createdUserIds.push(user.id);
    return user;
  }

  it("should replace user fields and return 200 without altering institutional email", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await createTargetUser(suffix);

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/users/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        firstName: "Atualizado",
        lastName: "Completo",
        personalEmail: `novo.${suffix}@gmail.com`,
        role: "coordination",
        isActive: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "User updated" });

    const [updated] = await db
      .select()
      .from(users)
      .where(eq(users.id, target.id));

    expect(updated.firstName).toBe("Atualizado");
    expect(updated.lastName).toBe("Completo");
    expect(updated.personalEmail).toBe(`novo.${suffix}@gmail.com`);
    expect(updated.role).toBe("coordination");
    expect(updated.email).toBe(target.email);
  });

  it("should return 409 when personalEmail belongs to another user", async () => {
    const suffix = randomUUID().slice(0, 6);
    const userA = await createTargetUser(`${suffix}a`);
    const userB = await createTargetUser(`${suffix}b`);

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/users/${userB.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        firstName: "Conflito",
        lastName: "Email",
        personalEmail: userA.personalEmail,
        role: "finance",
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: "Personal email is already in use.",
    });
  });

  it("should return 404 when user ID does not exist", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/users/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        firstName: "Inexistente",
        lastName: "Teste",
        personalEmail: `naoexiste.${randomUUID().slice(0, 6)}@gmail.com`,
        role: "secretary",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "User not found, verify ID and try again",
    });
  });

  it("should return 400 when required fields are missing", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await createTargetUser(suffix);

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/users/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        firstName: "FaltandoCampos",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/users/${randomUUID()}`,
      payload: {
        firstName: "Sem",
        lastName: "Token",
        personalEmail: "sem.token@gmail.com",
        role: "secretary",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});