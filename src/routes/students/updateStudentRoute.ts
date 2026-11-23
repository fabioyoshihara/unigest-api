import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../database/client.ts";
import { students } from "../../database/schema.ts";
import { genderEnum, studentStatusEnum } from "../../database/schema/enums.ts";
import { checkRequestJWT } from "../hooks/check-request-jwt.ts";
import { getUserFromRequest } from "../../utils/getUserFromRequest.ts";

export const updateStudentRoute: FastifyPluginAsyncZod = async (server) => {
  server.put(
    "/api/v1/students/:id",
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ["Students"],
        summary: "Replace Student",
        description:
          "Full update: all required fields must be sent. Omitted optional fields are set to null.",
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          name: z.string().trim().min(1, "Name is required").max(200),
          cpf: z.string().trim().min(11, "Invalid CPF").max(14),
          email: z.string().trim().email("Invalid email").max(120),
          phone: z.string().trim().min(1, "Phone is required").max(20),
          secondaryPhone: z.string().trim().max(20).nullable().optional(),
          address: z.string().trim().min(1, "Address is required").max(255),
          registrationNumber: z
            .string()
            .trim()
            .min(1, "Registration number is required")
            .max(20),
          admissionDate: z.coerce.date(),
          birthDate: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
            .nullable()
            .optional(),
          gender: z.enum(genderEnum.enumValues).nullable().optional(),
          nationality: z.string().trim().max(80).nullable().optional(),
          naturalness: z.string().trim().max(120).nullable().optional(),
          photoUrl: z.string().trim().url().max(500).nullable().optional(),
          emergencyContact: z.string().trim().max(120).nullable().optional(),
          status: z.enum(studentStatusEnum.enumValues).optional(),
          isActive: z.boolean().optional(),
        }),
        response: {
          200: z.object({ message: z.string() }),
          401: z.object({ message: z.string() }),
          404: z.object({ message: z.string() }),
          409: z.object({ message: z.string() }),
          500: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const body = request.body;
      const user = getUserFromRequest(request);

      if(!user) { 
        return reply.status(401).send({ message: "You aren't authorized" })
      }

      try {
        const updated = await db
          .update(students)
          .set({
            ...body,
            secondaryPhone: body.secondaryPhone ?? null,
            birthDate: body.birthDate ?? null,
            gender: body.gender ?? null,
            nationality: body.nationality ?? null,
            naturalness: body.naturalness ?? null,
            photoUrl: body.photoUrl ?? null,
            emergencyContact: body.emergencyContact ?? null,
            updatedAt: new Date(),
          })
          .where(eq(students.id, id))
          .returning({ id: students.id });

        if (updated.length === 0) {
          return reply
            .status(404)
            .send({ message: "Student not found, verify ID and try again" });
        }

        return reply.status(200).send({ message: "Student updated" });
      } catch (err) {
        const pg = err as { code?: string; cause?: { code?: string } };
        const code = pg.code ?? pg.cause?.code;

        if (code === "23505") {
          return reply.status(409).send({
            message: "CPF, email or registration number already in use.",
          });
        }
        request.log.error(err);
        const detail =
          process.env.NODE_ENV === "production"
            ? ""
            : ` [${(err as { cause?: Error }).cause?.message ?? (err as Error).message}]`;
        return reply
          .status(500)
          .send({ message: `Unable to update student.${detail}` });
      }
    },
  );
};
