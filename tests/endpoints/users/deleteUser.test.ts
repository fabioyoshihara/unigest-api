import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { hash } from "argon2";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { users } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("DELETE /api/v1/users/:id", () => {
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

  it("should logically deactivate an active user and return 200", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [targetUser] = await db
      .insert(users)
      .values({
        firstName: "Patricia",
        lastName: `Lima${suffix}`,
        email: `patricia.${suffix}@unigest.test`,
        personalEmail: `patricia.${suffix}@gmail.com`,
        passwordHash: await hash("Senha@123"),
        isActive: true,
      })
      .returning();

    createdUserIds.push(targetUser.id);

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/users/${targetUser.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      message: "User deleted",
    });

    const [updatedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUser.id));

    expect(updatedUser).toBeDefined();
    expect(updatedUser.isActive).toBe(false);
  });

  it("should return 404 when user does not exist or is already inactive", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [inactiveUser] = await db
      .insert(users)
      .values({
        firstName: "Roberto",
        lastName: `Dias${suffix}`,
        email: `roberto.${suffix}@unigest.test`,
        personalEmail: `roberto.${suffix}@gmail.com`,
        passwordHash: await hash("Senha@123"),
        isActive: false,
      })
      .returning();

    createdUserIds.push(inactiveUser.id);

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/users/${inactiveUser.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "User not Found, verify ID and try again",
    });
  });

  it("should return 400 when ID parameter is not a valid UUID", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: "/api/v1/users/id-invalido",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/users/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
  });
});