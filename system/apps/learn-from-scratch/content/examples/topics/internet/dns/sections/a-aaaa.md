The most common record is the **A record** — it maps a name to a 32-bit **IPv4** address, like `example.com → 93.184.216.34`. This is the classic name-to-address translation. [[cite:rfc1035]]

IPv4 addresses ran short, so IPv6 introduced much longer 128-bit addresses. Those need their own record: the **AAAA record** ("quad-A"), added in 2003, maps a name to an IPv6 address. [[cite:rfc3596]]

A name usually has both. A client that supports IPv6 asks for the AAAA record and falls back to the A record if there isn't one.
