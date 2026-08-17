export type LocalizedText = {
  en: string;
  fa: string;
};

export type ProjectContent = {
  overview: LocalizedText;
  challenges: LocalizedText;
  outcome: LocalizedText;
};

export type Project = {
  id: string;
  title: LocalizedText;
  slug: string;
  description: LocalizedText;
  image: string;
  technologies: string[];
  github?: string;
  demo?: string;
  featured: boolean;
  content: ProjectContent;
};
