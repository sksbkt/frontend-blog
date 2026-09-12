import { getTranslations } from "next-intl/server";

import ArticleCard from "@/components/blog/article-card";
import FeaturedPostsMotion from "@/components/home/featured-posts-motion";
import { freshClient } from "@/lib/sanity/client";
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
    await freshClient.fetch(featuredPostsQuery);

  const featuredPosts = sanityPosts.map(mapSanityPost);

  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl space-y-8 px-6">
        <FeaturedPostsMotion title={t("featured.title")}>
          {featuredPosts.map((post) => (
            <div key={post.id}>
              <ArticleCard post={post} />
            </div>
          ))}
        </FeaturedPostsMotion>
      </div>
    </section>
  );
}
