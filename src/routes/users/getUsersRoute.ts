
import { z } from "zod";
import { db } from "../../database/client.ts";
import { users } from "../../database/schema.ts";
import { asc, eq } from "drizzle-orm";
import { checkRequestJWT } from "../hooks/check-request-jwt.ts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const getUsersRoute: FastifyPluginAsyncZod = async (server) => {
  server.get(
    "/api/v1/users",
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ["Users"],
        summary: "Get Users",
        description: "List all internal system users.",
        response: {
          200: z.array(
            z.object({
              id: z.string().uuid(),
              firstName: z.string(),
              lastName: z.string(),
              name: z.string(),
              email: z.email(),
              personalEmail: z.email(),
              role: z.enum([
                "admin",
                "secretary",
                "finance",
                "coordination",
              ]),
              isActive: z.boolean(),
              createdAt: z.string(),
              updatedAt: z.string(),
            })
          ),
          401: z.object({
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
        const result = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            personalEmail: users.personalEmail,
            role: users.role,
            isActive: users.isActive,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .orderBy(asc(users.firstName))
          .where(eq(users.isActive, true))

        const formattedUsers = result.map((user) => ({
          ...user,
          name: `${user.firstName} ${user.lastName}`,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        }));

        return reply.status(200).send(formattedUsers);
      } catch (err) {
        request.log.error(err);

        return reply.status(500).send({
          message: "Unable to retrieve users. Internal server error.",
        });
      }
    }
  );
};
