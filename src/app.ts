import fastifySwagger from "@fastify/swagger";
import { fastify } from "fastify";
import cors from "@fastify/cors";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import scalarAPIReference from "@scalar/fastify-api-reference";

import { getStudentsRoute } from "./routes/students/getStudentsRoute.ts";
import { createStudentRoute } from "./routes/students/createStudentsRoute.ts";
import { createUserRoute } from "./routes/users/createUserRoute.ts";
import { loginRoute } from "./routes/auth/loginRoute.ts";
import { createCourseRoute } from "./routes/courses/createCourseRoute.ts";
import { getUsersRoute } from "./routes/users/getUsersRoute.ts";
import { healthRoute } from "./routes/health.ts";
import { getUserByIdRoute } from "./routes/users/getUserByIdRoute.ts";

export async function buildApp() {
  const isDev =
    process.env.NODE_ENV === "development" ||
    process.env.NODE_ENVIRONMENT === "development";

  const app = fastify({
    logger: isDev
      ? {
          level: "debug",
          transport: {
            target: "pino-pretty",
            options: {
              translateTime: "SYS:HH:MM:ss",
              ignore: "pid,hostname",
              colorize: true,
            },
          },
        }
      : false,
  });

  await app.register(cors, {
    origin: process.env.FRONTEND_URL || "*",
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(healthRoute);

  if (isDev) {
    await app.register(fastifySwagger, {
      openapi: {
        info: {
          title: "Unigest API",
          description: "API to university management",
          version: "1.0.0",
        },
      },
      transform: jsonSchemaTransform,
    });

    app.get("/openapi.json", async () => {
      return app.swagger();
    });

    await app.register(scalarAPIReference, {
      routePrefix: "/docs",
      configuration: {
        title: "Our API Reference",
        url: "/openapi.json",
        theme: "deepSpace",
      },
    });
  }

  app.register(loginRoute);
  app.register(createUserRoute);
  app.register(getUsersRoute);
  app.register(getUserByIdRoute);
  app.register(getStudentsRoute);
  app.register(createStudentRoute);
  app.register(createCourseRoute);

  return app;
}