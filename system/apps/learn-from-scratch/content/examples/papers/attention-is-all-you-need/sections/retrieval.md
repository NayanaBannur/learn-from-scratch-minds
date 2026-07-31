# Attention as soft retrieval

Attention works like looking something up in a dictionary — but softened, so that instead of one exact match you blend several entries.

Every token produces three vectors, each a learned projection of its embedding:

- a **query** — what this token is looking for;
- a **key** — what this token offers to others, used for matching;
- a **value** — the actual content this token passes on if matched.

To update one token, its query is compared against **every** key. A close match earns a high score; the scores become weights, and the output is the weighted blend of all the values.

```diagram
{ "type": "svg", "src": "assets/retrieval.svg" }
```

Nothing is selected outright. Each token pulls a little from everywhere, weighted by how well its query matched each key.
