Walking from the root on every lookup would be slow and would pound the root and TLD servers. **Caching** is what avoids it. [[cite:rfc1034]]

As the resolver walks the tree, it keeps every answer it receives. The next time anyone asks for `www.example.com`, it already has the address and replies at once — no walk at all.

It also caches the intermediate steps. Once it has learned which servers run `com`, a later lookup for `other.com` can skip the root entirely and start at the TLD.
