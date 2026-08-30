# `_meta/` — agent start pack

**Purpose.** Session layer for structure agents: how this pack works, what’s in focus, and how to write. Root `AGENTS.md` / `CLAUDE.md` only point here. The **system spine** lives under `architecture/` and is part of every warm start.

## Warm start

*If you are an agent working in this repo, read this sequence:*

1. This file  
2. [current-focus.md](current-focus.md)  
3. [conventions.md](conventions.md)  
4. [../architecture/overview.md](../architecture/overview.md)  
5. [../architecture/architecture.md](../architecture/architecture.md)  
6. [../architecture/principles.md](../architecture/principles.md)  
7. [../architecture/governance.md](../architecture/governance.md)  

Then use [load-by-task.md](load-by-task.md) for docs outside that spine (articles, ADRs, domains, working-with).

## What belongs here

| Here (`_meta`) | Spine (`architecture/`) | On demand |
|---|---|---|
| Current focus, writing conventions, load routing | Map, principles, governance | Articles, ADRs, domains, working-with |

Keep `_meta` thin: session and style, not a second architecture.

## Files

| File | Job |
|---|---|
| [current-focus.md](current-focus.md) | What we’re actively doing (edit often) |
| [conventions.md](conventions.md) | Writing style for docs and structure work |
| [load-by-task.md](load-by-task.md) | Extra docs beyond the spine |
