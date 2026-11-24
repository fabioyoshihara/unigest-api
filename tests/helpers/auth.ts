import { randomUUID } from "node:crypto";
import { hash } from "argon2";
import { eq } from "drizzle-orm";
import { server } from "../../src/index.ts";
import { db } from "../../src/database/client.ts";
import { users } from "../../src/database/schema.ts";

export async function createAuthenticatedSession() {
  const suffix = randomUUID().slice(0, 8);
  const plainPassword = `Pass@${suffix}`;
  const passwordHash = await hash(plainPassword);

  const [user] = await db
    .insert(users)
    .values({
      firstName: "Test",
      lastName: `Admin ${suffix}`,
      email: `test.admin.${suffix}@unigest.test`,
      personalEmail: `personal.admin.${suffix}@test.com`,
      passwordHash,
      role: "admin",
      mustChangePassword: false,
    })
    .returning();

  const loginResponse = await server.inject({
    method: "POST",
    url: "/api/v1/login",
    payload: {
      email: user.email,
      password: plainPassword,
    },
  });

  const { token } = loginResponse.json() as { token: string };

  const cleanup = async () => {
    await db.delete(users).where(eq(users.id, user.id));
  };

  return {
    user,
    plainPassword,
    token,
    cleanup,
  };
}