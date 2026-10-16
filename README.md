# RootZero Engine v1.0-alpha

> Enterprise Portfolio, Deterministic Telemetry, and Self-Learning Taxonomy Engine.  
> Designed and engineered by **Root Zero Systems Lab™**.

---

## Architecture Overview

1. **Canonical Tech Dictionary & Alias Resolver**:
   - Self-learning AI taxonomy disambiguation via Google Gemini.
   - Dual-key resolution (`slug` and `aliases` array in PostgreSQL).
   - Eliminates redundant AI calls with guaranteed cache hits.

2. **14-Day OpenGraph Asset Cache**:
   - Automated OpenGraph asset pipeline caching remote cards in Supabase Storage (`projects/github-og/...`).
   - Backed by the `AssetCache` model with automated 14-day TTL.

3. **Real-Time Telemetry Event Bus & SSE Stream**:
   - Server-sent events route (`/api/telemetry/stream`) broadcasting live provenance (`DB_CACHE`, `GEMINI_SYNTHESIS`, `GITHUB_API`).
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

# Seed flagship project assets
npx tsx --env-file=.env.local scripts/seed-project-assets.ts
```

---

© 2026 Root Zero Systems Lab™. All rights reserved.
