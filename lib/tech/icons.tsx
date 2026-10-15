import React from "react";
import type { IconType } from "react-icons";
import { FaAws } from "react-icons/fa";
import {
  SiReact,
  SiNextdotjs,
  SiTypescript,
  SiJavascript,
  SiTailwindcss,
  SiNodedotjs,
  SiExpress,
  SiPython,
  SiDjango,
  SiFlask,
  SiFastapi,
  SiPostgresql,
  SiMongodb,
  SiMysql,
  SiRedis,
  SiPrisma,
  SiDrizzle,
  SiGraphql,
  SiDocker,
  SiKubernetes,
  SiGit,
  SiGithub,
  SiVercel,
  SiSanity,
  SiSupabase,
  SiFirebase,
  SiGooglecloud,
  SiHtml5,
  SiCss,
  SiSass,
  SiVuedotjs,
  SiNuxt,
  SiSvelte,
  SiAstro,
  SiRust,
  SiGo,
  SiCplusplus,
  SiDotnet,
  SiPhp,
  SiRuby,
  SiRubyonrails,
  SiSwift,
  SiKotlin,
  SiFlutter,
  SiDart,
  SiRedux,
  SiReactquery,
  SiJest,
  SiVitest,
  SiCypress,
  SiVite,
  SiWebpack,
  SiTurborepo,
  SiBun,
  SiDeno,
  SiLinux,
  SiNginx,
  SiStripe,
  SiFigma,
  SiShadcnui,
  SiZod,
  SiPnpm,
  SiYarn,
  SiNpm,
  SiPrettier,
  SiEslint,
} from "react-icons/si";

/**
 * Normalizes any tech input string into an alphanumeric lookup key.
 * Examples:
 * - "Next.js" -> "next" or "nextjs"
 * - "Tailwind CSS" -> "tailwindcss"
 * - "React.js" -> "react"
 */
export function normalizeTechKey(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\+/g, "plus")
    .replace(/#/g, "sharp")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Direct mapping of normalized tech tokens to official brand icons
 */
const TECH_ICON_REGISTRY: Record<string, IconType> = {
  // Frontend Frameworks & Libraries
  react: SiReact,
  reactjs: SiReact,
  next: SiNextdotjs,
  nextjs: SiNextdotjs,
  nextdotjs: SiNextdotjs,
  vue: SiVuedotjs,
  vuejs: SiVuedotjs,
  vuedotjs: SiVuedotjs,
  nuxt: SiNuxt,
  nuxtjs: SiNuxt,
  nuxtdotjs: SiNuxt,
  svelte: SiSvelte,
  sveltekit: SiSvelte,
  astro: SiAstro,

  // Languages & Runtimes
  typescript: SiTypescript,
  ts: SiTypescript,
  javascript: SiJavascript,
  js: SiJavascript,
  node: SiNodedotjs,
  nodejs: SiNodedotjs,
  nodedotjs: SiNodedotjs,
  python: SiPython,
  py: SiPython,
  rust: SiRust,
  go: SiGo,
  golang: SiGo,
  cplusplus: SiCplusplus,
  cpp: SiCplusplus,
  csharp: SiDotnet,
  cs: SiDotnet,
  dotnet: SiDotnet,
  php: SiPhp,
  ruby: SiRuby,
  rails: SiRubyonrails,
  rubyonrails: SiRubyonrails,
  swift: SiSwift,
  kotlin: SiKotlin,
  flutter: SiFlutter,
  dart: SiDart,
  bun: SiBun,
  deno: SiDeno,
  html: SiHtml5,
  html5: SiHtml5,
  css: SiCss,
  css3: SiCss,
  sass: SiSass,
  scss: SiSass,

  // Styling & UI
  tailwind: SiTailwindcss,
  tailwindcss: SiTailwindcss,
  shadcn: SiShadcnui,
  shadcnui: SiShadcnui,

  // Backend & Databases
  express: SiExpress,
  expressjs: SiExpress,
  fastapi: SiFastapi,
  django: SiDjango,
  flask: SiFlask,
  postgres: SiPostgresql,
  postgresql: SiPostgresql,
  mongodb: SiMongodb,
  mongo: SiMongodb,
  mysql: SiMysql,
  redis: SiRedis,
  prisma: SiPrisma,
  drizzle: SiDrizzle,
  drizzleorm: SiDrizzle,
  graphql: SiGraphql,
  supabase: SiSupabase,
  firebase: SiFirebase,
  sanity: SiSanity,
  sanityio: SiSanity,

  // DevOps & Cloud
  docker: SiDocker,
  kubernetes: SiKubernetes,
  k8s: SiKubernetes,
  vercel: SiVercel,
  aws: FaAws,
  amazonwebservices: FaAws,
  gcp: SiGooglecloud,
  googlecloud: SiGooglecloud,
  git: SiGit,
  github: SiGithub,
  linux: SiLinux,
  nginx: SiNginx,

  // State & Utilities
  redux: SiRedux,
  reactquery: SiReactquery,
  tanstackquery: SiReactquery,
  zod: SiZod,
  stripe: SiStripe,
  figma: SiFigma,

  // Tooling & Testing
  vite: SiVite,
  webpack: SiWebpack,
  turborepo: SiTurborepo,
  jest: SiJest,
  vitest: SiVitest,
  cypress: SiCypress,
  pnpm: SiPnpm,
  yarn: SiYarn,
  npm: SiNpm,
  prettier: SiPrettier,
  eslint: SiEslint,
};

/**
 * Returns a React element with the official brand icon, or null if no brand icon is mapped.
 * Never returns generic placeholders.
 */
export function getTechIcon(
  techName: string,
  className: string = "w-3.5 h-3.5 shrink-0"
): React.ReactElement | null {
  if (!techName) return null;

  const key = normalizeTechKey(techName);
  const IconComponent = TECH_ICON_REGISTRY[key];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent className={className} aria-hidden="true" />;
}
