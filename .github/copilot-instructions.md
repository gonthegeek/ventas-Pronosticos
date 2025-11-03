<!-- Workspace-specific guidance for AI coding agents. Keep this concise, actionable, and tied to the repo. Docs: https://aka.ms/vscode-instructions-docs -->

# Casa Pronósticos — Copilot Instructions (Agent Quickstart)

This app is a React 18 + TypeScript + Firebase (Auth/Firestore) system with a strict caching-first data layer to keep Firebase reads under free-tier limits.

## Architecture and data flow
- UI (components in `src/components/**`, feature pages in `src/modules/**`) → hooks (`src/hooks/**`) → services (`src/services/**`) → Cache (`CacheService.ts`) → Firestore (`firebase.ts`).
- Firestore schema is hierarchical: `data/{feature}/{year}/{month}/{day?}/{id}`. Always use Mexico City timezone helpers in `utils/timezone.ts` for date partitions and display.
- State is RTK-based (`state/**`). Reuse UI primitives in `components/ui/*` and sales widgets in `components/sales/*`.

## What to use (and avoid)
- Prefer cached services and hooks:
  - `services/SalesService.cached.ts`, `hooks/useCachedSales.ts` (e.g., `useCachedHourlySales`, `useCachedDashboard`, `useCacheStats`).
  - Do NOT call Firestore directly from components; route all reads/writes through the service layer.
- Check permissions with `utils/permissions.ts` for routing and menu visibility; do not hardcode role logic in components.
- Use React Hook Form in forms; Tailwind for styling; Recharts via reusable chart wrappers in `components/sales/*`.

## Build, run, test
- Local scripts (see `package.json`): `npm run dev`, `npm run build`, `npm run test`, `npm run lint`, `npm run preview`.
- VS Code task: “Start Development Server” starts `npm run dev` in the background.
- Required env: VITE_FIREBASE_* (see examples in top-level README). Configure via `.env`.

## Implementing new SRS features (pattern to follow)
- Create: `src/modules/{category}/{Feature}.tsx` + `src/services/{Feature}Service.ts` (+ optional `{Feature}Service.cached.ts`).
- In the service: implement `getCollectionPath(date)` using the hierarchical schema, CRUD methods, and Mexico timezone utilities.
- Cache: extend `CacheService` with an explicit key namespace and TTL (Sales: 30–240 min, Dashboard: 10 min, Users: 30–60 min). Invalidate on writes.
- Wire hooks/selectors if state is needed; otherwise prefer hook-returning services (see `hooks/useCachedSales.ts`).
- Update permissions in `utils/permissions.ts` and menu visibility in layout if needed.

## Concrete examples in this repo
- **SRS #1 (Hourly Sales)**: `modules/sales/HourlySales.tsx`, `services/SalesService.ts`, `services/SalesService.cached.ts`, hooks in `hooks/useCachedSales.ts`, UI in `components/sales/*`.
- **SRS #5 (Tickets Sold)**: `modules/finances/Tickets.tsx`, `services/TicketsService.ts`, `services/TicketsService.cached.ts`, hooks in `hooks/useCachedTickets.ts`.
  - Comparison module: `modules/finances/TicketsComparison.tsx` with 4 modes (day/week/month/weekday), chart component in `components/sales/TicketsComparisonChart.tsx`.
- Cached usage example:
  - Read: `const { data, loading, refresh } = useCachedMonthlyTickets(yearMonth)`
  - Stats: `const { stats, loading: statsLoading, refresh: refreshStats } = useCachedMonthlyTicketStats(yearMonth)`
  - Write: call `TicketsService.create(...)` then invalidate via `CacheManager.invalidateTicketsData(year, month)`.
  - Update: call `update(id, prevEntry, changes)` - handles cross-month date changes automatically.

## Guardrails and conventions
- Do not duplicate derived datasets: daily/weekly aggregates are computed from hourly sales unless a specific collection exists.
- All dates/times must be created/read in `America/Mexico_City` (`utils/timezone.ts`). Never store client-local times.
- Keep Firestore reads minimal: narrow by year/month/day collections; lean on cache and avoid N+1 queries.
- Reuse shared UI and Export tools in `components/sales/ExportTools.tsx` for CSV/print.
- **CHANGELOG.md**: Always add new entries at the top under `[Unreleased]` section. Never modify historical entries—follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) conventions.
- **Commit Messages**: Use conventional commit format: `type(scope): description`
  - Examples: `fix(console): resolve browser warnings`, `feat(tickets): add comparison module`, `refactor(cache): optimize invalidation logic`
  - Common types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`
  - Keep first line under 72 characters; add bullet points for details if needed

## Key files/directories to know
- Services: `src/services/{firebase.ts, SalesService.ts, TicketsService.ts, CommissionsService.ts, PaidPrizesService.ts, CacheService.ts}` (+ their `.cached.ts` versions)
- Hooks: `src/hooks/{useCachedSales.ts, useCachedTickets.ts, useCachedCommissions.ts, useCachedPaidPrizes.ts}`
- UI: `src/components/ui/*`, `src/components/sales/*` (includes reusable chart components)
- Auth/Permissions: `src/services/AuthService.ts`, `src/utils/permissions.ts`
- Modules: `src/modules/{sales/*, finances/*}` (feature pages with CRUD operations)

Questions or gaps? If any section above feels ambiguous for the change you’re making (e.g., cache keying/TTL or permission strings), leave a short note in your PR and we’ll iterate this guide.