# Proportionate Privacy

> **Thesis:** Treat your data-self as an asset held under uncertainty. Act while restraint is still cheap (exposure is judged by *tomorrow's* capabilities). Share *shape* with frontier models, not *substance*. Route by real sensitivity — proportionate stewardship, not bunker-building.

**Related:** [the-ai-pilled-engineer](the-ai-pilled-engineer.md), [open-format-sovereignty](open-format-sovereignty.md), [why-a-life-os](why-a-life-os.md)

## The time asymmetry

The usual privacy calculus asks "are these servers secure today?" That's the wrong frame, because data doesn't expire. The right frame is: **data exfiltrated now will be exploited by whatever capabilities exist later.** This is the "harvest now, exploit later" pattern — long understood in cryptography — applied to a personal data-self. It is the load-bearing reason restraint is front-loaded, not a complete privacy stance by itself.

Three forces compound against exposed data over time:

1. **Breaches are eventual, not hypothetical.** A store that is hard to crack today is a store that accumulates value and attacker attention. Given enough time, the probability trends toward one.
2. **Custodians change.** Policies, ownership, terms, and intentions all drift. The entity you trusted with the data is not necessarily the entity that will hold it.
3. **Extraction improves.** Tomorrow's models pull far more inference out of the same bytes than today's can — correlating, de-anonymizing, profiling, reconstructing. The data doesn't have to leak *more* to *mean* more.

And the worst case is irreversible: anything absorbed into a model's **training data** is effectively in the weights forever. There is no delete.

The consequence is that the value of restraint is **front-loaded**. The most important time to be careful is before the capability curve goes vertical and before you've built up a large exposed corpus. That is *now*.

## Why now is the window

We are past the era where AI was a toy, but not yet at the tipping point where data security everywhere is questionable and the exposed corpus of a life is trivially weaponizable. That gap is the window to get ahead of the curve — to delete, restrict, and re-route *before* the cost of not having done so compounds. The window is open and closing. Acting inside it is not paranoia; it is the cheapest moment to buy a durable position.

## Not all exposure is equal

"Frontier model" is not one bucket. The same lab offers two different privacy regimes from the same weights, and the lever you actually control is the *terms*. Two guarantees get constantly conflated, and they are not the same:

- **"Won't train on my data."** For the major frontier *APIs*, this is the default — for everyone, including individual developers. It is the *consumer* apps, with their memory toggles and training-on-by-default, that are the real hazard.
- **"Won't retain my data."** Stricter. Providers typically keep a short window (on the order of a month) for abuse and safety monitoring, then delete. True contractual *Zero Data Retention* — nothing stored at all — is usually a configuration or a negotiated agreement, sometimes gated to approved use.


| Mode                       | Trains on it? | Retains it?           | Risk                                     |
| -------------------------- | ------------- | --------------------- | ---------------------------------------- |
| Consumer product w/ memory | Often yes     | Yes                   | **Worst** — avoid for anything sensitive |
| Frontier **API** (default) | No            | Briefly, then deleted | Low–moderate                             |
| Frontier API under **ZDR** | No            | No                    | Low                                      |
| Local model                | No            | Never leaves device   | **None** (network-wise)                  |


The practical upgrade is nearly free: *using the API from your own code, rather than pasting into a consumer chatbot,* already buys "no training + brief retention + deletion." (Why the same lab offers a better bargain through the API than through the chatbot is a vendor-incentive story — the API's customers are technical, read the terms, and will walk; see [the-ai-pilled-engineer](the-ai-pilled-engineer.md).) But "deleted after thirty days" is a *promise*, not physics — a real reduction in exposure, still trust in a custodian. That residual trust is exactly why the ladder below ranks sharing *shape* above sharing *contents under good terms*.

## The resolution: shape without substance

Here is the move that dissolves the privacy-versus-power tension. **Frontier models almost never need your actual contents. They need your shape** — the structure, the schema, the logic, the categories. Designing a financial data model, building a dashboard, reasoning about whether an account *structure* is sound, drafting a document template: all of this is *structure*, not *instance*. The intimate specifics — the balances, the names, the confessions — are rarely what the model needs to be useful.

Separate the two and you can route by it: share shape freely, guard substance jealously. This is not a compromise that costs you capability. It captures most of the leverage at near-zero exposure.

## The escape-hatch ladder

When a task does need to touch sensitive territory, you don't face a binary. You have a ladder, ordered by protection. Choose the rung by asking: *what does the model actually need — shape or contents?*

1. **Zero-retention API** — send the real data under no-train/no-retention terms. Full fidelity; real data still briefly transits. For the sensitive-but-not-catastrophic when you genuinely need the real thing.
2. **Redaction / abstraction** — a *local* model strips the specifics (names → tokens, balances → orders of magnitude), you work with the frontier model on the redacted version, then map the answer back locally. Frontier reasoning on structure; specifics never leave.
3. **Synthetic / mock data** — send *nothing* real. The frontier model builds the schema, tool, or dashboard against fake-but-isomorphic data; you run it locally against the real thing. Ideal for *building software*.
4. **Pure local** — weakest model, total privacy. For anything you'd rather no external system ever hold.

One honest caveat: redaction is only as good as the redactor, and "redacted" data can sometimes be re-identified from residual quasi-identifiers and context. For your most sensitive material, **mock-or-local beats redaction** — never trust a jumble to be irreversible.

## Proportionate, not paranoid

None of this requires imagining catastrophe. Most of a life — even a comfortable, semi-public one — holds no secret whose exposure means collapse. The case for minimization stands anyway, and on calmer ground:

- **Aggregation, not any single fact.** Your finances, location, relationships, and beliefs are each mundane alone. *Joined*, they become a profile, and a profile is what enables targeting — scams, social engineering, manipulation, persuasion. The risk lives in the join.
- **Optionality for your future self.** You don't know who you'll become or what will be sensitive later. You can't retroactively un-expose, so minimizing now cheaply preserves the *option* of a private life later.
- **Power and legibility.** The entities that accumulate your data hold far more leverage over you than you have visibility into them. Minimizing is refusing to be needlessly *legible* to systems that don't have your interests at heart.
- **Dignity, not fear.** Independent of any concrete harm, keeping your inner life un-harvested is an expression of autonomy — the same thread as owning your tools instead of renting them.
- **The hedge is cheap.** Because shape-vs-contents costs you almost no capability, you buy the insurance even against low-probability risk.

So the disposition is **proportionate stewardship, not bunker-building** — calibrating effort to a sensitivity gradient rather than treating everything as a vault:


| Tier            | What it is                                                                                   | Default handling                                                         |
| --------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Open**        | Fine to be public or shared                                                                  | Anywhere, including public                                               |
| **Operational** | Rather not broadcast, but no real harm under no-train API terms — the bulk of Life OS work   | Frontier API (no-train) freely                                           |
| **Private**     | Intimate or identifying: specific balances, relationship and spiritual reflections, contacts | Local by default; share only via redaction, mock data, or deliberate ZDR |
| **Sealed**      | The rare things no external system should ever hold                                          | Local-only, possibly unindexed                                           |


In practice, today, most of life is **Operational**, a meaningful slice is **Private**, and **Sealed** is nearly empty — the category exists mainly so a future, more out-of-the-box life has somewhere to put things. Calibrate the work to where each thing actually sits, not to the worst case.

## The disposition

Underneath the mechanics is a stance: treat your data-self as an **asset held under uncertainty**, and steward it accordingly. When a thing's tier is unclear, err one notch *more* protective — but only one. Respect the irreversibility: you can always choose to share something later, but you can never un-share it. When genuinely in doubt, the asymmetry says wait.

## Distilled principles

- Data exposed today is judged by tomorrow's capabilities; the value of restraint is front-loaded.
- Three compounding forces — eventual breach, custodian drift, improving extraction — mean exposed data only grows more dangerous. Training data is irreversible.
- Now is the window: past toy-AI, before ubiquitous exposure. Act inside it.
- Two guarantees, not one: most frontier *APIs* won't *train* on your data by default; *not retaining* it is stricter and often configured (ZDR). Consumer apps are the real hazard; calling the API from your own code is a nearly-free upgrade.
- Frontier models need your **shape**, not your **substance**. Share structure freely; guard contents.
- Use the escape-hatch ladder (zero-retention API → redaction → mock → local), chosen by what the model actually needs. For your most sensitive material, prefer mock-or-local over redaction.
- Proportionate stewardship, not bunker-building: calibrate to a gradient (Open / Operational / Private / Sealed). Most of life is Operational; Sealed is nearly empty.
- The case for minimization doesn't need catastrophe — aggregation, optionality, power asymmetry, and dignity are enough.
- When a tier is unclear, err one notch more protective. Sharing is irreversible; restraint is not.

