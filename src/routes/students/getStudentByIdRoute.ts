import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { eq, and } from "drizzle-orm";

import { db } from "../../database/client.ts";
import { students } from "../../database/schema.ts";
import { checkRequestJWT } from "../hooks/check-request-jwt.ts";
import { getUserFromRequest } from "../../utils/getUserFromRequest.ts";

export const getStudentByIdRoute: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/api/v1/students/:studentId",
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ["Students"],
        summary: "Get Student By ID",
        description: "Retrieve a student by their unique identifier.",
        params: z.object({
          studentId: z.uuid(),
        }),
        response: {
          200: z.object({
            student: z.object({
              id: z.string(),
              name: z.string(),
              cpf: z.string(),
              email: z.string(),
              phone: z.string(),
              secondaryPhone: z.string().nullable(),
              address: z.string(),
              registrationNumber: z.string(),
              admissionDate: z.date(),
              birthDate: z.string().nullable(),
              gender: z.string().nullable(),
              nationality: z.string().nullable(),
              naturalness: z.string().nullable(),
              photoUrl: z.string().nullable(),
              emergencyContact: z.string().nullable(),
              status: z.string(),
              isActive: z.boolean(),
              createdAt: z.date().nullable(),
              updatedAt: z.date().nullable(),
            }),
          }),
          401: z.object({
            message: z.string(),
          }),
          404: z.object({
            message: z.string(),
          }),
          500: z.object({
            message: z.string(),
          }),
        },
      },
    },

    async (request, reply) => {
      const user = getUserFromRequest(request);
      const { studentId } = request.params;

      if (!user) {
        return reply.status(401).send({
          message: "Unauthorized access.",
        });
      }

      try {
        const [student] = await db
          .select()
          .from(students)
          .where(and(eq(students.id, studentId), eq(students.isActive, true)))
          .limit(1);

        if (!student) {
          return reply.status(404).send({
            message: "Student not found.",
          });
        }

        return reply.status(200).send({
          student,
        });
      } catch (error) {
        server.log.error(
          { error, studentId },
          "Error while retrieving student.",
        );

        return reply.status(500).send({
          message: "Internal server error.",
        });
      }
    },
  );
};
