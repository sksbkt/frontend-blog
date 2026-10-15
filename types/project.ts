import type { ProjectLanguageItem } from "@/lib/github/languages";

export type LocalizedText = {
  en: string;
  fa: string;
};

export type ProjectContent = {
  overview: LocalizedText;
  challenges: LocalizedText;
  outcome: LocalizedText;
};

export type ProjectGalleryItem = {
  _key?: string;
  url: string;
  caption?: string;
  alt?: string;
};

export type ProjectVideo = {
  enabled?: boolean;
  url?: string;
  assetUrl?: string;
};

export type ProjectPreviewGif = {
  enabled?: boolean;
  url?: string;
};

export type Project = {
  id: string;
  title: LocalizedText;
  slug: string;
  description: LocalizedText;
  image: string;
  coverImage?: string;
  openGraphImage?: string;
  gallery?: ProjectGalleryItem[];
  video?: ProjectVideo;
  previewGif?: ProjectPreviewGif;
  technologies: string[];
  github?: string;
  demo?: string;
  featured: boolean;
  content: ProjectContent;
  rawLanguages?: Record<string, number> | string;
  languages?: ProjectLanguageItem[];
};


