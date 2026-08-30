# Mock travel volume

Same layout as `$LIFE_OS_DATA_ROOT/travel/`.

```text
seeds/travel/
  README.md
  seed.sql           # sample rows only
  travel.sqlite      # local build — not in git
```

DDL: [schema.sql](../../domains/travel/schema.sql), [views.sql](../../domains/travel/views.sql).

```bash
cd seeds/travel
rm -f travel.sqlite
sqlite3 travel.sqlite < ../../domains/travel/schema.sql
sqlite3 travel.sqlite < ../../domains/travel/views.sql
sqlite3 travel.sqlite < seed.sql
```
