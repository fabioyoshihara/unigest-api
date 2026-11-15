import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { courses } from "../../database/schema.ts";
import { db } from "../../database/client.ts";

export const createCourseRoute: FastifyPluginAsyncZod = async (server) => {
  server.post("/api/v1/courses", {
    schema: {
      tags: ["Courses"],
      summary: "",
      description: "Register a course in database",
      body: z.object({
        name: z.string().min(1, "Course name is required"),
        workload: z.number().min(1, "Workload is required"),
        semesters: z.number().min(1, "Number of semesters required"),
        modality: z.enum(["in_person", "online", "hybrid"]),
        active: z.boolean().optional(),
      }),
      response: {
        201: z.object({
          courseId: z.string(),
        }),
        401: z.object({
          message: z.string(),
        })
      }
    }
  }, async (request, reply) => {
    try {
      const { name, workload, semesters, modality, active } = request.body;

      const result = await db
        .insert(courses)
        .values({
          name,
          workloadHours: workload,
          durationSemesters: semesters,
          modality,
          isActive: active,
        })
      .returning()

      return reply.status(201).send({ courseId: result[0].id })
    } catch (err) {
      throw new Error(`Couldn't complete this request ${err}`);
    }
  })
}