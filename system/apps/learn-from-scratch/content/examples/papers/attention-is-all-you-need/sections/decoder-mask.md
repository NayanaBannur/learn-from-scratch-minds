# The decoder and the causal mask

The decoder writes the target sentence one token at a time, left to right. When it produces a word, it may use the words already written — never the ones still to come [[cite:transformer]].

But self-attention lets every position see every other position, future included. At training time the whole target sentence is present at once, so plain self-attention would let a token peek at the answer.

The fix is a **mask**: before the softmax, every score that points at a *future* position is set to $-\infty$, so softmax gives it weight zero.

```diagram
{ "type": "svg", "src": "assets/mask.svg" }
```

Each token can attend only to itself and earlier tokens. This *masked* self-attention is the decoder's first sub-layer; otherwise its layers match the encoder's.
