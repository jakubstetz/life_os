# Life OS — Governance (policy)

**Purpose.** The sensitivity rule Life OS actually runs on: **public vs private**. System shape → [architecture.md](architecture.md). Structural rules → [principles.md](principles.md). Day-to-day procedure → [working-with.md](working-with.md).

Richer privacy *philosophy* (shape vs substance, time asymmetry) lives in [proportionate privacy](../articles/proportionate-privacy.md). **This file is the simple rule.**

---

## 1. What “governance” means here


| Use                  | Meaning                                                       | Home                                                                          |
| -------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **System component** | Docs and context that define how Life OS works                | [architecture.md § Governance](architecture.md#6-governance-system-component) |
| **This document**    | **Policy**: public vs private (models + git follow from that) | *here*                                                                        |


Changing this rule → ADR, then update this file.

---



## 2. Two tiers: public and private

If something is in doubt, treat it as **private**.


| Tier        | What it is                                                                                                                                     | Models                                          | Git               |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ----------------- |
| **Public**  | Structure and **shape**: architecture, principles, app/worker *code*, schemas, prompts, clearly fake mocks, non-identifying domain description | **Frontier via API** (or IDE on the same terms) | **May commit**    |
| **Private** | **Substance**: real balances, journals, contacts, raw mail, live vault content, anything identifying you in the concrete                       | **Local models**                                | **Do not commit** |


**“Public” does not mean “on the open internet.”** It means *not instance substance*. The git remote may still be private to you. That remote remains the public *tier*: no private material in it.

**Routing:** a task is private if it needs private material (or would put private material in the prompt). Otherwise it is public. Do not “average down.”

**Stay public while building tools:** use **mock volumes** (`seeds/`) so structure work never needs real rows — same as SQL in git with no production dump.

**Who does what:** structure agents work public paths; workers on real volumes are private by default. Detail: [principles.md](principles.md) Principle 4 · [architecture.md § Workers](architecture.md#3-workers).

**Irreversible actions** (send mail, move money, bulk delete, publish) need a human in the loop, regardless of model.

Primary control for private data is **location** outside `life_os/` ([ADR 0001](ADRs/0001-repo-structure-and-posture.md)).