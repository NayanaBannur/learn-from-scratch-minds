# The encoder-decoder skeleton

The Transformer keeps the classic translation shape: an **encoder** that reads the source sentence, and a **decoder** that writes the target sentence [[cite:seq2seq]].

Each is a stack of $N = 6$ identical layers [[cite:transformer]].

```diagram
{ "type": "svg", "src": "assets/skeleton.svg" }
```

The encoder turns the input tokens into a stack of context-rich vectors — one per source token. The decoder produces the output one token at a time, and at every step it can look back at the encoder's vectors.

The next steps open up one encoder layer, then one decoder layer.
