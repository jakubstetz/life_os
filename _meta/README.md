# `_meta/` — agent start pack

**Purpose.** Session layer for structure agents: how this pack works and what’s in focus. Root `AGENTS.md` / `CLAUDE.md` only point here. The **system spine** lives under `architecture/` and is part of every warm start.

## Warm start (with root pointers)

_*If you are an agent working in this repo, read through the following sequence of files:*_
1. This file
2. [current-focus.md](current-focus.md)
3. [../architecture/overview.md](../architecture/overview.md)
4. [../architecture/architecture.md](../architecture/architecture.md)
5. [../architecture/principles.md](../architecture/principles.md)
6. [../architecture/governance.md](../architecture/governance.md)

Then use [load-by-task.md](load-by-task.md) when you need a doc **outside** that spine (articles, ADRs, domains, working-with).

## What belongs here


| Here (`_meta`)                     | Spine (`architecture/`)     | On demand                             |
| ---------------------------------- | --------------------------- | ------------------------------------- |
| Current focus; how to load context | Map, principles, governance | Articles, ADRs, domains, working-with |


Keep `_meta` thin. Real conventions will earn a home when the OS has enough practice to justify them — until then, the spine is enough.

## Files


| File                                 | Job                                    |
| ------------------------------------ | -------------------------------------- |
| [current-focus.md](current-focus.md) | What we’re actively doing (edit often) |
| [load-by-task.md](load-by-task.md)   | Extra docs beyond the spine            |


