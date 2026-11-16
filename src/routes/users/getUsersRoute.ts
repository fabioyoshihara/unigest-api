import { z } from "zod";
import { server } from "../../index.ts";
import { getUserFromRequest } from "../../utils/getUserFromRequest.ts";
import { db } from "../../database/client.ts";
import { users } from "../../database/schema.ts";
import { eq } from "drizzle-orm";
import { checkRequestJWT } from "../hooks/check-request-jwt.ts";

export function getUsersRoute() {
  server.get("/api/v1/users", { 
    preHandler: [ 
      checkRequestJWT,
    ],
    schema: { 
      tags: ["Users"],
      summary: "Get Users",
      description: "Return info from all users registered to use system, require authenticate and return name, educational address, role, createdAt and UpdatedAt",
      response: { 
        200: z.array(
          z.object({ 
            id: z.string().uuid(),
            name: z.string(),
            email: z.email(),
            role: z.string(),
            isActive: z.boolean(),
            createdAt: z.string(),
            updatedAt: z.string(),
          })
        ),
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
    try { 
      const result = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        })
        .from(users)
        .where(eq(users.isActive, true))

      if(result.length === 0) { 
        return reply.status(404).send({ message: "No users found!" });
      }

      const formattedUsers = result.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      }));
        
      return reply.status(200).send(formattedUsers);
    } catch (err) { 
      request.log.error(err);
      return reply.status(500).send({ message: err });
    }
  })
}