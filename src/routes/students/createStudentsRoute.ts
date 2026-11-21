import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { checkRequestJWT } from "../hooks/check-request-jwt.ts";
import { z } from "zod";
import { getUserFromRequest } from "../../utils/getUserFromRequest.ts";
import { db } from "../../database/client.ts";
import { students } from "../../database/schema.ts";

function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const errorObj = err as Record<string, unknown>;
  const cause = errorObj.cause as Record<string, unknown> | undefined;
  return errorObj.code === "23505" || cause?.code === "23505";
}

export const createStudentRoute: FastifyPluginAsyncZod = async (server) => {
  server.post(
    "/api/v1/students",
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ["Students"],
        summary: "Register a new student",
        description: "Create an enrollment to student",
        body: z.object({
          nome: z.string().min(1, "Name is required"),
          cpf: z.string().min(11, "CPF is required"),
          email: z.email(),
          telefone: z.string().min(1, "Phone is required"),
          endereco: z.string().min(1, "Address is required"),
          ra: z.string().min(1, "Registration number is required"),
          dataIngresso: z.coerce.date(),
        }),
        response: {
          201: z.object({
            studentId: z.string(),
          }),
          401: z.object({
            message: z.string(),
          }),
          409: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const user = getUserFromRequest(request);
      const { nome, cpf, email, telefone, endereco, ra, dataIngresso } =
        request.body;

      if (!user) {
        return reply
          .status(401)
          .send({ message: "You are'n authorized to use this resource" });
      }

      try {
        const result = await db
          .insert(students)
          .values({
            name: nome,
            cpf,
            email,
            phone: telefone,
            address: endereco,
            registrationNumber: ra,
            admissionDate: dataIngresso,
          })
          .returning();

        return reply.status(201).send({ studentId: result[0].id });
      } catch (err) {
        if (isUniqueViolation(err)) {
          return reply.status(409).send({
            message: "Student with this CPF, email or RA already exists",
          });
        }
        throw err;
      }
    }
  );
};