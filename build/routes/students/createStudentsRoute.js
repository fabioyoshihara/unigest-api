import { checkRequestJWT } from "../hooks/check-request-jwt.js";
import { z } from "zod";
import { getUserFromRequest } from "../../utils/getUserFromRequest.js";
import { db } from "../../database/client.js";
import { students } from "../../database/schema.js";
export const createStudentRoute = async (server) => {
    server.post("/api/v1/students", {
        preHandler: [
            checkRequestJWT,
        ],
        schema: {
            tags: ["Students"],
            summary: "",
            description: "Create an enrollment to student",
            response: {
                201: z.object({
                    studentId: z.string(),
                }),
                401: z.object({
                    message: z.string(),
                }),
            },
            body: z.object({
                nome: z.string(),
                cpf: z.string(),
                email: z.email(),
                telefone: z.string(),
                endereco: z.string(),
                ra: z.string(),
                dataIngresso: z.coerce.date(),
            })
        }
    }, async (request, reply) => {
        const user = getUserFromRequest(request);
        const { nome, cpf, email, telefone, endereco, ra, dataIngresso } = request.body;
        if (!user) {
            return reply.status(401).send({ message: "You are'n authorized to use this resource" });
        }
        const result = await db
            .insert(students)
            .values({
            name: nome,
            cpf,
            email,
            phone: telefone,
            address: endereco,
            registrationNumber: ra,
            admissionDate: dataIngresso,
        })
            .returning();
        return reply.send({ studentId: result[0].id });
    });
};
