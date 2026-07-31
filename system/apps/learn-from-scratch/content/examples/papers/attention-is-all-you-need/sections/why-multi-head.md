# Why one head is too narrow

A single attention computation produces **one** set of weights per token. That forces every token to pick a single way of deciding what is relevant.

But relevance has many flavours at once. To understand a word, a model may need to track the verb it belongs to, the noun it modifies, and the pronoun it refers back to — different relationships, all in play together.

One softmax over one set of scores cannot hold several of these at the same time. A weight spent looking at the verb is a weight not spent on the pronoun.

The fix is to run attention several times in parallel, each with its own learned projections — so each copy, called a **head**, can specialize in a different kind of relationship.
