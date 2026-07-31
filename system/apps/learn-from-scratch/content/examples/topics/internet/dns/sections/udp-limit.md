The original spec capped a DNS message over UDP at **512 bytes** — the largest size every host was guaranteed to handle without fragmenting. [[cite:rfc1035]]

When an answer doesn't fit, the server sends what it can and sets a **truncated** flag. Seeing that flag, the resolver retries the same query over **TCP**, which has no such limit. [[cite:rfc1035]]

Modern DNS mostly avoids that extra round trip with **EDNS(0)**: the client advertises that it can accept larger UDP responses (often 1232 bytes), so bigger answers — common with IPv6 and DNSSEC — still fit in one UDP packet. [[cite:rfc6891]]
