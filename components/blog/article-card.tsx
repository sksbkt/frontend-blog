import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import type { BlogPost } from "@/types/blog";

type ArticleCardProps = {
  post: BlogPost;
};

export default async function ArticleCard({ post }: ArticleCardProps) {
  const locale = await getLocale();
  const t = await getTranslations("blog.card");

  const language = locale === "fa" ? "fa" : "en";

  const formattedDate = new Intl.DateTimeFormat(
    locale === "fa" ? "fa-IR" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  ).format(new Date(post.publishedAt));

  return (
    <article className="group relative overflow-hidden rounded-xl border bg-card transition-shadow duration-300 hover:shadow-lg">
      <Link
        href={`/blog/${post.slug}`}
        className="block"
      >
        <div className="relative h-56 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <Image
              src={post.image}
              alt={post.title[language]}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="scale-[1.01] object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          </div>

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card via-card/60 to-transparent" />
        </div>

        <div className="-mt-8 relative z-10 p-6">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-muted px-3 py-1 text-xs"
              >
                {tag}
              </span>
            ))}
          </div>

          <h2 className="mt-4 text-xl font-semibold transition-colors group-hover:text-primary">
            {post.title[language]}
          </h2>

          <p className="mt-3 leading-7 text-muted-foreground">
            {post.excerpt[language]}
          </p>

          <div className="mt-5 flex items-center gap-3 text-sm text-muted-foreground">
            <time dateTime={post.publishedAt}>{formattedDate}</time>

            <span>•</span>

            <span>
              {post.readingTime} {t("minutes")}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
