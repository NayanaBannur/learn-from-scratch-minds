# The three uses of attention

The same attention mechanism appears in three roles across the model [[cite:transformer]]. What changes each time is only *where the queries, keys, and values come from*.

| Role | Queries from | Keys / values from | Masked? |
|---|---|---|---|
| **Encoder self-attention** | source tokens | same source tokens | no |
| **Decoder self-attention** | target tokens | same target tokens | yes — future hidden |
| **Encoder–decoder attention** | target tokens | encoder output | no |

The third role is the bridge between the two stacks. Here the decoder's queries read from the encoder's keys and values, so each word being generated pulls in the parts of the source sentence most relevant to it — the job attention was first invented to do [[cite:bahdanau]].

One mechanism, three wirings: read the source, read the past output, and connect the two.
