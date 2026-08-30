# Life OS — Architecture

**Purpose.** The shape of the running system: how data enters, where it lives, what works on it, what you open day to day, and what governs the whole. This is the **system map**. Policy detail lives in [governance.md](governance.md); structural rules in [principles.md](principles.md); day-to-day use in [working-with.md](working-with.md).

**Read first:** [overview.md](overview.md) (keystone + read order).

---

## Story (left → right)

```text
                    ┌── Governance (philosophy · architecture · agent context) ──┐
                    └────────────────────────────────────────────────────────────┘

 Inputs ──► Ingest ──► Volumes ──► Apps (hub + tools)
    │                     │  vault
    │                     ├──► Lenses (Obsidian, …)
    │                     └──► Workers visit (librarians, index rebuilds)
    └─────────────────────┘
         manual / other
```


| Piece          | Job                                                                     | Lives in                                                        |
| -------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Inputs**     | Outside world (paystubs, tickets, mail, voice memos, manual files)      | Outside Life OS                                                 |
| **Ingest**     | Coded paths that *write* correctly shaped data into volumes             | Repo (`apps/*/flows`, scripts, …)                               |
| **Volumes**    | Source of truth for life instance data                                  | **Outside** repo (`$LIFE_OS_DATA_ROOT`)                         |
| **Workers**    | Ephemeral jobs on volumes under Life OS rules (ingest *and* librarians) | Definitions in repo; run against volumes                        |
| **Apps**       | Interactive tools you open on purpose                                   | Repo (`apps/`)                                                  |
| **Lenses**     | External readers over volumes (not Life OS packages)                    | e.g. Obsidian app + vault path                                  |
| **Governance** | How the system should behave; shape without substance                   | Repo (`articles/`, `architecture/`, `domains/`, `_meta`/AGENTS) |


---



## 1. Ingestion

**What it is.** The boundary where the outside world becomes volume content.

Two paths from **Inputs**:


| Path               | Meaning                                                            | Example                                                    |
| ------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| **Coded (Ingest)** | A flow or script turns an input into open-format files on a volume | Pay stub PDF → rows under `$ROOT/finance`                  |
| **Manual / other** | You drop or edit files on a volume without a coded flow            | Hand-edited Markdown in vault; CSV export dropped in place |


**Ingest code** is structure: versioned in the repo, refinable with structure agents, never a substitute for the volume files it produces.

