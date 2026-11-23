import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../../database/client.ts";
import { suppliers } from "../../database/schema.ts";
import { checkRequestJWT } from "../hooks/check-request-jwt.ts";
import { getUserFromRequest } from "../../utils/getUserFromRequest.ts";

export const updateSupplierRoute: FastifyPluginAsyncZod = async (server) => {
  server.put(
    "/api/v1/suppliers/:id",
    {
      preHandler: [checkRequestJWT],
      schema: {
        tags: ["Suppliers"],
        summary: "Replace Supplier",
        description:
          "Full update: all required fields must be sent. Omitted stateRegistration is set to null.",
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          legalName: z
            .string()
            .trim()
            .min(1, "Legal name is required")
            .max(200),
          cnpj: z.string().trim().min(14, "Invalid CNPJ").max(18),
          stateRegistration: z.string().trim().max(30).nullable().optional(),
          email: z.string().trim().email("Invalid email").max(120),
          phone: z.string().trim().min(1, "Phone is required").max(20),
          address: z.string().trim().min(1, "Address is required").max(255),
          category: z.string().trim().min(1, "Category is required").max(100),
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

      if(!user) { 
        return reply.status(401).send({ message: "You aren't authorized" });
      }

      try {
        const updated = await db
          .update(suppliers)
          .set({
            ...body,
            stateRegistration: body.stateRegistration ?? null,
            updatedAt: new Date(),
          })
          .where(eq(suppliers.id, id))
          .returning({ id: suppliers.id });

        if (updated.length === 0) {
          return reply
            .status(404)
            .send({ message: "Supplier not found, verify ID and try again" });
        }

        return reply.status(200).send({ message: "Supplier updated" });
      } catch (err) {
        const pg = err as { code?: string; cause?: { code?: string } };
        const code = pg.code ?? pg.cause?.code;

        if (code === "23505") {
          return reply.status(409).send({ message: "CNPJ is already in use." });
        }
        request.log.error(err);
        const detail =
          process.env.NODE_ENV === "production"
            ? ""
            : ` [${(err as { cause?: Error }).cause?.message ?? (err as Error).message}]`;
        return reply
          .status(500)
          .send({ message: `Unable to update supplier.${detail}` });
      }
    },
  );
};
