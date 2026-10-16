import { prisma } from "../lib/prisma";

async function main() {
  const timer = setTimeout(() => {
    console.error("[TIMEOUT] Database query took longer than 20s. Forcing exit.");
    process.exit(1);
  }, 20000);

  try {
    const projects = await prisma.project.findMany({
      select: {
        id: true,
        slug: true,
        title: true,
        githubUrl: true,
        coverImageUrl: true,
      },
    });
    console.log("PROJECTS_FOUND:", JSON.stringify(projects, null, 2));
  } catch (err: any) {
    console.error("[DB_ERROR]:", err.message);
  } finally {
    clearTimeout(timer);
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