**Not the same as librarians.** Ingest *writes new or updated content onto the shelf*. Librarians *maintain what is already there* (see [Workers](#3-workers)).

**Near-term home for code:** `apps/*/flows`, scripts, or later a dedicated workers layout — earn the folder when a real flow exists. Do not invent empty flow shells.

**Sensitivity.** Ingest that sees real inputs is **private** → local models by default. Build and test flows as **public** shape work against mock inputs when you can ([governance.md](governance.md)).

---



## 2. Volumes

**What they are.** Disks of **life instance data** — the knowledge substrate.

**Location (load-bearing):**

```text
$LIFE_OS_DATA_ROOT/          # outside life_os/  — set in root .env
├── finance/
├── travel/
├── coaching/
├── vault/                   # PKM / cliffnotes
└── .index/                  # derived (GBrain-style) — disposable
```


| Rule                                        | Why                                                                                                                                                                                     |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Outside the repo**                        | Primary control so Life OS structure work has no ambient path to substance ([ADR 0001](ADRs/0001-repo-structure-and-posture.md)); only dispatched workers / mounting apps touch volumes |
| **Open formats**                            | CSV, JSON, SQLite, Markdown — usable without Life OS apps ([open-format sovereignty](../articles/open-format-sovereignty.md))                                                           |
| **Source vs derived**                       | Volume files are source of truth; `.index/` and similar are rebuildable                                                                                                                 |
| **Apps and workers mount; they do not own** | Same data-as-a-disk model ([ADR 0002](ADRs/0002-apps-as-self-contained-modules.md))                                                                                                     |


Exact volume names evolve as real apps appear. Prefer creating a volume when something real needs to write or mount it.

**What volumes are not:** agent homes, the Life OS monorepo, or a place to store worker “memory” as a second source of truth.

---



## 3. Workers

**What they are.** Executable jobs defined by Life OS that **visit** volumes under rules. Agent-role cut: [principles.md](principles.md) Principle 4 · [ADRs/0003-structure-agents-vs-workers.md](ADRs/0003-structure-agents-vs-workers.md).


|                   | **Structure agents**           | **Worker agents**                   |
| ----------------- | ------------------------------ | ----------------------------------- |
| **Job**           | Build / change Life OS         | Bounded task on life data           |
| **Workspace**     | `life_os/` only                | Instruction pack + scoped volume paths |
| **Instance data** | **Must not** read live volumes | **May**, only for that job          |
| **Lifespan**      | Your session                   | Often ephemeral                     |
| **Who starts them** | You open a coding session on the repo | Life OS **dispatches** a templated job |
| **Models (default)** | **Frontier via API** (shape) | **Local** first (substance may be in context) |


**Subtypes on the data path:**


| Subtype        | Role                                                            |
| -------------- | --------------------------------------------------------------- |
| **Ingestors**  | Boundary writers (see [Ingestion](#1-ingestion))                |
| **Librarians** | Maintain volumes: cleanup, links, filing rules, derived indexes |


**Contract for a run:**

1. **Trigger** (you, schedule, app, event)
2. **Instruction pack** from the repo (prompt, skill, schema, flow — the template)
3. **Data location** — only the volumes that job is allowed to see
4. **Process boundary** — a **worker process** (or equivalent) is spun with that pack + those paths; it exits when done

> Repo holds the factory and rulebook. Volumes hold the materials. Workers are temporary staff with a checklist and a key to one storeroom — then dismissed.

**Access model (load-bearing):**


| Actor                                                                                              | May read `$LIFE_OS_DATA_ROOT`?                                    |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Life OS as structure** — the repo, structure-agent sessions, design/docs work                    | **No.** No ambient path, no default mount, not the project root.  |
| **Dispatched workers** — templated jobs Life OS *starts* with an instruction pack + scoped volumes | **Yes**, only for that job’s allowed paths.                       |
| **Apps / lenses** — separate runtimes you open that *mount* or *open* disks by config              | **Yes**, as their own processes — not as “the repo reading data.” |


Life OS **does not** hold live instance data and **is not** a process that browses volumes. It **can** define templates and **dispatch** workers (or launch apps) that do. If a coding session on `life_os/` can `cat` your vault, that is a **posture failure**, not an intended capability.

**Implementation posture:** prove multi-step patterns on mock disks (Track A) before promoting into Life OS. No free-floating multi-agent org chart at the hub before a real job forces it.

---



## 4. Apps

**What they are.** Interactive tools under `apps/<name>/` that you open on purpose — financial review, travel, mail views, coaching hours, hub.

**Data-as-a-disk.** An app is a machine with empty bays. You attach a volume via config (`LIFE_OS_DATA_ROOT` / optional per-app override). Same code path against **mock volumes** under `seeds/` for development.

```text
life_os/
├── apps/
│   ├── hub/           # thin launcher
│   ├── finances/      # when real
│   └── …
├── bin/lifeos         # when real — opens hub
└── .env               # LIFE_OS_DATA_ROOT (git-ignored)
```

**What an app is:**

1. Does **one job** a person would open deliberately.
2. Owns its UI/behavior; respects open formats and privacy posture.
3. **Does not own** life data — mounts external (or mock) disks.
4. Discoverable by the hub via a small manifest.

**What an app is not:** a dump of balances into git; a second philosophy layer; the only home of domain *structure* (that still lives in `domains/` when structural).

**Hub +** `lifeos`**.** One shell entry that opens a thin browser hub listing apps. Hub shows safe chrome only (names, status) — not live private content. Apps remain startable alone for development.

Decision record: [ADR 0002](ADRs/0002-apps-as-self-contained-modules.md). Day-to-day: [working-with.md](working-with.md).

---



## 5. Lenses (Obsidian and other external readers)

**Why not under Apps?** Apps in Life OS means **packages we own in** `apps/`. Obsidian is an **external application** that opens a volume (and optionally structure docs). Same for any third-party lens over open files.


|         | **Apps**           | **Lenses**                        |
| ------- | ------------------ | --------------------------------- |
| Code    | In `life_os/apps/` | External product                  |
| Data    | Mounts volumes     | Opens vault (or other open paths) |
| Example | Finances UI        | Obsidian over `$ROOT/vault`       |


**Obsidian** = primary human lens over Markdown on the vault volume. Not the OS. Not a second source of truth. Structure docs can also be opened from the repo when useful.

**GBrain /** `.index` = derived index over volume files — disposable, selectively curated. Rebuild, do not treat as SoT. Placement of *code* that builds the index is worker/app territory; the *index files* live under the data root.

---



## 6. Governance (system component)

The documentation that defines how Life OS operates.


| Material                                | Home                   |
| --------------------------------------- | ---------------------- |
| Cross-cutting *why*s                    | `articles/`            |
| System shape & principles               | `architecture/`        |
| Per-domain *structure* and descriptions | `domains/`             |
| Decision records                        | `architecture/ADRs/`   |
| Agent start context                     | `AGENTS.md` / `CLAUDE.md` → `_meta/` (pointers + short pack) |


Governance **tells** Execution how to behave and **describes** Knowledge shape.

Operational policy (public vs private, models, git): **[governance.md](governance.md)** — that document is the policy home; this section is the *place* of governance in the system diagram.

---



## 7. Layout (repo vs data)

```text
life_os/                         # STRUCTURE — git-tracked
├── .env                         # git-ignored — LIFE_OS_DATA_ROOT
├── articles/
├── architecture/                # this map, principles, governance, working-with, ADRs
├── domains/
├── apps/
├── bin/
├── skills/                      # when real
├── seeds/                       # mock volumes (rows in seed.sql)
└── dev/                         # git-ignored scratch

$LIFE_OS_DATA_ROOT/              # SUBSTANCE — outside repo
├── finance/ | travel/ | coaching/ | vault/ | .index/
```

---



## 8. Environment & phasing

- **Now:** personal-machine-first (laptop). Docs, apps, on-demand workers; private volume work defaults to local models.  
- **Later (Mini):** trigger is *persistence + isolation + always-on local inference*, not raw capability.  
- **Sync:** git for structure; separate sync for the data root; **one** canonical home for live data.

---



## 9. Open questions

- Packaging of worker instruction packs (`skills/` vs app-local).  
- Scheduler vs on-demand for librarians.  
- How aggressively apps/workers write back vs propose diffs.  
- Hub: single origin proxy vs multi-port links.  
- Exact default volume set as apps earn existence.

Record hardened answers as ADRs; keep this file as the map.

---

*System shape. Policy → governance.md · Rules of organization → principles.md · Operate vs develop → working-with.md.*