import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { suppliers } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("GET /api/v1/suppliers", () => {
  let auth: Awaited<ReturnType<typeof createAuthenticatedSession>>;
  const createdSupplierIds: string[] = [];

  beforeAll(async () => {
    await server.ready();
    auth = await createAuthenticatedSession();
  });

  afterEach(async () => {
    while (createdSupplierIds.length > 0) {
      const id = createdSupplierIds.pop()!;
      await db.delete(suppliers).where(eq(suppliers.id, id));
    }
  });

  afterAll(async () => {
    await auth.cleanup();
    await server.close();
  });

  it("should return 200 with active suppliers and exclude inactive ones", async () => {
    const suffix = randomUUID().slice(0, 6);
    const baseA = String(Math.floor(10000000 + Math.random() * 90000000));
    const baseB = String(Math.floor(10000000 + Math.random() * 90000000));

    const [activeSupplier] = await db
      .insert(suppliers)
      .values({
        legalName: `TechLab Equipamentos ${suffix} S.A.`,
        cnpj: `${baseA.slice(0, 2)}.${baseA.slice(2, 5)}.${baseA.slice(5, 8)}/0001-21`,
        email: `ativo.${suffix}@fornecedor.test`,
        phone: "(11) 4002-8922",
        address: "Rua Vergueiro, 800 - São Paulo, SP",
        category: "Infraestrutura de TI",
        isActive: true,
      })
      .returning();

    const [inactiveSupplier] = await db
      .insert(suppliers)
      .values({
        legalName: `Fornecedor Inativo ${suffix} Ltda`,
        cnpj: `${baseB.slice(0, 2)}.${baseB.slice(2, 5)}.${baseB.slice(5, 8)}/0001-22`,
        email: `inativo.${suffix}@fornecedor.test`,
        phone: "(11) 4002-0000",
        address: "Rua Vergueiro, 900 - São Paulo, SP",
        category: "Limpeza",
        isActive: false,
      })
      .returning();

    createdSupplierIds.push(activeSupplier.id, inactiveSupplier.id);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/suppliers",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    const body = response.json() as {
      suppliers: Array<Record<string, unknown>>;
    };

    expect(response.statusCode).toBe(200);
    expect(body).toHaveProperty("suppliers");
    expect(Array.isArray(body.suppliers)).toBe(true);

    const foundActive = body.suppliers.find((s) => s.id === activeSupplier.id);
    const foundInactive = body.suppliers.find(
      (s) => s.id === inactiveSupplier.id,
    );

    expect(foundActive).toBeDefined();
    expect(foundActive).toMatchObject({
      id: activeSupplier.id,
      legalName: activeSupplier.legalName,
      cnpj: activeSupplier.cnpj,
      email: activeSupplier.email,
      category: "Infraestrutura de TI",
    });
    expect(foundInactive).toBeUndefined();
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/suppliers",
    });

    expect(response.statusCode).toBe(401);
  });
});