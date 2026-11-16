import "dotenv/config";
import fastifySwagger from "@fastify/swagger";
import { fastify } from "fastify";
import cors from "@fastify/cors";

import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import scalarAPIReference from "@scalar/fastify-api-reference";

import { getStudentsRoute } from "./routes/getStudentsRoute.ts";
import { createStudentRoute } from "./routes/createStudentsRoute.ts";
import { createUserRoute } from "./routes/createUserRoute.ts";
import { loginRoute } from "./routes/loginRoute.ts";
import { createCourseRoute } from "./routes/createCourseRoute.ts";

const server = fastify({
  logger: {
    transport: {
      target: "pino-pretty",
      options: {
        translateTime: "HH:MM:ss Z",
        ignore: "pid,hostname",
      },
    },
  },
});

const port = Number(process.env.PORT) || 3333;

/* CORS */
await server.register(cors, {
  origin: "http://localhost:5173",
});

/* ZOD */
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

/* SWAGGER */
if (process.env.NODE_ENVIRONMENT === "development") {
  await server.register(fastifySwagger, {
    openapi: {
      info: {
        title: "Unigest API",
        description: "API to university management",
        version: "1.0.0",
      },
    },
    transform: jsonSchemaTransform,
  });

  server.get("/openapi.json", async () => {
    return server.swagger();
  });

  await server.register(scalarAPIReference, {
    routePrefix: "/docs",
    configuration: {
      title: "Our API Reference",
      url: "/openapi.json",
      theme: "deepSpace",
    },
  });
}

/* ROUTES */
server.register(createUserRoute);
server.register(loginRoute);
server.register(getStudentsRoute);
server.register(createStudentRoute);
server.register(createCourseRoute);

/* SERVER */
server.listen(
  {
    port,
    host: "0.0.0.0",
  },
  (err) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }

    console.log("HTTP server is running!");
  }
);

export { server };