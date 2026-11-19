import { jsonSchemaTransform } from "fastify-type-provider-zod";

export const swaggerConfig = {
  openapi: {
    info: {
      title: "Unigest API",
      description: "API to university management",
      version: "1.0.0",
    },
    tags: [
      {
        name: "Authentication",
        description:
          "Handles user authentication, access control, token generation, and session management.",
      },
      {
        name: "Users",
        description:
          "Manages system users, including registration, profile updates, account management, and user permissions.",
      },
      {
        name: "Courses",
        description:
          "Manages university courses, including course registration, academic information, curriculum details, and course availability.",
      },
      {
        name: "Students",
        description:
          "Manages student records, including enrollment, personal information, academic status, and student-course associations.",
      },
      {
        name: "Classes",
        description:
          "Manages academic classes, including class creation, scheduling, student assignments, instructors, and class availability.",
      },
    ],
  },
  transform: jsonSchemaTransform,
};