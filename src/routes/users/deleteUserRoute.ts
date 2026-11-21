import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { getUserFromRequest } from "../../utils/getUserFromRequest.ts";
import { db } from "../../database/client.ts";
import { users } from "../../database/schema.ts";
import { and, eq } from "drizzle-orm";

export const deleteUserRoute: FastifyPluginAsyncZod = async (server) => { 
  server.delete("/api/v1/users/:id", { 
    schema: { 
      tags: ["Users"],
      summary: "Delete User",
      description: "Inactivate user on Database, logic exclusion, you need info UUID to delete.",
      params: z.object({ 
        id: z.string().uuid(),
      }),
      response: { 
        200: z.object({
          message: z.string(),
        }),
        401: z.object({
          message: z.string(),
        }),
        404: z.object({
          message: z.string(),
        }),
        500: z.object({ 
          message: z.string(),
        })
      }
    }
  }, async (request, reply) => {
    const user = getUserFromRequest(request);
    const id = request.params.id;

    if(!user) { 
      return reply.status(401).send({ message: "You aren't authorized to use this resource" })
    }

    try { 
      const selectUser = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id),eq(users.isActive, true)))

      if(selectUser.length === 0) { 
        return reply.status(404).send({ message: "User not Found, verify ID and try again" });
      }

      await db.update(users).set({ isActive: false }).where(eq(users.id, id));

      return reply.status(200).send({ message: "User deleted" });

    } catch(err) { 
      request.log.error(err);
      return reply.status(500).send({ message: `Can't complete this request, error: ${err}` });
    }
  })
}