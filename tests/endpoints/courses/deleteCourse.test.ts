import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { server } from "../../helpers/server.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("DELETE /api/v1/courses/:id", () => {
  let auth: Awaited<ReturnType<typeof createAuthenticatedSession>>;

  beforeAll(async () => {
    await server.ready();
    auth = await createAuthenticatedSession();
  });

  afterAll(async () => {
    await auth.cleanup();
    await server.close();
  });

  // Nota técnica: na branch main, deleteCourseRoute.ts declara ":id" na URL,
  // mas exige "courseId" no schema Zod de params, fazendo o Fastify retornar 400.
  it("should return 400 due to route param mismatch (:id vs courseId schema) on current main", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/courses/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 400 when ID parameter is not a valid UUID", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: "/api/v1/courses/uuid-invalido",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });
});