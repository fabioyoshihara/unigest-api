import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { server } from "../../helpers/server.ts";
import { db } from "../../../src/database/client.ts";
import { suppliers } from "../../../src/database/schema.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("GET /api/v1/suppliers/:id", () => {
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
    digit = "31",
  ) {
    const base = String(Math.floor(10000000 + Math.random() * 90000000));
    const [supplier] = await db
      .insert(suppliers)
      .values({
        legalName: `Gráfica Universitária ${suffix} Ltda`,
        cnpj: `${base.slice(0, 2)}.${base.slice(2, 5)}.${base.slice(5, 8)}/0001-${digit}`,
        stateRegistration: "222.333.444.555",
        email: `grafica.${suffix}@fornecedor.test`,
        phone: "(11) 3210-9876",
        address: "Rua Domingos de Morais, 1500 - São Paulo, SP",
        category: "Serviços Gráficos",
        isActive,
      })
      .returning();

    createdSupplierIds.push(supplier.id);
    return supplier;
  }

  it("should return 200 and supplier details when valid UUID exists", async () => {
    const suffix = randomUUID().slice(0, 6);
    const target = await createTargetSupplier(suffix, true, "31");

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/suppliers/${target.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toHaveProperty("supplier");
    expect(body.supplier).toMatchObject({
      id: target.id,
      legalName: target.legalName,
      cnpj: target.cnpj,
      stateRegistration: "222.333.444.555",
      email: target.email,
      category: "Serviços Gráficos",
      isActive: true,
    });
  });

  it("should return 200 even when supplier is inactive", async () => {
    const suffix = randomUUID().slice(0, 6);
    const inactiveTarget = await createTargetSupplier(suffix, false, "32");

    const response = await server.inject({
      method: "GET",
      url: `/api/v1/suppliers/${inactiveTarget.id}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().supplier).toMatchObject({
      id: inactiveTarget.id,
      isActive: false,
    });
  });

  it("should return 404 when supplier ID does not exist", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/suppliers/${randomUUID()}`,
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({
      message: "Supplier not found.",
    });
  });

  it("should return 400 when ID parameter is not a valid UUID", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/suppliers/id-invalido",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const response = await server.inject({
      method: "GET",
      url: `/api/v1/suppliers/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(401);
  });
});