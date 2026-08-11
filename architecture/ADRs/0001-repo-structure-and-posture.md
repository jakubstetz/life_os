# ADR 0001 — Repo structure and posture

**Status:** Accepted · **Date:** 2026-06-18 · **Revised:** 2026-08-10

## Context

Life OS needs a home that satisfies several constraints at once:

- Own the source of truth in **open formats**.
- Keep intimate **instance data** private and local.
- Still allow the structural layer (docs, code, schemas) to be engineered liberally — including with **frontier coding agents**.
- Avoid reintroducing the maintenance overhead that sank past PKM attempts.

A natural first instinct is: put everything under one tree and **gitignore** the sensitive folders. That is not enough.

**Why gitignore (and “folder permissions” as a soft rule) fail as the primary control:**

- Gitignore only affects **git**. It does not stop a process that already has a shell in the project from reading a path.
- Coding agents opened on a repo routinely list, search, and `cat` files under the project root. We **do not rely on the model to honor** “please don’t look in `data/`” or ignore rules. Policy text and denylists help; they are **backstops**, not the boundary.
- If live journals, balances, or vault notes sit **inside** `life_os/`, a structure session has ambient path access by default — even when those files are untracked.

So the hard boundary is **location**: structure in one place, substance in another. Structure-agent work opens the repo; private data is not under that root.

This is not an exotic personal-OS invention. It is ordinary **code vs data**: application SQL and migrations live in git; production rows live in a database the app **connects to** at runtime. The committed code does not contain the contents of the tables. Life OS applies the same split to a life — open files under an external data root instead of (only) a SQL server.

See: [../overview.md](../overview.md), [../architecture.md](../architecture.md), [../principles.md](../principles.md) (esp. Principles 2 and 4), [../governance.md](../governance.md).

## Decision

**One structure repo; live instance data outside that tree.**

1. **Tracked (`life_os/`):** stable structure — philosophy (`articles/`), architecture (`architecture/`), per-domain *structural* docs (`domains/`), apps, skills, flows, and related engine code. Version-controlled; suitable for structure agents and frontier API work on **shape** ([../governance.md](../governance.md) public tier).

2. **Live instance data lives outside the repo** (e.g. `~/LifeData/…`), pointed at by root `.env` → `LIFE_OS_DATA_ROOT` (commit `.env.example` only). Volumes are subfolders of that root (`finance/`, `travel/`, `vault/`, …). How apps and workers **mount** that root is detailed in [0002](0002-apps-as-self-contained-modules.md) and [../architecture.md](../architecture.md) § Volumes / Workers.

3. **Primary control = separate location.** Not “ignored but still inside the project.” Not “the model will respect permissions.” If a coding agent’s workspace is `life_os/`, private volumes are simply **not in that workspace**.

4. **Git-ignored inside the repo (when present):** `dev/` (scratch, mock seeds), `.env`, and accidental `/data/` under the repo (backstop in `.gitignore`).

5. **Remotes:** structure may go to a private remote. Instance data does not ride that remote; back up / sync the data root separately.

6. **Secrets** are not committed; fetch at runtime (e.g. 1Password CLI). Key files ignored as a backstop.

7. **Obsidian** may open the external vault volume and/or the repo for structure docs; the vault is not required to live inside `life_os/`.

8. **Source vs derived:** open files under `LIFE_OS_DATA_ROOT` are the source of truth for life instance data; indexes (e.g. under `.index/`) are derived and disposable.

## Consequences

- Structure can be engineered, shared carefully, and worked on with frontier coding agents **without** ambient access to private life content.
- Re-engineer the OS without migrating instance data; sync/back up the data root as its own unit.
- Apps and workers **attach** data at runtime (like a DB connection) — they do not own it inside the package ([0002](0002-apps-as-self-contained-modules.md)). Who may open those attachments: [0003](0003-structure-agents-vs-workers.md) (structure agents do not; dispatched workers and mounting apps do).
- Cost: one configured path (`LIFE_OS_DATA_ROOT`); discipline not to dump live files into the repo; optional rebuild of derived indexes.
- Residual risk remains if a session is given the data root path or an absolute path — posture and tooling still matter; location removes the **default** failure mode.
