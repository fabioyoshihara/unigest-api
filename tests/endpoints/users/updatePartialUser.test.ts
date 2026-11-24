import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { hash } from "argon2";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { users } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("PATCH /api/v1/users/:id", () => {
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

  async function createTargetUser(suffix: string, isActive = true) {
    const [user] = await db
      .insert(users)
      .values({
        firstName: "Parcial",
        lastName: `User${suffix}`,
        email: `parcial.${suffix}@unigest.test`,
        personalEmail: `parcial.${suffix}@gmail.com`,
        passwordHash: await hash("Senha@123"),
        role: "secretary",
        isActive,
      })
      .returning();

    createdUserIds.push(user.id);
    return user;
  }

  it("should update only the sent fields and preserve the others", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await createTargetUser(suffix, false);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        role: "finance",
        isActive: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "User updated" });

    const [updated] = await db
      .select()
      .from(users)
      .where(eq(users.id, target.id));

    expect(updated.role).toBe("finance");
    expect(updated.isActive).toBe(true);
    expect(updated.firstName).toBe(target.firstName);
    expect(updated.lastName).toBe(target.lastName);
    expect(updated.personalEmail).toBe(target.personalEmail);
  });

  it("should return 400 when body is empty", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await createTargetUser(suffix);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 409 when updating personalEmail to one already in use", async () => {
    const suffix = randomUUID().slice(0, 6);
    const userA = await createTargetUser(`${suffix}a`);
    const userB = await createTargetUser(`${suffix}b`);

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${userB.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        personalEmail: userA.personalEmail,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: "Personal email is already in use.",
    });
  });

  it("should return 404 when user ID does not exist", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        firstName: "NovoNome",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${randomUUID()}`,
      payload: {
        firstName: "SemToken",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});