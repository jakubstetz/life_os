# The AI-Pilled Engineer

> **Thesis:** AI has collapsed the cost of building bespoke software from months to hours. For a capable engineer, this inverts the default relationship to software — from *tenant* to *owner* — and makes it possible to repatriate the parts of your life that vendors have quietly been renting back to you.

**Related:** [why-a-life-os](why-a-life-os.md), [open-format-sovereignty](open-format-sovereignty.md), [proportionate-privacy](proportionate-privacy.md)

## The collapse

For most of software history, "build your own version" was a fantasy with a price tag. Wanting a better email client, a tailored finance tracker, or a personal CRM meant months of obsessive engineering — a cost only paid by a small tribe of pedantic geeks with too much time. So the rational default for everyone else was to *rent*: adopt whatever vendor had shipped the nearest-fitting compromise.

AI changed the economics, not the engineering. A model that can write and iterate on code alongside you compresses "months of obsessive work" into "hours or days of focused iteration." The work is still real, but the *threshold* dropped far enough that the build-vs-buy calculation flips for an entire class of software: the data-and-workflow tools that handle the mundanities of life.

Building, though, is only the most visible expression of a deeper and older capability — understanding how the digital world works well enough to move through it deliberately. That root principle has its own essay ([Fluency in the Digital Substrate](fluency-in-the-digital-substrate.md)); this one is about what AI did to a single branch of it.

## From tenant to owner

This is the philosophical core, and it is about **control**, not convenience.

When you use a vendor's app, you are renting a compromise. It was built for the average user or for an enterprise sales motion, and it is shaped by the vendor's incentives, not yours: lock-in, monetization, data harvesting, the constant threat of deprecation. Your data lives in their schema. Your workflow bends to their mental model. You are a tenant in software someone else owns, and the lease terms are theirs to change.

The bill often compounds that: suites are sold as wholes, not as a menu of the capabilities you want. You may keep a subscription for one excellent slice — tracking and categorization in a personal-finance app, for example — while funding budgeting, goals, investment modules, and other features you never open. You cannot refuse the packaging; ownership lets you build only the thin surface you actually use.

Ownership inverts every term. The software bends to *your* mental model instead of the reverse. Your data stays where you put it. It evolves precisely when *you* need it to, and never gets "sunset" out from under you. You stop being at the mercy of whatever a product manager decides to ship or kill. The mundane infrastructure of your life becomes *yours* — private, free in the long run, and exactly shaped to how you actually think.

## Where ownership is *not* the move

The power here is in knowing the boundary, not in maximalism. Rebuilding everything is its own trap. You should keep renting where:

- **Security or regulatory depth is the actual product.** Password managers, banks, anything where adversarial hardening and compliance are the thing you're paying for. Do not rebuild your bank.
- **It is already built for engineers.** GitHub, IDEs, the professional tooling that is itself the output of people solving exactly your problem well. The compromise isn't a compromise.
- **Network effects are the point.** Tools whose value is that *other people* use them too. You can't unilaterally own a shared protocol.

The sweet spot is everything else: the productivity, organization, tracking, and workflow tools where the commercial version is a compromise built for someone who isn't you. Build where the off-the-shelf option *fights your philosophy* — your need for privacy, for fit, for deep integration, for paying only for what you use — and rent where it doesn't.

## Who the customer is determines what you get

There is a deeper principle under that boundary, and it generalizes well beyond software: **a product's integrity tracks the sophistication of the customer it is actually built for.**

When the paying customer is technical — developers, engineers, businesses building on top — the product has to clear a hard bar, because those customers read the terms, demand guarantees, and will walk the instant it betrays them. That pressure produces honesty: controllable behavior, real documentation, data-handling guarantees, fewer dark patterns. This is *why* "it's already built for engineers" is a real exception to build-it-yourself. GitHub, IDEs, and developer APIs aren't compromises, because their customers wouldn't tolerate one.

When the product is built for the general consumer, the incentives invert. The average user wants usefulness and won't scrutinize the defaults, so the vendor is free to optimize for engagement, lock-in, monetization, and — increasingly — harvesting the user's data as raw material. The compromises aren't punished, so they accumulate.

The same company can sit on both sides of this line at once. A frontier lab's **API** (technical customers) won't train on your data by default and retains it only briefly; its **consumer chatbot** (the general public) may train on your conversations and keep them indefinitely. That isn't benevolence on one side and malice on the other — it's two audiences demanding two different bargains. (The [privacy article](proportionate-privacy.md) applies this directly to deciding where your data is allowed to go.)

The practical reading: **trust a product to the degree its core customer would punish betrayal.** Rent the ones built for people like you; stay wary of the ones built for everyone; and when you do use a consumer product, route the sensitive parts through the technical-grade door — the API — not the front door.

## The honest cost

The bar dropped; it did not vanish. You still have to think clearly about data models and desired behavior. Iteration is fast but still iterative. Reliability and security still matter, especially where money or important communications are involved. And maintenance is now *yours* — the flip side of owning is that no one else will fix it.

The deeper trap is building for building's sake: re-creating tools that already fit you fine, or gold-plating a personal utility into a product. Ownership is leverage, not a hobby. The discipline is to spend it only where it buys real control, fit, or privacy that you couldn't otherwise have.

## Distilled principles

- The cost of bespoke software collapsed; the *default* should shift from rent to build for life's data-and-workflow tools.
- Using a vendor's app means renting their compromise, shaped by their incentives. Owning means the software bends to you, and you only build what you need.
- Keep renting where security/regulation is the product, where the tool is already built for engineers, or where network effects are the point.
- Build where off-the-shelf *fights your philosophy* (privacy, fit, integration, paying only for what you use) — not everywhere.
- Owning means maintaining. Spend the leverage deliberately; don't build for building's sake.
- A product's integrity tracks the sophistication of the customer it's built for. Technical customers demand and get honest, controllable products; consumer products accumulate compromises the average user won't punish. The same lab's API and chatbot are two different bargains — route sensitive work through the technical-grade door.
