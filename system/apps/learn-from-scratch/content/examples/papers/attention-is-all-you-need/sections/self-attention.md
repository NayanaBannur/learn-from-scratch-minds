# Self-attention

So far queries, keys, and values could come from anywhere. In **self-attention**, all three are projected from the *same* sequence [[cite:transformer]].

Every token builds a query, a key, and a value from its own embedding. Then every token's query is scored against every token's key — including its own.

```diagram
{ "type": "svg", "src": "assets/self-attention.svg" }
```

The result: in a single step, each token gathers context from the whole sentence, near or far. A word can look straight at another word ten positions away with no chain of steps between them.

This is what replaces recurrence. The left-to-right hidden state is gone; each token's new representation is a direct blend of all the others.
