# Root Zero Systems Lab™ Platform

> Engineering Platform, Self-Learning Taxonomy Engine & Asset Storage Runtime  
> Designed and engineered by **Root Zero Systems Lab™**.

---

## Architecture Overview

1. **Self-Hosted Supabase Asset Storage & OpenGraph Cache**:
   - Automated OpenGraph asset pipeline caching remote cards directly in self-hosted Supabase Storage (`projects/github-og/...` and `projects/covers/...`).
   - Backed by the PostgreSQL `AssetCache` model with automated 14-day TTL.
   - Zero external CDN leaks (all project cards served directly via Supabase Storage CDN).

2. **Canonical Tech Dictionary & Alias Resolver**:
   - Self-learning AI taxonomy disambiguation via Google Gemini.
   - Dual-key resolution (`slug` and `aliases` array in PostgreSQL).
   - Eliminates redundant AI calls with guaranteed cache hits.

3. **Real-Time Telemetry Event Bus & SSE Stream**:
   - Server-Sent Events route (`/api/telemetry/stream`) broadcasting live provenance (`DB_CACHE`, `GEMINI_SYNTHESIS`, `GITHUB_API`).
   - Multi-stage SCA Deep Scan with granular progress updates.

4. **Developer HUD Overlay (`<DeveloperHud />`)**:
   - Collapsible in-browser command console (`Ctrl+Shift+H`).
   - Real-time ring buffer (last 50 events), live hit-rate analytics, and latency metrics.

---

## Getting Started

```bash
# Run local development server
npm run dev

# Run TypeScript validation
npx tsc --noEmit

# Migrate project covers to Supabase Storage
npx tsx --env-file=.env.local scripts/migrate-project-covers-to-supabase.ts
```

---

© 2026 Root Zero Systems Lab™. All rights reserved.
