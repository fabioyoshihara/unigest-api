import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { hash } from "argon2";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { users } from "../../../src/database/schema.ts";

describe("POST /api/v1/login", () => {
  const suffix = randomUUID().slice(0, 8);
  const institutionalEmail = `login.user.${suffix}@unigest.test`;
  const validPassword = `Senha@${suffix}`;
  let createdUserId: string;

  beforeAll(async () => {
    await server.ready();

    const passwordHash = await hash(validPassword);
    const [user] = await db
      .insert(users)
      .values({
        firstName: "Carlos",
        lastName: "Silva",
        email: institutionalEmail,
        personalEmail: `carlos.${suffix}@gmail.com`,
        passwordHash,
        role: "secretary",
      })
      .returning();

    createdUserId = user.id;
  });

  afterAll(async () => {
    if (createdUserId) {
      await db.delete(users).where(eq(users.id, createdUserId));
    }
    await server.close();
  });

  it("should authenticate with valid credentials and return a signed JWT token", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/login",
      payload: {
        email: institutionalEmail,
        password: validPassword,
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toHaveProperty("token");
    expect(typeof body.token).toBe("string");

    const decoded = jwt.verify(body.token, process.env.JWT_SECRET!) as {
      sub: string;
      role: string;
    };

    expect(decoded.sub).toBe(createdUserId);
    expect(decoded.role).toBe("secretary");
  });

  it("should return 400 when institutional email does not exist", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/login",
      payload: {
        email: `nao.existe.${suffix}@unigest.test`,
        password: validPassword,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: "Invalid Credentials",
    });
  });

  it("should return 400 when password does not match", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/login",
      payload: {
        email: institutionalEmail,
        password: "SenhaErrada123",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: "Invalid password. Try Again",
    });
  });

  it("should return 400 when payload fails Zod schema validation", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/login",
      payload: {
        email: "email-invalido",
      },
    });

    expect(response.statusCode).toBe(400);
  });
});