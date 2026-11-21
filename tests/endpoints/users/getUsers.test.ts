import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { hash } from "argon2";
import { eq } from "drizzle-orm";
import { server } from "../../../src/index.ts";
import { db } from "../../../src/database/client.ts";
import { users } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("GET /api/v1/users", () => {
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

  it("should return 200 and list active users with concatenated name", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    const body = response.json() as Array<Record<string, unknown>>;

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(body)).toBe(true);

    const foundAuthUser = body.find((u) => u.id === auth.user.id);
    expect(foundAuthUser).toBeDefined();
    expect(foundAuthUser).toMatchObject({
      id: auth.user.id,
      name: `${auth.user.firstName} ${auth.user.lastName}`,
      email: auth.user.email,
      role: auth.user.role,
      isActive: true,
    });
    expect(typeof foundAuthUser?.createdAt).toBe("string");
    expect(typeof foundAuthUser?.updatedAt).toBe("string");
  });

  it("should not include inactive users in the returned list", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [inactiveUser] = await db
      .insert(users)
      .values({
        firstName: "Inativo",
        lastName: `Teste${suffix}`,
        email: `inativo.${suffix}@unigest.test`,
        personalEmail: `inativo.${suffix}@gmail.com`,
        passwordHash: await hash("Senha@123"),
        isActive: false,
      })
      .returning();

    createdUserIds.push(inactiveUser.id);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    const body = response.json() as Array<{ id: string }>;

    expect(response.statusCode).toBe(200);
    expect(body.some((u) => u.id === inactiveUser.id)).toBe(false);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/users",
    });

    expect(response.statusCode).toBe(401);
  });
});