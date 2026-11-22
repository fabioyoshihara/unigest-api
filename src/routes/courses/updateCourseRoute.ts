import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../database/client.ts";
import { courses } from "../../database/schema.ts";
import { courseModalityEnum } from "../../database/schema/enums.ts";
import { checkRequestJWT } from "../hooks/check-request-jwt.ts";
import { getUserFromRequest } from "../../utils/getUserFromRequest.ts";

export const updateCourseRoute: FastifyPluginAsyncZod = async (server) => {
  server.put(
    "/api/v1/courses/:id",
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ["Courses"],
        summary: "Replace Course",
        description:
          "Full update: all required fields must be sent (modality and isActive are kept when omitted).",
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          name: z.string().trim().min(1, "Name is required").max(150),
          workloadHours: z.number().int().positive(),
          durationSemesters: z.number().int().positive(),
          modality: z.enum(courseModalityEnum.enumValues).optional(),
          isActive: z.boolean().optional(),
        }),
        response: {
          200: z.object({ message: z.string() }),
          401: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body;
      const user = getUserFromRequest(request);
      
      if(!user) { 
        return reply.status(401).send({ message: "You aren't authorized" });
      }

      try {
        const updated = await db
          .update(courses)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(courses.id, id))
          .returning({ id: courses.id });

        if (updated.length === 0) {
          return reply
            .status(404)
            .send({ message: "Course not found, verify ID and try again" });
        }

        return reply.status(200).send({ message: "Course updated" });
      } catch (err) {
        request.log.error(err);
        const detail =
          process.env.NODE_ENV === "production"
            ? ""
            : ` [${(err as { cause?: Error }).cause?.message ?? (err as Error).message}]`;
        return reply
          .status(500)
          .send({ message: `Unable to update course.${detail}` });
      }
    },
  );
};
