import type {BlogContentBlock, BlogPost} from "@/types/blog";
import {urlFor} from "./client";

type SanityTextValue = {
  en?: string;
  fa?: string;
};

type SanityPost = {
  _id: string;
  title: SanityTextValue;
  slug: {
    current: string;
  };
  excerpt: SanityTextValue;
  coverImage?: unknown;
  publishedAt: string;
  readingTime: number;
  tags?: string[];
  featured?: boolean;
  body?: {
    en?: unknown[];
    fa?: unknown[];
  };
};

function getBlockText(block: any): string {
  return (
    block?.children
      ?.map((child: any) => child?.text ?? "")
      .join("") ?? ""
  );
}

function mapPortableText(
  blocks: unknown[] | undefined,
): BlogContentBlock[] {
  if (!blocks) return [];

  const result: BlogContentBlock[] = [];

  for (const block of blocks as any[]) {
    if (block?._type === "code") {
      result.push({
        type: "code",
        language: block.language ?? "text",
        content: block.code ?? "",
      });

      continue;
    }

    if (block?._type !== "block") continue;

    const text = getBlockText(block);

    if (block.listItem) {
      const last = result[result.length - 1];

      if (last?.type === "list") {
        last.content.push({
          en: text,
          fa: text,
        });
      } else {
        result.push({
          type: "list",
          content: [
            {
              en: text,
              fa: text,
            },
          ],
        });
      }

      continue;
    }

    if (block.style === "h1" || block.style === "h2" || block.style === "h3") {
      result.push({
        type: "heading",
        content: {
          en: text,
          fa: text,
        },
      });

      continue;
    }

    result.push({
      type: "paragraph",
      content: {
        en: text,
        fa: text,
      },
    });
  }

  return result;
}

export function mapSanityPost(post: SanityPost): BlogPost {
  return {
    id: post._id,
    title: {
      en: post.title?.en ?? "",
      fa: post.title?.fa ?? "",
    },
    slug: post.slug?.current ?? "",
    excerpt: {
      en: post.excerpt?.en ?? "",
      fa: post.excerpt?.fa ?? "",
    },
    image: post.coverImage
      ? urlFor(post.coverImage).width(1200).url()
      : "",
    publishedAt: post.publishedAt,
    readingTime: post.readingTime,
    tags: post.tags ?? [],
    featured: post.featured ?? false,
    content: [
      ...mapPortableText(post.body?.en).map((block) => ({
        ...block,
        content:
          block.type === "code"
            ? block.content
            : Array.isArray(block.content)
              ? block.content.map((item) => ({
                  en: item.en,
                  fa: item.fa,
                }))
              : {
                  en: block.content.en,
                  fa: block.content.fa,
                },
      })),
    ],
  };
}