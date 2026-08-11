# Life OS — Principles

**Purpose.** Structural and design principles of Life OS itself — how the corpus and system are organized. Distinct from:

- life philosophy in `[../articles/](../articles/README.md)` (the *why* of how I live), and  
- the system map in `[architecture.md](architecture.md)` (where pieces sit).

These five principles are the main rules for how Life OS is organized. They sit **side by side** — none is “above” the others.

A good rule tends to line up several questions at once: *what kind of thing is this*, *where does it live*, *how private is it*, and *how often does it change*. When those answers agree, the system is easier to navigate. That alignment is a quality of the five principles below, not a sixth principle of its own.

When two docs disagree, prefer a clearer principle here or an ADR.


| #     | One line                                                      |
| ----- | ------------------------------------------------------------- |
| **1** | Put things where their *role* says they belong, not by topic. |
| **2** | Commit the engine; live data lives outside the repo.          |
| **3** | Own open-format source; indexes are disposable.               |
| **4** | Building the OS ≠ visiting volumes under rules.               |
| **5** | Share shape freely; guard instance contents.                  |


---



## Principle 1 — Separate by role, not by topic

**Statement.** Everything in Life OS has a *role* — what job it does in the system — and that role decides **where it lives**, not the life-topic it happens to mention (finances, travel, security, …). Mixing roles in one place is an anti-pattern.

At minimum, keep these roles apart:


| Role                  | What it is                                                                    | Home (typical)              | How often it changes             |
| --------------------- | ----------------------------------------------------------------------------- | --------------------------- | -------------------------------- |
| **Philosophy**        | Universal *why* and disposition                                               | `articles/`                 | Rarely                           |
| **Domain structure**  | How one area of life is set up for me (schemas, practices — not live numbers) | `domains/`                  | When that domain’s setup changes |
| **Decisions**         | Why we locked a structural choice                                             | `architecture/ADRs/`        | When a decision is made          |
| **Executable system** | Apps, workers, skills, code that *run*                                        | `apps/`, skills, scripts, … | Often                            |
| **Instance data**     | My actual life content (balances, notes, logs)                                | `$LIFE_OS_DATA_ROOT`        | As life happens                  |


A single *topic* (e.g. finances) can appear in several roles: philosophy about money, a domain doc for financial architecture, an app UI, and numbers on a volume. Those are **different homes**, not one “finances folder.”

**Why it matters.** You and agents always know where to *look* and where to *write*. Topic-based filing fails because one topic shows up at every role at once. Role-based filing does not. It also avoids the “one giant doc” / Zettelkasten collapse where philosophy, domain detail, and code tangle together.

**In practice.** Before creating or filing something, ask: *what job does this do — explain why, describe a domain’s structure, record a decision, run as software, or hold live data?* If one artifact is trying to do two jobs, split it.

*Example:* a digital-security roadmap is **domain structure** even when it cites privacy philosophy and will inform tooling. It lives under domain docs and links out — it is not absorbed into `articles/` or into app code.

---



## Principle 2 — Separate structure from state

**Statement.** Stable *structure* — engine code, automation, schemas, templates, skills, architecture and philosophy docs — is **git-tracked** and liberally engineered. *Live data* — balances, journals, notes, contacts, derived indexes — lives **outside the repo**, pointed at by `LIFE_OS_DATA_ROOT` in root `.env`, and is never pushed to a shareable remote.

This is code-vs-data applied to a life. Location is chosen so Life OS structure work **cannot** casually reach substance: volumes are outside the project root. Gitignore is a **backstop**; external data root is the **primary** control. Runtime access to volumes is only via **dispatched workers** or **apps/lenses** that mount paths on purpose (Principle 4).

**Why it matters.** Version schemas not rows; keep the shareable layer frontier-touchable; evolve engine and data independently; back up / sync the data root as its own unit.

**In practice.** Before saving: *structure or live data?* Structure → tracked tree. Data → `$LIFE_OS_DATA_ROOT` in open formats, **referenced** by docs — not embedded. When unsure, treat as data.

