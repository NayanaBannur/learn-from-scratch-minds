The answers DNS stores are **resource records**. A record is not just "name → address"; it has a fixed shape. [[cite:rfc1035]]

Every record carries four things:

- **Name** — the domain name it belongs to (`example.com`).
- **Type** — what kind of data this is (an address, a mail server, an alias…).
- **TTL** — how long it may be cached.
- **Data** — the value itself, whose form depends on the type.

The **type** is the key field: the same name can hold several records of different types, and a query always asks for a specific one.
