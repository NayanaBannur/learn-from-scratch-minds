Even with DNSSEC, the query itself travels in the clear on port 53. Anyone on the network path can see every name you look up. Two standards encrypt the query to fix that.

- **DNS over TLS (DoT)**, 2016 — wraps DNS in a TLS-encrypted connection on its own **port 853**. [[cite:rfc7858]]
- **DNS over HTTPS (DoH)**, 2018 — sends the query inside ordinary **HTTPS** traffic, so it looks like any other web request and is hard to single out. [[cite:rfc8484]]

Both hide *which names* you resolve from the network between you and the resolver. Note the resolver itself still sees your queries — encryption protects the path, not what happens at the far end.
