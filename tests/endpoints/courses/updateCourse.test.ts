import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { courses } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("PUT /api/v1/courses/:id", () => {
  let auth: Awaited<ReturnType<typeof createAuthenticatedSession>>;
  const createdCourseIds: string[] = [];

  beforeAll(async () => {
    await server.ready();
    auth = await createAuthenticatedSession();
  });

  afterEach(async () => {
    while (createdCourseIds.length > 0) {
      const id = createdCourseIds.pop()!;
      await db.delete(courses).where(eq(courses.id, id));
    }
  });

  afterAll(async () => {
    await auth.cleanup();
    await server.close();
  });

  it("should replace course fields and return 200", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [inserted] = await db
      .insert(courses)
      .values({
        name: `Curso Antigo ${suffix}`,
        workloadHours: 1600,
        durationSemesters: 4,
        modality: "in_person",
      })
      .returning();

    createdCourseIds.push(inserted.id);

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/courses/${inserted.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        name: `Curso Atualizado ${suffix}`,
        workloadHours: 2800,
        durationSemesters: 7,
        modality: "online",
        isActive: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Course updated" });

    const [updated] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, inserted.id));

    expect(updated.name).toBe(`Curso Atualizado ${suffix}`);
    expect(updated.workloadHours).toBe(2800);
    expect(updated.durationSemesters).toBe(7);
    expect(updated.modality).toBe("online");
  });

  it("should return 404 when course ID does not exist", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/courses/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        name: "Curso Inexistente",
        workloadHours: 2000,
        durationSemesters: 5,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "Course not found, verify ID and try again",
    });
  });

  it("should return 400 when required fields are missing or invalid", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/courses/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        name: "Sem Carga Horaria",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/courses/${randomUUID()}`,
      payload: {
        name: "Sem Token",
        workloadHours: 2000,
        durationSemesters: 5,
      },
    });

    expect(response.statusCode).toBe(401);
  });
});