export type Project = {
  id: string;
  title: string;
  slug: string;
  description: string;
  image: string;
  technologies: string[];
  github?: string;
  demo?: string;
  featured: boolean;
  content?: {
    overview: string;
    challenges: string;
    outcome: string;
  };
};
