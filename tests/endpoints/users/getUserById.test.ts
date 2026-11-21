import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { hash } from "argon2";
import { eq } from "drizzle-orm";
import { server } from "../../../src/index.ts";
import { db } from "../../../src/database/client.ts";
import { users } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("GET /api/v1/users/:id", () => {
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

  it("should return 200 and user details when a valid active UUID is provided", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/users/${auth.user.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toMatchObject({
      id: auth.user.id,
      firstName: auth.user.firstName,
      lastName: auth.user.lastName,
      email: auth.user.email,
      personalEmail: auth.user.personalEmail,
      role: auth.user.role,
    });
    expect(typeof body.createdAt).toBe("string");
    expect(typeof body.updatedAt).toBe("string");
  });

  it("should return 404 when user ID does not exist", async () => {
    const nonExistentId = randomUUID();

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/users/${nonExistentId}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "User not found, verify ID and try again",
    });
  });

  it("should return 404 when user exists but is inactive", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [inactiveUser] = await db
      .insert(users)
      .values({
        firstName: "Bloqueado",
        lastName: `User${suffix}`,
        email: `bloqueado.${suffix}@unigest.test`,
        personalEmail: `bloqueado.${suffix}@gmail.com`,
        passwordHash: await hash("Senha@123"),
        isActive: false,
      })
      .returning();

    createdUserIds.push(inactiveUser.id);

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/users/${inactiveUser.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 400 when ID parameter is not a valid UUID", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/users/id-invalido-123",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/users/${auth.user.id}`,
    });

    expect(response.statusCode).toBe(401);
  });
});