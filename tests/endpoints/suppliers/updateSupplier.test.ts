import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { suppliers } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("PUT /api/v1/suppliers/:id", () => {
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

  async function createTargetSupplier(suffix: string, digit = "41") {
    const base = String(Math.floor(10000000 + Math.random() * 90000000));
    const [supplier] = await db
      .insert(suppliers)
      .values({
        legalName: `Fornecedor Original ${suffix} Ltda`,
        cnpj: `${base.slice(0, 2)}.${base.slice(2, 5)}.${base.slice(5, 8)}/0001-${digit}`,
        stateRegistration: "333.444.555.666",
        email: `orig.${suffix}@fornecedor.test`,
        phone: "(11) 3111-2222",
        address: "Rua Antiga, 100 - São Paulo, SP",
        category: "Manutenção",
        isActive: true,
      })
      .returning();

    createdSupplierIds.push(supplier.id);
    return supplier;
  }

  it("should replace supplier fields and set omitted stateRegistration to null", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await createTargetSupplier(suffix, "41");

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/suppliers/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        legalName: `Fornecedor Atualizado ${suffix} S.A.`,
        cnpj: target.cnpj,
        email: `atualizado.${suffix}@fornecedor.test`,
        phone: "(11) 3999-8888",
        address: "Av. Paulista, 2000 - São Paulo, SP",
        category: "Segurança Patrimonial",
        isActive: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Supplier updated" });

    const [updated] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, target.id));

    expect(updated.legalName).toBe(`Fornecedor Atualizado ${suffix} S.A.`);
    expect(updated.email).toBe(`atualizado.${suffix}@fornecedor.test`);
    expect(updated.category).toBe("Segurança Patrimonial");
    expect(updated.stateRegistration).toBeNull();
  });

  it("should return 409 when updating CNPJ to one already used by another supplier", async () => {
    const suffix = randomUUID().slice(0, 6);
    const supplierA = await createTargetSupplier(`${suffix}a`, "42");
    const supplierB = await createTargetSupplier(`${suffix}b`, "43");

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/suppliers/${supplierB.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        legalName: supplierB.legalName,
        cnpj: supplierA.cnpj,
        email: supplierB.email,
        phone: supplierB.phone,
        address: supplierB.address,
        category: supplierB.category,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: "CNPJ is already in use.",
    });
  });

  it("should return 404 when supplier ID does not exist", async () => {
    const suffix = randomUUID().slice(0, 6);

    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/suppliers/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        legalName: "Fornecedor Inexistente",
        cnpj: "99.888.777/0001-99",
        email: `inexistente.${suffix}@fornecedor.test`,
        phone: "(11) 3000-0000",
        address: "Rua Teste, 1 - São Paulo, SP",
        category: "Geral",
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "Supplier not found, verify ID and try again",
    });
  });

  it("should return 400 when required fields are missing", async () => {
    const response = await server.inject({
      method: "PUT",
      url: `/api/v1/suppliers/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        legalName: "Incompleto",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
  const response = await server.inject({
    method: "PUT",
    url: `/api/v1/suppliers/${randomUUID()}`,
    payload: {
      legalName: "Fornecedor Sem Token Ltda",
      cnpj: "12.345.678/0001-99",
      email: "sem.token@fornecedor.test",
      phone: "(11) 3000-0000",
      address: "Rua Teste, 1 - São Paulo, SP",
      category: "Geral",
    },
  });

  expect(response.statusCode).toBe(401);
});
});