# Why self-attention wins

The paper compares one layer of each design on three axes, for a sequence of length $n$ and representation width $d$ [[cite:transformer]]:

| Layer type | Compute per layer | Sequential steps | Max path length |
|---|---|---|---|
| **Self-attention** | $O(n^2 \cdot d)$ | $O(1)$ | $O(1)$ |
| Recurrent | $O(n \cdot d^2)$ | $O(n)$ | $O(n)$ |
| Convolutional | $O(k \cdot n \cdot d^2)$ | $O(1)$ | $O(\log_k n)$ |

Two columns decide it:

- **Sequential steps** — self-attention needs just one, so a whole sentence runs in parallel; recurrence needs $n$ steps in a row.
- **Max path length** — the distance information travels between the two furthest tokens. Self-attention connects any pair directly, in one step, so long-range links are as easy as short ones.

Its compute grows as $n^2$, which hurts for long sequences. For the sentence lengths in translation, that cost is well worth the parallelism and the short paths.
