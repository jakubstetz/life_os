# Travel — data schema

[schema.sql](schema.sql) is the executable contract. Its fields and structure are self-documenting, and comments further elaborate on each table and each field. This Markdown file contains additional commentary on the schema that can't be easily captured in a SQL file.

[views.sql](views.sql) is useful advanced derived queries on the contract.


## How Flights Nest

```text
trip (optional)
  └── flight                 one ticket / purchase / confirmation
        └── flight_leg       one origin → destination (what you quote to the airline)
              └── portion    one takeoff → landing
```

Connecting is extra **portions** on one leg. Round-trip and multi-city are extra **legs** on one ticket.


| Shape                                | How to store                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| **One-way, nonstop**                 | One ticket, one leg, one portion                                                     |
| **One-way, one layover**             | One ticket, one leg, two portions (JFK→DEN, DEN→SFO)                                 |
| **Round-trip, two one-way tickets**  | Two tickets, same `trip_id`; each has its own leg(s)                                 |
| **Round-trip, one ticket**           | One ticket, two legs (home→far, far→home), portions per leg                          |
| **Multi-city** (A→B→C on one ticket) | One ticket, one leg per city-pair, portions per leg                                  |
| **Planned stub**                     | One ticket, one leg, one incomplete portion (date + airports) until routing is known |


## `flight_payments` across volumes

`travel_credit_id` is a real foreign key: both tables live in `travel.sqlite`. `account_id` is the id of a card/account in the **finances** volume. It has no `REFERENCES` because SQLite cannot enforce a key across files, and travel stays readable if finance is not mounted. The travel app (or a worker) joins in code once both disks are attached.