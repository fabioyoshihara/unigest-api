import { z } from "zod";
import { sql } from "drizzle-orm";
import { db } from "../database/client.js";
export const healthRoute = async (app) => {
    app.get("/", {
        schema: {
            tags: ["Health"],
            summary: "Health check e metadados básicos da API",
            response: {
                200: z.object({
                    status: z.literal("ok"),
                    service: z.string(),
                    version: z.string(),
                    database: z.enum(["connected", "disconnected"]),
                    uptimeSeconds: z.number(),
                    timestamp: z.string(),
                    docs: z.string(),
                }),
                503: z.object({
                    status: z.literal("error"),
                    database: z.literal("disconnected"),
                    timestamp: z.string(),
                }),
            },
        },
    }, async (_request, reply) => {
        try {
            await db.execute(sql `SELECT 1`);
            return reply.status(200).send({
                status: "ok",
                service: "gestao_universidade_server",
                version: "1.0.0",
                database: "connected",
                uptimeSeconds: Math.floor(process.uptime()),
                timestamp: new Date().toISOString(),
                docs: "/docs",
            });
        }
        catch {
            return reply.status(503).send({
                status: "error",
                database: "disconnected",
                timestamp: new Date().toISOString(),
            });
        }
    });
};
