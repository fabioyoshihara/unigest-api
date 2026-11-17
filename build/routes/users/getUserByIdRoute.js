import { server } from "../../index.js";
import { checkRequestJWT } from "../hooks/check-request-jwt.js";
export function getUserByIdRoute() {
    server.get("/api/v1/users/:id", {
        preHandler: [
            checkRequestJWT
        ],
        schema: {
            tags: ["Users"],
            summary: "Get user info by ID",
            description: "Return all info of user searching by ID, return first name, Last Name, "
        }
    }, async (request, reply) => {
    });
}
