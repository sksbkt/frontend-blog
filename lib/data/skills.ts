import type { SkillCategory } from "@/types/skill";

export const skillCategories: SkillCategory[] = [
  {
    id: "frontend",
    title: "Frontend",
    skills: [
      "Next.js",
      "React",
      "TypeScript",
      "Tailwind CSS",
      "Framer Motion",
      "next-intl",
    ],
  },
  {
    id: "backend",
    title: "Backend",
    skills: ["Node.js", "Express", "REST API"],
  },
  {
    id: "tools",
    title: "Tools",
    skills: ["Git", "GitHub", "Vercel", "Figma"],
  },
];
