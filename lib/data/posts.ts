import type { BlogPost } from "@/types/blog";

export const posts: BlogPost[] = [
  {
    id: "1",
    title: "Getting Started with Next.js App Router",
    slug: "getting-started-with-nextjs-app-router",
    excerpt:
      "Understanding the fundamentals of Next.js App Router and modern React architecture.",
    date: "2026-01-10",
    readingTime: "5 min read",
    category: "Next.js",
    image: "/images/blog/nextjs.jpg",
  },
  {
    id: "2",
    title: "Building Multilingual Applications with next-intl",
    slug: "building-multilingual-applications-with-next-intl",
    excerpt:
      "How to build applications that support multiple languages and RTL layouts.",
    date: "2026-01-20",
    readingTime: "7 min read",
    category: "Internationalization",
    image: "/images/blog/next-intl.jpg",
  },
  {
    id: "3",
    title: "Understanding React Server Components",
    slug: "understanding-react-server-components",
    excerpt:
      "A practical introduction to React Server Components in modern Next.js.",
    date: "2026-02-01",
    readingTime: "8 min read",
    category: "React",
    image: "/images/blog/react.jpg",
  },
];
