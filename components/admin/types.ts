export type AdminUser = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
};

export type AdminSession = {
  user: AdminUser;
  accessToken: string;
  createdAt: number;
};

export type RepositoryItem = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  homepage: string;
  language: string;
  stars: number;
  forks: number;
  isPrivate: boolean;
  updatedAt: string;
  topics: string[];
  defaultBranch: string;
  importStatus: "published" | "draft" | "none";
  languages?: Record<string, number>;
};

export type LocalizedText = {
  en: string;
  fa: string;
};

export type ProjectContent = {
  overview: LocalizedText;
  challenges: LocalizedText;
  outcome: LocalizedText;
};

export type ImageAssetRef = {
  _type?: string;
  alt?: string;
  asset?: {
    _id?: string;
    url?: string;
    _ref?: string;
  };
};

export type GalleryItem = {
  _key: string;
  _type?: string;
  caption?: string;
  alt?: string;
  asset?: {
    _id?: string;
    url?: string;
    _ref?: string;
  };
};

export type ProjectVideo = {
  enabled: boolean;
  url?: string;
  asset?: {
    _id?: string;
    url?: string;
    _ref?: string;
  };
};

export type ProjectPreviewGif = {
  enabled?: boolean;
  asset?: {
    _id?: string;
    url?: string;
    _ref?: string;
  };
};

export type AiContextDigest = {
  summary?: string;
  architecture?: string;
  coreFeatures?: string[];
  targetAudience?: string;
  technicalTradeoffs?: string[];
  rawDigest?: string;
  lastAnalyzedCommit?: string;
  lastAnalyzedAt?: string;
};

export type AdminProject = {
  _id: string;
  _createdAt: string;
  _updatedAt: string;
  title: LocalizedText;
  slug: { current: string };
  description: LocalizedText;
  technologies: string[];
  github: string;
  demo?: string;
  featured?: boolean;
  content: ProjectContent;
  isDraft: boolean;
  image?: ImageAssetRef;
  coverImage?: ImageAssetRef;
  gallery?: GalleryItem[];
  video?: ProjectVideo;
  previewGif?: ProjectPreviewGif;
  aiContextDigest?: AiContextDigest;
  rawLanguages?: Record<string, number> | string;
  languages?: import("@/lib/github/languages").ProjectLanguageItem[];
  auditScore?: number | null;
  auditBreakdown?: any;
  auditedAt?: string | null;
};

export type SanityProject = AdminProject;

export type EnvVariableDef = {
  key: string;
  required: boolean;
  description: string;
  isSecret: boolean;
};

export type RepoAuditData = {
  overallScore: number;
  documentationStatus: "missing" | "basic" | "good" | "comprehensive";
  requiresEnv?: boolean;
  envVariables?: EnvVariableDef[];
  summary: { en: string; fa: string };
  strengths: { en: string[]; fa: string[] };
  improvements: { en: string[]; fa: string[] };
  techStackHighlights: string[];
  bilingualReadmeDraft: string;
};

export type RepoAuditItem = {
  audit?: RepoAuditData | null;
  readmeDraft?: string | null;
  context?: {
    fullName?: string;
    hasReadme: boolean;
    readmeSize?: number;
    totalFiles: number;
    configFiles: string[];
    entryPoint: string | null;
    defaultBranch?: string;
    hasPackageJson?: boolean;
    detectedEnvKeys?: string[];
  };
};

export type PushReadmeConfig = {
  fullName: string;
  content: string;
  mode: "direct" | "pr";
  targetBranch: string;
  branchName: string;
  commitMessage: string;
  prTitle: string;
  prBody: string;
};

export type PushSuccessResult = {
  url: string;
  mode: "direct" | "pr";
  branch: string;
  sha?: string;
  number?: number;
};

export type VercelModalConfig = {
  repoFullName: string;
  branch?: string;
  envVariables: EnvVariableDef[];
};

export type VercelDeployResult = {
  liveUrl: string;
  deploymentId: string;
  projectId: string;
  message?: string;
};
