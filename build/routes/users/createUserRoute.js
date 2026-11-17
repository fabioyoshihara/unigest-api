import { db } from "../../database/client.js";
import { z } from "zod";
import { eq } from 'drizzle-orm';
import { users } from "../../database/schema.js";
import { hash } from 'argon2';
import { checkRequestJWT } from "../hooks/check-request-jwt.js";
import { generateRandomPassword } from "../../utils/generateRandomPassword.js";
import { generateInstitutionalEmail } from "../../utils/generateInstitutionalEmail.js";
const MAX_RETRIES = 3;
export const createUserRoute = async (server) => {
    server.post("/api/v1/users", {
        preHandler: [checkRequestJWT],
        schema: {
            tags: ["Users"],
            summary: "Create User",
            description: "Create a user with permission to use system, email is generated automatically based on name ",
            body: z.object({
                firstName: z
                    .string()
                    .trim()
                    .min(1, "First name is required")
                    .trim()
                    .max(100, "Maximum 100 characters"),
                lastName: z
                    .string()
                    .min(1, "Last name is required")
                    .max(100, "Maximum 100 characters"),
                personalEmail: z.string().email("Invalid Personal E-mail "),
            }),
            response: {
                201: z.object({
                    id: z.string().uuid(),
                    firstName: z.string(),
                    lastName: z.string(),
                    email: z.string().email(),
                    temporaryPassword: z.string(),
                }),
                409: z.object({
                    message: z.string(),
                }),
                500: z.object({
                    message: z.string(),
                }),
            },
        },
    }, async (request, reply) => {
        try {
            const { firstName, lastName, personalEmail } = request.body;
            const plainPassword = generateRandomPassword(8);
            const passwordHash = await hash(plainPassword);
            const personalEmailExist = await db
                .select()
                .from(users)
                .where(eq(users.personalEmail, personalEmail));
            if (personalEmailExist.length > 0) {
                return reply
                    .status(409)
                    .send({ message: "Credentials is already been used!" });
            }
            for (var attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                try {
                    const email = await generateInstitutionalEmail(firstName, lastName);
                    const [createdUser] = await db
                        .insert(users)
                        .values({
                        firstName,
                        lastName,
                        email,
                        personalEmail,
                        passwordHash,
                        mustChangePassword: true,
                    })
                        .returning({
                        id: users.id,
                        firstName: users.firstName,
                        lastName: users.lastName,
                        email: users.email,
                        personalEmail: users.personalEmail,
                        mustChangePassword: users.mustChangePassword,
                    });
                    return reply
                        .status(201)
                        .send({ ...createdUser, temporaryPassword: plainPassword });
                }
                catch (err) {
                    const pgError = err;
                    if (pgError?.code === "23505") {
                        if (attempt < MAX_RETRIES) {
                            request.log.warn({ attempt, firstName, lastName }, "Colisão simultânea de e-mail institucional (23505). Tentando próximo sufixo...");
                            continue;
                        }
                        return reply.status(409).send({
                            message: "Não foi possível gerar um e-mail institucional único devido a alta concorrência.",
                        });
                    }
                    throw err;
                }
            }
        }
        catch (err) {
            console.error("Registration error:", err);
            return reply
                .status(500)
                .send({ message: "Cannot process user registration" });
        }
    });
};
