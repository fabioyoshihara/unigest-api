import { like } from "drizzle-orm";
import { db } from "../database/client.ts";
import { users } from "../database/schema.ts";

const MAX_LOCAL_PART_LENGTH = 64; 

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove blanks
    .toLowerCase() 
    .trim()
    .replace(/[^a-z0-9\s]/g, "") // remove special characters
    .replace(/\s+/g, " "); // regular multiples blanks
}

function buildLocalPart(base: string, suffix = ''): string { 
  const maxBaseLength = MAX_LOCAL_PART_LENGTH - suffix.length;
  const truncatedBase = base.slice(0, maxBaseLength).replace(/\.+$/, '') // dont allow finish with dot before at (@)
  return `${truncatedBase}${suffix}`
}

export async function generateInstitutionalEmail(
  rawFirstName: string,
  rawLastName: string
): Promise<string> { 
  const domain = process.env.DOMAIN;
  if(!domain) {
    throw new Error('Environment Variable DOMAIN is required on .env');
  }

  const firstParts = normalizeText(rawFirstName).split(' ').filter(Boolean);
  const lastParts = normalizeText(rawLastName).split(' ').filter(Boolean)

  const primaryFirst = firstParts[0] || 'user'
  const primaryLast = lastParts[lastParts.length - 1] || '';

  const rawBase = primaryLast ? `${primaryFirst}.${primaryLast}` : primaryFirst;
  const safeBase = buildLocalPart(rawBase);

  const searchPrefix = safeBase.slice(0, 50);

  const existingUsers = await db
    .select({ email: users.email })
    .from(users)
    .where(like(users.email, `${searchPrefix}%@${domain}`));

  const existingSet = new Set(existingUsers.map((u) => u.email.toLowerCase()));

  const primaryCandidate = `${safeBase}@${domain}`;
  if (!existingSet.has(primaryCandidate)) {
    return primaryCandidate;
  }

  if (lastParts.length > 1) {
    const middleLast = lastParts[lastParts.length - 2];
    const altBase = buildLocalPart(`${primaryFirst}.${middleLast}`);
    const altCandidate = `${altBase}@${domain}`;

    if (!existingSet.has(altCandidate)) {
      const [conflict] = await db
        .select({ email: users.email })
        .from(users)
        .where(like(users.email, altCandidate))
        .limit(1);

      if (!conflict) {
        return altCandidate;
      }
    }
  }

  let counter = 1;
  while (true) {
    const numberedLocal = buildLocalPart(rawBase, String(counter));
    const candidate = `${numberedLocal}@${domain}`;

    if (!existingSet.has(candidate)) {
      return candidate;
    }
    counter++;
  }
}