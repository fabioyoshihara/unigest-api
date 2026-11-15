import fastifySwagger from "@fastify/swagger";
import { fastify } from "fastify";
import { jsonSchemaTransform, serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import scalarAPIReference from "@scalar/fastify-api-reference";
import { getStudentsRoute } from "./routes/students/getStudentsRoute.ts";
import { createStudentRoute } from "./routes/students/createStudentsRoute.ts";
import { createUserRoute } from "./routes/users/createUserRoute.ts";
import { loginRoute } from "./routes/auth/loginRoute.ts";
import { createCourseRoute } from "./routes/courses/createCourseRoute.ts";
import "dotenv/config"

const port = Number(process.env.PORT) || 3333;

const server = fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }
});

if(process.env.NODE_ENVIRONMENT === "development") { 
  server.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Unigest API',
        description: 'API to university management',
        version: '1.0.0',
      },
    },
    transform: jsonSchemaTransform,
  })
  
  server.register(scalarAPIReference, {
    routePrefix: "/docs",
    configuration: {
      title: 'Our API Reference',
      url: '/openapi.json',
      theme: 'deepSpace'
    },
  })
}

server.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if(err) {
    server.log.error(err);
  }
  console.log(`HTTP server is running, ${address}`);
})

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

server.register(createUserRoute); /* OK - SEM AUTENTICAÇÃO - EXIGIR AUTENTICAÇÃO */
server.register(loginRoute);
server.register(getStudentsRoute);
server.register(createStudentRoute);
server.register(createCourseRoute);

export { server };
