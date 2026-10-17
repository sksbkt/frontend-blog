# AGENT RULES & OPERATING ARCHITECTURE STANDARDS

**Root Zero Systems Lab™ Engineering Guidelines**

These rules are permanent operational mandates for all AI coding agents working in this repository.

---

### Rule 1: Audit Before Writing
- Always search `lib/`, `components/`, and `prisma/schema.prisma` for existing helpers, types, and models before creating new files or functions.
- Never write redundant utilities or reinvent existing services.

### Rule 2: Extend, Don't Duplicate
- If an asset helper exists (such as `ensureSovereignAsset`, `getOrCacheGithubOgImage`, or Supabase client wrappers like `getServiceSupabase`), extend and build directly on top of it.
- Unify pipelines under shared architectural standards rather than building parallel implementations.

### Rule 3: Strict Storage Separation
- Enforce strict bucket and folder separation in Supabase Storage (`projects` bucket):
  - `projects/covers/`: Custom user-uploaded images and project cover art.
  - `projects/github-og/`: Cached GitHub OpenGraph images (`[slug]-high.webp`, `[slug]-low.webp`).
  - `projects/captures/`: Automated GitHub Actions screenshots and GIF recordings synced from repo `assets/`.
- Never mix automated captures, GitHub OG fallbacks, and user covers into the same folder.

### Rule 4: Zero Process Killing
- Never execute system-wide `taskkill`, `pkill`, or destructive host commands that can crash user processes, background servers, or active development instances.
- Manage processes strictly through targeted, isolated tool commands.