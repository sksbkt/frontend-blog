import type { Project } from "@/types/project";

export const projects: Project[] = [
  {
    id: "1",

    title: {
      en: "Frontend Blog",
      fa: "وبلاگ فرانت‌اند",
    },

    slug: "frontend-blog",

    description: {
      en: "A multilingual developer blog built with Next.js, Tailwind CSS, next-intl, and modern UI patterns.",
      fa: "یک وبلاگ چندزبانه برای توسعه‌دهندگان که با Next.js، Tailwind CSS، next-intl و الگوهای مدرن رابط کاربری ساخته شده است.",
    },

    image: "/images/projects/frontend-blog.jpg",

    technologies: ["Next.js", "TypeScript", "Tailwind", "next-intl"],

    github: "https://github.com/...",
    demo: "https://...",

    featured: true,

    content: {
      overview: {
        en: "A personal developer portfolio and blog focused on modern frontend development, multilingual support, responsive design, and accessible user experiences.",
        fa: "یک پورتفولیو و وبلاگ شخصی برای توسعه‌دهندگان با تمرکز بر توسعه مدرن فرانت‌اند، پشتیبانی چندزبانه، طراحی واکنش‌گرا و تجربه کاربری قابل دسترس.",
      },

      challenges: {
        en: "One of the main challenges was handling RTL and LTR layouts while keeping theme switching and language transitions smooth without visual flickering.",
        fa: "یکی از چالش‌های اصلی، مدیریت چیدمان‌های RTL و LTR و در عین حال حفظ روان بودن تغییر پوسته و زبان بدون ایجاد پرش بصری بود.",
      },

      outcome: {
        en: "The project provides a responsive multilingual experience with reusable components and a structure that can later be connected to a headless CMS.",
        fa: "این پروژه یک تجربه چندزبانه و واکنش‌گرا با کامپوننت‌های قابل استفاده مجدد فراهم می‌کند و ساختاری دارد که در آینده می‌تواند به یک CMS بدون رابط کاربری متصل شود.",
      },
    },
  },
];
