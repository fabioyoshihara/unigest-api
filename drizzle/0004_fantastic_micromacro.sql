ALTER TYPE "public"."semestre_letivo" RENAME TO "academic_semester";--> statement-breakpoint
ALTER TYPE "public"."modalidade_curso" RENAME TO "course_modality";--> statement-breakpoint
ALTER TYPE "public"."titulacao" RENAME TO "degree_level";--> statement-breakpoint
ALTER TYPE "public"."resultado_matricula" RENAME TO "enrollment_status";--> statement-breakpoint
ALTER TYPE "public"."papel_usuario" RENAME TO "user_role";--> statement-breakpoint
ALTER TABLE "turmas" RENAME TO "classes";--> statement-breakpoint
ALTER TABLE "cursos" RENAME TO "courses";--> statement-breakpoint
ALTER TABLE "matriculas" RENAME TO "enrollments";--> statement-breakpoint
ALTER TABLE "alunos" RENAME TO "students";--> statement-breakpoint
ALTER TABLE "fornecedores" RENAME TO "suppliers";--> statement-breakpoint
ALTER TABLE "docentes" RENAME TO "teachers";--> statement-breakpoint
ALTER TABLE "usuarios" RENAME TO "users";--> statement-breakpoint
ALTER TABLE "students" RENAME COLUMN "nome" TO "name";--> statement-breakpoint
ALTER TABLE "students" RENAME COLUMN "telefone" TO "phone";--> statement-breakpoint
ALTER TABLE "students" RENAME COLUMN "endereco" TO "address";--> statement-breakpoint
ALTER TABLE "students" RENAME COLUMN "ra" TO "registration_number";--> statement-breakpoint
ALTER TABLE "students" RENAME COLUMN "data_ingresso" TO "admission_date";--> statement-breakpoint
ALTER TABLE "students" RENAME COLUMN "ativo" TO "is_active";--> statement-breakpoint
ALTER TABLE "courses" RENAME COLUMN "nome" TO "name";--> statement-breakpoint
ALTER TABLE "courses" RENAME COLUMN "carga_horaria" TO "workload_hours";--> statement-breakpoint
ALTER TABLE "courses" RENAME COLUMN "duracao_semestres" TO "duration_semesters";--> statement-breakpoint
ALTER TABLE "courses" RENAME COLUMN "modalidade" TO "modality";--> statement-breakpoint
ALTER TABLE "courses" RENAME COLUMN "ativo" TO "is_active";--> statement-breakpoint
ALTER TABLE "teachers" RENAME COLUMN "nome" TO "name";--> statement-breakpoint
ALTER TABLE "teachers" RENAME COLUMN "telefone" TO "phone";--> statement-breakpoint
ALTER TABLE "teachers" RENAME COLUMN "endereco" TO "address";--> statement-breakpoint
ALTER TABLE "teachers" RENAME COLUMN "matricula_funcional" TO "employee_number";--> statement-breakpoint
ALTER TABLE "teachers" RENAME COLUMN "titulacao" TO "degree_level";--> statement-breakpoint
ALTER TABLE "teachers" RENAME COLUMN "ativo" TO "is_active";--> statement-breakpoint
ALTER TABLE "suppliers" RENAME COLUMN "razao_social" TO "legal_name";--> statement-breakpoint
ALTER TABLE "suppliers" RENAME COLUMN "inscricao_estadual" TO "state_registration";--> statement-breakpoint
ALTER TABLE "suppliers" RENAME COLUMN "telefone" TO "phone";--> statement-breakpoint
ALTER TABLE "suppliers" RENAME COLUMN "endereco" TO "address";--> statement-breakpoint
ALTER TABLE "suppliers" RENAME COLUMN "categoria" TO "category";--> statement-breakpoint
ALTER TABLE "suppliers" RENAME COLUMN "ativo" TO "is_active";--> statement-breakpoint
ALTER TABLE "enrollments" RENAME COLUMN "aluno_id" TO "student_id";--> statement-breakpoint
ALTER TABLE "enrollments" RENAME COLUMN "turma_id" TO "class_id";--> statement-breakpoint
ALTER TABLE "enrollments" RENAME COLUMN "data_matricula" TO "enrollment_date";--> statement-breakpoint
ALTER TABLE "enrollments" RENAME COLUMN "nota_final" TO "final_grade";--> statement-breakpoint
ALTER TABLE "enrollments" RENAME COLUMN "frequencia_pct" TO "attendance_percentage";--> statement-breakpoint
ALTER TABLE "enrollments" RENAME COLUMN "resultado" TO "status";--> statement-breakpoint
ALTER TABLE "classes" RENAME COLUMN "curso_id" TO "course_id";--> statement-breakpoint
ALTER TABLE "classes" RENAME COLUMN "docente_id" TO "teacher_id";--> statement-breakpoint
ALTER TABLE "classes" RENAME COLUMN "descricao" TO "description";--> statement-breakpoint
ALTER TABLE "classes" RENAME COLUMN "semestre" TO "semester";--> statement-breakpoint
ALTER TABLE "classes" RENAME COLUMN "ano" TO "year";--> statement-breakpoint
ALTER TABLE "classes" RENAME COLUMN "horario" TO "schedule_time";--> statement-breakpoint
ALTER TABLE "classes" RENAME COLUMN "sala" TO "room";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "nome" TO "name";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "senha_hash" TO "password_hash";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "papel" TO "role";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "ativo" TO "is_active";--> statement-breakpoint
ALTER TABLE "enrollments" DROP CONSTRAINT "matriculas_aluno_id_alunos_id_fk";
--> statement-breakpoint
ALTER TABLE "enrollments" DROP CONSTRAINT "matriculas_turma_id_turmas_id_fk";
--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "turmas_curso_id_cursos_id_fk";
--> statement-breakpoint
ALTER TABLE "classes" DROP CONSTRAINT "turmas_docente_id_docentes_id_fk";
--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "modality" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "modality" SET DEFAULT 'in_person'::text;--> statement-breakpoint
DROP TYPE "public"."course_modality";--> statement-breakpoint
CREATE TYPE "public"."course_modality" AS ENUM('in_person', 'online', 'hybrid');--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "modality" SET DEFAULT 'in_person'::"public"."course_modality";--> statement-breakpoint
ALTER TABLE "courses" ALTER COLUMN "modality" SET DATA TYPE "public"."course_modality" USING "modality"::"public"."course_modality";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'secretary'::text;--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'secretary', 'finance', 'coordination');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'secretary'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "status" SET DEFAULT 'in_progress'::text;--> statement-breakpoint
DROP TYPE "public"."enrollment_status";--> statement-breakpoint
CREATE TYPE "public"."enrollment_status" AS ENUM('in_progress', 'approved', 'failed', 'withdrawn');--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "status" SET DEFAULT 'in_progress'::"public"."enrollment_status";--> statement-breakpoint
ALTER TABLE "enrollments" ALTER COLUMN "status" SET DATA TYPE "public"."enrollment_status" USING "status"::"public"."enrollment_status";--> statement-breakpoint
ALTER TABLE "teachers" ALTER COLUMN "degree_level" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."degree_level";--> statement-breakpoint
CREATE TYPE "public"."degree_level" AS ENUM('undergraduate', 'specialization', 'master', 'doctorate');--> statement-breakpoint
ALTER TABLE "teachers" ALTER COLUMN "degree_level" SET DATA TYPE "public"."degree_level" USING "degree_level"::"public"."degree_level";--> statement-breakpoint
DROP INDEX "alunos_cpf_uq";--> statement-breakpoint
DROP INDEX "alunos_email_uq";--> statement-breakpoint
DROP INDEX "alunos_ra_uq";--> statement-breakpoint
DROP INDEX "docentes_cpf_uq";--> statement-breakpoint
DROP INDEX "docentes_email_uq";--> statement-breakpoint
DROP INDEX "docentes_matricula_uq";--> statement-breakpoint
DROP INDEX "fornecedores_cnpj_uq";--> statement-breakpoint
DROP INDEX "matriculas_aluno_idx";--> statement-breakpoint
DROP INDEX "matriculas_turma_idx";--> statement-breakpoint
DROP INDEX "turmas_curso_idx";--> statement-breakpoint
DROP INDEX "turmas_docente_idx";--> statement-breakpoint
DROP INDEX "usuarios_email_uq";--> statement-breakpoint
ALTER TABLE "enrollments" DROP CONSTRAINT "matriculas_aluno_id_turma_id_pk";--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_class_id_pk" PRIMARY KEY("student_id","class_id");--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "students_cpf_uq" ON "students" USING btree ("cpf");--> statement-breakpoint
CREATE UNIQUE INDEX "students_email_uq" ON "students" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "students_registration_number_uq" ON "students" USING btree ("registration_number");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_cpf_uq" ON "teachers" USING btree ("cpf");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_email_uq" ON "teachers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "teachers_employee_number_uq" ON "teachers" USING btree ("employee_number");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_cnpj_uq" ON "suppliers" USING btree ("cnpj");--> statement-breakpoint
CREATE INDEX "enrollments_student_idx" ON "enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_class_idx" ON "enrollments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "classes_course_idx" ON "classes" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "classes_teacher_idx" ON "classes" USING btree ("teacher_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");