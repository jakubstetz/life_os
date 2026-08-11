# Life OS — Working with the system

**Purpose.** How to run Life OS day to day, and how to change its structure. Shape → [architecture.md](architecture.md). Policy → [governance.md](governance.md). Principles → [principles.md](principles.md).

---

## Operate and develop


|             | **Operate**                                    | **Develop**                                            |
| ----------- | ---------------------------------------------- | ------------------------------------------------------ |
| **You are** | Living with the system                         | Changing the system                                    |
| **Work**    | Data in, apps, Obsidian, ingest and librarians | Docs, code, templates, mocks, structure-agent sessions |
| **Touches** | Volumes, apps, dispatched workers              | `life_os/` (public structure)                          |
| **Models**  | Local when private substance is in play        | Frontier via API on shape                              |


```text
Operate:   Inputs → Volumes → Apps / Obsidian / Workers
Develop:   life_os/  (docs, code, templates, mocks)
                 │
                 └── dispatches workers / mounts apps ──► volumes at runtime
```

---



# Part A — Operating

Data in, tools open, jobs run.

## A1. Machine setup

```bash
# life_os/.env  (git-ignored)
LIFE_OS_DATA_ROOT=/absolute/path/to/LifeData
```

## A2. Putting data in


| Path               | When                   | How                                                      |
| ------------------ | ---------------------- | -------------------------------------------------------- |
| **Coded ingest**   | A flow exists          | Run it; writes open formats under `$LIFE_OS_DATA_ROOT/…` |
| **Manual / other** | One-off or no flow yet | Edit or drop files on the volume                         |
| **App write-back** | App can save/export    | Open formats on the volume                               |


Instance data lives on volumes.

## A3. Apps

```bash
lifeos              # hub, when present
# later, maybe:
lifeos finances
```

Or `cd apps/<name>` and the app’s start command. Apps mount volumes. Hub lists tools without surfacing private content.

## A4. Lenses (Obsidian)

Open Obsidian on `$LIFE_OS_DATA_ROOT/vault` (or your vault path). Optionally also open `life_os/` for structure docs. Vault files remain the source of truth for notes.

## A5. Running workers

Ingest, librarians, index rebuilds, other bounded jobs.

1. **Job type** — ingest vs librarian vs other
2. **Instruction pack** — template in the repo
3. **Scope** — volume path(s) for this run
4. **Public or private** — [governance.md](governance.md) (real volumes → private → local models)
5. **Human approval** — for irreversible effects

Dispatch a process with the pack and those paths; let it exit when done.

---



# Part B — Developing

Documents, code, templates, mocks. Structure-agent work on `life_os/`.

## B1. Session setup

- Project root: `life_os/`  
- Models: frontier via API on shape  
- Data for design: **mock volumes**
- To try a real volume path: open an **operate** path (app or dispatched worker), not the structure session



## B2. Where writing goes


| Kind                                   | Put it                 |
| -------------------------------------- | ---------------------- |
| Universal *why*                        | `articles/`            |
| System shape / policy / how-to         | `architecture/`        |
| How a life domain is structured for me | `domains/<area>/`      |
| Locked design decision                 | `architecture/ADRs/`   |
| Live numbers, journals, notes          | `$LIFE_OS_DATA_ROOT/…` |
| Scratch / experiments                  | `dev/` (ignored)       |


[principles.md](principles.md) Principle 1 — role, not topic.

## B3. Seeds and tracks

Mock disks keep app and flow design on the public path; same mount code as production, different path. Ship apps you use (Track L). Promote agent patterns from practice when ready (Track A).

---



## By intent


| Intent                            | Where                                                           |
| --------------------------------- | --------------------------------------------------------------- |
| Drop a paystub / edit vault notes | A2                                                              |
| Open Finances / Obsidian          | A3–A4                                                           |
| Run a librarian or ingest job     | A5                                                              |
| Understand the system             | [overview.md](overview.md) → [architecture.md](architecture.md) |
| Public vs private                 | [governance.md](governance.md)                                  |
| Add or change an app / flow       | B1–B3 · [architecture.md § Apps](architecture.md#4-apps)        |
| Code with an AI on the repo       | B1 · [principles.md](principles.md) Principle 4                 |
| Refine architecture docs          | B2                                                              |


