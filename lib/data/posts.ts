import type { BlogPost } from "@/types/blog";

export const posts: BlogPost[] = [
  {
    id: "1",
    title: {
      en: "Getting Started with Next.js",
      fa: "شروع کار با Next.js",
    },
    slug: "getting-started-with-nextjs",
    excerpt: {
      en: "A practical introduction to building modern web applications with Next.js.",
      fa: "مقدمه‌ای کاربردی برای ساخت اپلیکیشن‌های وب مدرن با Next.js.",
    },
    image: "/images/blog/nextjs.jpg",
    publishedAt: "2026-08-01",
    readingTime: 5,
    tags: ["Next.js", "React", "TypeScript"],
    featured: true,

    content: [
      {
        type: "paragraph",
        content: {
          en: "Next.js provides a powerful foundation for building modern React applications. It includes routing, server rendering, optimized images, and many other features that make frontend development easier and more scalable.",
          fa: "Next.js یک پایه قدرتمند برای ساخت اپلیکیشن‌های مدرن React فراهم می‌کند. این فریم‌ورک امکاناتی مانند مسیریابی، رندر سمت سرور، بهینه‌سازی تصاویر و قابلیت‌های مختلف دیگری ارائه می‌دهد که توسعه فرانت‌اند را ساده‌تر و مقیاس‌پذیرتر می‌کنند.",
        },
      },
      {
        type: "heading",
        content: {
          en: "Why Next.js?",
          fa: "چرا Next.js؟",
        },
      },
      {
        type: "paragraph",
        content: {
          en: "Next.js builds on top of React and provides many of the features that production applications need out of the box.",
          fa: "Next.js بر پایه React ساخته شده و بسیاری از قابلیت‌هایی را که اپلیکیشن‌های واقعی نیاز دارند، به صورت آماده در اختیار توسعه‌دهنده قرار می‌دهد.",
        },
      },
      {
        type: "list",
        content: [
          {
            en: "File-based routing",
            fa: "مسیریابی مبتنی بر فایل",
          },
          {
            en: "Server-side rendering",
            fa: "رندر سمت سرور",
          },
          {
            en: "Optimized images",
            fa: "بهینه‌سازی تصاویر",
          },
          {
            en: "Excellent TypeScript support",
            fa: "پشتیبانی عالی از TypeScript",
          },
        ],
      },
      {
        type: "heading",
        content: {
          en: "A simple example",
          fa: "یک مثال ساده",
        },
      },
      {
        type: "code",
        language: "tsx",
        content: `export default function Page() {
  return <h1>Hello Next.js</h1>;
}`,
      },
      {
        type: "paragraph",
        content: {
          en: "This simple component can be rendered as a page using Next.js App Router.",
          fa: "این کامپوننت ساده می‌تواند با استفاده از App Router در Next.js به عنوان یک صفحه نمایش داده شود.",
        },
      },
    ],
  },

  {
    id: "2",
    title: {
      en: "Building Better React Components",
      fa: "ساخت کامپوننت‌های بهتر در React",
    },
    slug: "building-better-react-components",
    excerpt: {
      en: "Practical principles for creating reusable, maintainable, and accessible React components.",
      fa: "اصول کاربردی برای ساخت کامپوننت‌های قابل استفاده مجدد، قابل نگهداری و دسترس‌پذیر در React.",
    },
    image: "/images/blog/react.jpg",
    publishedAt: "2026-08-10",
    readingTime: 7,
    tags: ["React", "Components", "Frontend"],
    featured: true,

    content: [
      {
        type: "paragraph",
        content: {
          en: "Well-designed React components make applications easier to maintain and extend.",
          fa: "کامپوننت‌های خوب طراحی‌شده در React نگهداری و توسعه اپلیکیشن را ساده‌تر می‌کنند.",
        },
      },
      {
        type: "heading",
        content: {
          en: "Keep components focused",
          fa: "کامپوننت‌ها را متمرکز نگه دارید",
        },
      },
      {
        type: "paragraph",
        content: {
          en: "A component should ideally have a clear responsibility. Smaller focused components are easier to understand, test, and reuse.",
          fa: "هر کامپوننت بهتر است مسئولیت مشخصی داشته باشد. کامپوننت‌های کوچک و متمرکز راحت‌تر قابل درک، تست و استفاده مجدد هستند.",
        },
      },
      {
        type: "list",
        content: [
          {
            en: "Keep responsibilities clear",
            fa: "مسئولیت‌ها را مشخص نگه دارید",
          },
          {
            en: "Avoid unnecessary complexity",
            fa: "از پیچیدگی غیرضروری جلوگیری کنید",
          },
          {
            en: "Prefer reusable components",
            fa: "کامپوننت‌های قابل استفاده مجدد را ترجیح دهید",
          },
        ],
      },
    ],
  },

  {
    id: "3",
    title: {
      en: "Internationalization with next-intl",
      fa: "چندزبانه کردن پروژه با next-intl",
    },
    slug: "internationalization-with-next-intl",
    excerpt: {
      en: "How to build a multilingual Next.js application with next-intl and support both LTR and RTL layouts.",
      fa: "چگونه با استفاده از next-intl یک اپلیکیشن چندزبانه Next.js بسازیم و از چیدمان‌های LTR و RTL پشتیبانی کنیم.",
    },
    image: "/images/blog/next-intl.jpg",
    publishedAt: "2026-08-18",
    readingTime: 6,
    tags: ["Next.js", "next-intl", "i18n"],
    featured: true,

    content: [
      {
        type: "paragraph",
        content: {
          en: "Internationalization requires more than translating strings. A good multilingual application should also handle direction, navigation, metadata, layouts, and user experience consistently across languages.",
          fa: "چندزبانه کردن یک پروژه فقط به ترجمه متن‌ها محدود نمی‌شود. یک اپلیکیشن چندزبانه خوب باید جهت صفحه، مسیریابی، متادیتا، چیدمان و تجربه کاربری را نیز در زبان‌های مختلف به شکل یکپارچه مدیریت کند.",
        },
      },
      {
        type: "heading",
        content: {
          en: "Supporting RTL and LTR",
          fa: "پشتیبانی از RTL و LTR",
        },
      },
      {
        type: "paragraph",
        content: {
          en: "When supporting languages such as Persian, the application needs to switch between left-to-right and right-to-left layouts without causing visual flickering.",
          fa: "هنگام پشتیبانی از زبان‌هایی مانند فارسی، اپلیکیشن باید بتواند بدون ایجاد پرش بصری بین چیدمان چپ به راست و راست به چپ جابه‌جا شود.",
        },
      },
      {
        type: "list",
        content: [
          {
            en: "Localized navigation",
            fa: "مسیریابی چندزبانه",
          },
          {
            en: "RTL and LTR layouts",
            fa: "چیدمان‌های RTL و LTR",
          },
          {
            en: "Localized metadata",
            fa: "متادیتای چندزبانه",
          },
        ],
      },
    ],
  },
];
