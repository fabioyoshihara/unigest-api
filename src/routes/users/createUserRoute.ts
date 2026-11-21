
import { db } from "../../database/client.ts";
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { eq } from "drizzle-orm";
import { users } from "../../database/schema.ts";
import { hash } from "argon2";
import { checkRequestJWT } from "../hooks/check-request-jwt.ts";
import { generateRandomPassword } from "../../utils/generateRandomPassword.ts";
import { generateInstitutionalEmail } from "../../utils/generateInstitutionalEmail.ts";

const MAX_RETRIES = 3;

export const createUserRoute: FastifyPluginAsyncZod = async (server) => {
  server.post(
    "/api/v1/users",
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ["Users"],
        summary: "Create User",
        description:
          "Create a user with permission to use the system. Institutional email is generated automatically.",
        body: z.object({
          firstName: z
            .string()
            .trim()
            .min(1, "First name is required")
            .max(100, "Maximum 100 characters"),
          lastName: z
            .string()
            .trim()
            .min(1, "Last name is required")
            .max(100, "Maximum 100 characters"),
          personalEmail: z
            .string()
            .trim()
            .email("Invalid personal email"),
        }),
        response: {
          201: z.object({
            id: z.string().uuid(),
            firstName: z.string(),
            lastName: z.string(),
            email: z.email(),
            personalEmail: z.email(),
            mustChangePassword: z.boolean(),
            temporaryPassword: z.string(),
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
      try {
        const { firstName, lastName, personalEmail } = request.body;

        const personalEmailExist = await db
          .select()
          .from(users)
          .where(eq(users.personalEmail, personalEmail));

        if (personalEmailExist.length > 0) {
          return reply.status(409).send({
            message: "Personal email is already in use.",
          });
        }

        const plainPassword = generateRandomPassword(8);
        const passwordHash = await hash(plainPassword);

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
          try {
            const email = await generateInstitutionalEmail(
              firstName,
              lastName
            );

            const [createdUser] = await db
              .insert(users)
              .values({
                firstName,
                lastName,
                email,
                personalEmail,
                passwordHash,
                mustChangePassword: true,
              })
              .returning({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                personalEmail: users.personalEmail,
                mustChangePassword: users.mustChangePassword,
              });

            return reply.status(201).send({
              ...createdUser,
              temporaryPassword: plainPassword,
            });
          } catch (err: unknown) {
            const pgError = err as { code?: string };

            if (pgError?.code === "23505") {
              if (attempt < MAX_RETRIES) {
                request.log.warn(
                  { attempt, firstName, lastName },
                  "Institutional email conflict. Trying again."
                );

                continue;
              }

              return reply.status(409).send({
                message:
                  "Unable to generate a unique institutional email.",
              });
            }

            throw err;
          }
        }
      } catch (err) {
        request.log.error(err);

        return reply.status(500).send({
          message: "Unable to process user registration.",
        });
      }
    }
  );
};
