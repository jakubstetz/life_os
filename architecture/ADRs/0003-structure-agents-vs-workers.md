# ADR 0003 — Structure agents vs workers

**Status:** Accepted · **Date:** 2026-08-10

## Context

Life OS uses agents in two very different ways:

1. **Building the system** — coding and architecture sessions on the `life_os/` repo (frontier models via API or IDE).
2. **Working on life data** — ingest, librarians, cleanup, index rebuilds, and similar jobs that must see files under `$LIFE_OS_DATA_ROOT`.

Without a hard cut, the default becomes one ambient session that has the monorepo *and* every private volume open. That undoes [0001](0001-repo-structure-and-posture.md) (data outside the project root) and blurs [0002](0002-apps-as-self-contained-modules.md) (tools attach disks at runtime; they are not the repo casually browsing LifeData).

Related: some jobs are **deterministic code** (inspectable SQL-style paths); others are **model-backed** and non-deterministic, so safety depends more on scope, locality, and human gates than on reading the source alone.

See: [../principles.md](../principles.md) Principle 4, [../architecture.md](../architecture.md) § Workers, [../governance.md](../governance.md), [../working-with.md](../working-with.md).

## Decision

1. **Two roles, not one super-agent.**
   - **Structure agents** change Life OS (docs, apps, flows, templates). Workspace: `life_os/` only.
   - **Workers** perform bounded jobs on life data under rules Life OS defines. They receive an **instruction pack** (template from the repo) and **scoped volume paths**.

2. **Life OS as structure does not read volumes.** No ambient mount of `$LIFE_OS_DATA_ROOT` in a structure session. Ambient shell access from the repo project root into live volumes is a **posture failure**, not a feature. Life OS **defines** templates and **dispatches** workers (or launches apps/lenses) that may read those paths.

3. **Access is process-scoped.** A worker run is: trigger → pack → allowed paths → process starts → process exits. Workers do not “live in” the data root.

4. **Model defaults follow the role** ([../governance.md](../governance.md) public vs private):
   - Structure agents → **frontier via API** on shape (public tier).
   - Workers on **real** volumes → **local models** by default (private tier). Frontier with private substance only as a conscious exception.

5. **Apps and lenses** are separate runtimes that mount or open disks by config — same family as workers for data access, not the same as a structure-agent coding session.

6. **Prefer proven patterns.** Multi-step worker sophistication is earned (e.g. practice on mocks first); no free-floating multi-agent org chart at the hub before a real job needs it.

## Consequences

- Redesign of the OS stays free of instance data by default; private access is an explicit operate-time act.
- Sensitivity and model choice attach to the **job**, not to “using an agent.”
- Implementation must eventually make dispatch (CLI, hub, scheduler) the normal way to run workers — not “open the repo and also point the agent at LifeData.”
- Cost: slightly more ceremony to run a private job; clearer mental model and safer frontier use on structure work.
