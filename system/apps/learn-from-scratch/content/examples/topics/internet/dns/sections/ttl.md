A cached answer can't be kept forever — addresses change. Every record carries a **TTL (time to live)**: the number of seconds a resolver may cache it before discarding it and asking again. [[cite:rfc1034]]

The zone's owner sets the TTL. A high TTL (say a day) means fast lookups but slow propagation of changes; a low TTL (a few minutes) means the opposite. It is a deliberate trade-off between speed and freshness.

Two resolvers cache the same name — one with a low TTL, one with a high TTL. Move the server and watch which keeps serving the old address:

```diagram
{
  "type": "component",
  "module": "assets/TtlCountdown.jsx"
}
```
