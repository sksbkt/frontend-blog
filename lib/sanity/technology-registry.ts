import { writeClient } from "@/lib/sanity/write-client";

type TechnologyInput = {
  name: string;
  description: string;
};

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
  technology: TechnologyInput,
): Promise<TechnologyDocument> {
  const name = technology.name.trim();
  const description = technology.description.trim();

  const normalizedKey = normalizeTechnologyKey(name);
  const technologyId = createTechnologyId(name);

  return writeClient.createIfNotExists({
    _id: technologyId,
    _type: "technology",
    name,
    aliases: [normalizedKey],
    description,
  });
}

export async function resolveTechnology(
  technology: TechnologyInput,
): Promise<string> {
  const name = technology.name.trim();

  if (!name) {
    throw new Error("Technology name cannot be empty.");
  }

  const existingTechnology = await findTechnology(name);

  if (existingTechnology) {
    return existingTechnology.name;
  }

  const createdTechnology = await createTechnology({
    name,
    description: technology.description,
  });

  return createdTechnology.name;
}

export async function resolveTechnologies(
  technologies: TechnologyInput[],
): Promise<string[]> {
  const uniqueTechnologies = Array.from(
    new Map(
      technologies
        .map((technology) => ({
          name: technology.name.trim(),
          description: technology.description.trim(),
        }))
        .filter((technology) => technology.name)
        .map((technology) => [
          normalizeTechnologyKey(technology.name),
          technology,
        ]),
    ).values(),
  );

  const resolvedTechnologies = await Promise.all(
    uniqueTechnologies.map(resolveTechnology),
  );

  return [...new Set(resolvedTechnologies)];
}
