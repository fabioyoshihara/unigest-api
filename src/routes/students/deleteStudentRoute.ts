import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { checkRequestJWT } from "../hooks/check-request-jwt.ts";
import { getUserFromRequest } from "../../utils/getUserFromRequest.ts";
import { z } from "zod";
import { db } from "../../database/client.ts";
import { students } from "../../database/schema.ts";
import { and, eq } from "drizzle-orm";

export const deleteStudentRoute: FastifyPluginAsyncZod = async (server) => {
  server.delete("/api/v1/students/:id", { 
    preHandler: [checkRequestJWT],
    schema: { 
      tags: ["Students"],
      summary: "Delete Student",
      description: "Inactivate an student, logic delete, you need an ID and info on request, you should be authenticate to use this resource",
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
      const selectStudent = await db
        .select()
        .from(students)
        .where(and(eq(students.id, id), eq(students.isActive, true)));

      if (selectStudent.length === 0) {
        return reply
          .status(404)
          .send({ message: "Student not Found, verify ID and try again" });
      }

      await db
        .update(students)
        .set({ isActive: false })
        .where(eq(students.id, id));

      return reply.status(200).send({ message: "Student deleted" });

    } catch(err) { 
      request.log.error(err);
      return reply.status(500).send({ message: `Can't complete this request, error: ${err}` });
    }
  })
}