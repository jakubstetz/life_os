# ADR 0002 — Apps as self-contained modules with external data disks

**Status:** Accepted · **Date:** 2026-08-09 · **Revised:** 2026-08-10

## Context

Life OS will grow interactive tools (financial review, flight tracking, specialized email views, and similar). Early versions largely replace personal Excel workbooks with something more interactive. We need a place for that code that:

- fits **structure vs state** ([0001](0001-repo-structure-and-posture.md), Principle 2): code in git, live data outside the repo;
- stays navigable as the system grows (OS-like apps, not one monolith);
- lets development use **mock data** without special-casing production code paths;
- has a **single human entrypoint** (`lifeos` → browser hub) without forcing every tool through a heavy platform.

Repo posture and *why* instance data is outside the project root (agents, gitignore limits, code-vs-data precedent): **[0001](0001-repo-structure-and-posture.md)**. Fuller app write-up: [../architecture.md](../architecture.md) § Apps. Policy: [../governance.md](../governance.md).

## Decision

1. **User-facing tools live under `apps/`**, each app in its own subdirectory, self-contained for UI and behavior.

2. **Apps mount volumes under `LIFE_OS_DATA_ROOT`** (root `.env`, never committed; see `.env.example`). Volumes are subfolders of that root (`finance/`, `travel/`, `vault/`, …). Apps resolve paths from that root (or an app-level override), not from a hard-coded life path inside the package. Same pattern as application code that connects to a database: the app is data-agnostic structure; the disk holds the rows.

3. **Mocks** under `seeds/` (tracked `seed.sql` for rows; DDL in `domains/<name>/schema.sql` + `views.sql`; built `*.sqlite` gitignored) — same layout as live volumes, same app mount path via env. `dev/` stays local scratch only.

4. **Hub app + `lifeos` shell command** form the default entry: run `lifeos`, get a browser homepage that navigates to installed apps. Apps must still be startable alone for development.

5. **No empty app scaffolds.** Create an app directory when there is a real first version to put there.

6. Prefer **`apps/`** over parallel names (`dashboards/`, etc.) for this role so the tree has one clear home.

## Consequences

- New interactive work has an obvious home and a clear attachment story (mount an external disk).
- Spreadsheet migration can proceed one app at a time with mock disks for design and demos.
- Shared libraries appear only when a second app forces extraction (avoid premature monorepo weight).
- Hub stays thin; domain logic stays in apps and domain docs, not in the launcher.
- Cost: path configuration and backup of the data root (owned with [0001](0001-repo-structure-and-posture.md)); Obsidian may open the external vault rather than assuming vault ⊂ repo.
