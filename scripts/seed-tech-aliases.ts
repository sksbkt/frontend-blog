import "dotenv/config";
import { prisma } from "../lib/prisma";
import { normalizeTechInput, resolveTechnologiesFromCache } from "../lib/tech-resolver";

interface SeedEntry {
  slug: string;
  name: string;
  aliases: string[];
  icon?: string;
  category: string;
  summaryEn: string;
  summaryFa: string;
}

const COMMON_TECHS: SeedEntry[] = [
  {
    slug: "react",
    name: "React",
    aliases: ["reactjs", "react.js", "react-js"],
    icon: "react",
    category: "frontend",
    summaryEn: "A declarative, component-based JavaScript library for building high-performance web user interfaces.",
    summaryFa: "یک کتابخانه اعلامی جاوااسکریپت مبتنی بر کامپوننت برای ساخت رابط‌های کاربری وب با کارایی بالا.",
  },
  {
    slug: "nextjs",
    name: "Next.js",
    aliases: ["next.js", "next-js", "next"],
    icon: "nextdotjs",
    category: "frontend",
    summaryEn: "A full-stack React framework enabling server-side rendering, static site generation, and optimized performance.",
    summaryFa: "یک فریم‌ورک فول‌استک برای React با قابلیت‌های Server-Side Rendering و تولید صفحات ایستا.",
  },
  {
    slug: "nodejs",
    name: "Node.js",
    aliases: ["node.js", "node", "node-js"],
    icon: "nodedotjs",
    category: "backend",
    summaryEn: "An asynchronous, event-driven JavaScript runtime built on Chrome's V8 engine for scalable network applications.",
    summaryFa: "یک محیط اجرای جاوااسکریپت غیرهمگام مبتنی بر موتور V8 کروم برای ساخت سرویس‌های سمت سرور مقیاس‌پذیر.",
  },
  {
    slug: "typescript",
    name: "TypeScript",
    aliases: ["ts", "typescript"],
    icon: "typescript",
    category: "language",
    summaryEn: "A strongly typed superset of JavaScript that compiles to plain JavaScript with compile-time type safety.",
    summaryFa: "یک فرامجموعه تایپ‌شده برای JavaScript که ایمنی نوع داده‌ها را در زمان کامپایل فراهم می‌کند.",
  },
  {
    slug: "javascript",
    name: "JavaScript",
    aliases: ["js", "javascript"],
    icon: "javascript",
    category: "language",
    summaryEn: "A lightweight, interpreted programming language that powers dynamic, interactive client-side web behaviors.",
    summaryFa: "یک زبان برنامه‌نویسی پویا و تفسیری که هسته اصلی تعاملات در وب مدرن را تشکیل می‌دهد.",
  },
  {
    slug: "tailwind-css",
    name: "Tailwind CSS",
    aliases: ["tailwindcss", "tailwind", "tailwind-css"],
    icon: "tailwindcss",
    category: "styling",
    summaryEn: "A utility-first CSS framework packed with classes that can be composed to build any design directly in markup.",
    summaryFa: "یک فریم‌ورک کاربردی CSS برای طراحی سریع و مدرن رابط کاربری بدون خروج از فایل‌های کد.",
  },
  {
    slug: "nextauthjs",
    name: "NextAuth.js",
    aliases: ["nextauth", "next-auth", "nextauth.js", "next-auth-js"],
    icon: "auth0",
    category: "auth",
    summaryEn: "A complete open-source authentication solution for Next.js applications with built-in OAuth and session management.",
    summaryFa: "یک راهکار احراز هویت کامل و متن‌باز برای اپلیکیشن‌های Next.js با پشتیبانی داخلی از OAuth و مدیریت نشست.",
  },
  {
    slug: "threejs",
    name: "Three.js",
    aliases: ["three", "three.js", "three-js"],
    icon: "threedotjs",
    category: "frontend",
    summaryEn: "A lightweight 3D library enabling complex GPU-accelerated WebGL animations and interactive graphics in the browser.",
    summaryFa: "یک کتابخانه سبک‌وزن ۳D که امکان اجرای گرافیک‌ها و انیمیشن‌های تعاملی تحت WebGL را در مرورگر فراهم می‌سازد.",
  },
  {
    slug: "mongodb",
    name: "MongoDB",
    aliases: ["mongo", "mongodb"],
    icon: "mongodb",
    category: "database",
    summaryEn: "A scalable document-oriented NoSQL database designed for high performance, flexible schemas, and developer productivity.",
    summaryFa: "یک دیتابیس NoSQL اسنادمحور و مقیاس‌پذیر برای ذخیره‌سازی داده‌های ساختاریافته و منعطف.",
  },
  {
    slug: "mongoose",
    name: "Mongoose",
    aliases: ["mongoose", "mongoose-js"],
    icon: "mongoose",
    category: "backend",
    summaryEn: "Mongoose is an Object Data Modeling (ODM) library for MongoDB and Node.js that manages relationships and schema validation.",
    summaryFa: "یک کتابخانه ODM برای Node.js و MongoDB به منظور مدیریت روابط و اعتبارسنجی اسناد.",
  },
  {
    slug: "postgresql",
    name: "PostgreSQL",
    aliases: ["postgres", "postgresql", "psql"],
    icon: "postgresql",
    category: "database",
    summaryEn: "A powerful, open-source object-relational database system known for reliability, feature robustness, and data integrity.",
    summaryFa: "یک سیستم مدیریت دیتابیس رابطه‌ای قدرتمند، منبع‌باز و مطمئن با پشتیبانی از استانداردهای پیچیده SQL.",
  },
  {
    slug: "prisma",
    name: "Prisma",
    aliases: ["prisma-orm", "prisma"],
    icon: "prisma",
    category: "database",
    summaryEn: "A next-generation Node.js and TypeScript ORM providing automated migrations and type-safe database queries.",
    summaryFa: "یک ORM مدرن برای Node.js و TypeScript که کوئری‌های تایپ‌سیف و مدیریت خودکار مایگریشن را ارائه می‌دهد.",
  },
  {
    slug: "docker",
    name: "Docker",
    aliases: ["docker"],
    icon: "docker",
    category: "devops",
    summaryEn: "A containerization platform that packages applications and their dependencies into lightweight, isolated containers.",
    summaryFa: "یک پلتفرم کانتینرسازی برای بسته‌بندی اپلیکیشن و تمام پیش‌نیازهای آن در کانتینرهای ایزوله و سبک.",
  },
  {
    slug: "aceaddon-30",
    name: "AceAddon-3.0",
    aliases: ["aceaddon-3-0", "aceaddon30", "aceaddon"],
    icon: "lua",
    category: "other",
    summaryEn: "A core Ace3 library component that manages lifecycle, events, and modular addon architectures.",
    summaryFa: "یک مؤلفه کلیدی از فریم‌ورک Ace3 برای مدیریت چرخه حیات، رویدادها و معماری ماژولار افزونه‌ها.",
  },
  {
    slug: "ace3",
    name: "Ace3",
    aliases: ["ace3-framework", "ace-3"],
    icon: "lua",
    category: "other",
    summaryEn: "A modular Lua framework providing standardized libraries for UI, configuration, and event handling in games.",
    summaryFa: "یک framework ماژولار مبتنی بر Lua برای مدیریت استاندارد رابط کاربری و رویدادها.",
  },
];

