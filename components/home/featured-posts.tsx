import { getTranslations } from "next-intl/server";

import ArticleCard from "@/components/blog/article-card";
import { client } from "@/lib/sanity/client";
import { mapSanityPost } from "@/lib/sanity/mappers";

const featuredPostsQuery = `*[
  _type == "post" &&
  featured == true
] | order(publishedAt desc) {
  _id,
  title,
  slug,
  excerpt,
  coverImage,
  publishedAt,
  readingTime,
  tags,
  featured,
  body
}`;

export const dynamic = "force-dynamic";

export default async function FeaturedPosts() {
  const t = await getTranslations("blog");

  const sanityPosts: Parameters<typeof mapSanityPost>[0][] =
    await client.fetch(featuredPostsQuery);

  const featuredPosts = sanityPosts.map(mapSanityPost);

  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl space-y-8 px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("featured.title")}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {featuredPosts.map((post) => (
            <ArticleCard
              key={post.id}
              post={post}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
