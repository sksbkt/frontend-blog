import { writeClient } from "@/lib/sanity/write-client";

type TechnologyDocument = {
  _id: string;
  name: string;
  aliases?: string[];
  description?: string;
};

function normalizeTechnologyKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function createTechnologyId(name: string) {
  const key = normalizeTechnologyKey(name);

  return `technology-${key.replace(/[^a-z0-9]+/g, "-")}`;
}

async function findTechnology(
  technology: string,
): Promise<TechnologyDocument | null> {
  const key = normalizeTechnologyKey(technology);

  return writeClient.fetch<TechnologyDocument | null>(
    `*[
      _type == "technology" &&
      (
        lower(name) == $key ||
        $key in aliases
      )
    ][0]{
      _id,
      name,
      aliases,
      description
    }`,
    {
      key,
    },
  );
}

async function createTechnology(
  technology: string,
): Promise<TechnologyDocument> {
  const normalizedTechnology = technology.trim();
  const normalizedKey = normalizeTechnologyKey(normalizedTechnology);

  const technologyId = createTechnologyId(normalizedTechnology);

  return writeClient.createIfNotExists({
    _id: technologyId,
    _type: "technology",
    name: normalizedTechnology,
    aliases: [normalizedKey],
    description: "Technology used in a web development project.",
  });
}

export async function resolveTechnology(technology: string): Promise<string> {
  const normalizedTechnology = technology.trim();

  if (!normalizedTechnology) {
    throw new Error("Technology name cannot be empty.");
  }

  const existingTechnology = await findTechnology(normalizedTechnology);

  if (existingTechnology) {
    return existingTechnology.name;
  }

  const createdTechnology = await createTechnology(normalizedTechnology);

  return createdTechnology.name;
}

export async function resolveTechnologies(
  technologies: string[],
): Promise<string[]> {
  const uniqueTechnologies = [
    ...new Set(
      technologies
        .map((technology) => technology.trim())
        .filter(Boolean)
        .map(normalizeTechnologyKey),
    ),
  ];

  const resolvedTechnologies = await Promise.all(
    uniqueTechnologies.map(resolveTechnology),
  );

  return [...new Set(resolvedTechnologies)];
}
