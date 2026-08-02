import type { Project } from "@/types/project";

export const projects: Project[] = [
  {
    id: "1",
    title: "Frontend Blog",
    slug: "frontend-blog",
    description:
      "A multilingual developer blog built with Next.js, Tailwind CSS, next-intl, and modern UI patterns.",
    image: "/images/projects/frontend-blog.jpg",
    technologies: ["Next.js", "TypeScript", "Tailwind", "next-intl"],
    github: "https://github.com/...",
    demo: "https://...",
    featured: true,
  },
];
