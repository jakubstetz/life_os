# Mock volumes

Public, isomorphic fakes of `$LIFE_OS_DATA_ROOT/<volume>/`. Structure agents use these instead of live data.

```text
seeds/travel/     ↔  $LIFE_OS_DATA_ROOT/travel/
```

Each volume folder has `seed.sql` (rows only) and a README. Tables live in `domains/<name>/schema.sql`; views in `views.sql`. Leave `seed.sql` alone while the schema is still moving; regenerate mock rows once the human confirms the volume’s final form.

Build the SQLite file locally:

```bash
cd seeds/travel
rm -f travel.sqlite
sqlite3 travel.sqlite < ../../domains/travel/schema.sql
sqlite3 travel.sqlite < ../../domains/travel/views.sql
sqlite3 travel.sqlite < seed.sql
```

`*.sqlite` is gitignored.
