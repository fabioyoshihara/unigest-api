import "dotenv/config";
import { fastify } from "fastify";
import cors from "@fastify/cors";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

// Health & Auth
import { healthRoute } from "../../src/routes/health.ts";
import { loginRoute } from "../../src/routes/auth/loginRoute.ts";

// Users
import { createUserRoute } from "../../src/routes/users/createUserRoute.ts";
import { getUsersRoute } from "../../src/routes/users/getUsersRoute.ts";
import { getUserByIdRoute } from "../../src/routes/users/getUserByIdRoute.ts";
import { updateUserRoute } from "../../src/routes/users/updateUserRoute.ts";
import { updatePartialUserRoute } from "../../src/routes/users/updatePartialUserRoute.ts";
import { deleteUserRoute } from "../../src/routes/users/deleteUserRoute.ts";

// Students
import { createStudentRoute } from "../../src/routes/students/createStudentsRoute.ts";
import { getStudentsRoute } from "../../src/routes/students/getStudentsRoute.ts";
import { getStudentByIdRoute } from "../../src/routes/students/getStudentByIdRoute.ts";
import { updateStudentRoute } from "../../src/routes/students/updateStudentRoute.ts";
import { updatePartialStudentRoute } from "../../src/routes/students/updatePartialStudentRoute.ts";
import { deleteStudentRoute } from "../../src/routes/students/deleteStudentRoute.ts";

// Courses
import { createCourseRoute } from "../../src/routes/courses/createCourseRoute.ts";
import { getCoursesRoute } from "../../src/routes/courses/getCoursesRoute.ts";
import { getCourseByIdRoute } from "../../src/routes/courses/getCourseByIdRoute.ts";
import { updateCourseRoute } from "../../src/routes/courses/updateCourseRoute.ts";
import { updatePartialCourseRoute } from "../../src/routes/courses/updatePartialCourseRoute.ts";
import { deleteCourseRoute } from "../../src/routes/courses/deleteCourseRoute.ts";

// Teachers
import { createTeacherRoute } from "../../src/routes/teachers/createTeacherRoute.ts";
import { getTeachersRoute } from "../../src/routes/teachers/getTeachersRoute.ts";
import { getTeacherByIdRoute } from "../../src/routes/teachers/getTeacherByIdRoute.ts";
import { updateTeacherRoute } from "../../src/routes/teachers/updateTeacherRoute.ts";
import { updatePartialTeacherRoute } from "../../src/routes/teachers/updatePartialTeacherRoute.ts";
import { deleteTeacherRoute } from "../../src/routes/teachers/deleteTeacherRoute.ts";

// Suppliers
import { createSupplierRoute } from "../../src/routes/suppliers/createSupplierRoute.ts";
import { getSupplierRoute } from "../../src/routes/suppliers/getSupplierRoute.ts";
import { getSupplierByIdRoute } from "../../src/routes/suppliers/getSupplierByIdRoute.ts";
import { updateSupplierRoute } from "../../src/routes/suppliers/updateSupplierRoute.ts";
import { updatePartialSupplierRoute } from "../../src/routes/suppliers/updatePartialSupplierRoute.ts";
import { deleteSupplierRoute } from "../../src/routes/suppliers/deleteSupplierRoute.ts";

// Classes
import { createClassRoute } from "../../src/routes/classes/createClassRoute.ts";
import { getClassesRoute } from "../../src/routes/classes/getClassesRoute.ts";
import { getClassByIdRoute } from "../../src/routes/classes/getClassByIdRoute.ts";
import { updateClassRoute } from "../../src/routes/classes/updateClassRoute.ts";
import { updatePartialClassRoute } from "../../src/routes/classes/updatePartialClassRoute.ts";
import { deleteClassRoute } from "../../src/routes/classes/deleteClassRoute.ts";

// Instância Fastify isolada em memória para testes de integração (sem abrir porta TCP)
const server = fastify({
  logger: false,
});

// Plugins essenciais (CORS + compiladores de validação e serialização Zod)
server.register(cors, {
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Authorization", "Content-Type"],
});

server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

// Registro das 38 rotas da API
server.register(healthRoute);
server.register(loginRoute);

server.register(createUserRoute);
server.register(getUsersRoute);
server.register(getUserByIdRoute);
server.register(updateUserRoute);
server.register(updatePartialUserRoute);
server.register(deleteUserRoute);

server.register(createStudentRoute);
server.register(getStudentsRoute);
server.register(getStudentByIdRoute);
server.register(updateStudentRoute);
server.register(updatePartialStudentRoute);
server.register(deleteStudentRoute);

server.register(createCourseRoute);
server.register(getCoursesRoute);
server.register(getCourseByIdRoute);
server.register(updateCourseRoute);
server.register(updatePartialCourseRoute);
server.register(deleteCourseRoute);

server.register(createTeacherRoute);
server.register(getTeachersRoute);
server.register(getTeacherByIdRoute);
server.register(updateTeacherRoute);
server.register(updatePartialTeacherRoute);
server.register(deleteTeacherRoute);

server.register(createSupplierRoute);
server.register(getSupplierRoute);
server.register(getSupplierByIdRoute);
server.register(updateSupplierRoute);
server.register(updatePartialSupplierRoute);
server.register(deleteSupplierRoute);

server.register(createClassRoute);
server.register(getClassesRoute);
server.register(getClassByIdRoute);
server.register(updateClassRoute);
server.register(updatePartialClassRoute);
server.register(deleteClassRoute);

export { server };