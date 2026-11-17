import jwt from "jsonwebtoken";
export async function checkRequestJWT(request, reply) {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        return reply.status(401).send({ message: "Token not provided" });
    }
    const [, token] = authHeader.split(" ");
    if (!token) {
        return reply.status(401).send("You aren't authorized to use this resource");
    }
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET must be exist on .env");
    }
    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        request.user = payload;
    }
    catch (err) {
        return reply.status(401).send({ error: err });
    }
}
