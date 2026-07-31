Two record types describe the structure of the tree itself, rather than an address. [[cite:rfc1034]]

An **NS (name server) record** names an authoritative server for a zone. NS records are how delegation is written down: the `com` zone holds NS records pointing at `example.com`'s servers, which is exactly the referral a resolver follows.

An **SOA (start of authority) record** sits at the top of every zone. It marks where one zone's authority begins and records zone-wide settings — who administers it, a version number, and default timers. Each zone has exactly one SOA.
