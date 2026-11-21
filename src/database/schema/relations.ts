import { relations } from "drizzle-orm";
import { classes, courses, enrollments, students, suppliers, teachers, users } from "../schema.ts";

export const coursesRelations = relations(courses, ({ many }) => ({
  classes: many(classes),
}));

export const teachersRelations = relations(teachers, ({ many }) => ({
  classes: many(classes),
}));

export const studentsRelations = relations(students, ({ many }) => ({
  enrollments: many(enrollments),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  course: one(courses, {
    fields: [classes.courseId],
    references: [courses.id],
  }),
  teacher: one(teachers, {
    fields: [classes.teacherId],
    references: [teachers.id],
  }),
  enrollments: many(enrollments),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(students, {
    fields: [enrollments.studentId],
    references: [students.id],
  }),
  class: one(classes, {
    fields: [enrollments.classId],
    references: [classes.id],
  }),
}));