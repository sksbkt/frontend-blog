import ArticleCard from "@/components/blog/article-card";
import { posts } from "@/lib/data/posts";
import { getTranslations } from "next-intl/server";

export default async function FeaturedPosts() {
  const t = await getTranslations("blog");

  return (
    <section className="py-16">
      <div className="mx-auto max-w-6xl space-y-8 px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("featured.title")}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {posts.map((post) => (
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
