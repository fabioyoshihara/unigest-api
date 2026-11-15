import { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { users } from "../../database/schema.ts";
import { eq } from "drizzle-orm";
import { db } from "../../database/client.ts";
import jwt from "jsonwebtoken";
import { verify } from "argon2";

export const loginRoute: FastifyPluginAsyncZod = async (server) => {
  server.post("/api/v1/login", {
    schema: { 
      tags: ["Authentication"],
      summary: "",
      description: "",
      body: z.object({
        email: z.email(),
        password: z.string(),
      }),
      response: {
        200: z.object({
          token: z.string(),
        }),
        201: z.object({
          token: z.string(),
        }),
        400: z.object({
          message: z.string(),
        }),
        401: z.object({
          message: z.string(),
        })
      }
    }
  }, async (request, reply) => {
    try { 
      const { email, password } = request.body;
      
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email));

      if(result.length === 0) {
        return reply.status(400).send({ message: "Invalid Credentials"})
      }

      const user = result[0];

      const doesPasswordMatch = await verify(user.passwordHash, password);

      if(!doesPasswordMatch) { 
        return reply.status(400).send({ message: "Invalid password. Try Again"})
      }

      const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET!)

      return reply.status(200).send({ token })
    } catch(err) { 
      throw new Error("Can't login on system, try Again! Internal Error")
    }
  })
}