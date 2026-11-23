import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { suppliers } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("DELETE /api/v1/suppliers/:id", () => {
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

  async function createTargetSupplier(
    suffix: string,
    isActive = true,
    digit = "61",
  ) {
    const base = String(Math.floor(10000000 + Math.random() * 90000000));
    const [supplier] = await db
      .insert(suppliers)
      .values({
        legalName: `Fornecedor Excluir ${suffix} Ltda`,
        cnpj: `${base.slice(0, 2)}.${base.slice(2, 5)}.${base.slice(5, 8)}/0001-${digit}`,
        email: `excluir.${suffix}@fornecedor.test`,
        phone: "(11) 3555-6666",
        address: "Rua Pedro de Toledo, 600 - São Paulo, SP",
        category: "Alimentação",
        isActive,
      })
      .returning();

    createdSupplierIds.push(supplier.id);
    return supplier;
  }

  it("should logically deactivate an active supplier and return 200", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await createTargetSupplier(suffix, true, "61");

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/suppliers/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      message: "Supplier has been deactivated",
    });

    const [updated] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, target.id));

    expect(updated).toBeDefined();
    expect(updated.isActive).toBe(false);
  });

  it("should return 404 when supplier is already inactive or does not exist", async () => {
    const suffix = randomUUID().slice(0, 6);
    const inactiveTarget = await createTargetSupplier(suffix, false, "62");

    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/suppliers/${inactiveTarget.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "Supplier not found or already deactivated.",
    });
  });

  it("should return 400 when ID parameter is not a valid UUID", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: "/api/v1/suppliers/id-invalido",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "DELETE",
      url: `/api/v1/suppliers/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
  });
});