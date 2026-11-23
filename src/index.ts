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
import { getStudentByIdRoute } from "./routes/students/getStudentByIdRoute.ts";
import { getCourseByIdRoute } from "./routes/courses/getCourseByIdRoute.ts";
import { getSupplierRoute } from "./routes/suppliers/getSupplierRoute.ts";
import { createSupplierRoute } from "./routes/suppliers/createSupplierRoute.ts";
import { getSupplierByIdRoute } from "./routes/suppliers/getSupplierByIdRoute.ts";
import { deleteSupplierRoute } from "./routes/suppliers/deleteSupplierRoute.ts";
import { getClassesRoute } from "./routes/classes/getClassesRoute.ts";
import { getClassByIdRoute } from "./routes/classes/getClassByIdRoute.ts";
import { createClassRoute } from "./routes/classes/createClassRoute.ts";
import { deleteClassRoute } from "./routes/classes/deleteClassRoute.ts";
import { updateClassRoute } from "./routes/classes/updateClassRoute.ts";
import { updatePartialClassRoute } from "./routes/classes/updatePartialClassRoute.ts";
import { getTeachersRoute } from "./routes/teachers/getTeachersRoute.ts";
import { getTeacherByIdRoute } from "./routes/teachers/getTeacherByIdRoute.ts";
import { createTeacherRoute } from "./routes/teachers/createTeacherRoute.ts";
import { updateTeacherRoute } from "./routes/teachers/updateTeacherRoute.ts";
import { updatePartialTeacherRoute } from "./routes/teachers/updatePartialTeacherRoute.ts";
import { deleteTeacherRoute } from "./routes/teachers/deleteTeacherRoute.ts";
import { updateCourseRoute } from "./routes/courses/updateCourseRoute.ts";
import { updatePartialCourseRoute } from "./routes/courses/updatePartialCourseRoute.ts";
import { updatePartialSupplierRoute } from "./routes/suppliers/updatePartialSupplierRoute.ts";
import { updateSupplierRoute } from "./routes/suppliers/updateSupplierRoute.ts";
import { updateStudentRoute } from "./routes/students/updateStudentRoute.ts";
import { updatePartialStudentRoute } from "./routes/students/updatePartialStudentRoute.ts";
import { updateUserRoute } from "./routes/users/updateUserRoute.ts";
import { updatePartialUserRoute } from "./routes/users/updatePartialUserRoute.ts";

const port = Number(process.env.PORT) || 3333;

// Detecta se o arquivo foi importado pelo Vitest durante a execução dos testes
const isTest = process.env.NODE_ENV === "test" || Boolean(process.env.VITEST);

// Só ativa logs coloridos e Swagger em desenvolvimento real (nunca durante os testes)
const isDev =
  !isTest &&
  (process.env.NODE_ENV === "development" ||
    process.env.NODE_ENVIRONMENT === "development");

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
    : !isTest,
});

/* CORS */
/* CORS */
await server.register(cors, {
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Authorization", "Content-Type"],
});

/* ZOD */
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(healthRoute);

/* SWAGGER */
if (isDev) {
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
server.register(loginRoute);

server.register(getUsersRoute);
server.register(getUserByIdRoute);
server.register(createUserRoute);
server.register(deleteUserRoute);
server.register(updateUserRoute);
server.register(updatePartialUserRoute);

server.register(getStudentsRoute);
server.register(getStudentByIdRoute);
server.register(createStudentRoute);
server.register(deleteStudentRoute);
server.register(updateStudentRoute);
server.register(updatePartialStudentRoute);

server.register(getCoursesRoute);
server.register(getCourseByIdRoute);
server.register(createCourseRoute);
server.register(deleteCourseRoute);
server.register(updateCourseRoute);
server.register(updatePartialCourseRoute);

server.register(getSupplierRoute);
server.register(getSupplierByIdRoute);
server.register(createSupplierRoute);
server.register(deleteSupplierRoute);
server.register(updateSupplierRoute);
server.register(updatePartialSupplierRoute);

server.register(getClassesRoute);
server.register(getClassByIdRoute);
server.register(createClassRoute);
server.register(deleteClassRoute);
server.register(updateClassRoute);
server.register(updatePartialClassRoute);

server.register(getTeachersRoute);
server.register(getTeacherByIdRoute);
server.register(createTeacherRoute);
server.register(deleteTeacherRoute);
server.register(updateTeacherRoute);
server.register(updatePartialTeacherRoute);

/* SERVER */
// Só abre a porta de rede se NÃO estiver rodando dentro do Vitest
if (!isTest) {
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
}

export { server };