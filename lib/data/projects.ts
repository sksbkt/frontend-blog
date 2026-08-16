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
    content: {
      overview:
        "A personal developer portfolio and blog focused on modern frontend development, multilingual support, responsive design, and accessible user experiences.",
      challenges:
        "One of the main challenges was handling RTL and LTR layouts while keeping theme switching and language transitions smooth without visual flickering.",
      outcome:
        "The project provides a responsive multilingual experience with reusable components and a structure that can later be connected to a headless CMS.",
    },
  },
];
