import type { BlogContentBlock, BlogPost } from "@/types/blog";
import type { Project } from "@/types/project";

import { urlFor } from "./client";

type SanityTextValue = {
  en?: string;
  fa?: string;
};

type SanityPortableTextChild = {
  text?: string;
};

type SanityPortableTextBlock = {
  _type?: string;
  children?: SanityPortableTextChild[];
  listItem?: string;
  style?: string;
  language?: string;
  code?: string;
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

type SanityProject = {
  _id: string;
  title: SanityTextValue;
  slug: {
    current: string;
  };
  description: SanityTextValue;
  image?: unknown;
  technologies?: string[];
  github?: string;
  demo?: string;
  featured?: boolean;
  content?: {
    overview?: SanityTextValue;
    challenges?: SanityTextValue;
    outcome?: SanityTextValue;
  };
};

function isPortableTextBlock(block: unknown): block is SanityPortableTextBlock {
  return typeof block === "object" && block !== null;
}

function getBlockText(block: SanityPortableTextBlock): string {
  return block.children?.map((child) => child.text ?? "").join("") ?? "";
}

function mapPortableText(blocks: unknown[] | undefined): BlogContentBlock[] {
  if (!blocks) return [];

  const result: BlogContentBlock[] = [];

  for (const rawBlock of blocks) {
    if (!isPortableTextBlock(rawBlock)) continue;

    const block = rawBlock;

    if (block._type === "code") {
      result.push({
        type: "code",
        language: block.language ?? "text",
        content: block.code ?? "",
      });

      continue;
    }

    if (block._type !== "block") continue;

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

function mergeLocalizedContent(
  englishBlocks: BlogContentBlock[],
  persianBlocks: BlogContentBlock[],
): BlogContentBlock[] {
  const result: BlogContentBlock[] = [];
  const maxLength = Math.max(englishBlocks.length, persianBlocks.length);

  for (let index = 0; index < maxLength; index++) {
    const english = englishBlocks[index];
    const persian = persianBlocks[index];

    if (!english && persian) {
      result.push(persian);
      continue;
    }

    if (english && !persian) {
      result.push(english);
      continue;
    }

    if (!english || !persian) continue;

    if (english.type === "code" && persian.type === "code") {
      result.push(english);
      continue;
    }

    if (english.type === "heading" && persian.type === "heading") {
      result.push({
        type: "heading",
        content: {
          en: english.content.en,
          fa: persian.content.fa,
        },
      });

      continue;
    }

    if (english.type === "paragraph" && persian.type === "paragraph") {
      result.push({
        type: "paragraph",
        content: {
          en: english.content.en,
          fa: persian.content.fa,
        },
      });

      continue;
    }

    if (english.type === "list" && persian.type === "list") {
      const items: { en: string; fa: string }[] = [];
      const itemCount = Math.max(
        english.content.length,
        persian.content.length,
      );

      for (let itemIndex = 0; itemIndex < itemCount; itemIndex++) {
        const englishItem = english.content[itemIndex];
        const persianItem = persian.content[itemIndex];

        items.push({
          en: englishItem?.en ?? "",
          fa: persianItem?.fa ?? "",
        });
      }

      result.push({
        type: "list",
        content: items,
      });

      continue;
    }

    result.push(english);
  }

  return result;
}

export function mapSanityPost(post: SanityPost): BlogPost {
  const englishContent = mapPortableText(post.body?.en);
  const persianContent = mapPortableText(post.body?.fa);

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
    image: post.coverImage ? urlFor(post.coverImage).width(1200).url() : "",
    publishedAt: post.publishedAt,
    readingTime: post.readingTime,
    tags: post.tags ?? [],
    featured: post.featured ?? false,
    content: mergeLocalizedContent(englishContent, persianContent),
  };
}

export function mapSanityProject(project: SanityProject): Project {
  return {
    id: project._id,

    title: {
      en: project.title?.en ?? "",
      fa: project.title?.fa ?? "",
    },

    slug: project.slug?.current ?? "",

    description: {
      en: project.description?.en ?? "",
      fa: project.description?.fa ?? "",
    },

    image: project.image ? urlFor(project.image).width(1200).url() : "",

    technologies: project.technologies ?? [],

    github: project.github,

    demo: project.demo,

    featured: project.featured ?? false,

    content: {
      overview: {
        en: project.content?.overview?.en ?? "",
        fa: project.content?.overview?.fa ?? "",
      },

      challenges: {
        en: project.content?.challenges?.en ?? "",
        fa: project.content?.challenges?.fa ?? "",
      },

      outcome: {
        en: project.content?.outcome?.en ?? "",
        fa: project.content?.outcome?.fa ?? "",
      },
    },
  };
}
