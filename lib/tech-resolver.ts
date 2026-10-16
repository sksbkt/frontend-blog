import { prisma } from "@/lib/prisma";
import { generateMissingTechDefinitions } from "@/lib/gemini/tech-def";

export function sanitizeLookupKey(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9.-]/g, "");
}

export const normalizeTechInput = sanitizeLookupKey;

export interface ResolvedTech {
  name: string;
  slug: string;
  aliases: string[];
  summaryEn: string;
  summaryFa: string;
  icon?: string | null;
  category?: string | null;
  fromCache: boolean;
}

export async function resolveTechStack(rawTechs: string[]) {
  if (!rawTechs || rawTechs.length === 0) return [];

  const uniqueRaw = Array.from(new Set(rawTechs));
  const lookupKeys = uniqueRaw.map(sanitizeLookupKey);

  // 1. Single database query checking both slug and aliases
  const cachedDefs = await prisma.techDefinition.findMany({
    where: {
      OR: [
        { slug: { in: lookupKeys } },
        { aliases: { hasSome: lookupKeys } },
      ],
    },
  });

  const resolvedMap = new Map<string, typeof cachedDefs[0]>();

  // Map cached items back to raw inputs
  for (const raw of uniqueRaw) {
    const key = sanitizeLookupKey(raw);
    const match = cachedDefs.find(
      (def) => def.slug === key || def.aliases.some((a) => sanitizeLookupKey(a) === key)
    );
    if (match) {
      resolvedMap.set(raw, match);
    }
  }

  // 2. Identify missing technologies
  const missingTechs = uniqueRaw.filter((raw) => !resolvedMap.has(raw));

  // 3. Call Gemini ONLY for genuinely missing items
  if (missingTechs.length > 0) {
    console.log(`[Tech Resolver] Cache miss. Synthesizing via Gemini:`, missingTechs);
    const generated = await generateMissingTechDefinitions(missingTechs);

    for (const item of generated) {
      // Normalize all aliases plus the raw input that prompted the search
      const normalizedAliases = Array.from(
        new Set([
          ...item.aliases.map(sanitizeLookupKey),
          sanitizeLookupKey(item.rawInput),
        ])
      );

      // Persist to Postgres
      const record = await prisma.techDefinition.upsert({
        where: { slug: item.slug },
        update: {
          aliases: {
            push: normalizedAliases.filter((a) => a !== item.slug),
          },
        },
        create: {
          slug: item.slug,
          name: item.name,
          aliases: normalizedAliases.filter((a) => a !== item.slug),
          summaryEn: item.summaryEn,
          summaryFa: item.summaryFa,
          category: item.category,
          icon: item.icon,
        },
      });

      resolvedMap.set(item.rawInput, record);
    }
  }

  // 4. Return definitions mapped in original order
  return uniqueRaw.map((raw) => resolvedMap.get(raw)!);
}

/**
 * Backward-compatible resolver returning { resolved, missing }
 */
export async function resolveTechnologiesFromCache(rawTechNames: string[]): Promise<{
  resolved: ResolvedTech[];
  missing: string[];
}> {
  if (!rawTechNames || rawTechNames.length === 0) {
    return { resolved: [], missing: [] };
  }

  const normalizedPairs = rawTechNames.map((raw) => ({
    raw,
    normalized: sanitizeLookupKey(raw),
  }));

  const allNormalized = Array.from(new Set(normalizedPairs.map((p) => p.normalized)));

  const cachedRecords = await prisma.techDefinition.findMany({
    where: {
      OR: [
        { slug: { in: allNormalized } },
        { aliases: { hasSome: allNormalized } },
      ],
    },
  });

  const resolved: ResolvedTech[] = [];
  const resolvedNormalizedKeys = new Set<string>();

  for (const pair of normalizedPairs) {
    const match = cachedRecords.find(
      (record) =>
        record.slug === pair.normalized ||
        record.aliases.some((a) => sanitizeLookupKey(a) === pair.normalized)
    );

    if (match) {
      resolved.push({
        name: match.name,
        slug: match.slug,
        aliases: match.aliases,
        summaryEn: match.summaryEn,
        summaryFa: match.summaryFa,
        icon: match.icon,
        category: match.category,
        fromCache: true,
      });
      resolvedNormalizedKeys.add(pair.normalized);
    }
  }

  const missing = rawTechNames.filter(
    (raw) => !resolvedNormalizedKeys.has(sanitizeLookupKey(raw))
  );

  return { resolved, missing };
}