See [ADR 0001](ADRs/0001-repo-structure-and-posture.md), [architecture.md § Volumes](architecture.md#2-volumes).

---



## Principle 3 — Source vs derived

**Statement.** The source of truth for life instance data is **open files** under `$LIFE_OS_DATA_ROOT`. Every index, graph, or secondary DB (e.g. GBrain / `.index/`) is **derived and disposable**: delete and rebuild, lose no source.

**Why it matters.** Avoid lock-in to a tool’s database; keep Obsidian and apps as **lenses**; survive tool churn ([open-format sovereignty](../articles/open-format-sovereignty.md)).

**In practice.** Never make a derived index the only place a fact lives. Prefer writing through to open files (or an explicit export path) when something must persist.

---



## Principle 4 — Separate structure agents from worker agents

**Statement.** Agents that **build or change Life OS** (coding sessions on the repo) are a different role from agents that **perform jobs on life data** under rules Life OS defines (ingest, librarians, cleanup, index rebuilds).


|                      | Structure agents                                | Workers                                                     |
| -------------------- | ----------------------------------------------- | ----------------------------------------------------------- |
| Workspace            | `life_os/` only                                 | Instruction pack + **scoped** volume paths                  |
| Instance data        | **Must not** read live volumes                  | **May**, only for that job                                  |
| Lifespan             | Your session                                    | Often ephemeral                                             |
| Who starts them      | You open a coding session on the repo           | Life OS (or you via CLI/hub) **dispatches** a templated job |
| **Models (default)** | **Frontier via API** (or IDE wired to the same) | **Local** models first                                      |


The repo holds definitions and rules; volumes hold substance. Workers do not “live in” `$LIFE_OS_DATA_ROOT`.

**Access model.** Life OS **cannot** (must not be able to) read volumes as part of ordinary structure work. It **can** dispatch **templated workers** that receive only the pack + paths they need. Apps and lenses that mount disks are the same idea: separate runtimes, not the monorepo casually opening your life files. Ambient shell access from a structure session to `$LIFE_OS_DATA_ROOT` is a failure mode, not a feature.

**Why the model split.** Structure work is **public** (shape: architecture, code, schemas, prompts) — strong frontier models via **API** are the default. Worker jobs are **private** (they exist to touch volume contents) — **local** models are the default so instance data stays on the machine. Sending private material to a frontier model is a conscious exception, not the everyday path ([governance.md](governance.md)).

**Why it matters.** Keeps redesign of the OS free of substance; makes substance access an explicit, job-scoped act; sensitivity routing attaches to the *dispatched job*, not to “using an agent.”

**In practice.** Before spinning something up: *changing the OS, or dispatching a worker against a volume?* System detail: [architecture.md § Workers](architecture.md#3-workers). Decision record: [ADRs/0003-structure-agents-vs-workers.md](ADRs/0003-structure-agents-vs-workers.md).

---



## Principle 5 — Shape without substance; public vs private

**Statement.** Frontier models almost always need **shape** (schemas, structure, logic), not **substance** (balances, confessions, contact lists). Life OS policy uses **two tiers**:

| Tier | Means | Default |
|---|---|---|
| **Public** | Structure / shape (no live instance data) | Frontier via API; may commit to git |
| **Private** | Instance substance | Local models; never commit |

If a task needs private material, the whole task is private. Do not “average down.”

Full policy: **[governance.md](governance.md)**. Background philosophy: [proportionate privacy](../articles/proportionate-privacy.md) (older multi-tier language there is historical; **run on the two-tier rule**).

**In practice.** Building a dashboard against mock finance data is public shape work. Pasting real balances into a frontier or consumer chat is the anti-pattern.

---



## The three planes (a view of the principles)

Life OS is one system in three planes:


| Plane          | Job                                                | Sensitivity     | Lives in                                                | Cadence  |
| -------------- | -------------------------------------------------- | --------------- | ------------------------------------------------------- | -------- |
| **Governance** | How the system should behave                       | low (structure) | git-tracked docs, skills, ADRs                          | stable   |
| **Knowledge**  | Life content + memory over it                      | high (instance) | `$LIFE_OS_DATA_ROOT`                                    | episodic |
| **Execution**  | Apps, workers, integrations — *how they are built* | low (structure) | code in repo; secrets fetched at runtime, not committed | constant |


**Contract:** Knowledge is shared state; Execution reads and writes it at **runtime**; Governance tells both how to behave.

Execution artifacts are **data-agnostic structure**: the Finances app, an ingest template, a librarian pack. They do not embed instance data. Sensitivity rises only when a **running** worker or app is **mounted on** Knowledge (scoped paths, ephemeral process) — that is a runtime session over Knowledge, not a property of the Execution code itself. Secrets (API keys) stay out of git and are loaded at runtime; they are not “the app’s sensitivity class.”

Planes are a *view* of Principles 1–5 (especially 1, 2, and 4), not a competing taxonomy. System map: [architecture.md](architecture.md).

---



## Companion principles (philosophy articles)

These are life/engineering dispositions that inform architecture but live in `articles/`:

- Selective curation over maximalism → [why-a-life-os](../articles/why-a-life-os.md)  
- Agents do the drudgery; I do the judgment → same  
- Fluency & ownership → [fluency](../articles/fluency-in-the-digital-substrate.md), [ai-pilled engineer](../articles/the-ai-pilled-engineer.md)  
- Open-format sovereignty → [open-format-sovereignty](../articles/open-format-sovereignty.md)  
- Proportionate privacy → [proportionate-privacy](../articles/proportionate-privacy.md)

