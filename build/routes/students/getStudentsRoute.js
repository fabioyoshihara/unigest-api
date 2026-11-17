import { students } from "../../database/schema.js";
import { getUserFromRequest } from "../../utils/getUserFromRequest.js";
import { checkRequestJWT } from "../hooks/check-request-jwt.js";
import { z } from "zod";
import { db } from "../../database/client.js";
export const getStudentsRoute = async (server) => {
    server.get("/api/v1/students", {
        preHandler: [checkRequestJWT],
        schema: {
            tags: ["Students"],
            summary: "Get Students",
            description: "Return all students registered on system",
            // querystring: z.object({
            //   search: z.string().optional(),
            //   orderBy: z.enum(['ra', 'nome', 'cpf'])
            // }),
            response: {
                200: z.object({
                    students: z.array(z.object({
                        id: z.uuid(),
                        name: z.string(),
                        cpf: z.string(),
                        email: z.email(),
                        phone: z.string(),
                        address: z.string(),
                        registrationNumber: z.string(),
                        admissionDate: z.coerce.date(),
                        isActive: z.boolean(),
                    })),
                }),
                401: z.object({
                    message: z.string(),
                }),
            },
        },
    }, async (request, reply) => {
        try {
            const user = getUserFromRequest(request);
            // const { search } = request.params;
            if (!user) {
                return reply
                    .status(401)
                    .send({ message: "You are'n authorized to use this resource" });
            }
            const result = await db.select().from(students);
            // .orderBy()
            return reply.status(200).send({ students: result });
        }
        catch (error) {
            throw new Error("Não foi possível retornar a consulta.");
        }
    });
};
