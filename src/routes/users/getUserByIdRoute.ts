import { z } from "zod";
import { server } from "../../index.ts";
import { getUserFromRequest } from "../../utils/getUserFromRequest.ts";
import { checkRequestJWT } from "../hooks/check-request-jwt.ts";
import { db } from "../../database/client.ts";
import { users } from "../../database/schema.ts";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

export const getUserByIdRoute: FastifyPluginAsyncZod = async (server) => { 
  server.get(
    "/api/v1/users/:id",
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ["Users"],
        summary: "Get user info by ID",
        description:
          "Return all info of user searching by ID, return first name, last name, email, role, createdAt and updatedAt, require be authenticate to use this resource",
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            id: z.string().uuid(),
            firstName: z.string().min(1),
            lastName: z.string().min(1),
            email: z.email(),
            personalEmail: z.email().nullable().optional(),
            role: z.string(),
            createdAt: z.string(),
            updatedAt: z.string(),
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
      const userId = request.params.id;

      try {
        const result = await db
          .select({
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            personalEmail: users.personalEmail,
            role: users.role,
            createdAt: users.createdAt,
            updatedAt: users.updatedAt,
          })
          .from(users)
          .where(and(eq(users.id, userId), eq(users.isActive, true)));

        if (result.length === 0) {
          return reply
            .status(404)
            .send({ message: "User not found, verify ID and try again" });
        }

        const foundUser = result[0];

        return reply.status(200).send({
          ...foundUser,
          createdAt: foundUser.createdAt.toISOString(),
          updatedAt: foundUser.updatedAt.toISOString(),
        })
      } catch (err) {
        request.log.error(err);
        return reply
          .status(500)
          .send({ message: "Cannot complete this request: " });
      }
    },
  );
}