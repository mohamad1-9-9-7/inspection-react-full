# Company isolation — one site, one kitchen, a table per company

Decided with the owner on 30 Sep 2026.

**The picture:** one website, one link, one server, one database — *one kitchen*.
Every customer company has its **own table**: its own folder of code (its chef
and its recipes), loaded only for that company's people. Everything common
(login, saving, offline outbox, exports, isolation) lives once in the shared
core and every company is wired to it the same way.

**The rule the owner set:** a bug in one company must never reach another,
and no file grows into thousands of lines.

---

## Target layout

```
src/
├─ core/                     shared engine — imported by companies, never the reverse
├─ companies/
│   ├─ index.js              registry: module key → lazy loader (one line per company)
│   ├─ CompanyBoundary.jsx   error wall around a company's screens
│   ├─ exaltis/              EXALTIS (confectionery) — pilot table
│   │   ├─ manifest.js       cards, reports, groups, guides (was industries/sweets)
│   │   ├─ reports/          daily reports, HACCP, quality …
│   │   ├─ training/  ohc/  certs/  cars/  settings/
│   │   └─ …
│   └─ almawashi/            (later phases — the meat system moves in last)
└─ App.jsx                   core routes + "mount the signed-in company's module"
```

Server: shared core routes; per-industry rules stay in `industries/<name>/`;
data isolation by `company_id` + Postgres RLS (`db/tenantRls.cjs`).

## Guard rails (enforced by tools, not memory)

| Rule | Enforced by |
|---|---|
| A company folder imports only `core/` or its own files — never another company | ESLint `no-restricted-imports` override per company |
| No meat modules/data inside another company | existing ESLint override (kept) |
| Every relative import resolves to a real file | `scripts/check-imports.js` |
| Files in `src/companies/**` stay ≤ 800 lines | `scripts/check-sizes.js` (fails on new offenders) |
| A company's screens crash alone | `CompanyBoundary` around the mounted module |
| The company's code is loaded only for that company | registry `import()` per module key |

---

## Items — each one is checked before the next starts

| # | Item | Check before moving on | Status |
|---|---|---|---|
| 1 | **Tooling**: `check-imports.js`, `check-sizes.js`, ESLint company-boundary rule | scripts run clean on today's tree; rule fires on a deliberate violation | ☑ |
| 2 | **Server: `companies.module`** column (which code module a company runs), returned by `/api/companies` and login; defaults: meat → `almawashi`, sweets → `exaltis`, kit industries → their starter | `node --check`; column + values verified on the live DB after deploy | ☑ |
| 3 | **Platform Center**: "System" field on add/edit company (list from the registry) | ESLint clean; field saves and reloads | ☑ |
| 4 | **Registry + boundary**: `src/companies/index.js`, `CompanyBoundary.jsx`, `getActiveModule()`; company app picks its template by module (industry as fallback) | ESLint + import check clean; sweets and kit companies still open the same cards | ☑ |
| 5 | **Move EXALTIS in**: `industries/sweets` + `pages/monitor/branches/sweets` + `pages/sweets-*` → `src/companies/exaltis/…`; all imports rewritten; public quiz/verify routes repointed | import check: 0 unresolved; ESLint clean; no file outside the module imports the old paths | ☑ |
| 6 | **Split EXALTIS files over 800 lines** (training list/admin/plan, OHC view, cert view, cars, daily log…) into focused files | `check-sizes` → 0 files over 800 in `companies/exaltis`; ESLint + import check clean | ☑ |
| 7 | **Full server audit**: every route — auth, company scope, RLS path, input validation, errors, secrets, rate limits; findings fixed or listed | report delivered; fixes committed and pushed | ☐ |

**Later phases (not in this run):** the kit starters (restaurant, retail,
warehouse, factory) become `companies/_starters/`; the shared parts that are
copied today (training, OHC, certs) are lifted into `core/`; Al Mawashi moves
into `companies/almawashi/` and its large files (up to 9 000 lines) are split —
last, in stages, because it runs the business every day.

**Open infrastructure item:** Render ↔ Neon are ~47 ms apart (Neon us-east-2).
Moving the Render service to Ohio is what makes the database-level isolation
(`TENANT_RLS=on`) cheap enough to switch on.
