import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { suppliers } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("PATCH /api/v1/suppliers/:id", () => {
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
    digit = "51",
  ) {
    const base = String(Math.floor(10000000 + Math.random() * 90000000));
    const [supplier] = await db
      .insert(suppliers)
      .values({
        legalName: `Fornecedor Parcial ${suffix} Ltda`,
        cnpj: `${base.slice(0, 2)}.${base.slice(2, 5)}.${base.slice(5, 8)}/0001-${digit}`,
        stateRegistration: "444.555.666.777",
        email: `parcial.${suffix}@fornecedor.test`,
        phone: "(11) 3444-5555",
        address: "Rua Sena Madureira, 300 - São Paulo, SP",
        category: "Telecomunicações",
        isActive,
      })
      .returning();

    createdSupplierIds.push(supplier.id);
    return supplier;
  }

  it("should update only sent fields and preserve existing data", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await createTargetSupplier(suffix, false, "51");

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/suppliers/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        category: "Cloud & Redes",
        isActive: true,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: "Supplier updated" });

    const [updated] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, target.id));

    expect(updated.category).toBe("Cloud & Redes");
    expect(updated.isActive).toBe(true);
    expect(updated.legalName).toBe(target.legalName);
    expect(updated.cnpj).toBe(target.cnpj);
    expect(updated.stateRegistration).toBe("444.555.666.777");
  });

  it("should return 400 when body is empty", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await createTargetSupplier(suffix, true, "52");

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/suppliers/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {},
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 409 when updating CNPJ to one already in use", async () => {
    const suffix = randomUUID().slice(0, 6);
    const supplierA = await createTargetSupplier(`${suffix}a`, true, "53");
    const supplierB = await createTargetSupplier(`${suffix}b`, true, "54");

    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/suppliers/${supplierB.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        cnpj: supplierA.cnpj,
      },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: "CNPJ is already in use.",
    });
  });

  it("should return 404 when supplier ID does not exist", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/suppliers/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        phone: "(11) 3777-8888",
      },
    });

    expect(response.statusCode).toBe(404);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "PATCH",
      url: `/api/v1/suppliers/${randomUUID()}`,
      payload: {
        phone: "(11) 3777-8888",
      },
    });

    expect(response.statusCode).toBe(401);
  });
});