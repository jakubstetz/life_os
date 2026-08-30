# Domains

Per-domain **structure** — how each area of life is set up for me.

## Layout (every domain)

| File | Required | Role |
|---|---|---|
| `README.md` | yes | Document purpose and how I work |
| `schema.sql` | yes | Self-documenting, executable DDL |
| `views.sql` | no | `CREATE VIEW`s |
| `schema.md` | when SQL comments aren’t enough | Nesting, diagrams, worked examples |

## Overarching guidelines

### Timestamps in data

Wherever times/dates are saved in databases, they should be saved as singular numbers — a UNIX timestamp. It is the responsibility of the querying app to turn that timestamp into a date and/or time and account for timezones as needed.