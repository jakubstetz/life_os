# Open-Format Sovereignty

> **Thesis:** Your source of truth must live in **open, durable, inspectable formats that you own** — Markdown for prose, open structured formats (JSON, CSV, SQLite, Parquet) for data. Every intelligence layer above it — index, graph, embeddings, agent memory — is a *derived, disposable view*. Sovereignty is owning the source in formats no vendor controls, and being able to delete everything derived and lose nothing but compute.

**Related:** [why-a-life-os](why-a-life-os.md), [proportionate-privacy](proportionate-privacy.md), [the-ai-pilled-engineer](the-ai-pilled-engineer.md), [fluency-in-the-digital-substrate](fluency-in-the-digital-substrate.md)

## The principle

There is a source of truth, and there is everything built on top of it. The discipline is to never confuse the two — and to keep the source in a format **you own**.

"Own" means **open, durable, and inspectable**: non-proprietary, readable by many tools, portable across vendors, stable across decades. The derived layers — knowledge graph, vector index, typed edges, agent memory — are a *view* over that source. A lens, not a vault. The invariant is **openness plus the source/derived separation** — for prose and for structured data alike.

## The litmus: a view over data you own, or data trapped in an app?

The cleanest way to *feel* this principle is the Obsidian-versus-Notion question.

**Obsidian** is a lens over Markdown files that sit on your disk and that you own. Delete Obsidian tomorrow and your notes are still there — readable by any editor, any script, any future tool. The app is disposable; the data is yours and open.

**Notion** inverts this. Your data lives inside Notion's proprietary cloud database, reachable only through their app and API; export is lossy and second-class. If Notion changes its terms, hikes its price, or shuts down, your accumulated knowledge is hostage. In Notion, *the system is the data.*

That is the axis that matters, and it generalizes far past note-taking: **"the app is a view over data I own"** versus **"my data lives inside the app."** It is the same tenant-versus-owner line from [the AI-pilled engineer](the-ai-pilled-engineer.md), drawn at the data layer. For anything you intend to keep, choose the former.

And the payoff isn't only future-proofing. Because the source is open, *many* systems can adapt to it **at once** — Obsidian, a script, GBrain, an agent, and plain `grep` can all point at the same files simultaneously. Your data becomes a hub that tools orbit, not a silo one tool owns. Sovereignty buys a pluggable ecosystem today, not just survival tomorrow.

## Match the format to the shape of the content

- **Prose, knowledge, reflection, architecture docs → Markdown.** Human-first, diff-friendly, universally readable.
- **Structured / relational / quantitative data → open structured formats.** JSON, CSV, YAML for the canonical facts; SQLite or Parquet when scale or query performance demands it.
- **Config → YAML / JSON.**

What every one of these shares — and what proprietary app formats lack — is that you can open them, move them, regenerate indexes from them, and read them with tools that will still exist in twenty years. Structure is welcome; **opacity and lock-in** are not.

## The discipline it imposes

**No agent writes state that exists only in a derived layer.** Everything important round-trips back to the owned, open source. The index can be arbitrarily smart, but it is smart *about* the source, never the sole home of anything that matters.

## Worked example: financial data

- **Canonical source:** the financial facts (accounts, transactions, tax-benefit snapshots, credit utilization) live as **JSON / CSV** — open, portable, yours.
- **Derived query layer:** a **SQLite / DuckDB** database built from those files for fast aggregation — rebuildable, disposable.
- **Derived intelligence:** the GBrain index and any embeddings over the facts — disposable.
- **Derived views:** the dashboards read the query layer; they never store truth.

You can nuke the database, the index, and every dashboard, rebuild from the JSON/CSV, and lose nothing.

## Why it matters

- **Tools are young and tools die.** The current memory engines are new and opinionated; betting your life's memory on one being permanent is a category error. Open source formats make any engine swappable.
- **Formats outlive vendors.** Open files are readable in thirty years by any tool, with no license. Proprietary stores are readable only as long as the vendor and version cooperate.
- **It forecloses the deepest lock-in** — lock-in of your *memory itself*, where you can't leave because your accumulated knowledge only exists in one system's format.
- **It aligns with privacy.** Local files in open formats give you exact, file-level control over what gets indexed and what gets sent anywhere — the granularity [proportionate privacy](proportionate-privacy.md) demands.

## The tradeoff, honestly

You accept some redundancy between source and derived layers, and a rebuild step when indexes or query stores are regenerated. Against the alternative (surrendering ownership of your accumulated life to a format someone else controls), it is cheap.

## Distilled principles

- Source of truth vs. derived view: never confuse them; keep the source in formats *you own*.
- "Own" = open, durable, inspectable, portable — Markdown for prose, open structured formats for data.
- The litmus (Obsidian vs. Notion): the app should be a *lens* over data you own, never the *vault* that owns your data. Prefer "a view over data I own" to "my data lives inside the app." Open formats also let many tools use the same source at once.
- Match format to content: Markdown for prose; JSON/CSV/SQLite/Parquet for data; YAML/JSON for config.
- No agent writes state that lives *only* in a derived layer.
- It costs some redundancy and a rebuild step. Pay it; sovereignty is worth more.
