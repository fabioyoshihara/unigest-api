import { db } from './../database/client.ts';
import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { eq } from 'drizzle-orm';
import { usuarios } from '../database/schema.ts';
import { hash } from 'argon2';

export const createUserRoute: FastifyPluginAsyncZod = async (server) => { 
  server.post("/api/users", {
    schema: {
      tags: ["Users"],
      description: "Register an user with email, username and password", 
      summary: "",
      body: z.object({
        name: z.string().min(1, "Name is required"),
        email: z.email().min(1, "Email is required"),
        password: z.string().min(8, "Minimum 8 caracters is required to password"),
      }),
      response: {
        201: z.object({
          userId: z.string(),
        }),
        409: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        })
      },
    }
  }, async (request, reply) => {
    try {
      const { name, email, password } = request.body;
      
      const emailExist = await db
        .select()
        .from(usuarios)
        .where(eq(usuarios.email, email))
      
      if(emailExist.length > 0) {
        return reply.status(409).send({ message: "Credentials is already been used!" });
      }
      
      const passwordHash = await hash(password);
      
      const result = await db
        .insert(usuarios)
        .values({
          nome: name,
          email,
          senhaHash: passwordHash,
        })
        .returning()
      
      return reply.status(201).send({ userId: result[0].id})
    } catch (err) {
      console.error("Registration error:", err);
      return reply.status(500).send({ message: "Cannot process user registration" })    
    }
  })

  server.get("/api/users", async () => {
  const users = await db
    .select()
    .from(usuarios);

  return users;
});

server.delete("/api/users/:id", async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    await db
      .delete(usuarios)
      .where(eq(usuarios.id, id));

    return reply.status(200).send({
      message: "User deleted successfully",
    });

  } catch (err) {
    console.error(err);

    return reply.status(500).send({
      message: "Error deleting user",
    });
  }
});

server.put("/api/users/:id", async (request, reply) => {
  try {
    const { id } = request.params as { id: string };

    const body = request.body as {
      name: string;
      email: string;
    };

    await db
      .update(usuarios)
      .set({
        nome: body.name,
        email: body.email,
      })
      .where(eq(usuarios.id, id));

    return reply.status(200).send({
      message: "User updated successfully",
    });

  } catch (err) {
    console.error(err);

    return reply.status(500).send({
      message: "Error updating user",
    });
  }
});
}