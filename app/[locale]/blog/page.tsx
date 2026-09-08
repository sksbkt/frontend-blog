import {getTranslations} from "next-intl/server";

import ArticleCard from "@/components/blog/article-card";
import {client} from "@/lib/sanity/client";
import {mapSanityPost} from "@/lib/sanity/mappers";
import {postsQuery} from "@/lib/sanity/queries";

export default async function BlogPage() {
  const t = await getTranslations("blog");

  const sanityPosts = await client.fetch(postsQuery);
  const posts = sanityPosts.map(mapSanityPost);

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
      </div>
    </main>
  );
}