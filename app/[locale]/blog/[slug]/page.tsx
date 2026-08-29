import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { posts } from "@/lib/data/posts";
import { highlightCode } from "@/lib/shiki";

type ArticlePageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  const post = posts.find((post) => post.slug === slug);

  if (!post) {
    const t = await getTranslations({
      locale,
      namespace: "blog",
    });

    return {
      title: t("page.notFound"),
    };
  }

  const language = locale === "fa" ? "fa" : "en";

  return {
    title: post.title[language],
    description: post.excerpt[language],
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { locale, slug } = await params;

  const t = await getTranslations("blog");

  const post = posts.find((post) => post.slug === slug);

  if (!post) {
    notFound();
  }

  const language = locale === "fa" ? "fa" : "en";

  const formattedDate = new Intl.DateTimeFormat(
    locale === "fa" ? "fa-IR" : "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  ).format(new Date(post.publishedAt));

  const renderedContent = await Promise.all(
    post.content.map(async (block) => {
      if (block.type === "code") {
        return {
          ...block,
          highlightedCode: await highlightCode(block.content, block.language),
        };
      }

      return block;
    }),
  );

  return (
    <main className="py-20">
      <article className="mx-auto max-w-4xl px-6">
        <div className="relative aspect-video overflow-hidden rounded-2xl">
          <Image
            src={post.image}
            alt={post.title[language]}
            fill
            priority
            className="object-cover"
          />
        </div>

        <header className="mt-10">
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

          <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
            {post.title[language]}
          </h1>

          <p className="mt-6 text-xl leading-8 text-muted-foreground">
            {post.excerpt[language]}
          </p>

          <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground">
            <time dateTime={post.publishedAt}>{formattedDate}</time>

            <span>•</span>

            <span>
              {post.readingTime} {t("card.minutes")}
            </span>
          </div>
        </header>

        <div className="mt-12 border-t pt-10">
          <div className="space-y-8">
            {renderedContent.map((block, index) => {
              if (block.type === "heading") {
                return (
                  <h2
                    key={index}
                    className="text-2xl font-bold tracking-tight md:text-3xl"
                  >
                    {block.content[language]}
                  </h2>
                );
              }

              if (block.type === "paragraph") {
                return (
                  <p
                    key={index}
                    className="text-lg leading-8 text-muted-foreground"
                  >
                    {block.content[language]}
                  </p>
                );
              }

              if (block.type === "list") {
                return (
                  <ul
                    key={index}
                    className="list-disc space-y-3 ps-6 text-lg leading-8 text-muted-foreground"
                  >
                    {block.content.map((item, itemIndex) => (
                      <li key={itemIndex}>{item[language]}</li>
                    ))}
                  </ul>
                );
              }

              if (block.type === "code") {
                return (
                  <div
                    key={index}
                    dir="ltr"
                    className="[&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:p-6 [&_pre]:text-sm [&_pre]:leading-7"
                    dangerouslySetInnerHTML={{
                      __html: block.highlightedCode,
                    }}
                  />
                );
              }

              return null;
            })}
          </div>
        </div>

        <div className="mt-12">
          <Link
            href="/blog"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            ← {t("page.back")}
          </Link>
        </div>
      </article>
    </main>
  );
}
