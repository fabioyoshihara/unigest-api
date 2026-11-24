import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomInt, randomUUID } from "node:crypto";
import { server } from "../../helpers/server.ts";
import { createAuthenticatedSession } from "../../helpers/auth.ts";

describe("POST /api/v1/suppliers", () => {
  let auth: Awaited<ReturnType<typeof createAuthenticatedSession>>;

  beforeAll(async () => {
    await server.ready();
    auth = await createAuthenticatedSession();
  });

  afterAll(async () => {
    await auth.cleanup();
    await server.close();
  });

  function buildSupplierPayload(suffix: string) {
    const base = String(randomInt(10000000, 100000000));
    const digit = String(randomInt(10, 100));
    const phoneSuffix = String(randomInt(1000, 10000));

    return {
      legalName: `Editora Acadêmica ${suffix} Ltda`,
      cnpj: `${base.slice(0, 2)}.${base.slice(2, 5)}.${base.slice(5, 8)}/0001-${digit}`,
      stateRegistration: "110.042.490.114",
      email: `contato.${suffix}@fornecedor.test`,
      phone: `(11) 3344-${phoneSuffix}`,
      address: "Av. Lins de Vasconcelos, 1222 - São Paulo, SP",
      category: "Material Didático",
    };
  }

  // Nota técnica: na branch main, createSupplierRoute.ts verifica `if (supplierExist)`
  // sobre o array retornado por `db.select()`. Como `[]` é truthy em JavaScript,
  // a rota retorna 409 mesmo quando o CNPJ ainda não existe no banco.
  it("should return 409 on current main due to truthy empty-array check in createSupplierRoute", async () => {
    const suffix = randomUUID().slice(0, 8);
    const payload = buildSupplierPayload(suffix);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/suppliers",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: "Supplier already registered!",
    });
  });

  it("should return 409 even when optional stateRegistration is omitted on current main", async () => {
    const suffix = randomUUID().slice(0, 8);
    const { stateRegistration: _omitted, ...payloadWithoutIE } =
      buildSupplierPayload(suffix);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/suppliers",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: payloadWithoutIE,
    });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      message: "Supplier already registered!",
    });
  });

  it("should return 400 when required fields fail validation", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/v1/suppliers",
      headers: {
        authorization: `Bearer ${auth.token}`,
      },
      payload: {
        legalName: "A",
        cnpj: "123",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("should return 401 when Authorization header is missing", async () => {
    const suffix = randomUUID().slice(0, 8);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/suppliers",
      payload: buildSupplierPayload(suffix),
    });

    expect(response.statusCode).toBe(401);
  });
});