import { getTranslations } from "next-intl/server";

import ArticleCard from "@/components/blog/article-card";
import Pagination from "@/components/shared/pagination";
import { client } from "@/lib/sanity/client";
import { mapSanityPost } from "@/lib/sanity/mappers";
import { postsQuery } from "@/lib/sanity/queries";

const POSTS_PER_PAGE = 6;

type BlogPageProps = {
  searchParams: Promise<{
    page?: string;
  }>;
};

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const t = await getTranslations("blog");

  const { page: pageParam } = await searchParams;

  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const start = (page - 1) * POSTS_PER_PAGE;
  const end = start + POSTS_PER_PAGE + 1;

  const sanityPosts: Parameters<typeof mapSanityPost>[0][] = await client.fetch(
    postsQuery,
    {
      start,
      end,
    },
  );

  const hasNextPage = sanityPosts.length > POSTS_PER_PAGE;

  const posts = sanityPosts.slice(0, POSTS_PER_PAGE).map(mapSanityPost);

  return (
    <main className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-3xl">
          <span className="text-sm font-medium uppercase tracking-widest text-primary">
            {t("label")}
          </span>

          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            {t("title")}
          </h1>

          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            {t("description")}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {posts.map((post) => (
            <ArticleCard
              key={post.id}
              post={post}
            />
          ))}
        </div>
        <Pagination
          currentPage={page}
          hasNextPage={hasNextPage}
          basePath="/blog"
          translationNamespace="blog.page"
        />
      </div>
    </main>
  );
}
