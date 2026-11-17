import "dotenv/config";
import { hash } from "argon2";
import { db } from "./client.js";
import { users, students, teachers, suppliers, courses, classes, enrollments, } from "./schema.js";
async function seed() {
    console.log("🌱 Iniciando seed do banco de dados...");
    const domain = process.env.DOMAIN || "universidade.edu.br";
    const adminPasswordHash = await hash("Admin@2026");
    const staffPasswordHash = await hash("Staff@2026");
    await db
        .insert(users)
        .values([
        {
            firstName: "Admin",
            lastName: "Sistema",
            email: `admin.sistema@${domain}`,
            personalEmail: "admin.pessoal@gmail.com",
            passwordHash: adminPasswordHash,
            mustChangePassword: false,
            role: "admin",
            isActive: true,
        },
        {
            firstName: "Mariana",
            lastName: "Costa",
            email: `mariana.costa@${domain}`,
            personalEmail: "mariana.costa@gmail.com",
            passwordHash: staffPasswordHash,
            mustChangePassword: true,
            role: "secretary",
            isActive: true,
        },
        {
            firstName: "Roberto",
            lastName: "Almeida",
            email: `roberto.almeida@${domain}`,
            personalEmail: "roberto.almeida@gmail.com",
            passwordHash: staffPasswordHash,
            mustChangePassword: true,
            role: "coordination",
            isActive: true,
        },
    ])
        .onConflictDoNothing({ target: users.email });
    console.log("✅ Usuários criados (Admin: admin.sistema@" +
        domain +
        " / Senha: Admin@2026)");
    const insertedTeachers = await db
        .insert(teachers)
        .values([
        {
            name: "Dr. Carlos Eduardo Mendes",
            cpf: "111.222.333-44",
            rg: "12.345.678-9",
            email: `carlos.mendes@${domain}`,
            phone: "(11) 98765-4321",
            address: "Av. Paulista, 1000 - São Paulo, SP",
            employeeNumber: "PROF-202601",
            degreeLevel: "doctorate",
            isActive: true,
        },
        {
            name: "Profa. Fernanda Lima",
            cpf: "222.333.444-55",
            rg: "23.456.789-0",
            email: `fernanda.lima@${domain}`,
            phone: "(11) 97654-3210",
            address: "Rua Vergueiro, 450 - São Paulo, SP",
            employeeNumber: "PROF-202602",
            degreeLevel: "master",
            isActive: true,
        },
    ])
        .onConflictDoNothing({ target: teachers.cpf })
        .returning();
    const allTeachers = insertedTeachers.length > 0
        ? insertedTeachers
        : await db.select().from(teachers);
    console.log("✅ Professores populados");
    const insertedStudents = await db
        .insert(students)
        .values([
        {
            name: "Lucas Gabriel Ferreira",
            cpf: "333.444.555-66",
            email: `lucas.ferreira@${domain}`,
            phone: "(11) 91234-5678",
            address: "Rua das Flores, 123 - São Paulo, SP",
            registrationNumber: "RA20260001",
            admissionDate: new Date("2026-02-01T08:00:00Z"),
            isActive: true,
        },
        {
            name: "Beatriz Oliveira Santos",
            cpf: "444.555.666-77",
            email: `beatriz.santos@${domain}`,
            phone: "(11) 92345-6789",
            address: "Av. Santo Amaro, 890 - São Paulo, SP",
            registrationNumber: "RA20260002",
            admissionDate: new Date("2026-02-01T08:00:00Z"),
            isActive: true,
        },
        {
            name: "Pedro Henrique Rocha",
            cpf: "555.666.777-88",
            email: `pedro.rocha@${domain}`,
            phone: "(11) 93456-7890",
            address: "Rua Augusta, 500 - São Paulo, SP",
            registrationNumber: "RA20260003",
            admissionDate: new Date("2026-02-01T08:00:00Z"),
            isActive: true,
        },
    ])
        .onConflictDoNothing({ target: students.cpf })
        .returning();
    const allStudents = insertedStudents.length > 0
        ? insertedStudents
        : await db.select().from(students);
    console.log("✅ Alunos populados");
    await db
        .insert(suppliers)
        .values([
        {
            legalName: "TechEdu Infraestrutura e Redes Ltda",
            cnpj: "12.345.678/0001-90",
            stateRegistration: "110.042.490.114",
            email: "contato@techedu.com.br",
            phone: "(11) 3344-5566",
            address: "Av. Engenheiro Luís Carlos Berrini, 500 - São Paulo, SP",
            category: "Tecnologia e Infraestrutura",
            isActive: true,
        },
        {
            legalName: "Editora Acadêmica Brasil S.A.",
            cnpj: "98.765.432/0001-10",
            stateRegistration: "112.345.678.999",
            email: "comercial@editoraacademica.com.br",
            phone: "(11) 3222-1100",
            address: "Rua da Consolação, 1200 - São Paulo, SP",
            category: "Material Didático e Biblioteca",
            isActive: true,
        },
    ])
        .onConflictDoNothing({ target: suppliers.cnpj });
    console.log("✅ Fornecedores populados");
    let allCourses = await db.select().from(courses);
    if (allCourses.length === 0) {
        allCourses = await db
            .insert(courses)
            .values([
            {
                name: "Tecnologia em Sistemas para Internet",
                workloadHours: 2100,
                durationSemesters: 5,
                modality: "in_person",
                isActive: true,
            },
            {
                name: "Engenharia de Software",
                workloadHours: 3600,
                durationSemesters: 8,
                modality: "hybrid",
                isActive: true,
            },
        ])
            .returning();
    }
    console.log("✅ Cursos populados");
    let allClasses = await db.select().from(classes);
    if (allClasses.length === 0 &&
        allCourses.length >= 2 &&
        allTeachers.length >= 2) {
        allClasses = await db
            .insert(classes)
            .values([
            {
                courseId: allCourses[0].id,
                teacherId: allTeachers[0].id,
                description: "Turma A - Desenvolvimento Web Full-Stack",
                semester: "1",
                year: 2026,
                scheduleTime: "19:00:00",
                room: "Lab 04 - Bloco B",
            },
            {
                courseId: allCourses[1].id,
                teacherId: allTeachers[1].id,
                description: "Turma B - Arquitetura de Software e Banco de Dados",
                semester: "2",
                year: 2026,
                scheduleTime: "20:45:00",
                room: "Sala 202 - Bloco A",
            },
        ])
            .returning();
    }
    console.log("✅ Turmas populadas");
    // 7. Matrículas (Enrollments) - chave composta (studentId, classId)
    if (allStudents.length >= 3 && allClasses.length >= 2) {
        await db
            .insert(enrollments)
            .values([
            {
                studentId: allStudents[0].id,
                classId: allClasses[0].id,
                enrollmentDate: "2026-02-05",
                finalGrade: "9.25",
                attendancePercentage: "95.00",
                status: "approved",
            },
            {
                studentId: allStudents[1].id,
                classId: allClasses[0].id,
                enrollmentDate: "2026-02-06",
                finalGrade: null,
                attendancePercentage: "88.50",
                status: "in_progress",
            },
            {
                studentId: allStudents[2].id,
                classId: allClasses[1].id,
                enrollmentDate: "2026-02-07",
                finalGrade: null,
                attendancePercentage: "92.00",
                status: "in_progress",
            },
        ])
            .onConflictDoNothing();
    }
    console.log("✅ Matrículas populadas");
    console.log("🚀 Seed concluído com sucesso!");
    process.exit(0);
}
seed().catch((err) => {
    console.error("❌ Erro ao executar o seed:", err);
    process.exit(1);
});
