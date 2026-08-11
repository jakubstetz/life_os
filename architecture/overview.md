# Life OS — Keystone

**Purpose.** Front door for agents and future-me. **Points** at the architecture set; does not restate it (Principle 1).

---

## What Life OS is

A private, agent-augmented personal operating system with two faces:

- **A running system** — memory, automation, and tools that lower the maintenance cost of a well-run life.  
- **A self-description corpus** — living docs of *who I am and how I operate*.

The core bet: agents absorb bookkeeping; I keep judgment, direction, and reflection. Personal-machine-first; privacy and ownership non-negotiable. → [why-a-life-os](../articles/why-a-life-os.md)

---



## Read order


| Order | Doc                                    | Job                                                                                    |
| ----- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| **1** | **This file**                          | Orientation                                                                            |
| **2** | **[architecture.md](architecture.md)** | System map: Inputs → Ingest → Volumes → Workers → Apps → Lenses → Governance           |
| **3** | **[principles.md](principles.md)**     | Five principles: role, structure/state, source/derived, agents, shape/substance |
| **4** | **[governance.md](governance.md)**     | Policy: public vs private (models and git follow)                                      |
| **5** | **[working-with.md](working-with.md)** | Two modes: operate the system · develop the system                                     |
| **6** | **[articles/](../articles/README.md)** | Philosophy (*why*)                                                                     |
| **7** | `domains/`                             | Per-domain structural self-description                                                 |
| **8** | **[ADRs/](ADRs/)**                     | Locked decisions                                                                       |


---



## Picture in one screen

```text
                    Governance (docs · ADRs · agent context)

 Inputs ──► Ingest ──► Volumes ──► Apps
    │                     │  vault ──► Obsidian
    └─────────────────────┘
         Workers (ingest + librarians) visit volumes;
         definitions live in the repo
```


|                   | Structure (`life_os/`)                        | Substance (`$LIFE_OS_DATA_ROOT`) |
| ----------------- | --------------------------------------------- | -------------------------------- |
| **What**          | Philosophy, architecture, apps, flows, skills | finance, travel, vault, …        |
| **Git**           | Yes                                           | No                               |
| **Who may read**  | Structure agents (coding on the repo)          | **Only** dispatched workers / apps / lenses with scoped mounts — not Life OS structure sessions |


---

## How to change the system story

- **Shape** changes → update [architecture.md](architecture.md); ADR if load-bearing.  
- **Cuts / rules** → [principles.md](principles.md).  
- **Policy** → [governance.md](governance.md).  
- **Habits** → [working-with.md](working-with.md).

