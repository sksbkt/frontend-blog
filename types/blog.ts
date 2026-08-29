export type LocalizedText = {
  en: string;
  fa: string;
};

export type BlogContentBlock =
  | {
      type: "heading";
      content: LocalizedText;
    }
  | {
      type: "paragraph";
      content: LocalizedText;
    }
  | {
      type: "list";
      content: LocalizedText[];
    }
  | {
      type: "code";
      language: string;
      content: string;
    };

export type BlogPost = {
  id: string;
  title: LocalizedText;
  slug: string;
  excerpt: LocalizedText;
  image: string;
  publishedAt: string;
  readingTime: number;
  tags: string[];
  content: BlogContentBlock[];
  featured?: boolean;
};
