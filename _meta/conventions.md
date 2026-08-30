# Writing conventions (structure work)

For docs, schemas, ADRs, and `_meta` itself. Architecture and code follow the same spirit.

## One home per fact

Put a fact in the file that owns it. Elsewhere, **link** — do not restate paragraphs of the same content in README + schema + architecture.

| Kind of fact | Typical home |
|---|---|
| How I work in a domain | `domains/<name>/README.md` |
| Types, keys, constraints, field notes | `domains/<name>/schema.sql` (SQL comments) |
| `CREATE VIEW` | `domains/<name>/views.sql` |
| Nesting / diagrams that comments cannot draw | `domains/<name>/schema.md` |
| Sample rows | `seeds/<volume>/seed.sql` |
| System-wide shape | `architecture/` |
| Locked decisions | `architecture/ADRs/` |
| Session priorities | `_meta/current-focus.md` |

If a note is growing into an essay, move it to its proper home and leave a link.

## Describe the present system

State what the system **is and does now**: paths, fields, behavior — concrete and affirmative.

| Prefer | Avoid |
|---|---|
| “Logistics rows share a trip via `trip_id`.” | “In the old spreadsheet we used colors; now we use trips.” |
| “`layovers` holds multi-leg connection times; `remarks` is free narrative.” | Long sections of “we do not…”, “this is not…”, “unlike X we don’t…” |
| Paths, fields, and rules as they exist today | Abandoned tools, prior layouts, or “original idea sources” as if the reader needs migration history |

History belongs in git and in ADRs when a *decision* needs a record. One short contrast is fine when it prevents a real mistake; it is not a style for whole documents.

## Domain-specific only

State rules that are **particular to this project or domain**. Skip universal software literacy.

| Prefer | Avoid |
|---|---|
| “`points_value = (cost_amount - 5.60) / points_cost` with `US_FLIGHT_GOV_FEE = 5.60`.” | “IDs are stable primary keys and should never be reused.” |
| “Booleans are declared `BOOLEAN`.” | “Nulls are allowed unless a column is required.” |

If a competent engineer already assumes it, omit it.