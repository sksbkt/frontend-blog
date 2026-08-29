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

  {
    id: "2",
    title: {
      en: "Task Management Dashboard",
      fa: "داشبورد مدیریت وظایف",
    },
    slug: "task-management-dashboard",
    description: {
      en: "A responsive task management dashboard with filtering, status tracking, and a clean productivity-focused interface.",
      fa: "یک داشبورد واکنش‌گرا برای مدیریت وظایف با قابلیت فیلتر کردن، پیگیری وضعیت و رابط کاربری ساده و متمرکز بر بهره‌وری.",
    },
    image: "/images/projects/frontend-blog.jpg",

    technologies: ["Next.js", "TypeScript", "Tailwind"],
    github: "https://github.com/...",
    demo: "https://...",
    featured: true,
    content: {
      overview: {
        en: "A productivity dashboard designed to help users organize tasks, monitor progress, and quickly understand their current workload.",
        fa: "یک داشبورد بهره‌وری که برای سازماندهی وظایف، بررسی پیشرفت و مشاهده سریع وضعیت کاری کاربران طراحی شده است.",
      },
      challenges: {
        en: "The main challenge was creating a flexible interface that remained easy to use across different screen sizes while keeping task states visually clear.",
        fa: "چالش اصلی ایجاد رابطی انعطاف‌پذیر بود که در اندازه‌های مختلف صفحه نمایش همچنان ساده و قابل استفاده باقی بماند و وضعیت وظایف را به شکل واضح نمایش دهد.",
      },
      outcome: {
        en: "The result is a responsive dashboard with reusable UI components and a clear visual hierarchy for managing daily tasks.",
        fa: "نتیجه یک داشبورد واکنش‌گرا با کامپوننت‌های قابل استفاده مجدد و سلسله‌مراتب بصری واضح برای مدیریت وظایف روزانه است.",
      },
    },
  },

  {
    id: "3",
    title: {
      en: "Weather Application",
      fa: "اپلیکیشن آب‌وهوا",
    },
    slug: "weather-application",
    description: {
      en: "A modern weather application focused on simple information architecture, responsive layouts, and accessible UI.",
      fa: "یک اپلیکیشن مدرن آب‌وهوا با تمرکز بر معماری اطلاعات ساده، طراحی واکنش‌گرا و رابط کاربری قابل دسترس.",
    },
    image: "/images/projects/frontend-blog.jpg",

    technologies: ["React", "TypeScript", "Tailwind", "API"],
    github: "https://github.com/...",
    demo: "https://...",
    featured: false,
    content: {
      overview: {
        en: "A weather application that presents current conditions and forecast information through a clean and easy-to-scan interface.",
        fa: "یک اپلیکیشن آب‌وهوا که شرایط فعلی و اطلاعات پیش‌بینی را در قالب رابطی ساده و خوانا نمایش می‌دهد.",
      },
      challenges: {
        en: "The main challenge was presenting changing weather information without overwhelming the user while keeping the interface usable on mobile devices.",
        fa: "چالش اصلی نمایش اطلاعات متغیر آب‌وهوا بدون شلوغ کردن رابط کاربری و در عین حال حفظ قابلیت استفاده در دستگاه‌های موبایل بود.",
      },
      outcome: {
        en: "The application provides a lightweight responsive experience with a focus on readable weather information and straightforward navigation.",
        fa: "این اپلیکیشن تجربه‌ای سبک و واکنش‌گرا با تمرکز بر خوانایی اطلاعات آب‌وهوا و مسیریابی ساده ارائه می‌دهد.",
      },
    },
  },
];
