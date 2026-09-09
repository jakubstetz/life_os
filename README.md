# Life OS

My private, agent-augmented personal operating system — a curated second brain, automation layer, intimate thought partner, and living self-description of how I run my life.

This repo is the **structure** of that system: philosophy, architecture, per-domain docs, and (in time) apps and automation. **Live data** lives outside this tree under `LIFE_OS_DATA_ROOT` (see root `.env.example`).

## Start here

**Agents:** [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md), then [`_meta/`](_meta/) (short pack — not a dump of the full architecture).

**Humans / deep dive:**

1. **[architecture/overview.md](architecture/overview.md)** — keystone (read order).
2. **[architecture/architecture.md](architecture/architecture.md)** — system map (Ingest, Volumes, Workers, Apps, Lenses, Governance).
3. **[architecture/principles.md](architecture/principles.md)** — load-bearing cuts.
4. **[architecture/governance.md](architecture/governance.md)** — public vs private.
5. **[architecture/working-with.md](architecture/working-with.md)** — operate vs develop.
6. **[articles/](articles/README.md)** — philosophy (*why*).
7. `domains/` — per-domain structural self-description (when present).

## How this repo is organized

Hard lines ([principles.md](architecture/principles.md)):

- **Structure vs state** — git-tracked engine here; instance data under `$LIFE_OS_DATA_ROOT`.  
- **Source vs derived** — open files are SoT; indexes are disposable.  
- **Structure agents vs workers** — coding on the repo ≠ ephemeral jobs on volumes.

```text
life_os/                 # structure only
├── .env.example
├── .env                 # git-ignored
├── articles/
├── architecture/
├── domains/
├── apps/
├── bin/                 # lifeos when real
├── seeds/               # mock volumes (seed.sql = rows; schema in domains/)
└── dev/                 # git-ignored scratch

$LIFE_OS_DATA_ROOT/      # e.g. ~/LifeData — outside the repo
├── finance/
├── travel/
├── vault/
└── …
```

- **Obsidian** opens the external vault volume; structure docs stay in the repo.  
- **Secrets** from 1Password CLI (or equivalent) at runtime — never committed.  
- **Structure work:** open `life_os/` only — no ambient read of volumes. **Substance access:** only via dispatched workers or apps/lenses that mount paths on purpose.

