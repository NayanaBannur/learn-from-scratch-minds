A single lookup involves three kinds of party:

- **Stub resolver** — the small client built into your device. It doesn't do the work itself; it just asks a resolver and waits for the final answer.
- **Recursive resolver** — a server (run by your ISP, or a public one) that does the legwork: it chases the name down the tree and caches what it learns.
- **Authoritative servers** — the servers that actually hold the records for a zone. The root, TLD, and domain servers are each authoritative for their part of the tree. [[cite:rfc1034]]
