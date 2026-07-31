The walk starts at the **root**. The root servers don't know any ordinary domain — their one job is to point to the authoritative servers for each **top-level domain**.

There are **13 root server identities**, labelled `a` through `m` (`a.root-servers.net` … `m.root-servers.net`). [[cite:iana-root]]

Each identity is not one machine but many: the same address is served from hundreds of locations worldwide (a technique called anycast), so a nearby copy answers quickly and the root keeps working under heavy load. [[cite:iana-root]]
