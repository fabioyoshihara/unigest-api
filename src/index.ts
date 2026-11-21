import "dotenv/config";
import fastifySwagger from "@fastify/swagger";
import { fastify } from "fastify";
import cors from "@fastify/cors";

import {
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
import { getCoursesRoute } from "./routes/courses/getCoursesRoute.ts";
import { swaggerConfig } from "./config/swagger.ts";
import { deleteUserRoute } from "./routes/users/deleteUserRoute.ts";
import { deleteStudentRoute } from "./routes/students/deleteStudentRoute.ts";
import { deleteCourseRoute } from "./routes/courses/deleteCourseRoute.ts";

const port = Number(process.env.PORT) || 3333;

const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENVIRONMENT === "development";

const server = fastify({
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
    : true,
});

/* CORS */
await server.register(cors, {
  origin: process.env.FRONTEND_URL || "*",
});

/* ZOD */
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(healthRoute);
/* SWAGGER */
if (isDev) {
  await server.register(fastifySwagger, swaggerConfig);

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
server.register(loginRoute);

server.register(createUserRoute);
server.register(getUsersRoute);
server.register(getUserByIdRoute);
server.register(deleteUserRoute);

server.register(getStudentsRoute);
server.register(createStudentRoute);
server.register(deleteStudentRoute);

server.register(createCourseRoute);
server.register(getCoursesRoute);
server.register(deleteCourseRoute);

/* SERVER */
server.listen(
  {
    port,
    host: "0.0.0.0",
  },
  (err, address) => {
    if (err) {
      server.log.error(err);
      process.exit(1);
    }

    console.log(`HTTP server is running, ${address}`);
  }
);

export { server };