async function main() {
  console.log("=== SEEDING CANONICAL TECH DEFINITIONS & ALIASES ===");

  for (const item of COMMON_TECHS) {
    const normalizedAliases = Array.from(
      new Set(
        item.aliases
          .map((a) => normalizeTechInput(a))
          .filter((a) => a && a !== item.slug)
      )
    );

    const existing = await prisma.techDefinition.findUnique({
      where: { slug: item.slug },
    });

    if (existing) {
      const mergedAliases = Array.from(
        new Set([...(existing.aliases || []), ...normalizedAliases])
      );

      await prisma.techDefinition.update({
        where: { slug: item.slug },
        data: {
          name: item.name,
          aliases: mergedAliases,
          icon: item.icon || existing.icon,
          category: item.category || existing.category,
          summaryEn: existing.summaryEn || item.summaryEn,
          summaryFa: existing.summaryFa || item.summaryFa,
        },
      });
      console.log(`  ✓ Updated [${item.slug}] (${item.name}) -> aliases: ${JSON.stringify(mergedAliases)}`);
    } else {
      await prisma.techDefinition.create({
        data: {
          slug: item.slug,
          name: item.name,
          aliases: normalizedAliases,
          icon: item.icon || null,
          category: item.category,
          summaryEn: item.summaryEn,
          summaryFa: item.summaryFa,
        },
      });
      console.log(`  + Created [${item.slug}] (${item.name}) -> aliases: ${JSON.stringify(normalizedAliases)}`);
    }
  }

  console.log("\n=== VERIFYING ALIAS RESOLUTION VIA RESOLVER HELPER ===");
  const testInputs = [
    "react.js",
    "React",
    "next-js",
    "Next.js",
    "NextAuth.js",
    "nextauth",
    "node.js",
    "Node.js",
    "Tailwind CSS",
    "tailwindcss",
    "TypeScript",
    "ts",
  ];

  const t0 = performance.now();
  const { resolved, missing } = await resolveTechnologiesFromCache(testInputs);
  const t1 = performance.now();

  console.log(`Resolved: ${resolved.length}/${testInputs.length} in ${(t1 - t0).toFixed(2)}ms`);
  console.log(`Missing count: ${missing.length}`, missing.length > 0 ? missing : "");

  for (const r of resolved) {
    console.log(`  • "${r.name}" [slug: ${r.slug}] (fromCache: ${r.fromCache})`);
  }

  if (missing.length === 0 && resolved.length === testInputs.length) {
    console.log("\n🎉 ALL TEST ALIASES RESOLVED INSTANTLY FROM DATABASE CACHE!");
  } else {
    console.error("\n❌ FAILED TO RESOLVE SOME ALIASES:", missing);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
