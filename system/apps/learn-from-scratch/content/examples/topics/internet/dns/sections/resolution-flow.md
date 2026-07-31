Put it together. To resolve `www.example.com`, the recursive resolver walks the tree from the top, and each server it asks refers it one step closer. [[cite:rfc1034]]

Each authoritative server answers with a **referral** — "I don't have it, but ask this server next" — until the last one returns the actual address.

```diagram
{
  "type": "svg",
  "src": "assets/resolution-flow.svg"
}
```
