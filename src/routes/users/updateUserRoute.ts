import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { eq, and, ne } from "drizzle-orm";
import { db } from "../../database/client.ts";
import { users } from "../../database/schema.ts";
import { userRoleEnum } from "../../database/schema/enums.ts";
import { checkRequestJWT } from "../hooks/check-request-jwt.ts";
import { getUserFromRequest } from "../../utils/getUserFromRequest.ts";

export const updateUserRoute: FastifyPluginAsyncZod = async (server) => {
  server.put(
    "/api/v1/users/:id",
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ["Users"],
        summary: "Replace User",
        description:
          "Full update: firstName, lastName, personalEmail and role are required. Institutional email and password are not changed here.",
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          firstName: z
            .string()
            .trim()
            .min(1, "First name is required")
            .max(100),
          lastName: z.string().trim().min(1, "Last name is required").max(100),
          personalEmail: z
            .string()
            .trim()
            .email("Invalid personal email")
            .max(255),
          role: z.enum(userRoleEnum.enumValues),
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

      if (!user) {
        return reply.status(401).send({ message: "You aren't authorized" });
      }
      
      try {
        const [emailInUse] = await db
          .select({ id: users.id })
          .from(users)
          .where(
            and(eq(users.personalEmail, body.personalEmail), ne(users.id, id)),
          )
          .limit(1);

        if (emailInUse) {
          return reply
            .status(409)
            .send({ message: "Personal email is already in use." });
        }

        const updated = await db
          .update(users)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(users.id, id))
          .returning({ id: users.id });

        if (updated.length === 0) {
          return reply
            .status(404)
            .send({ message: "User not found, verify ID and try again" });
        }

        return reply.status(200).send({ message: "User updated" });
      } catch (err) {
        request.log.error(err);
        const detail =
          process.env.NODE_ENV === "production"
            ? ""
            : ` [${(err as { cause?: Error }).cause?.message ?? (err as Error).message}]`;
        return reply
          .status(500)
          .send({ message: `Unable to update user.${detail}` });
      }
    },
  );
};
