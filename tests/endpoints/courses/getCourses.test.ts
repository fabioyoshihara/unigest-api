import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../../src/index.ts";
import { db } from "../../../src/database/client.ts";
import { courses } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("GET /api/v1/courses", () => {
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

  it("should return 200 with registered courses list", async () => {
    const suffix = randomUUID().slice(0, 6);
    const [inserted] = await db
      .insert(courses)
      .values({
        name: `Ciência da Computação ${suffix}`,
        workloadHours: 3200,
        durationSemesters: 8,
        modality: "in_person",
      })
      .returning();

    createdCourseIds.push(inserted.id);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/courses",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    const body = response.json() as {
      courses: Array<Record<string, unknown>>;
    };

    expect(response.statusCode).toBe(200);
    expect(body).toHaveProperty("courses");
    expect(Array.isArray(body.courses)).toBe(true);

    const found = body.courses.find((c) => c.id === inserted.id);
    expect(found).toBeDefined();
    expect(found).toMatchObject({
      id: inserted.id,
      name: inserted.name,
      workloadHours: 3200,
      durationSemesters: 8,
      modality: "in_person",
      isActive: true,
    });
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/courses",
    });

    expect(response.statusCode).toBe(401);
  });
});