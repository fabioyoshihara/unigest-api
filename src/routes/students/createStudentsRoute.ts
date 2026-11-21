import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { checkRequestJWT } from "../hooks/check-request-jwt.ts";
import { z } from "zod";
import { getUserFromRequest } from "../../utils/getUserFromRequest.ts";
import { db } from "../../database/client.ts";
import { students } from "../../database/schema.ts";
import { eq } from "drizzle-orm";
import { genderEnum, studentStatusEnum } from "../../database/schema/enums.ts";
import { randomUUID } from "node:crypto";

export const createStudentRoute: FastifyPluginAsyncZod = async (server) => {
  server.post(
    "/api/v1/students",
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ["Students"],
        summary: "Create Student",
        description: "Create an enrollment to student",
        body: z.object({
          name: z.string().trim().min(1, "Name is required").max(200),
          cpf: z.string().min(1, "CPF is required").max(14),
          email: z.email().min(1, "E-mail is required").trim().toLowerCase(),
          phone: z.string().max(20),
          secondaryPhone: z.string().optional(),
          address: z.string().max(255),
          admissionDate: z.coerce.date(),
          birthDate: z.iso.date(),
          gender: z.enum(genderEnum.enumValues).optional(),
          nationality: z.string().max(80).optional(),
          naturalness: z.string().max(120).optional(),
          photoUrl: z.string().max(500).optional(),
          emergencyContact: z.string().max(120),
          status: z.enum(studentStatusEnum.enumValues).default("active"),
        }),
        response: {
          201: z.object({
            studentId: z.string().uuid(),
            registrationNumber: z.string(),
          }),
          401: z.object({
            message: z.string(),
          }),
          409: z.object({
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
      const { cpf, email } = request.body;

      if (!user) {
        return reply
          .status(401)
          .send({ message: "You are'n authorized to use this resource" });
      }

      try {
        const registrationNumber = `ALU-${randomUUID().slice(0, 8).toUpperCase()}`;
        const data = {
          ...request.body,
          cpf: cpf.replace(/\D/g, ""),
          email: email.toLowerCase(),
          registrationNumber,
        };

        const [createStudent] = await db
          .insert(students)
          .values(data)
          .returning({
            id: students.id,
            registrationNumber: students.registrationNumber,
          });

        return reply.status(201).send({
          studentId: createStudent.id,
          registrationNumber: createStudent.registrationNumber,
        });
      } catch (err) {
        const dbError = err as {
          code?: string;
          constraint?: string;
        };

        if (dbError.code === "23505") {
          if (dbError.constraint === "students_cpf_uq") {
            return reply.status(409).send({
              message: "A student with this CPF already exists",
            });
          }

          if (dbError.constraint === "students_email_uq") {
            return reply.status(409).send({
              message: "A student with this email already exists",
            });
          }

          if (dbError.constraint === "students_registration_number_uq") {
            return reply.status(409).send({
              message: "Registration number conflict. Try again",
            });
          }
          return reply.status(409).send({
            message: "A unique constraint was violated",
          });
        }
        request.log.error({ error: err }, "Failed to create student");
        return reply.status(500).send({
          message: "Internal server error",
        });
      }
    },
  );
}