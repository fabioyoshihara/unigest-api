import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { users } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("POST /api/v1/users", () => {
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

  it("should create a user with generated institutional email and temporary password", async () => {
    const suffix = randomUUID().slice(0, 6);
    const payload = {
      firstName: "Mariana",
      lastName: `Oliveira${suffix}`,
      personalEmail: `mariana.${suffix}@gmail.com`,
    };

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload,
    });

    const body = response.json();
    if (body.id) {
      createdUserIds.push(body.id);
    }

    expect(response.statusCode).toBe(201);
    expect(body).toMatchObject({
      firstName: payload.firstName,
      lastName: payload.lastName,
    });
    expect(typeof body.id).toBe("string");
    expect(body.email).toContain("@");
    expect(typeof body.temporaryPassword).toBe("string");
    expect(body.temporaryPassword.length).toBe(8);

    const [savedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, body.id));

    expect(savedUser).toBeDefined();
    expect(savedUser.personalEmail).toBe(payload.personalEmail);
    expect(savedUser.mustChangePassword).toBe(true);
    expect(savedUser.passwordHash).not.toBe(body.temporaryPassword);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/users",
      payload: {
        firstName: "Sem",
        lastName: "Token",
        personalEmail: "sem.token@gmail.com",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("should return 400 when request body is invalid", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        firstName: "",
        lastName: "Teste",
        personalEmail: "formato-invalido",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 409 when personalEmail is already registered", async () => {
    const suffix = randomUUID().slice(0, 6);
    const duplicatePersonalEmail = `duplicado.${suffix}@gmail.com`;

    const firstResponse = await server.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        firstName: "Lucas",
        lastName: `Mendes${suffix}`,
        personalEmail: duplicatePersonalEmail,
      },
    });

    const firstBody = firstResponse.json();
    if (firstBody.id) {
      createdUserIds.push(firstBody.id);
    }

    const secondResponse = await server.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        firstName: "Lucas",
        lastName: `Santos${suffix}`,
        personalEmail: duplicatePersonalEmail,
      },
    });

    expect(secondResponse.statusCode).toBe(409);
   expect(secondResponse.json()).toEqual({
  message: "Personal email is already in use.",
});
  });
});