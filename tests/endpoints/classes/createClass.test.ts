import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { classes } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";
import {
  createTestCourse,
  deleteTestCourse,
  createTestTeacher,
  deleteTestTeacher,
} from "../../helpers/factories.ts";

describe("POST /api/v1/classes", () => {
  let auth: Awaited<ReturnType<typeof createAuthenticatedSession>>;
  const createdClassIds: string[] = [];
  const createdTeacherIds: string[] = [];
  const createdCourseIds: string[] = [];

  beforeAll(async () => {
    await server.ready();
    auth = await createAuthenticatedSession();
  });

  afterEach(async () => {
    while (createdClassIds.length > 0) {
      const id = createdClassIds.pop()!;
      await db.delete(classes).where(eq(classes.id, id));
    }
    while (createdTeacherIds.length > 0) {
      await deleteTestTeacher(createdTeacherIds.pop()!);
    }
    while (createdCourseIds.length > 0) {
      await deleteTestCourse(createdCourseIds.pop()!);
    }
  });

  afterAll(async () => {
    await auth.cleanup();
    await server.close();
  });

  it("should create a class linked to a course and teacher and return 201", async () => {
    const suffix = randomUUID().slice(0, 6);
    const course = await createTestCourse(suffix);
    const teacher = await createTestTeacher(suffix, "71");
    createdCourseIds.push(course.id);
    createdTeacherIds.push(teacher.id);

    const payload = {
      courseId: course.id,
      teacherId: teacher.id,
      description: `Turma A - Noturno ${suffix}`,
      semester: "1" as const,
      year: 2026,
      scheduleTime: "19:00:00",
      room: `Lab-${suffix}`,
      isActive: true,
    };

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/classes",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload,
    });

    const body = response.json();
    if (body.id) {
      createdClassIds.push(body.id);
    }

    expect(response.statusCode).toBe(201);
    expect(body).toMatchObject({
      message: "Class created",
    });
    expect(typeof body.id).toBe("string");

    const [saved] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, body.id));

    expect(saved).toBeDefined();
    expect(saved.courseId).toBe(course.id);
    expect(saved.teacherId).toBe(teacher.id);
    expect(saved.description).toBe(payload.description);
    expect(saved.semester).toBe("1");
    expect(saved.year).toBe(2026);
    expect(saved.scheduleTime).toBe("19:00:00");
    expect(saved.room).toBe(payload.room);
  });

  it("should create a class without teacherId and store teacherId as null", async () => {
    const suffix = randomUUID().slice(0, 6);
    const course = await createTestCourse(suffix);
    createdCourseIds.push(course.id);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/classes",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        courseId: course.id,
        description: `Turma Sem Professor ${suffix}`,
        semester: "2",
        year: 2026,
        scheduleTime: "08:30:00",
        room: `Sala-${suffix}`,
      },
    });

    const body = response.json();
    if (body.id) {
      createdClassIds.push(body.id);
    }

    expect(response.statusCode).toBe(201);

    const [saved] = await db
      .select()
      .from(classes)
      .where(eq(classes.id, body.id));

    expect(saved.teacherId).toBeNull();
  });

  it("should return 400 when courseId or teacherId does not exist in database", async () => {
    const suffix = randomUUID().slice(0, 6);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/classes",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        courseId: randomUUID(),
        description: `Turma FK Invalida ${suffix}`,
        semester: "1",
        year: 2026,
        scheduleTime: "14:00:00",
        room: `Sala-${suffix}`,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      message: "Invalid courseId or teacherId.",
    });
  });

  it("should return 400 when scheduleTime format or required fields are invalid", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/classes",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        courseId: randomUUID(),
        description: "",
        semester: "3",
        year: 1990,
        scheduleTime: "25:99",
        room: "",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/classes",
      payload: {
        courseId: randomUUID(),
        description: "Turma Sem Token",
        semester: "1",
        year: 2026,
        scheduleTime: "19:00:00",
        room: "Sala 101",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});